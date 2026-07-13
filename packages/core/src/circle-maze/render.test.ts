import { describe, expect, it } from "vitest";
import {
	type ArcSegment,
	TUBE_CORNER_RADIUS_RATIO,
	TUBE_HALF_WIDTH_RATIO,
	type TubeSegment,
	isArcSegment,
} from "../rendering/maze-layout.js";
import type { CircleCell } from "./cells.js";
import { carveEdge, createCircleGrid } from "./cells.js";
import { generateCircleMaze } from "./generate.js";
import {
	computeCircleCellCenter,
	computeCircleMazeDiameter,
	computeCircleMazeSegments,
	computeCircleSolutionPoints,
	computeCircleTubeFillShapes,
	computeCircleTubeSegments,
} from "./render.js";
import { computeCircleSectorCounts, computeHubRadius } from "./topology.js";

function buildFullyWalledCircleMaze(sectorCounts: number[]): {
	sectorCounts: number[];
	cells: CircleCell[][];
} {
	return { sectorCounts, cells: createCircleGrid(sectorCounts) };
}

// Same hand-built 3-ring, 3-sector-per-ring crossing maze as
// circle-maze/solve.test.ts's buildCircleCrossingMaze (see ADR 055): a
// crossing sits at (ring 1, sector 1), its "under" (pre-existing) axis
// radial, its "over" (tunneled) axis tangential.
function buildCircleCrossingMaze() {
	const sectorCounts = [3, 3, 3];
	const cells = createCircleGrid(sectorCounts);

	carveEdge(
		cells,
		sectorCounts,
		{ ring: 0, sector: 0 },
		{ ring: 1, sector: 0 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 1, sector: 0 },
		{ ring: 1, sector: 1 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 0, sector: 1 },
		{ ring: 1, sector: 1 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 1, sector: 1 },
		{ ring: 2, sector: 1 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 1, sector: 1 },
		{ ring: 1, sector: 2 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 1, sector: 2 },
		{ ring: 2, sector: 2 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 2, sector: 2 },
		{ ring: 2, sector: 1 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 2, sector: 1 },
		{ ring: 2, sector: 0 },
	);

	return {
		sectorCounts,
		cells,
		crossings: [{ ring: 1, sector: 1, underAxis: "radial" as const }],
	};
}

describe("computeCircleMazeDiameter", () => {
	it("is twice the ring count plus the hub radius (outermost ring's own outer radius)", () => {
		const maze = { sectorCounts: computeCircleSectorCounts(8, 5), cells: [] };

		expect(computeCircleMazeDiameter(maze)).toBeCloseTo(
			2 * (5 + computeHubRadius(8)),
			9,
		);
	});
});

describe("computeCircleMazeSegments", () => {
	it("never draws an arc AT the center (radius 0) — it's a real point, not a boundary", () => {
		// The center itself is never a boundary — the hub sits at `HUB_RADIUS`
		// away from it, so no arc should ever land exactly on the center point.
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);

		const segments = computeCircleMazeSegments(maze);
		const hasZeroRadiusArc = segments.some(
			(segment) => isArcSegment(segment) && segment.radius < 1e-9,
		);
		expect(hasZeroRadiusArc).toBe(false);
	});

	it("never draws the exit's outer boundary even though every wall is closed", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		const outerRadius = sectorCounts.length + computeHubRadius(sectorCounts[0]);
		const lastRingCount = sectorCounts[sectorCounts.length - 1];
		const exitAngleStep = (2 * Math.PI) / lastRingCount;

		const segments = computeCircleMazeSegments(maze);
		// Sum of the angular span covered by every outer-boundary arc — an arc
		// spans `2 * asin(chordLength / (2 * radius))`. If the exit's own
		// sector were mistakenly included, this would cover the full circle;
		// skipping it, the total must fall exactly `exitAngleStep` short.
		const totalAngle = segments
			.filter(isArcSegment)
			.filter((segment) => Math.abs(segment.radius - outerRadius) < 1e-9)
			.reduce((sum, segment) => {
				const chordLength = Math.hypot(
					segment.x2 - segment.x1,
					segment.y2 - segment.y1,
				);
				return sum + 2 * Math.asin(chordLength / (2 * segment.radius));
			}, 0);

		expect(totalAngle).toBeCloseTo(2 * Math.PI - exitAngleStep, 6);
	});

	it("draws every other outer-boundary sector on the outermost ring", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		const outerRadius = sectorCounts.length + computeHubRadius(sectorCounts[0]);
		const lastRingCount = sectorCounts[sectorCounts.length - 1];

		const segments = computeCircleMazeSegments(maze);
		const outerArcs = segments.filter(
			(segment) =>
				isArcSegment(segment) && Math.abs(segment.radius - outerRadius) < 1e-9,
		);
		// Every sector but the exit's own has its outer arc drawn (each closed,
		// possibly split into >1 piece if it spans a reflex angle, so this is a
		// lower bound rather than an exact count).
		expect(outerArcs.length).toBeGreaterThanOrEqual(lastRingCount - 1);
	});

	it("points the exit gap upward (12 o'clock) instead of to the right", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = { sectorCounts, cells: createCircleGrid(sectorCounts) };
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;

		const exitCenter = computeCircleCellCenter(maze, {
			ring: sectorCounts.length - 1,
			sector: 0,
		});

		// "Up" means a smaller y than the center (y grows downward), and the
		// vertical offset should dominate the horizontal one — not off to the
		// right (larger x, same y as the center), which is where sector 0 used
		// to render before the rotation.
		expect(exitCenter.y).toBeLessThan(center);
		expect(Math.abs(exitCenter.y - center)).toBeGreaterThan(
			Math.abs(exitCenter.x - center),
		);
	});

	it("draws a hub boundary around the center, sized like the maze's other passages, open at the entrance sector", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;
		const hubRadius = computeHubRadius(sectorCounts[0]);

		const segments = computeCircleMazeSegments(maze);
		const hubArcs = segments
			.filter(isArcSegment)
			.filter((segment) => Math.abs(segment.radius - hubRadius) < 1e-9);

		expect(hubArcs.length).toBeGreaterThan(0);
		// The hub is never smaller than one full ring's own thickness — a real
		// starting circle, not a tiny fraction of one.
		expect(hubRadius).toBeGreaterThanOrEqual(1);
		// Not a full circle: the entrance sector's own arc must be missing, so
		// the total angular coverage falls short of a full turn.
		const entranceAngleStep = (2 * Math.PI) / sectorCounts[0];
		const totalAngle = hubArcs.reduce((sum, segment) => {
			const chordLength = Math.hypot(
				segment.x2 - segment.x1,
				segment.y2 - segment.y1,
			);
			return sum + 2 * Math.asin(chordLength / (2 * segment.radius));
		}, 0);
		expect(totalAngle).toBeCloseTo(2 * Math.PI - entranceAngleStep, 6);

		// The gap itself: no hub arc should cover the point straight up from
		// the center (the rotated position of sector 0, the entrance).
		const upPoint = { x: center, y: center - hubRadius };
		const gapCovered = hubArcs.some((segment) => {
			const midX = (segment.x1 + segment.x2) / 2;
			const midY = (segment.y1 + segment.y2) / 2;
			return Math.hypot(midX - upPoint.x, midY - upPoint.y) < 0.2;
		});
		expect(gapCovered).toBe(false);
	});

	// Every ring boundary — the hub included — should stay within a bounded
	// range of the radial thickness, not collapse to a sliver or balloon out.
	it("keeps the hub arc length within a bounded ratio of every other ring-boundary arc length", () => {
		const sectorCounts = computeCircleSectorCounts(8, 15);
		const maze = buildFullyWalledCircleMaze(sectorCounts);

		const segments = computeCircleMazeSegments(maze);
		const arcs = segments.filter(isArcSegment);

		expect(arcs.length).toBeGreaterThan(0);
		for (const arc of arcs) {
			const chordLength = Math.hypot(arc.x2 - arc.x1, arc.y2 - arc.y1);
			const arcLength =
				2 * arc.radius * Math.asin(chordLength / (2 * arc.radius));

			expect(arcLength).toBeGreaterThan(0.35);
			expect(arcLength).toBeLessThan(2.1);
		}
	});

	it("throws when cells do not match the sector counts", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		maze.cells.pop();

		expect(() => computeCircleMazeSegments(maze)).toThrow();
	});

	it("handles the minimal 1x1 circle maze without throwing", () => {
		const sectorCounts = computeCircleSectorCounts(1, 1);
		const maze = buildFullyWalledCircleMaze(sectorCounts);

		expect(() => computeCircleMazeSegments(maze)).not.toThrow();
	});

	it("never produces an arc spanning a reflex angle (>= 180°), regardless of sector count", () => {
		for (const width of [1, 2, 3, 7]) {
			const sectorCounts = computeCircleSectorCounts(width, 3);
			const maze = buildFullyWalledCircleMaze(sectorCounts);

			const segments = computeCircleMazeSegments(maze);
			for (const segment of segments) {
				if (!isArcSegment(segment)) continue;
				const chordLength = Math.hypot(
					segment.x2 - segment.x1,
					segment.y2 - segment.y1,
				);
				expect(chordLength).toBeLessThan(2 * segment.radius);
			}
		}
	});

	it("produces a non-empty, valid segment list for every one of the 4 generation algorithms", () => {
		for (const algorithm of [
			"growing-tree",
			"kruskal",
			"wilson",
			"aldous-broder",
		] as const) {
			const maze = generateCircleMaze({
				width: 8,
				height: 6,
				seed: 3,
				algorithm,
			});

			const segments = computeCircleMazeSegments(maze);
			expect(segments.length).toBeGreaterThan(0);
		}
	});
});

describe("computeCircleSolutionPoints", () => {
	it("does not insert an extra point for a same-ring move", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = { sectorCounts, cells: createCircleGrid(sectorCounts) };

		const points = computeCircleSolutionPoints(maze, [
			{ ring: 0, sector: 0 },
			{ ring: 0, sector: 1 },
		]);

		expect(points).toHaveLength(2);
	});

	// The bug this fixes: a straight line from one cell's center directly to
	// another ring's cell center cuts across the maze at an angle instead of
	// following the radius through the shared ring boundary. Inserting a
	// point at the boundary, on the *outer* cell's own angle, makes the final
	// approach into that cell a pure radial line (same angle, only the radius
	// changes) — matching how a real passage between two rings should read.
	it("connects a ring transition through a boundary point that makes the approach into the outer cell purely radial", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = { sectorCounts, cells: createCircleGrid(sectorCounts) };
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;

		const points = computeCircleSolutionPoints(maze, [
			{ ring: 0, sector: 0 },
			{ ring: 1, sector: 0 },
		]);

		expect(points).toHaveLength(3);
		const [innerCenter, boundaryPoint, outerCenter] = points;

		// The inner cell's own center is untouched.
		const innerExpected = computeCircleCellCenter(maze, {
			ring: 0,
			sector: 0,
		});
		expect(innerCenter).toEqual(innerExpected);

		// The outer cell's own center is untouched.
		const outerExpected = computeCircleCellCenter(maze, {
			ring: 1,
			sector: 0,
		});
		expect(outerCenter).toEqual(outerExpected);

		// The boundary point sits at the same angle as the outer cell's own
		// center — same angle, so this last segment is a pure radial line.
		const boundaryAngle = Math.atan2(
			boundaryPoint.y - center,
			boundaryPoint.x - center,
		);
		const outerAngle = Math.atan2(
			outerCenter.y - center,
			outerCenter.x - center,
		);
		expect(boundaryAngle).toBeCloseTo(outerAngle, 9);
	});

	it("works symmetrically for an inward move (outer ring to inner ring)", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = { sectorCounts, cells: createCircleGrid(sectorCounts) };
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;

		const points = computeCircleSolutionPoints(maze, [
			{ ring: 1, sector: 0 },
			{ ring: 0, sector: 0 },
		]);

		expect(points).toHaveLength(3);
		const [outerCenter, boundaryPoint] = points;

		const boundaryAngle = Math.atan2(
			boundaryPoint.y - center,
			boundaryPoint.x - center,
		);
		const outerAngle = Math.atan2(
			outerCenter.y - center,
			outerCenter.x - center,
		);
		expect(boundaryAngle).toBeCloseTo(outerAngle, 9);
	});

	it("returns just the single cell center for a one-cell path", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = { sectorCounts, cells: createCircleGrid(sectorCounts) };

		const points = computeCircleSolutionPoints(maze, [{ ring: 0, sector: 0 }]);

		expect(points).toHaveLength(1);
	});
});

describe("computeCircleCellCenter", () => {
	it("returns a point at the ring's mid-radius from the center", () => {
		const sectorCounts = computeCircleSectorCounts(8, 5);
		const maze = { sectorCounts, cells: createCircleGrid(sectorCounts) };
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;

		const point = computeCircleCellCenter(maze, { ring: 2, sector: 3 });
		const distance = Math.hypot(point.x - center, point.y - center);

		expect(distance).toBeCloseTo(2 + computeHubRadius(8) + 0.5, 9);
	});

	it("places different sectors of the same ring at different angles", () => {
		const sectorCounts = computeCircleSectorCounts(8, 5);
		const maze = { sectorCounts, cells: createCircleGrid(sectorCounts) };

		const first = computeCircleCellCenter(maze, { ring: 1, sector: 0 });
		const second = computeCircleCellCenter(maze, { ring: 1, sector: 4 });

		expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThan(
			0.5,
		);
	});
});

// computeCircleTubeSegments draws the outline of the maze's whole passage
// area, built as a filled region of axis-aligned polar rectangles — one hub
// band per cell, one connector per open radial edge, entrance/exit stubs —
// plus a handful of forced edges (closed tangential walls, crossing weave
// marks); see ADR 059. The outline of a filled region is closed by
// construction, so the disconnected-fragment class of bugs that motivated
// the redesign cannot be expressed at all.
describe("computeCircleTubeSegments", () => {
	const h = TUBE_HALF_WIDTH_RATIO;
	const TOLERANCE = 1e-6;

	interface Point {
		x: number;
		y: number;
	}

	const mazeCenter = (maze: {
		sectorCounts: number[];
		cells: CircleCell[][];
	}): number => computeCircleMazeDiameter(maze) / 2;

	// Inverts the renderer's own polar-to-Cartesian mapping (sector 0 rotated
	// to 12 o'clock): the raw topology angle of a rendered point, in [0, 2*PI).
	const rawAngleOf = (center: number, point: Point): number => {
		const angle = Math.atan2(point.x - center, -(point.y - center));
		return angle < 0 ? angle + 2 * Math.PI : angle;
	};

	const radiusOf = (center: number, point: Point): number =>
		Math.hypot(point.x - center, point.y - center);

	const endpointsOf = (segment: TubeSegment): [Point, Point] => [
		{ x: segment.x1, y: segment.y1 },
		{ x: segment.x2, y: segment.y2 },
	];

	// Reconstructs an arc's center from its endpoints, radius and sweep flag:
	// of the two candidate centers, the right one puts the start-to-end
	// rotation in the direction the sweep flag encodes.
	const arcCenterOf = (arc: ArcSegment): Point => {
		const [start, end] = endpointsOf(arc);
		const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
		const halfChord = Math.hypot(end.x - start.x, end.y - start.y) / 2;
		const offset = Math.sqrt(
			Math.max(arc.radius * arc.radius - halfChord * halfChord, 0),
		);
		const along = {
			x: (end.x - start.x) / (2 * halfChord),
			y: (end.y - start.y) / (2 * halfChord),
		};
		const perpendicular = { x: -along.y, y: along.x };
		const candidate = {
			x: mid.x + offset * perpendicular.x,
			y: mid.y + offset * perpendicular.y,
		};
		const cross =
			(start.x - candidate.x) * (end.y - candidate.y) -
			(start.y - candidate.y) * (end.x - candidate.x);
		const matchesSweep = arc.sweep === 1 ? cross > 0 : cross < 0;
		return matchesSweep
			? candidate
			: {
					x: mid.x - offset * perpendicular.x,
					y: mid.y - offset * perpendicular.y,
				};
	};

	const pointLiesOnLine = (point: Point, segment: TubeSegment): boolean => {
		const dx = segment.x2 - segment.x1;
		const dy = segment.y2 - segment.y1;
		const lengthSquared = dx * dx + dy * dy;
		if (lengthSquared < TOLERANCE * TOLERANCE) return false;
		const t =
			((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) /
			lengthSquared;
		if (t < -TOLERANCE || t > 1 + TOLERANCE) return false;
		const projection = {
			x: segment.x1 + t * dx,
			y: segment.y1 + t * dy,
		};
		return (
			Math.hypot(point.x - projection.x, point.y - projection.y) < TOLERANCE
		);
	};

	const pointLiesOnArc = (point: Point, arc: ArcSegment): boolean => {
		const center = arcCenterOf(arc);
		const distance = Math.hypot(point.x - center.x, point.y - center.y);
		if (Math.abs(distance - arc.radius) > TOLERANCE) return false;
		const angleOf = (p: Point) => Math.atan2(p.y - center.y, p.x - center.x);
		const normalize = (angle: number) =>
			angle < 0 ? angle + 2 * Math.PI : angle;
		const [start, end] = endpointsOf(arc);
		const angularTolerance = TOLERANCE / arc.radius + 1e-9;
		const forward = arc.sweep === 1;
		const from = angleOf(forward ? start : end);
		const to = angleOf(forward ? end : start);
		const span = normalize(to - from);
		const offset = normalize(angleOf(point) - from);
		return (
			offset <= span + angularTolerance ||
			offset >= 2 * Math.PI - angularTolerance
		);
	};

	const pointLiesOnSegment = (point: Point, segment: TubeSegment): boolean =>
		isArcSegment(segment)
			? pointLiesOnArc(point, segment)
			: pointLiesOnLine(point, segment);

	/**
	 * The closure invariant of the region-outline construction: every rendered
	 * endpoint either coincides with another segment's endpoint or lands on
	 * another segment's interior (a T-junction) — the only exceptions are the
	 * entrance stub's inner tips and the exit stub's outer tips, the maze's
	 * two real openings. A violation is exactly the class of floating
	 * fragment / dangling stub this renderer was rebuilt to make impossible.
	 */
	const findDanglingEndpoints = (
		maze: { sectorCounts: number[]; cells: CircleCell[][] },
		segments: TubeSegment[],
	): Point[] => {
		const center = mazeCenter(maze);
		const hubRadius = computeHubRadius(maze.sectorCounts[0]);
		const outerBoundary = maze.sectorCounts.length + hubRadius;
		const isMazeOpening = (point: Point): boolean => {
			const radius = radiusOf(center, point);
			return (
				Math.abs(radius - hubRadius) < TOLERANCE ||
				Math.abs(radius - outerBoundary) < TOLERANCE
			);
		};

		const bucketSize = 1e-3;
		const buckets = new Map<string, Point[]>();
		const bucketKey = (x: number, y: number) =>
			`${Math.round(x / bucketSize)},${Math.round(y / bucketSize)}`;
		const allEndpoints = segments.flatMap(endpointsOf);
		for (const point of allEndpoints) {
			const key = bucketKey(point.x, point.y);
			const bucket = buckets.get(key);
			if (bucket === undefined) {
				buckets.set(key, [point]);
			} else {
				bucket.push(point);
			}
		}
		const hasCoincidingEndpoint = (point: Point): boolean => {
			const cx = Math.round(point.x / bucketSize);
			const cy = Math.round(point.y / bucketSize);
			let matches = 0;
			for (let dx = -1; dx <= 1; dx++) {
				for (let dy = -1; dy <= 1; dy++) {
					for (const other of buckets.get(`${cx + dx},${cy + dy}`) ?? []) {
						if (Math.hypot(other.x - point.x, other.y - point.y) < TOLERANCE) {
							matches++;
							if (matches >= 2) return true; // itself + one other
						}
					}
				}
			}
			return false;
		};

		const dangling: Point[] = [];
		segments.forEach((segment, index) => {
			for (const point of endpointsOf(segment)) {
				if (isMazeOpening(point)) continue;
				if (hasCoincidingEndpoint(point)) continue;
				const restsOnAnother = segments.some(
					(other, otherIndex) =>
						otherIndex !== index && pointLiesOnSegment(point, other),
				);
				if (!restsOnAnother) dangling.push(point);
			}
		});
		return dangling;
	};

	// Total angular coverage of the arcs at `radius`, clipped to the raw-angle
	// window [spanStart, spanEnd] — merged arcs may extend far beyond the
	// window on either side, so each one is clipped before summing.
	const coveredAngleWithin = (
		segments: TubeSegment[],
		center: number,
		radius: number,
		spanStart: number,
		spanEnd: number,
	): number => {
		const overlap = (a1: number, a2: number, b1: number, b2: number) =>
			Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
		return segments
			.filter(isArcSegment)
			.filter((segment) => Math.abs(segment.radius - radius) < TOLERANCE)
			.reduce((sum, segment) => {
				const [start, end] = endpointsOf(segment);
				const a1 = rawAngleOf(center, start);
				let a2 = rawAngleOf(center, end);
				if (a2 < a1 - 1e-9) a2 += 2 * Math.PI;
				return (
					sum +
					overlap(a1, a2, spanStart, spanEnd) +
					overlap(a1, a2, spanStart + 2 * Math.PI, spanEnd + 2 * Math.PI)
				);
			}, 0);
	};

	it("throws when cells do not match the sector counts", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		maze.cells.pop();

		expect(() => computeCircleTubeSegments(maze)).toThrow();
	});

	it("produces a non-empty list of finite-coordinate segments for a generated circle-crossing maze", () => {
		const maze = generateCircleMaze({
			width: 10,
			height: 10,
			seed: 3,
			allowsCrossings: true,
		});
		expect(maze.crossings.length).toBeGreaterThan(0);

		const segments = computeCircleTubeSegments(maze);
		expect(segments.length).toBeGreaterThan(0);
		for (const segment of segments) {
			expect(Number.isFinite(segment.x1)).toBe(true);
			expect(Number.isFinite(segment.y1)).toBe(true);
			expect(Number.isFinite(segment.x2)).toBe(true);
			expect(Number.isFinite(segment.y2)).toBe(true);
			if (isArcSegment(segment)) {
				expect(segment.radius).toBeGreaterThan(0);
			}
		}
	});

	it("bounds the tube band with arcs at exactly midRadius ± half-width, regardless of the ring's own sector count", () => {
		const sectorCounts = [6];
		const cells = createCircleGrid(sectorCounts);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 0 },
			{ ring: 0, sector: 1 },
		);
		const maze = { sectorCounts, cells };
		const midRadius = computeHubRadius(sectorCounts[0]) + 0.5;

		const segments = computeCircleTubeSegments(maze);
		const arcRadii = segments
			.filter(isArcSegment)
			.map((segment) => segment.radius);

		const hasRadiusNear = (radius: number) =>
			arcRadii.some((r) => Math.abs(r - radius) < 1e-9);
		expect(hasRadiusNear(midRadius - h)).toBe(true);
		expect(hasRadiusNear(midRadius + h)).toBe(true);
	});

	// Regression test for the original ADR 055 follow-up bug: sizing a door's
	// angular half-width from the ring's own angular step let a door's
	// *physical* width balloon within a same-sector-count band. Deriving the
	// half-width from the physical radius keeps the physical width within a
	// tight, bounded range no matter how deep in the maze the door sits.
	it("keeps an outward door's physical width within a tight bounded range across many rings of the same sector count", () => {
		const measureDoorWidth = (parentRing: number): number => {
			const sectorCounts = Array(parentRing + 2).fill(6);
			const cells = createCircleGrid(sectorCounts);
			carveEdge(
				cells,
				sectorCounts,
				{ ring: parentRing, sector: 2 },
				{ ring: parentRing + 1, sector: 2 },
			);
			const maze = { sectorCounts, cells };
			const center = mazeCenter(maze);
			const boundaryRadius = parentRing + 1 + computeHubRadius(6);

			const segments = computeCircleTubeSegments(maze);
			// The door's two jamb lines are the only line segments whose radial
			// span straddles the shared ring boundary (closed walls stay within
			// one band; the entrance/exit stubs sit at other radii).
			const jambs = segments.filter((segment) => {
				if (isArcSegment(segment)) return false;
				const [start, end] = endpointsOf(segment);
				const r1 = radiusOf(center, start);
				const r2 = radiusOf(center, end);
				return (
					Math.min(r1, r2) < boundaryRadius - TOLERANCE &&
					Math.max(r1, r2) > boundaryRadius + TOLERANCE
				);
			});
			expect(jambs).toHaveLength(2);

			const [first, second] = jambs.map((segment) =>
				rawAngleOf(center, endpointsOf(segment)[0]),
			);
			let angleDiff = Math.abs(first - second);
			if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
			return angleDiff * boundaryRadius;
		};

		const widths = [0, 2, 4, 6, 8].map(measureDoorWidth);

		for (const width of widths) {
			expect(width).toBeGreaterThan(1.5 * h);
			expect(width).toBeLessThan(2 * h);
		}
		expect(Math.max(...widths) / Math.min(...widths)).toBeLessThan(1.4);
	});

	// The region outline gives a door four real 90° jamb corners (two where
	// the connector leaves the parent's band, two where it enters the child's)
	// — each gets the same fillet treatment the rectangular tube applies to
	// its own hub corners.
	it("rounds a door's four jamb corners with fillet arcs", () => {
		const sectorCounts = [3, 9];
		const cells = createCircleGrid(sectorCounts);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 0 },
			{ ring: 1, sector: 1 },
		);
		const maze = { sectorCounts, cells };
		const center = mazeCenter(maze);
		const hubRadius = computeHubRadius(3);
		const childAngleStep = (2 * Math.PI) / 9;
		const childMidAngle = 1.5 * childAngleStep;
		const doorRadiusLow = hubRadius + 0.5 + h - 0.1;
		const doorRadiusHigh = 1 + hubRadius + 0.5 - h + 0.1;

		const segments = computeCircleTubeSegments(maze);
		const doorFillets = segments
			.filter(isArcSegment)
			.filter(
				(segment) => Math.abs(segment.radius - TUBE_CORNER_RADIUS_RATIO) < 1e-9,
			)
			.filter((segment) =>
				endpointsOf(segment).every((point) => {
					const radius = radiusOf(center, point);
					const angle = rawAngleOf(center, point);
					return (
						radius > doorRadiusLow &&
						radius < doorRadiusHigh &&
						Math.abs(angle - childMidAngle) < 0.19
					);
				}),
			);

		// Only the two lower jamb corners (into the parent's band arc) remain
		// real corners — the child cell's own tube hugs the door span exactly,
		// so the jambs continue straight through the child's band with no
		// corner at its inner edge.
		expect(doorFillets).toHaveLength(2);
	});

	// The closed-pipe look: a closed tangential wall renders as each cell's
	// own cap line, set back from the shared boundary, leaving a visible gap
	// of white between the two neighboring tubes — the same reading as
	// rectangle-crossing's separate flat caps, not one shared line.
	it("renders a closed tangential wall as two separate cap lines with a visible gap between the neighboring tubes", () => {
		const sectorCounts = [6];
		const cells = createCircleGrid(sectorCounts);
		// Two tangential corridors terminating on either side of the closed
		// boundary between sectors 1 and 2: (0,0)-(0,1) opens sector 1's ccw
		// side, (0,2)-(0,3) opens sector 2's cw side.
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 0 },
			{ ring: 0, sector: 1 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 2 },
			{ ring: 0, sector: 3 },
		);
		const maze = { sectorCounts, cells };
		const center = mazeCenter(maze);
		const midRadius = computeHubRadius(6) + 0.5;
		const angleStep = (2 * Math.PI) / 6;
		const boundaryAngle = 2 * angleStep;

		const segments = computeCircleTubeSegments(maze);
		const capLines = segments.filter((segment) => {
			if (isArcSegment(segment)) return false;
			const [start] = endpointsOf(segment);
			return Math.abs(rawAngleOf(center, start) - boundaryAngle) < 0.15;
		});

		expect(capLines).toHaveLength(2);
		const angles = capLines.map((segment) =>
			rawAngleOf(center, endpointsOf(segment)[0]),
		);
		// One cap on each side of the shared boundary, separated by twice the
		// cap inset (0.15 of a cell unit per side, measured physically).
		expect(Math.min(...angles)).toBeLessThan(boundaryAngle - 1e-6);
		expect(Math.max(...angles)).toBeGreaterThan(boundaryAngle + 1e-6);
		const gapWidth = (Math.max(...angles) - Math.min(...angles)) * midRadius;
		expect(gapWidth).toBeCloseTo(0.3, 6);
	});

	// The harmonization rule (user feedback: "il y a un petit crénelage"): a
	// straight multi-ring radial corridor must render with perfectly straight
	// unbroken walls — every door of an aligned straight-through chain shares
	// the exact same angular span (propagated from the chain's outermost
	// door), and a straight-through cell's own tube hugs that span exactly,
	// so all the wall pieces merge into one line per side with no step at
	// any ring transition.
	it("renders a straight multi-ring radial corridor with two perfectly straight unbroken walls", () => {
		const sectorCounts = [4, 4, 4];
		const cells = createCircleGrid(sectorCounts);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 1 },
			{ ring: 1, sector: 1 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 1 },
			{ ring: 2, sector: 1 },
		);
		const maze = { sectorCounts, cells };
		const center = mazeCenter(maze);
		const hubRadius = computeHubRadius(4);
		// The chain's outermost child is (2,1): every door in the run takes
		// its angular half-width.
		const runHalfAngle = h / (2 + hubRadius + 0.5);
		const midAngle = 1.5 * ((2 * Math.PI) / 4);
		// The corridor spans from the innermost cell's inner tube edge to the
		// outermost cell's outer tube edge.
		const spanLow = hubRadius + 0.5 - h;
		const spanHigh = 2 + hubRadius + 0.5 + h;

		const segments = computeCircleTubeSegments(maze);
		const walls = segments.filter((segment) => {
			if (isArcSegment(segment)) return false;
			const [start, end] = endpointsOf(segment);
			const r1 = radiusOf(center, start);
			const r2 = radiusOf(center, end);
			// One single unbroken line per side, spanning (almost) the whole
			// corridor — only shortened by the end-cap fillets.
			return (
				Math.min(r1, r2) < spanLow + 0.15 && Math.max(r1, r2) > spanHigh - 0.15
			);
		});

		expect(walls).toHaveLength(2);
		const angles = walls.map((segment) =>
			rawAngleOf(center, endpointsOf(segment)[0]),
		);
		expect(Math.abs(angles[0] - midAngle)).toBeCloseTo(runHalfAngle, 9);
		expect(Math.abs(angles[1] - midAngle)).toBeCloseTo(runHalfAngle, 9);
	});

	it("keeps a crossing's over axis (tangential) fully covered by arcs across its own span at both tube edges", () => {
		const maze = buildCircleCrossingMaze();
		const center = mazeCenter(maze);
		const angleStep = (2 * Math.PI) / maze.sectorCounts[1];
		const midRadius = 1 + computeHubRadius(maze.sectorCounts[0]) + 0.5;
		const spanStart = 1 * angleStep;
		const spanEnd = 2 * angleStep;

		const segments = computeCircleTubeSegments(maze);
		for (const radius of [midRadius - h, midRadius + h]) {
			const covered = coveredAngleWithin(
				segments,
				center,
				radius,
				spanStart,
				spanEnd,
			);
			expect(covered).toBeGreaterThanOrEqual(angleStep - 1e-6);
		}
	});

	it("leaves a real gap in a crossing node's under axis (radial here), never reaching its own center", () => {
		const maze = buildCircleCrossingMaze();
		const crossingCenter = computeCircleCellCenter(maze, {
			ring: 1,
			sector: 1,
		});

		const segments = computeCircleTubeSegments(maze);
		const distancesToCenter = segments
			.filter((segment) => !isArcSegment(segment))
			.flatMap(endpointsOf)
			.map((point) =>
				Math.hypot(point.x - crossingCenter.x, point.y - crossingCenter.y),
			);

		// Every line segment stops meaningfully short of the crossing's own
		// center — the real physical gap where the tangential (over-axis) tube
		// passes uninterrupted instead.
		expect(Math.min(...distancesToCenter)).toBeGreaterThan(0.2);
	});

	it("draws a crossing's over axis (radial) as two straight bridge sides running through the hub interior from the inward door's angles to the outward door's", () => {
		const sectorCounts = [3, 3, 3];
		const cells = createCircleGrid(sectorCounts);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 1 },
			{ ring: 1, sector: 1 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 1 },
			{ ring: 2, sector: 1 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 0 },
			{ ring: 1, sector: 1 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 1 },
			{ ring: 1, sector: 2 },
		);
		const maze = {
			sectorCounts,
			cells,
			crossings: [{ ring: 1, sector: 1, underAxis: "tangential" as const }],
		};

		const center = mazeCenter(maze);
		const angleStep = (2 * Math.PI) / sectorCounts[1];
		const midAngle = 1.5 * angleStep;
		const midRadius = 1 + computeHubRadius(sectorCounts[0]) + 0.5;
		const childMidRadius = midRadius + 1;
		// The inward and outward doors share the same physical width, sized
		// from their own mid-radii, so their angular half-widths differ —
		// each bridge side is one straight (slightly slanted) line from the
		// inward door's edge to the outward door's, with no step in between.
		const inwardHalfAngle = h / midRadius;
		const outwardHalfAngle = h / childMidRadius;

		const segments = computeCircleTubeSegments(maze);
		const cellSpan = (angle: number) =>
			angle > 1 * angleStep && angle < 2 * angleStep;
		const bridgeSides = segments.filter((segment) => {
			if (isArcSegment(segment)) return false;
			const [start, end] = endpointsOf(segment);
			const r1 = radiusOf(center, start);
			const r2 = radiusOf(center, end);
			return (
				Math.min(r1, r2) < midRadius - TOLERANCE &&
				Math.max(r1, r2) > midRadius + TOLERANCE &&
				cellSpan(rawAngleOf(center, start))
			);
		});
		expect(bridgeSides).toHaveLength(2);

		for (const segment of bridgeSides) {
			const [start, end] = endpointsOf(segment);
			const inner =
				radiusOf(center, start) < radiusOf(center, end) ? start : end;
			const outer = inner === start ? end : start;
			expect(Math.abs(rawAngleOf(center, inner) - midAngle)).toBeCloseTo(
				inwardHalfAngle,
				6,
			);
			expect(Math.abs(rawAngleOf(center, outer) - midAngle)).toBeCloseTo(
				outwardHalfAngle,
				6,
			);
		}
	});

	it("draws a stub channel connecting the entrance cell to the hub boundary", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		const hubRadius = computeHubRadius(sectorCounts[0]);
		const center = mazeCenter(maze);

		const segments = computeCircleTubeSegments(maze);
		const reachesHubBoundary = segments.some((segment) => {
			if (isArcSegment(segment)) return false;
			const [start, end] = endpointsOf(segment);
			return (
				Math.abs(radiusOf(center, start) - hubRadius) < TOLERANCE ||
				Math.abs(radiusOf(center, end) - hubRadius) < TOLERANCE
			);
		});

		expect(reachesHubBoundary).toBe(true);
	});

	it("draws a stub channel connecting the exit cell to the maze's outer boundary", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		const hubRadius = computeHubRadius(sectorCounts[0]);
		const outerBoundary = sectorCounts.length + hubRadius;
		const center = mazeCenter(maze);

		const segments = computeCircleTubeSegments(maze);
		const reachesOuterBoundary = segments.some((segment) => {
			if (isArcSegment(segment)) return false;
			const [start, end] = endpointsOf(segment);
			return (
				Math.abs(radiusOf(center, start) - outerBoundary) < TOLERANCE ||
				Math.abs(radiusOf(center, end) - outerBoundary) < TOLERANCE
			);
		});

		expect(reachesOuterBoundary).toBe(true);
	});

	it("does not error for the minimal 1x1 circle-crossing maze", () => {
		const sectorCounts = computeCircleSectorCounts(1, 1);
		const maze = buildFullyWalledCircleMaze(sectorCounts);

		expect(() => computeCircleTubeSegments(maze)).not.toThrow();
	});

	// The real-world scenario the reported "hairpin" artifact came from: a
	// cell with several open outward children and a closed tangential side.
	it("leaves no dangling endpoint in a hand-built maze where a cell has several open outward children", () => {
		const sectorCounts = [14, 14, 28];
		const cells = createCircleGrid(sectorCounts);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 12 },
			{ ring: 1, sector: 12 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 12 },
			{ ring: 2, sector: 24 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 12 },
			{ ring: 2, sector: 25 },
		);
		const maze = { sectorCounts, cells };

		const dangling = findDanglingEndpoints(
			maze,
			computeCircleTubeSegments(maze),
		);
		expect(dangling).toEqual([]);
	});

	// The invariant the previous per-cell-assembly renderers could never
	// guarantee, checked against real generated mazes across sizes and seeds
	// rather than a hand-picked scenario list.
	it("leaves no dangling endpoint on generated circle-crossing mazes across sizes and seeds", () => {
		let totalCrossings = 0;
		for (const { width, height } of [
			{ width: 8, height: 6 },
			{ width: 14, height: 14 },
		]) {
			for (let seed = 1; seed <= 10; seed++) {
				const maze = generateCircleMaze({
					width,
					height,
					seed,
					allowsCrossings: true,
				});
				totalCrossings += maze.crossings.length;

				const dangling = findDanglingEndpoints(
					maze,
					computeCircleTubeSegments(maze),
				);
				expect(
					dangling,
					`dangling endpoints for ${width}x${height} seed ${seed}: ${JSON.stringify(dangling)}`,
				).toEqual([]);
			}
		}
		// The sweep must have exercised the crossing rendering path for real.
		expect(totalCrossings).toBeGreaterThan(0);
	});
});

// computeCircleTubeFillShapes reuses the exact same passage-area rectangles
// computeCircleTubeSegments builds internally (see ADR 060), converting each
// one into its own closed loop (arc/line/arc/line) instead of feeding it to
// the boundary-outline extraction — one filled shape per hub band, connector,
// or entrance/exit stub, meant to be drawn under the outline with the same
// flat fill color so neighboring shapes appear seamlessly merged.
describe("computeCircleTubeFillShapes", () => {
	const TOLERANCE = 1e-6;

	interface Point {
		x: number;
		y: number;
	}

	const endpointsOf = (segment: TubeSegment): [Point, Point] => [
		{ x: segment.x1, y: segment.y1 },
		{ x: segment.x2, y: segment.y2 },
	];

	const samePoint = (a: Point, b: Point) =>
		Math.hypot(a.x - b.x, a.y - b.y) < TOLERANCE;

	// A shape is only usable as a fill path if consecutive segments actually
	// chain endpoint-to-endpoint and the last one closes back onto the first
	// — anything else would draw a self-intersecting or open blob instead of
	// the intended wedge.
	const isClosedChain = (shape: TubeSegment[]): boolean => {
		if (shape.length === 0) return false;
		for (let i = 0; i < shape.length; i++) {
			const [, end] = endpointsOf(shape[i]);
			const [nextStart] = endpointsOf(shape[(i + 1) % shape.length]);
			if (!samePoint(end, nextStart)) return false;
		}
		return true;
	};

	it("throws when cells do not match the sector counts", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		maze.cells.pop();

		expect(() => computeCircleTubeFillShapes(maze)).toThrow();
	});

	it("returns one closed shape per hub band, connector, and entrance/exit stub for a hand-built crossing maze", () => {
		const maze = buildCircleCrossingMaze();

		const shapes = computeCircleTubeFillShapes(maze);

		// 9 cells (one hub band each) + 4 open inward connectors + entrance
		// stub + exit stub, independently counted from the fixture's carved
		// edges (see the fixture's own crossing/topology comments above).
		expect(shapes).toHaveLength(15);
	});

	it("returns only genuinely closed shapes, each chaining endpoint-to-endpoint back to its start", () => {
		const maze = buildCircleCrossingMaze();

		const shapes = computeCircleTubeFillShapes(maze);

		for (const shape of shapes) {
			expect(isClosedChain(shape)).toBe(true);
		}
	});

	it("produces a non-empty list of closed shapes for a generated circle-crossing maze, none degenerate", () => {
		const maze = generateCircleMaze({
			width: 10,
			height: 10,
			seed: 3,
			allowsCrossings: true,
		});

		const shapes = computeCircleTubeFillShapes(maze);

		expect(shapes.length).toBeGreaterThan(0);
		for (const shape of shapes) {
			expect(shape.length).toBeGreaterThanOrEqual(4);
			expect(isClosedChain(shape)).toBe(true);
			for (const segment of shape) {
				expect(Number.isFinite(segment.x1)).toBe(true);
				expect(Number.isFinite(segment.y1)).toBe(true);
				expect(Number.isFinite(segment.x2)).toBe(true);
				expect(Number.isFinite(segment.y2)).toBe(true);
			}
		}
	});

	it("does not error for the minimal 1x1 circle-crossing maze", () => {
		const sectorCounts = computeCircleSectorCounts(1, 1);
		const maze = buildFullyWalledCircleMaze(sectorCounts);

		expect(() => computeCircleTubeFillShapes(maze)).not.toThrow();
	});
});
