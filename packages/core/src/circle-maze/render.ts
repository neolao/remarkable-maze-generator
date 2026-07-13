import type { CircleMazeCrossing } from "../maze-domain.js";
import {
	type ArcSegment,
	type LineSegment,
	TUBE_CORNER_RADIUS_RATIO,
	TUBE_HALF_WIDTH_RATIO,
	type TubeSegment,
	isArcSegment,
	roundCorner,
} from "../rendering/maze-layout.js";
import type { CircleCell } from "./cells.js";
import { isCcwOpen, isInwardOpen } from "./cells.js";
import {
	type PolarBoundaryEdge,
	type PolarOpening,
	type PolarRect,
	computePolarRegionBoundary,
} from "./region-boundary.js";
import { computeHubRadius, outwardChildren } from "./topology.js";

interface CircleMazeLike {
	sectorCounts: number[];
	cells: CircleCell[][];
	crossings?: CircleMazeCrossing[];
}

function validateCircleMazeShape(maze: CircleMazeLike): void {
	if (
		maze.cells.length !== maze.sectorCounts.length ||
		maze.cells.some((ring, index) => ring.length !== maze.sectorCounts[index])
	) {
		throw new Error(
			"Circle maze cells do not match the declared sector counts",
		);
	}
}

/**
 * Side length (in unit cell coordinates) of the square bounding box a circle
 * maze is laid out in — twice the ring count plus the hub radius (see
 * `computeHubRadius`), since every ring adds exactly 1 unit of radial
 * thickness and the whole ring stack sits pushed outward by the hub's own
 * radius (see ADR 037, ADR 038).
 */
export function computeCircleMazeDiameter(maze: CircleMazeLike): number {
	return (
		2 * (maze.sectorCounts.length + computeHubRadius(maze.sectorCounts[0]))
	);
}

interface Point {
	x: number;
	y: number;
}

// Sector 0 always starts at raw angle 0 on every ring (the topology's
// proportional index mapping keeps that seam radially aligned from the
// center out — see ADR 037), so a single constant rotation applied here
// moves the entrance/exit seam from the right (3 o'clock, the raw default)
// to the top (12 o'clock) for the whole maze at once.
const ANGLE_OFFSET = -Math.PI / 2;

function circlePoint(
	maze: CircleMazeLike,
	radius: number,
	angle: number,
): Point {
	const center = computeCircleMazeDiameter(maze) / 2;
	const adjustedAngle = angle + ANGLE_OFFSET;
	return {
		x: center + radius * Math.cos(adjustedAngle),
		y: center + radius * Math.sin(adjustedAngle),
	};
}

// The shared ArcSegment renderer always draws the *minor* arc between its two
// endpoints (a fixed SVG "large-arc-flag" of 0), so any span at or beyond
// 180° must be split in half, recursively, until every piece is safely under
// that threshold — same reasoning as the rectangular-grid `circle` type's
// superseded polar renderer (see ADR 034/037).
function circleArcSegments(
	maze: CircleMazeLike,
	radius: number,
	startAngle: number,
	endAngle: number,
): ArcSegment[] {
	if (endAngle - startAngle >= Math.PI) {
		const midAngle = (startAngle + endAngle) / 2;
		return [
			...circleArcSegments(maze, radius, startAngle, midAngle),
			...circleArcSegments(maze, radius, midAngle, endAngle),
		];
	}

	const from = circlePoint(maze, radius, startAngle);
	const to = circlePoint(maze, radius, endAngle);
	return [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y, radius, sweep: 1 }];
}

/**
 * Wall segments for the real growing-sector circle maze (see ADR 037), in the
 * same unit coordinate system the PDF/SVG renderers already scale/offset
 * generically for every maze type. Ring-boundary walls become arcs (drawn
 * from the *outer* ring's own sectors, at their own angular resolution, since
 * that ring may subdivide the boundary further than the inner one);
 * sector-boundary walls (`cwOpen`) become radial lines. The maze's absolute
 * outer edge (no ring further out to own it) is drawn directly from the
 * outermost ring, skipping the exit sector for a visible opening. The center
 * is a real point, not a boundary, so the whole ring stack is pushed outward
 * by the hub radius (see `computeHubRadius`) and ring 0 gets its own "hub"
 * circle of that same radius instead, skipping the entrance sector the same
 * way — the entrance and exit are both sector 0, so `ANGLE_OFFSET` keeps them
 * pointing the same direction (up).
 */
export function computeCircleMazeSegments(maze: CircleMazeLike): TubeSegment[] {
	validateCircleMazeShape(maze);

	const { sectorCounts, cells } = maze;
	const segments: TubeSegment[] = [];
	const lastRing = sectorCounts.length - 1;
	const hubRadius = computeHubRadius(sectorCounts[0]);

	for (let ring = 0; ring < sectorCounts.length; ring++) {
		const angleStep = (2 * Math.PI) / sectorCounts[ring];
		const innerRadius = ring + hubRadius;
		const outerRadius = ring + 1 + hubRadius;

		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			const startAngle = sector * angleStep;
			const endAngle = (sector + 1) * angleStep;
			const isExit = ring === lastRing && sector === 0;
			const isEntrance = ring === 0 && sector === 0;

			if (ring > 0 && !isInwardOpen(cells, sectorCounts, ring, sector)) {
				segments.push(
					...circleArcSegments(maze, innerRadius, startAngle, endAngle),
				);
			}

			if (ring === 0 && !isEntrance) {
				segments.push(
					...circleArcSegments(maze, hubRadius, startAngle, endAngle),
				);
			}

			if (!cells[ring][sector].cwOpen) {
				const from = circlePoint(maze, innerRadius, endAngle);
				const to = circlePoint(maze, outerRadius, endAngle);
				segments.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
			}

			if (ring === lastRing && !isExit) {
				segments.push(
					...circleArcSegments(maze, outerRadius, startAngle, endAngle),
				);
			}
		}
	}

	return segments;
}

/**
 * The physical center of cell (ring, sector), in the same unit coordinate
 * system as `computeCircleMazeSegments` — used to place the solution trace
 * and branch-point markers.
 */
export function computeCircleCellCenter(
	maze: CircleMazeLike,
	position: { ring: number; sector: number },
): Point {
	const angleStep = (2 * Math.PI) / maze.sectorCounts[position.ring];
	const angle = (position.sector + 0.5) * angleStep;
	const hubRadius = computeHubRadius(maze.sectorCounts[0]);
	const radius = position.ring + hubRadius + 0.5;
	return circlePoint(maze, radius, angle);
}

/**
 * The points a solution trace should actually pass through for `path` (a
 * sequence of adjacent cells), instead of just each cell's own center. A
 * straight line directly between two consecutive cells' centers looks like a
 * diagonal cutting across the maze whenever they're on different rings and
 * not at the same angle — so whenever the path changes rings, this inserts
 * an extra point at the shared ring boundary, on the *outer* cell's own
 * angle. That makes the final approach into the outer cell a pure radial
 * line (same angle, only the radius changes) — the passage between two rings
 * reads as following the radius, not cutting across it (see ADR 041). Same-
 * ring moves are untouched, since two cells in the same ring already sit at
 * the angles their own boundaries define.
 */
export function computeCircleSolutionPoints(
	maze: CircleMazeLike,
	path: { ring: number; sector: number }[],
): Point[] {
	const hubRadius = computeHubRadius(maze.sectorCounts[0]);
	const points: Point[] = [];

	for (let i = 0; i < path.length; i++) {
		points.push(computeCircleCellCenter(maze, path[i]));

		if (i < path.length - 1) {
			const current = path[i];
			const next = path[i + 1];

			if (next.ring !== current.ring) {
				const outer = next.ring > current.ring ? next : current;
				const boundaryRadius = Math.max(current.ring, next.ring) + hubRadius;
				const angleStep = (2 * Math.PI) / maze.sectorCounts[outer.ring];
				const angle = (outer.sector + 0.5) * angleStep;
				points.push(circlePoint(maze, boundaryRadius, angle));
			}
		}
	}

	return points;
}

function crossingKey(ring: number, sector: number): string {
	return `${ring},${sector}`;
}

function buildCrossingLookup(
	maze: CircleMazeLike,
): Map<string, CircleMazeCrossing> {
	const lookup = new Map<string, CircleMazeCrossing>();
	for (const crossing of maze.crossings ?? []) {
		lookup.set(crossingKey(crossing.ring, crossing.sector), crossing);
	}
	return lookup;
}

function radialLine(
	maze: CircleMazeLike,
	angle: number,
	fromRadius: number,
	toRadius: number,
): LineSegment {
	const from = circlePoint(maze, fromRadius, angle);
	const to = circlePoint(maze, toRadius, angle);
	return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
}

/**
 * The circle-maze equivalent of `computeTubeSegments`, rebuilt on a
 * region-outline construction (see ADR 059, superseding the per-cell segment
 * assembly of ADR 055/057/058): the maze's whole passage area is described as
 * a filled region of axis-aligned polar rectangles — one hub band per cell at
 * `midRadius ± h`, flush with the cell's own boundary on each open tangential
 * side (merging seamlessly with the neighbor's own flush band) and set back
 * by a cap inset on each closed one, so two closed neighbors read as two
 * separate rounded pipe caps with a visible gap of white between them; one
 * connector per open radial edge sized from the child's own physical radius;
 * and an entrance/exit stub each. The drawn segments are that region's own
 * outline, which is closed by construction. The only thing the region alone
 * cannot express is a crossing's weave marks, added as forced edges — arcs
 * sealing the over-axis tube where the under corridor's doors would otherwise
 * open into it (tangential over), or two bridge sides running through the hub
 * interior (radial over). Forced edges land on region-emitted arcs by
 * construction (their radii are the very hub-band radii those arcs are drawn
 * at), so they always join the outline instead of floating.
 *
 * Corner rounding is a post-pass on the outline: every vertex where exactly
 * one radial line and one concentric arc meet end-to-end is a true 90°
 * corner and gets the same `roundCorner` fillet the rectangular tube uses,
 * except inside crossing cells (which need their exact weave shape) and
 * where either piece is too short to absorb the fillet.
 */
export function computeCircleTubeSegments(maze: CircleMazeLike): TubeSegment[] {
	validateCircleMazeShape(maze);

	const { sectorCounts, cells } = maze;
	const h = TUBE_HALF_WIDTH_RATIO;
	const hubRadius = computeHubRadius(sectorCounts[0]);
	const lastRing = sectorCounts.length - 1;
	const crossingLookup = buildCrossingLookup(maze);
	const doorSpans = computeRadialDoorSpans(maze, hubRadius, lastRing);

	const rects: PolarRect[] = [];
	const openings: PolarOpening[] = [];
	const forcedEdges: PolarBoundaryEdge[] = [];
	const bridgeSegments: TubeSegment[] = [];
	const roundingExclusions: PolarRect[] = [];

	for (let ring = 0; ring < sectorCounts.length; ring++) {
		const angleStep = (2 * Math.PI) / sectorCounts[ring];
		const midRadius = ring + hubRadius + 0.5;
		const innerHubR = midRadius - h;
		const outerHubR = midRadius + h;
		// A door's angular half-width derives from the physical radius, not
		// the ring's own angular step, so its physical width stays consistent
		// however deep in the maze it sits (see ADR 055 follow-up).
		const hA = h / midRadius;

		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			const startAngle = sector * angleStep;
			const endAngle = (sector + 1) * angleStep;
			const midAngle = (startAngle + endAngle) / 2;

			const isEntrance = ring === 0 && sector === 0;
			const isExit = ring === lastRing && sector === 0;
			const inwardOpen =
				ring > 0 && isInwardOpen(cells, sectorCounts, ring, sector);
			const inwardSpan = inwardOpen
				? doorSpans.get(doorSpanKey(ring, sector))
				: undefined;
			const stubSpan =
				isEntrance || isExit
					? { start: midAngle - hA, end: midAngle + hA }
					: undefined;
			const openChildDoors: AngularSpan[] = [];
			if (ring < lastRing) {
				const children = outwardChildren(sectorCounts, ring, sector);
				children.forEach((child, index) => {
					if (!cells[ring][sector].outwardOpen[index]) return;
					const span = doorSpans.get(doorSpanKey(ring + 1, child));
					if (span !== undefined) openChildDoors.push(span);
				});
			}

			// Everything this cell's own tube must stay open to.
			const covers: AngularSpan[] = [...openChildDoors];
			if (inwardSpan !== undefined) covers.push(inwardSpan);
			if (stubSpan !== undefined) covers.push(stubSpan);

			// The tube band covers exactly what the passage needs: flush with
			// the boundary on an open tangential side (merging with the
			// neighbor's own flush band); on a closed side, set back by the
			// cap inset when a tangential corridor terminates against it (the
			// other side being open), or hugging the outermost door edge when
			// the cell is purely radial — this is what keeps a straight
			// multi-ring corridor's walls perfectly straight, with no step at
			// any ring transition, and cap gaps regular where corridors run
			// along a ring. The cap never cuts across a door: door needs win
			// over the inset.
			const capInset = (0.5 - h) / midRadius;
			const cwOpen = cells[ring][sector].cwOpen;
			const ccwOpen = isCcwOpen(cells, sectorCounts, ring, sector);
			const needStart =
				covers.length > 0
					? Math.min(...covers.map((span) => span.start))
					: undefined;
			const needEnd =
				covers.length > 0
					? Math.max(...covers.map((span) => span.end))
					: undefined;
			let aStart: number;
			if (ccwOpen) {
				aStart = startAngle;
			} else if (cwOpen) {
				aStart = Math.min(
					startAngle + capInset,
					needStart ?? Number.POSITIVE_INFINITY,
				);
			} else {
				aStart = needStart ?? midAngle - hA;
			}
			let aEnd: number;
			if (cwOpen) {
				aEnd = endAngle;
			} else if (ccwOpen) {
				aEnd = Math.max(
					endAngle - capInset,
					needEnd ?? Number.NEGATIVE_INFINITY,
				);
			} else {
				aEnd = needEnd ?? midAngle + hA;
			}

			rects.push({
				rStart: innerHubR,
				rEnd: outerHubR,
				aStart,
				aEnd,
			});

			// Each open radial edge's connector is owned by the child side, at
			// its (possibly run-aligned) door span — the fan-out to several
			// open children happens naturally, one connector per child.
			if (inwardSpan !== undefined) {
				rects.push({
					rStart: ring - 1 + hubRadius + 0.5 + h,
					rEnd: innerHubR,
					aStart: inwardSpan.start,
					aEnd: inwardSpan.end,
				});
			}

			if (isEntrance && stubSpan !== undefined) {
				rects.push({
					rStart: hubRadius,
					rEnd: innerHubR,
					aStart: stubSpan.start,
					aEnd: stubSpan.end,
				});
				openings.push({
					radius: hubRadius,
					aStart: stubSpan.start,
					aEnd: stubSpan.end,
				});
			}

			if (isExit && stubSpan !== undefined) {
				const outerBoundary = lastRing + 1 + hubRadius;
				rects.push({
					rStart: outerHubR,
					rEnd: outerBoundary,
					aStart: stubSpan.start,
					aEnd: stubSpan.end,
				});
				openings.push({
					radius: outerBoundary,
					aStart: stubSpan.start,
					aEnd: stubSpan.end,
				});
			}

			const crossing = crossingLookup.get(crossingKey(ring, sector));
			if (crossing === undefined) continue;

			roundingExclusions.push({
				rStart: innerHubR,
				rEnd: outerHubR,
				aStart: startAngle,
				aEnd: endAngle,
			});

			const underInward = inwardSpan ??
				stubSpan ?? { start: midAngle - hA, end: midAngle + hA };
			if (crossing.underAxis === "radial") {
				// Tangential over: seal the over tube's two edges across the
				// under corridor's door spans, so its arcs read uninterrupted
				// while the radial corridor visibly stops at them.
				forcedEdges.push({
					kind: "arc",
					radius: innerHubR,
					aStart: underInward.start,
					aEnd: underInward.end,
				});
				for (const door of openChildDoors) {
					forcedEdges.push({
						kind: "arc",
						radius: outerHubR,
						aStart: door.start,
						aEnd: door.end,
					});
				}
			} else {
				// Radial over: each side of the bridge is one straight line
				// from the inward door's edge to the outward door's, cutting
				// across the hub interior — slightly slanted when the two
				// doors' angular widths or positions differ, with no step.
				// Its endpoints are the exact connector-jamb tips on both
				// sides, so it always joins the outline.
				const outwardSpan: AngularSpan =
					openChildDoors.length > 0
						? {
								start: Math.min(...openChildDoors.map((door) => door.start)),
								end: Math.max(...openChildDoors.map((door) => door.end)),
							}
						: (stubSpan ?? underInward);
				const sides: [number, number][] = [
					[underInward.start, outwardSpan.start],
					[underInward.end, outwardSpan.end],
				];
				for (const [inwardAngle, outwardAngle] of sides) {
					const from = circlePoint(maze, innerHubR, inwardAngle);
					const to = circlePoint(maze, outerHubR, outwardAngle);
					bridgeSegments.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
				}
			}
		}
	}

	const edges = computePolarRegionBoundary(rects, openings, forcedEdges);
	const segments = edges.flatMap((edge): TubeSegment[] =>
		edge.kind === "arc"
			? circleArcSegments(maze, edge.radius, edge.aStart, edge.aEnd)
			: [radialLine(maze, edge.angle, edge.rStart, edge.rEnd)],
	);

	return roundTubeCorners(
		maze,
		[...segments, ...bridgeSegments],
		roundingExclusions,
	);
}

interface AngularSpan {
	start: number;
	end: number;
}

function doorSpanKey(ring: number, sector: number): string {
	return `${ring},${sector}`;
}

/**
 * The angular span of every open radial door, keyed by the child cell. A
 * door's natural span is centered on the child cell with a half-width
 * derived from the child ring's physical mid-radius (constant physical
 * width). On top of that, spans propagate inward along straight-through
 * chains: when a cell is a pure radial corridor (both tangential sides
 * closed, one inward and exactly one outward connection) and its two doors
 * are center-aligned, its inward door adopts its outward door's exact span
 * — so every door of a straight multi-ring corridor shares the same two
 * angles (the outermost, narrowest door's) and the corridor's walls merge
 * into two perfectly straight lines instead of stepping at each ring.
 */
function computeRadialDoorSpans(
	maze: CircleMazeLike,
	hubRadius: number,
	lastRing: number,
): Map<string, AngularSpan> {
	const { sectorCounts, cells } = maze;
	const h = TUBE_HALF_WIDTH_RATIO;
	const spans = new Map<string, AngularSpan>();

	for (let ring = lastRing; ring >= 1; ring--) {
		const angleStep = (2 * Math.PI) / sectorCounts[ring];
		const hA = h / (ring + hubRadius + 0.5);

		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			if (!isInwardOpen(cells, sectorCounts, ring, sector)) continue;
			const midAngle = (sector + 0.5) * angleStep;
			let span: AngularSpan = { start: midAngle - hA, end: midAngle + hA };

			const cell = cells[ring][sector];
			const isStraightThrough =
				!cell.cwOpen &&
				!isCcwOpen(cells, sectorCounts, ring, sector) &&
				cell.outwardOpen.filter(Boolean).length === 1;
			if (isStraightThrough) {
				const children = outwardChildren(sectorCounts, ring, sector);
				const openChild = children[cell.outwardOpen.findIndex(Boolean)];
				const childSpan = spans.get(doorSpanKey(ring + 1, openChild));
				if (childSpan !== undefined) {
					const childCenter = (childSpan.start + childSpan.end) / 2;
					if (Math.abs(childCenter - midAngle) < 1e-9) {
						span = { ...childSpan };
					}
				}
			}

			spans.set(doorSpanKey(ring, sector), span);
		}
	}

	return spans;
}

function unit(from: Point, to: Point): Point {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy);
	return { x: dx / length, y: dy / length };
}

// Rotates a unit vector the same 90° step the rectangular tube's own fixed
// `CLOCKWISE_DIRECTIONS` cycle encodes: whichever of a corner's two touching
// directions lands on the other after this rotation goes first when handing
// the pair to `roundCorner`, otherwise its sweep comes out flipped (see ADR
// 031).
function rotate90(v: Point): Point {
	return { x: -v.y, y: v.x };
}

// A vertex only gets a fillet when both of its pieces can absorb the
// shortening with room to spare — the entrance/exit stubs' jambs (0.5 - h
// long) and a crossing's sliver caps deliberately stay sharp.
const MIN_CORNER_PIECE_LENGTH = 2 * TUBE_CORNER_RADIUS_RATIO;

const VERTEX_TOLERANCE = 1e-7;

interface VertexToucher {
	index: number;
	end: "start" | "end";
}

/**
 * Rounds every true 90° corner of the extracted outline: a vertex where
 * exactly one radial line and one concentric arc meet end-to-end (a radial
 * direction and a tangential one are inherently perpendicular). T-junctions
 * — a forced wall's tip resting on a merged arc's interior — have no
 * endpoint pair here and stay sharp, as do vertices inside crossing cells
 * and vertices whose pieces are too short for the fillet. The arc's own
 * shortened endpoint is recomputed *on its circle* (rotated by the fillet
 * radius around the maze center) rather than slid along a chord or tangent,
 * so shortened arcs stay exactly concentric with the ring they bound.
 */
function roundTubeCorners(
	maze: CircleMazeLike,
	rawSegments: TubeSegment[],
	exclusions: PolarRect[],
): TubeSegment[] {
	const center = computeCircleMazeDiameter(maze) / 2;

	const isExcluded = (point: Point): boolean => {
		const radius = Math.hypot(point.x - center, point.y - center);
		let angle = Math.atan2(point.x - center, -(point.y - center));
		if (angle < 0) angle += 2 * Math.PI;
		return exclusions.some(
			(zone) =>
				radius > zone.rStart - 1e-6 &&
				radius < zone.rEnd + 1e-6 &&
				angle > zone.aStart - 1e-6 &&
				angle < zone.aEnd + 1e-6,
		);
	};

	// Group segment endpoints by coincidence.
	const bucketSize = 1e-4;
	const buckets = new Map<string, { point: Point; toucher: VertexToucher }[]>();
	const bucketKey = (x: number, y: number) =>
		`${Math.round(x / bucketSize)},${Math.round(y / bucketSize)}`;
	rawSegments.forEach((segment, index) => {
		const entries: { point: Point; toucher: VertexToucher }[] = [
			{
				point: { x: segment.x1, y: segment.y1 },
				toucher: { index, end: "start" },
			},
			{
				point: { x: segment.x2, y: segment.y2 },
				toucher: { index, end: "end" },
			},
		];
		for (const entry of entries) {
			const key = bucketKey(entry.point.x, entry.point.y);
			const bucket = buckets.get(key);
			if (bucket === undefined) {
				buckets.set(key, [entry]);
			} else {
				bucket.push(entry);
			}
		}
	});
	const touchersAt = (point: Point): VertexToucher[] => {
		const cx = Math.round(point.x / bucketSize);
		const cy = Math.round(point.y / bucketSize);
		const touchers: VertexToucher[] = [];
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (const entry of buckets.get(`${cx + dx},${cy + dy}`) ?? []) {
					if (
						Math.hypot(entry.point.x - point.x, entry.point.y - point.y) <
						VERTEX_TOLERANCE
					) {
						touchers.push(entry.toucher);
					}
				}
			}
		}
		return touchers;
	};

	// A second, coarser index over the same endpoints: a fillet erases the
	// outline within the fillet radius of its vertex, so a vertex is only
	// safe to round when no *other* segment's tip rests inside that reach —
	// a forced wall landing just beside a door jamb would otherwise be left
	// dangling in the freshly rounded gap.
	const FILLET_CLEARANCE = 1.25 * TUBE_CORNER_RADIUS_RATIO;
	const coarseBuckets = new Map<string, Point[]>();
	const coarseKey = (x: number, y: number) =>
		`${Math.round(x / FILLET_CLEARANCE)},${Math.round(y / FILLET_CLEARANCE)}`;
	for (const bucket of buckets.values()) {
		for (const { point } of bucket) {
			const key = coarseKey(point.x, point.y);
			const coarse = coarseBuckets.get(key);
			if (coarse === undefined) {
				coarseBuckets.set(key, [point]);
			} else {
				coarse.push(point);
			}
		}
	}
	const hasForeignTipWithinFilletReach = (vertex: Point): boolean => {
		const cx = Math.round(vertex.x / FILLET_CLEARANCE);
		const cy = Math.round(vertex.y / FILLET_CLEARANCE);
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (const point of coarseBuckets.get(`${cx + dx},${cy + dy}`) ?? []) {
					const distance = Math.hypot(point.x - vertex.x, point.y - vertex.y);
					if (distance >= VERTEX_TOLERANCE && distance < FILLET_CLEARANCE) {
						return true;
					}
				}
			}
		}
		return false;
	};

	const endpointOf = (toucher: VertexToucher): Point => {
		const segment = rawSegments[toucher.index];
		return toucher.end === "start"
			? { x: segment.x1, y: segment.y1 }
			: { x: segment.x2, y: segment.y2 };
	};
	const farPointOf = (toucher: VertexToucher): Point => {
		const segment = rawSegments[toucher.index];
		return toucher.end === "start"
			? { x: segment.x2, y: segment.y2 }
			: { x: segment.x1, y: segment.y1 };
	};
	const chordLengthOf = (toucher: VertexToucher): number => {
		const segment = rawSegments[toucher.index];
		return Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
	};

	const startOverride = new Map<number, Point>();
	const endOverride = new Map<number, Point>();
	const fillets: ArcSegment[] = [];
	const processed = new Set<string>();

	rawSegments.forEach((segment, index) => {
		for (const end of ["start", "end"] as const) {
			const vertex = endpointOf({ index, end });
			const vertexKey = `${vertex.x.toFixed(8)},${vertex.y.toFixed(8)}`;
			if (processed.has(vertexKey)) continue;
			processed.add(vertexKey);

			const touching = touchersAt(vertex);
			if (touching.length !== 2) continue;
			const [first, second] = touching;
			const firstIsArc = isArcSegment(rawSegments[first.index]);
			const secondIsArc = isArcSegment(rawSegments[second.index]);
			if (firstIsArc === secondIsArc) continue;
			if (
				chordLengthOf(first) < MIN_CORNER_PIECE_LENGTH ||
				chordLengthOf(second) < MIN_CORNER_PIECE_LENGTH
			) {
				continue;
			}
			if (isExcluded(vertex)) continue;
			if (hasForeignTipWithinFilletReach(vertex)) continue;

			// Exact perpendicular directions at the vertex: the line's own
			// direction is radial; the arc's is the tangent toward its far
			// endpoint (its chord direction would drift with the arc's span).
			const directionFor = (toucher: VertexToucher): Point => {
				if (!isArcSegment(rawSegments[toucher.index])) {
					return unit(vertex, farPointOf(toucher));
				}
				const radialDir = unit({ x: center, y: center }, vertex);
				const tangent = rotate90(radialDir);
				const towardFar = unit(vertex, farPointOf(toucher));
				const aligned = tangent.x * towardFar.x + tangent.y * towardFar.y > 0;
				return aligned ? tangent : { x: -tangent.x, y: -tangent.y };
			};

			const direction0 = directionFor(first);
			const direction1 = directionFor(second);
			const rotated0 = rotate90(direction0);
			const goesFirst =
				Math.abs(rotated0.x - direction1.x) < 1e-6 &&
				Math.abs(rotated0.y - direction1.y) < 1e-6;
			const ordered = goesFirst ? [first, second] : [second, first];
			const orderedDirections = goesFirst
				? [direction0, direction1]
				: [direction1, direction0];

			const radius = TUBE_CORNER_RADIUS_RATIO;
			const { tangent1, tangent2, arc } = roundCorner(
				vertex,
				{
					x: vertex.x + orderedDirections[0].x,
					y: vertex.y + orderedDirections[0].y,
				},
				{
					x: vertex.x + orderedDirections[1].x,
					y: vertex.y + orderedDirections[1].y,
				},
				radius,
			);

			// Snap each arc-side tangent point back onto its own circle so the
			// shortened arc stays exactly concentric.
			const snapped = [tangent1, tangent2].map((tangent, position) => {
				const toucher = ordered[position];
				const piece = rawSegments[toucher.index];
				if (!isArcSegment(piece)) return tangent;
				const vertexAngle = Math.atan2(vertex.y - center, vertex.x - center);
				const delta = radius / piece.radius;
				const candidates = [vertexAngle + delta, vertexAngle - delta].map(
					(angle) => ({
						x: center + piece.radius * Math.cos(angle),
						y: center + piece.radius * Math.sin(angle),
					}),
				);
				const direction = orderedDirections[position];
				return (candidates[0].x - vertex.x) * direction.x +
					(candidates[0].y - vertex.y) * direction.y >
					0
					? candidates[0]
					: candidates[1];
			});

			ordered.forEach((toucher, position) => {
				const overrideMap =
					toucher.end === "start" ? startOverride : endOverride;
				overrideMap.set(toucher.index, snapped[position]);
			});
			fillets.push({
				...arc,
				x1: snapped[0].x,
				y1: snapped[0].y,
				x2: snapped[1].x,
				y2: snapped[1].y,
			});
		}
	});

	const rounded = rawSegments.map((segment, index) => {
		const start = startOverride.get(index) ?? { x: segment.x1, y: segment.y1 };
		const end = endOverride.get(index) ?? { x: segment.x2, y: segment.y2 };
		return { ...segment, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
	});

	return [...rounded, ...fillets];
}
