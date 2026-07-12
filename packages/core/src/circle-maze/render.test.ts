import { describe, expect, it } from "vitest";
import { isArcSegment } from "../rendering/maze-layout.js";
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

describe("computeCircleTubeSegments", () => {
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

	it("draws a crossing node's over axis (tangential) as arcs spanning the full cell width, uninterrupted", () => {
		const maze = buildCircleCrossingMaze();
		const hubRadius = computeHubRadius(maze.sectorCounts[0]);
		const angleStep = (2 * Math.PI) / maze.sectorCounts[1]; // ring 1
		const midRadius = 1 + hubRadius + 0.5;

		const segments = computeCircleTubeSegments(maze);
		const arcsAt = (radius: number) =>
			segments
				.filter(isArcSegment)
				.filter((segment) => Math.abs(segment.radius - radius) < 1e-9);

		for (const radius of [midRadius - 0.35, midRadius + 0.35]) {
			const arcs = arcsAt(radius);
			const totalAngle = arcs.reduce((sum, segment) => {
				const chordLength = Math.hypot(
					segment.x2 - segment.x1,
					segment.y2 - segment.y1,
				);
				return sum + 2 * Math.asin(chordLength / (2 * segment.radius));
			}, 0);
			// The crossing's own cell (sector 1) contributes a full angleStep of
			// uninterrupted arc at this radius — a strict lower bound since other
			// cells sharing this radius may also contribute pieces.
			expect(totalAngle).toBeGreaterThanOrEqual(angleStep - 1e-6);
		}
	});

	it("leaves a real gap in a crossing node's under axis (radial), never a segment spanning across the hub", () => {
		const maze = buildCircleCrossingMaze();
		const hubRadius = computeHubRadius(maze.sectorCounts[0]);
		const diameter = computeCircleMazeDiameter(maze);
		const center = diameter / 2;
		const innerHubR = 1 + hubRadius + 0.5 - 0.35;
		const outerHubR = 1 + hubRadius + 0.5 + 0.35;

		const segments = computeCircleTubeSegments(maze);
		// No line segment should span (even partially) the open radius range
		// strictly between the two hub edges — that gap is exactly where the
		// tangential (over-axis) tube passes uninterrupted.
		const crossesTheGap = segments.some((segment) => {
			if (isArcSegment(segment)) return false;
			const r1 = Math.hypot(segment.x1 - center, segment.y1 - center);
			const r2 = Math.hypot(segment.x2 - center, segment.y2 - center);
			const rMin = Math.min(r1, r2);
			const rMax = Math.max(r1, r2);
			return (
				rMin < innerHubR - 0.01 && rMax > innerHubR + 0.01 && rMax < outerHubR
			);
		});

		expect(crossesTheGap).toBe(false);
	});

	it("opens an inward arm reaching the absolute hub boundary only at the entrance sector", () => {
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

	it("does not error for the minimal 1x1 circle-crossing maze", () => {
		const sectorCounts = computeCircleSectorCounts(1, 1);
		const maze = buildFullyWalledCircleMaze(sectorCounts);

		expect(() => computeCircleTubeSegments(maze)).not.toThrow();
	});
});
