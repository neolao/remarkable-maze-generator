import { describe, expect, it } from "vitest";
import {
	TUBE_CORNER_RADIUS_RATIO,
	TUBE_HALF_WIDTH_RATIO,
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

// computeCircleTubeSegments models each cell as a small polar "hub" (an
// inset window in local radius/angle space) plus an "arm" reaching to the
// cell boundary for each open side, a flat cap otherwise — the same shape
// the rectangular tube renderer uses, generalized to a topology where
// neighboring cells aren't all the same size (see ADR 056 follow-up). The
// hub's angular half-width is derived from the physical radius rather than
// the ring's own angular step, so a door's physical (Cartesian) size stays
// consistent regardless of how far out it sits or how many sectors its own
// ring happens to have.
describe("computeCircleTubeSegments", () => {
	const h = TUBE_HALF_WIDTH_RATIO;

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

	it("sizes an open side's hub arcs at exactly midRadius ± half-width, regardless of the ring's own sector count", () => {
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

	// Regression test for the original bug (see ADR 055 follow-up): sizing a
	// door's angular half-width from the ring's own angular step let a door's
	// *physical* width balloon within a same-sector-count band, since the
	// angular step stays flat while the radius (and so the arc length it
	// carves out) keeps growing ring by ring. Deriving the half-width from
	// the physical radius instead keeps the door's physical width within a
	// tight, bounded range no matter how deep in the maze it sits.
	it("keeps an outward door's physical width within a tight bounded range across many rings of the same sector count", () => {
		const measureDoorWidth = (parentRing: number): number => {
			const sectorCounts = Array(parentRing + 2).fill(6);
			const cells = createCircleGrid(sectorCounts);
			carveEdge(
				cells,
				sectorCounts,
				{ ring: parentRing, sector: 0 },
				{ ring: parentRing + 1, sector: 0 },
			);
			const maze = { sectorCounts, cells };

			const childCenter = computeCircleCellCenter(maze, {
				ring: parentRing + 1,
				sector: 0,
			});
			const boundaryRadius = parentRing + 1 + computeHubRadius(6);

			const segments = computeCircleTubeSegments(maze);
			const matchingPoints = segments
				.filter((segment) => !isArcSegment(segment))
				.flatMap((segment) => [
					{ x: segment.x1, y: segment.y1 },
					{ x: segment.x2, y: segment.y2 },
				])
				.filter(
					(point) =>
						Math.hypot(point.x - childCenter.x, point.y - childCenter.y) < 1.0,
				)
				.filter((point) => {
					const diameter = computeCircleMazeDiameter(maze);
					const center = diameter / 2;
					const radius = Math.hypot(point.x - center, point.y - center);
					return Math.abs(radius - boundaryRadius) < 1e-6;
				});
			// The parent's own outward arm and the child's own inward arm each
			// contribute a line ending at the exact same two boundary points —
			// deduplicate down to those 2 distinct points before measuring width.
			const boundaryPoints = matchingPoints.filter(
				(point, index) =>
					matchingPoints.findIndex(
						(other) =>
							Math.abs(other.x - point.x) < 1e-9 &&
							Math.abs(other.y - point.y) < 1e-9,
					) === index,
			);

			expect(boundaryPoints).toHaveLength(2);
			const [a, b] = boundaryPoints;
			return Math.hypot(a.x - b.x, a.y - b.y);
		};

		const widths = [0, 2, 4, 6, 8].map(measureDoorWidth);

		// The width asymptotically approaches 2h as the ring grows (the
		// boundary radius gets proportionally closer to the hub's own
		// mid-radius), but even at ring 0 — where that approximation is
		// loosest — it stays well within a bounded fraction of 2h, unlike the
		// old angleStep-based sizing (which could drift up to ~4.5x within a
		// same-sector-count band).
		for (const width of widths) {
			expect(width).toBeGreaterThan(1.5 * h);
			expect(width).toBeLessThan(2 * h);
		}
		expect(Math.max(...widths) / Math.min(...widths)).toBeLessThan(1.4);
	});

	// Cell (ring 1, sector 2) is open only clockwise (a dead-end analog): its
	// inner-start and outer-start corners sit between two sides in the same
	// (closed) state — inward/ccw and outward/ccw respectively — so those are
	// the "real" corners that get rounded; inner-end and outer-end sit
	// between an open side (cw) and a closed one (inward/outward), so they
	// stay sharp and collinear. Corners now sit at this cell's own true
	// angular boundaries (half an `angleStep` away from its own center, not a
	// narrow inset) — closer to a same-ring neighbor's own nearest corner
	// than to this cell's *other* corners, so scoping by distance from this
	// cell's center alone can't cleanly exclude that neighbor; scoping by
	// this cell's own angular slice (plus a small margin) does.
	it("rounds only the hub corners whose two adjacent sides share the same open/closed state", () => {
		const sectorCounts = [4, 4];
		const cells = createCircleGrid(sectorCounts);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 2 },
			{ ring: 1, sector: 3 },
		);
		const maze = { sectorCounts, cells };

		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;
		const cellCenter = computeCircleCellCenter(maze, { ring: 1, sector: 2 });
		const cellAngle = Math.atan2(cellCenter.y - center, cellCenter.x - center);
		const angleStep = (2 * Math.PI) / sectorCounts[1];
		const hubRadius = computeHubRadius(sectorCounts[0]);

		const inThisCell = (point: { x: number; y: number }): boolean => {
			const radius = Math.hypot(point.x - center, point.y - center);
			const angle = Math.atan2(point.y - center, point.x - center);
			let angleDiff = Math.abs(angle - cellAngle);
			if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
			return (
				angleDiff < angleStep / 2 + 0.02 &&
				radius > 1 + hubRadius - 0.1 &&
				radius < 2 + hubRadius + 0.1
			);
		};

		const segments = computeCircleTubeSegments(maze).filter(
			(segment) =>
				inThisCell({ x: segment.x1, y: segment.y1 }) &&
				inThisCell({ x: segment.x2, y: segment.y2 }),
		);

		const arcs = segments.filter(isArcSegment);
		const roundingArcs = arcs.filter(
			(arc) => Math.abs(arc.radius - TUBE_CORNER_RADIUS_RATIO) < 1e-9,
		);
		expect(roundingArcs).toHaveLength(2);
	});

	// Regression test for a real gap bug: an interior ring's outward side
	// used to draw *only* the door lines for each open child, with no cap
	// arc at all connecting them back to this cell's own hub corners or to
	// its closed siblings — since a child's own door is frequently narrower
	// than, and not necessarily centered inside, this cell's own narrow hub
	// window (see ADR 055 follow-up), the result was a tube that visibly
	// stopped short of closing near almost every ring transition. Growth
	// ratio 3 here (ring 0 has 3 sectors, ring 1 has 9) makes sector 0's
	// open child (the middle of its 3 children) still leave real margin on
	// both sides of its own door within its own slot.
	it("caps every closed child slot and both margins around an open child's own door, leaving no angular gap at the outward boundary", () => {
		const sectorCounts = [3, 9];
		const cells = createCircleGrid(sectorCounts);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 0, sector: 0 },
			{ ring: 1, sector: 1 },
		);
		const maze = { sectorCounts, cells };

		const hubRadius = computeHubRadius(3);
		const outerHubR = hubRadius + 0.5 + h;
		const childMidRadius = 1 + hubRadius + 0.5;
		const doorWidth = 2 * (h / childMidRadius);

		const segments = computeCircleTubeSegments(maze);
		const totalArcAngle = segments
			.filter(isArcSegment)
			.filter((segment) => Math.abs(segment.radius - outerHubR) < 1e-9)
			.reduce((sum, segment) => {
				const chordLength = Math.hypot(
					segment.x2 - segment.x1,
					segment.y2 - segment.y1,
				);
				return sum + 2 * Math.asin(chordLength / (2 * segment.radius));
			}, 0);

		// The whole ring-0 boundary at this radius (a full turn, 3 sectors) is
		// covered except for the one door's own width, plus a small, bounded
		// sliver at each rounded corner (real hub corners are always exactly
		// at this cell's own true angular boundaries now, so several of them
		// legitimately round here — see ADR 057 follow-up) — anything below
		// that bounded slack means an uncapped gap somewhere.
		const roundingSlackUpperBound = 0.5;
		expect(totalArcAngle).toBeLessThanOrEqual(2 * Math.PI - doorWidth);
		expect(totalArcAngle).toBeGreaterThan(
			2 * Math.PI - doorWidth - roundingSlackUpperBound,
		);
	});

	it("keeps a crossing node's over axis (tangential here) spanning its exact un-gapped angular range, as a single uninterrupted arc", () => {
		const maze = buildCircleCrossingMaze();
		const angleStep = (2 * Math.PI) / maze.sectorCounts[1];
		const hubRadius = computeHubRadius(maze.sectorCounts[0]);
		const midRadius = 1 + hubRadius + 0.5;

		const segments = computeCircleTubeSegments(maze);
		for (const radius of [midRadius - h, midRadius + h]) {
			// The crossing's own tangential channel is drawn as one single arc
			// spanning its entire own sector, ignoring the hub entirely — unlike
			// its cw/ccw neighbors, which only reach partway in from the cell
			// boundary. Its neighbors' own hub arcs and caps also happen to sit
			// at this same radius, so this looks for the one whole-sector-wide
			// piece specifically rather than summing every arc at this radius.
			const arcsAtRadius = segments
				.filter(isArcSegment)
				.filter((segment) => Math.abs(segment.radius - radius) < 1e-9);
			const fullSpanArc = arcsAtRadius.find((segment) => {
				const chordLength = Math.hypot(
					segment.x2 - segment.x1,
					segment.y2 - segment.y1,
				);
				const angle = 2 * Math.asin(chordLength / (2 * segment.radius));
				return Math.abs(angle - angleStep) < 1e-6;
			});
			expect(fullSpanArc).toBeDefined();
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
			.flatMap((segment) => [
				Math.hypot(
					segment.x1 - crossingCenter.x,
					segment.y1 - crossingCenter.y,
				),
				Math.hypot(
					segment.x2 - crossingCenter.x,
					segment.y2 - crossingCenter.y,
				),
			]);

		// Every line segment stops meaningfully short of the crossing's own
		// center — the real physical gap where the tangential (over-axis) tube
		// passes uninterrupted instead.
		expect(Math.min(...distancesToCenter)).toBeGreaterThan(0.2);
	});

	it("draws a stub channel connecting the entrance cell to the hub boundary", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		const hubRadius = computeHubRadius(sectorCounts[0]);
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;

		const segments = computeCircleTubeSegments(maze);
		const reachesHubBoundary = segments.some((segment) => {
			if (isArcSegment(segment)) return false;
			const r1 = Math.hypot(segment.x1 - center, segment.y1 - center);
			const r2 = Math.hypot(segment.x2 - center, segment.y2 - center);
			return Math.abs(r1 - hubRadius) < 1e-6 || Math.abs(r2 - hubRadius) < 1e-6;
		});

		expect(reachesHubBoundary).toBe(true);
	});

	it("draws a stub channel connecting the exit cell to the maze's outer boundary", () => {
		const sectorCounts = computeCircleSectorCounts(4, 3);
		const maze = buildFullyWalledCircleMaze(sectorCounts);
		const hubRadius = computeHubRadius(sectorCounts[0]);
		const lastRing = sectorCounts.length - 1;
		const outerBoundary = lastRing + 1 + hubRadius;
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;

		const segments = computeCircleTubeSegments(maze);
		const reachesOuterBoundary = segments.some((segment) => {
			if (isArcSegment(segment)) return false;
			const r1 = Math.hypot(segment.x1 - center, segment.y1 - center);
			const r2 = Math.hypot(segment.x2 - center, segment.y2 - center);
			return (
				Math.abs(r1 - outerBoundary) < 1e-6 ||
				Math.abs(r2 - outerBoundary) < 1e-6
			);
		});

		expect(reachesOuterBoundary).toBe(true);
	});

	it("does not error for the minimal 1x1 circle-crossing maze", () => {
		const sectorCounts = computeCircleSectorCounts(1, 1);
		const maze = buildFullyWalledCircleMaze(sectorCounts);

		expect(() => computeCircleTubeSegments(maze)).not.toThrow();
	});

	// Regression test for a whole class of disconnection bugs (see ADR 057
	// follow-up): every side used to anchor to a *separately inset* hub
	// corner (`startHubA`/`endHubA`, narrower than this cell's own true
	// width) instead of this cell's own true angular boundaries — an open
	// child's own door (growth ratio 3 here) routinely landed outside that
	// narrower window, or a growing-tree branch left several of a cell's
	// outward children open at once, letting the inset corner fall *inside*
	// an open child's own door with nothing there to anchor to. Anchoring
	// every side directly to this cell's own true `startAngle`/`endAngle`
	// instead removes the mismatch structurally: `outwardChildren` always
	// exactly partitions that same true width (see ADR 040), so the
	// outward side's own coverage — and, when closed, `cwSegment`'s and
	// `ccwSegment`'s own line — always meet at that exact point by
	// construction, not by coincidence.
	it("anchors cw/ccw and inward/outward to the exact same true-boundary vertex, regardless of how a growing-tree branch opens this cell's children", () => {
		const sectorCounts = [14, 14, 28];
		const cells = createCircleGrid(sectorCounts);
		// The real reported case: (ring 1, sector 12) has both of its outward
		// children open, and its own ccw side (sector 11) closed — under the
		// old inset-hub model, this cell's own inset corner landed inside
		// child 24's own door, leaving the ccw wall with nothing to anchor to.
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

		const ring = 1;
		const sector = 12;
		const angleStep = (2 * Math.PI) / sectorCounts[ring];
		const startAngle = sector * angleStep;
		const hubRadius = computeHubRadius(sectorCounts[0]);
		const h = TUBE_HALF_WIDTH_RATIO;
		const outerHubR = ring + hubRadius + 0.5 + h;
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;
		const outerStartCorner = {
			x: center + outerHubR * Math.sin(startAngle),
			y: center - outerHubR * Math.cos(startAngle),
		};

		const segments = computeCircleTubeSegments(maze);
		const touchingCount = segments.reduce((count, segment) => {
			const touchesStart =
				Math.hypot(
					segment.x1 - outerStartCorner.x,
					segment.y1 - outerStartCorner.y,
				) < 1e-6;
			const touchesEnd =
				Math.hypot(
					segment.x2 - outerStartCorner.x,
					segment.y2 - outerStartCorner.y,
				) < 1e-6;
			return count + (touchesStart ? 1 : 0) + (touchesEnd ? 1 : 0);
		}, 0);

		// The ccw closed side's own line, plus the outward side's own margin
		// arc bordering child 24's door on that side, both end exactly here.
		expect(touchingCount).toBeGreaterThanOrEqual(2);
	});

	// The same real-world scenario as above, checked from the opposite
	// direction: every endpoint anywhere in this small hand-built maze
	// should be shared with at least one other segment's endpoint — a
	// dangling, unshared endpoint (other than a true dead end's own rounded
	// cap, which still shares its *other* end with the rest of the cell) is
	// exactly what the reported "hairpin" artifact looked like.
	it("leaves no segment endpoint floating in open space for a cell with several open outward children", () => {
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

		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;
		const hubRadius = computeHubRadius(sectorCounts[0]);
		const outerBoundary = sectorCounts.length + hubRadius;
		// The maze's own two true openings — the entrance stub's inner tip and
		// the exit stub's outer tip — are the only points ever meant to stay
		// unmatched; every other endpoint should share its position with at
		// least one other segment's endpoint.
		const isMazesOwnOpenEnd = (point: { x: number; y: number }): boolean => {
			const radius = Math.hypot(point.x - center, point.y - center);
			return (
				Math.abs(radius - hubRadius) < 1e-6 ||
				Math.abs(radius - outerBoundary) < 1e-6
			);
		};

		const segments = computeCircleTubeSegments(maze);
		const points = segments
			.flatMap((segment) => [
				{ x: segment.x1, y: segment.y1 },
				{ x: segment.x2, y: segment.y2 },
			])
			.filter((point) => !isMazesOwnOpenEnd(point));

		const dangling = points.filter(
			(point) =>
				!points.some(
					(other) =>
						other !== point &&
						Math.hypot(other.x - point.x, other.y - point.y) < 1e-6,
				),
		);

		expect(dangling).toHaveLength(0);
	});
});
