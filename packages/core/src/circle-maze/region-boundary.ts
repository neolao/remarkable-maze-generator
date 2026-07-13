// Exact boundary extraction for a filled region built from axis-aligned
// rectangles in polar (radius, angle) space (see ADR 059). The circle-crossing
// tube renderer describes every passage area as such a rectangle; the outline
// this module emits is closed by construction — a floating fragment or
// dangling stub cannot be expressed, which is the whole point of the design.
//
// Two controlled refinements: `openings` suppress the constant-radius cap
// that would otherwise seal the entrance/exit doors shut, and `forcedEdges`
// draw a line the region itself cannot express — a crossing's weave marks,
// cutting visibly across passage area. Forced edges join the natural edges
// before collinear merging, so they fuse with them into single maximal runs.

const EPSILON = 1e-9;
const TWO_PI = 2 * Math.PI;

export interface PolarRect {
	rStart: number;
	rEnd: number;
	aStart: number;
	aEnd: number;
}

/**
 * A span of a constant-radius boundary line that must stay open instead of
 * being capped — the entrance and exit doors of the maze.
 */
export interface PolarOpening {
	radius: number;
	aStart: number;
	aEnd: number;
}

export type PolarBoundaryEdge =
	| { kind: "arc"; radius: number; aStart: number; aEnd: number }
	| { kind: "radial"; angle: number; rStart: number; rEnd: number };

function validateRects(rects: PolarRect[]): void {
	for (const rectangle of rects) {
		if (rectangle.rStart > rectangle.rEnd + EPSILON) {
			throw new Error(
				`Polar rectangle has inverted radial bounds: [${rectangle.rStart}, ${rectangle.rEnd}]`,
			);
		}
		if (rectangle.aStart > rectangle.aEnd + EPSILON) {
			throw new Error(
				`Polar rectangle has inverted angular bounds: [${rectangle.aStart}, ${rectangle.aEnd}]`,
			);
		}
	}
}

function sortedUnique(values: number[]): number[] {
	const sorted = [...values].sort((a, b) => a - b);
	const unique: number[] = [];
	for (const value of sorted) {
		if (unique.length === 0 || value - unique[unique.length - 1] > EPSILON) {
			unique.push(value);
		}
	}
	return unique;
}

// Angles live on a circle: breakpoints are normalized to [0, 2*PI) so the
// interval between the last and first breakpoints (wrapping through the
// 0/2*PI seam) is a first-class interval like any other — two rectangles
// meeting exactly at the seam merge with no spurious wall.
function normalizeAngle(angle: number): number {
	const wrapped = angle % TWO_PI;
	const positive = wrapped < 0 ? wrapped + TWO_PI : wrapped;
	return TWO_PI - positive < EPSILON ? 0 : positive;
}

interface AngularInterval {
	start: number;
	end: number;
}

function buildAngularIntervals(breakpoints: number[]): AngularInterval[] {
	return breakpoints.map((start, index) => ({
		start,
		end:
			index < breakpoints.length - 1
				? breakpoints[index + 1]
				: breakpoints[0] + TWO_PI,
	}));
}

function rectCoversAngle(rectangle: PolarRect, angle: number): boolean {
	const candidates = [angle, angle - TWO_PI, angle + TWO_PI];
	return candidates.some(
		(candidate) =>
			rectangle.aStart - EPSILON < candidate &&
			candidate < rectangle.aEnd + EPSILON,
	);
}

function isInsideAt(
	rects: PolarRect[],
	radius: number,
	angle: number,
): boolean {
	return rects.some(
		(rectangle) =>
			radius > rectangle.rStart + EPSILON &&
			radius < rectangle.rEnd - EPSILON &&
			rectCoversAngle(rectangle, angle),
	);
}

function isOpeningCovering(
	openings: PolarOpening[],
	radius: number,
	aStart: number,
	aEnd: number,
): boolean {
	return openings.some((opening) => {
		if (Math.abs(opening.radius - radius) > EPSILON) return false;
		const shifts = [0, -TWO_PI, TWO_PI];
		return shifts.some(
			(shift) =>
				opening.aStart - EPSILON <= aStart + shift &&
				aEnd + shift <= opening.aEnd + EPSILON,
		);
	});
}

interface RawArc {
	radius: number;
	aStart: number;
	aEnd: number;
}

interface RawRadial {
	angle: number;
	rStart: number;
	rEnd: number;
}

// Merging first groups pieces whose shared coordinate matches within
// EPSILON, snapping each group to one canonical value, and only then sorts
// by span — sorting on the raw shared coordinate alone would let two pieces
// differing by one float ULP interleave out of span order, and the merge
// would silently swallow one of them instead of extending the run.

function mergeArcs(raw: RawArc[]): RawArc[] {
	const groups = groupByCoordinate(raw, (piece) => piece.radius);
	const merged: RawArc[] = [];
	for (const group of groups) {
		const radius = group[0].radius;
		group.sort((a, b) => a.aStart - b.aStart);
		let current: RawArc | undefined;
		for (const piece of group) {
			if (current !== undefined && piece.aStart - current.aEnd < EPSILON) {
				current.aEnd = Math.max(current.aEnd, piece.aEnd);
			} else {
				current = { ...piece, radius };
				merged.push(current);
			}
		}
	}
	return merged;
}

function mergeRadials(raw: RawRadial[]): RawRadial[] {
	const groups = groupByCoordinate(raw, (piece) => piece.angle);
	const merged: RawRadial[] = [];
	for (const group of groups) {
		const angle = group[0].angle;
		group.sort((a, b) => a.rStart - b.rStart);
		let current: RawRadial | undefined;
		for (const piece of group) {
			if (current !== undefined && piece.rStart - current.rEnd < EPSILON) {
				current.rEnd = Math.max(current.rEnd, piece.rEnd);
			} else {
				current = { ...piece, angle };
				merged.push(current);
			}
		}
	}
	return merged;
}

function groupByCoordinate<T>(
	pieces: T[],
	coordinate: (piece: T) => number,
): T[][] {
	const sorted = [...pieces].sort((a, b) => coordinate(a) - coordinate(b));
	const groups: T[][] = [];
	for (const piece of sorted) {
		const group = groups[groups.length - 1];
		if (
			group !== undefined &&
			coordinate(piece) - coordinate(group[0]) < EPSILON
		) {
			group.push(piece);
		} else {
			groups.push([piece]);
		}
	}
	return groups;
}

/**
 * The complete outline of the region covered by `rects`: an edge wherever
 * passage meets non-passage, merged into maximal collinear runs, minus the
 * spans listed in `openings`, plus the explicitly `forcedEdges`. Every
 * constant-radius edge comes back as an arc, every constant-angle edge as a
 * radial span, both still in polar terms — mapping to Cartesian segments is
 * the caller's job.
 */
export function computePolarRegionBoundary(
	rects: PolarRect[],
	openings: PolarOpening[] = [],
	forcedEdges: PolarBoundaryEdge[] = [],
): PolarBoundaryEdge[] {
	validateRects(rects);
	if (rects.length === 0 && forcedEdges.length === 0) return [];

	const radialBreakpoints = sortedUnique(
		rects.flatMap((rectangle) => [rectangle.rStart, rectangle.rEnd]),
	);
	const angularBreakpoints = sortedUnique(
		[
			...rects.flatMap((rectangle) => [rectangle.aStart, rectangle.aEnd]),
			...openings.flatMap((opening) => [opening.aStart, opening.aEnd]),
		].map(normalizeAngle),
	);
	const intervals = buildAngularIntervals(angularBreakpoints);
	const bandCount = Math.max(radialBreakpoints.length - 1, 0);

	// One inside/outside flag per (radial band, angular interval) grid cell,
	// sampled at the cell's midpoint — exact, since every rectangle edge is a
	// breakpoint.
	const inside: boolean[][] = [];
	for (let band = 0; band < bandCount; band++) {
		const rMid = (radialBreakpoints[band] + radialBreakpoints[band + 1]) / 2;
		inside.push(
			intervals.map(
				(interval) =>
					interval.end - interval.start >= EPSILON &&
					isInsideAt(rects, rMid, (interval.start + interval.end) / 2),
			),
		);
	}

	const rawRadials: RawRadial[] = [];
	for (let band = 0; band < bandCount; band++) {
		if (radialBreakpoints[band + 1] - radialBreakpoints[band] < EPSILON) {
			continue;
		}
		for (let j = 0; j < intervals.length; j++) {
			const previous = (j - 1 + intervals.length) % intervals.length;
			if (inside[band][previous] !== inside[band][j]) {
				rawRadials.push({
					angle: intervals[j].start,
					rStart: radialBreakpoints[band],
					rEnd: radialBreakpoints[band + 1],
				});
			}
		}
	}

	const rawArcs: RawArc[] = [];
	for (let line = 0; line < radialBreakpoints.length; line++) {
		const radius = radialBreakpoints[line];
		for (let j = 0; j < intervals.length; j++) {
			const interval = intervals[j];
			if (interval.end - interval.start < EPSILON) continue;
			const below = line > 0 ? inside[line - 1][j] : false;
			const above = line < bandCount ? inside[line][j] : false;
			if (below === above) continue;
			if (isOpeningCovering(openings, radius, interval.start, interval.end)) {
				continue;
			}
			rawArcs.push({ radius, aStart: interval.start, aEnd: interval.end });
		}
	}

	for (const edge of forcedEdges) {
		if (edge.kind === "arc") {
			rawArcs.push({
				radius: edge.radius,
				aStart: edge.aStart,
				aEnd: edge.aEnd,
			});
		} else {
			rawRadials.push({
				angle: normalizeAngle(edge.angle),
				rStart: edge.rStart,
				rEnd: edge.rEnd,
			});
		}
	}

	return [
		...mergeArcs(rawArcs).map(
			(piece): PolarBoundaryEdge => ({ kind: "arc", ...piece }),
		),
		...mergeRadials(rawRadials).map(
			(piece): PolarBoundaryEdge => ({ kind: "radial", ...piece }),
		),
	];
}
