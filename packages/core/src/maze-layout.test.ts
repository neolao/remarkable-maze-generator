import { describe, expect, it } from "vitest";
import type { Maze } from "./maze-domain.js";
import {
	TUBE_CORNER_RADIUS_RATIO,
	TUBE_HALF_WIDTH_RATIO,
	computeCellCenter,
	computeTubeSegments,
	computeWallSegments,
	isArcSegment,
} from "./maze-layout.js";
import { generateMaze } from "./maze.js";

function buildFullyWalledMaze(width: number, height: number): Maze {
	return {
		width,
		height,
		cells: Array.from({ length: height }, () =>
			Array.from({ length: width }, () => ({
				walls: { north: true, south: true, east: true, west: true },
			})),
		),
	};
}

describe("computeWallSegments", () => {
	it("returns one segment per walled side, skipping the entrance and exit openings", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 42 });

		const segments = computeWallSegments(maze);

		let expectedCount = 0;
		for (let y = 0; y < maze.height; y++) {
			for (let x = 0; x < maze.width; x++) {
				const cell = maze.cells[y][x];
				const isEntrance = x === 0 && y === 0;
				const isExit = x === maze.width - 1 && y === maze.height - 1;
				if (cell.walls.north && !isEntrance) expectedCount++;
				if (cell.walls.west) expectedCount++;
				if (x === maze.width - 1 && cell.walls.east) expectedCount++;
				if (y === maze.height - 1 && cell.walls.south && !isExit)
					expectedCount++;
			}
		}

		expect(segments).toHaveLength(expectedCount);
	});

	it("handles the minimal 1x1 maze", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });

		const segments = computeWallSegments(maze);

		expect(Array.isArray(segments)).toBe(true);
	});

	it("never draws the entrance's north wall even if the cell has it walled", () => {
		const maze = generateMaze({ width: 3, height: 3, seed: 1 });
		maze.cells[0][0].walls.north = true;

		const segments = computeWallSegments(maze);

		const hasEntranceNorthWall = segments.some(
			(segment) =>
				segment.x1 === 0 &&
				segment.y1 === 0 &&
				segment.x2 === 1 &&
				segment.y2 === 0,
		);
		expect(hasEntranceNorthWall).toBe(false);
	});

	it("never draws the exit's south wall even if the cell has it walled", () => {
		const maze = generateMaze({ width: 3, height: 3, seed: 1 });
		const lastY = maze.height - 1;
		const lastX = maze.width - 1;
		maze.cells[lastY][lastX].walls.south = true;

		const segments = computeWallSegments(maze);

		const hasExitSouthWall = segments.some(
			(segment) =>
				segment.x1 === lastX &&
				segment.y1 === lastY + 1 &&
				segment.x2 === lastX + 1 &&
				segment.y2 === lastY + 1,
		);
		expect(hasExitSouthWall).toBe(false);
	});

	it("throws a clear error for a maze with invalid dimensions", () => {
		const invalidMaze = generateMaze({ width: 3, height: 3, seed: 1 });
		invalidMaze.width = 0;

		expect(() => computeWallSegments(invalidMaze)).toThrow();
	});

	it("throws when cells do not match the declared width and height", () => {
		const invalidMaze = generateMaze({ width: 3, height: 3, seed: 1 });
		invalidMaze.cells.pop();

		expect(() => computeWallSegments(invalidMaze)).toThrow();
	});
});

describe("computeTubeSegments", () => {
	const h = TUBE_HALF_WIDTH_RATIO;

	it("throws a clear error for a maze with invalid dimensions", () => {
		const invalidMaze = generateMaze({ width: 3, height: 3, seed: 1 });
		invalidMaze.width = 0;

		expect(() => computeTubeSegments(invalidMaze)).toThrow();
	});

	it("draws both edge lines the full length of a straight interior passage, with no gap", () => {
		// A 3-cell-tall vertical corridor down the middle column of a 3x5 maze:
		// (1,1)-(1,2)-(1,3), all interior rows (not touching entrance/exit).
		const maze = buildFullyWalledMaze(3, 5);
		maze.cells[1][1].walls.south = false;
		maze.cells[2][1].walls.north = false;
		maze.cells[2][1].walls.south = false;
		maze.cells[3][1].walls.north = false;

		const segments = computeTubeSegments(maze);
		const leftEdgeX = 1.5 - h;
		const rightEdgeX = 1.5 + h;
		// Column 1's west side stays closed throughout the maze, so every row
		// contributes a small west-cap piece at x=leftEdgeX — restrict to the
		// rows actually forming this corridor (1 to 3) to isolate it.
		const inCorridorRows = (s: { y1: number; y2: number }) =>
			Math.min(s.y1, s.y2) >= 1 - h && Math.max(s.y1, s.y2) <= 4 + h;

		const leftEdgeSegments = segments.filter(
			(s) => s.x1 === leftEdgeX && s.x2 === leftEdgeX && inCorridorRows(s),
		);
		const rightEdgeSegments = segments.filter(
			(s) => s.x1 === rightEdgeX && s.x2 === rightEdgeX && inCorridorRows(s),
		);

		// Each edge is unbroken across the whole passage (possibly split across
		// cell boundaries into colinear pieces, but with no gap in between) —
		// spanning from row 1's north cap corner to row 3's south cap corner.
		// Row 1 and row 3 are themselves dead ends here (only the middle row 2
		// is a true straight-through), so those two corners are now rounded
		// (see ADR 031) — the straight pieces stop `TUBE_CORNER_RADIUS_RATIO`
		// short of the original sharp corner on each end, an arc picking up
		// from there instead.
		for (const edgeSegments of [leftEdgeSegments, rightEdgeSegments]) {
			const sortedPieces = [...edgeSegments].sort(
				(a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2),
			);
			expect(Math.min(...sortedPieces.map((s) => Math.min(s.y1, s.y2)))).toBe(
				1.5 - h + TUBE_CORNER_RADIUS_RATIO,
			);
			expect(Math.max(...sortedPieces.map((s) => Math.max(s.y1, s.y2)))).toBe(
				3.5 + h - TUBE_CORNER_RADIUS_RATIO,
			);
			for (let i = 0; i < sortedPieces.length - 1; i++) {
				const end = Math.max(sortedPieces[i].y1, sortedPieces[i].y2);
				const nextStart = Math.min(
					sortedPieces[i + 1].y1,
					sortedPieces[i + 1].y2,
				);
				expect(nextStart).toBe(end);
			}
		}
	});

	it("closes a dead-end cell with a rounded cap and one open arm, no gaps", () => {
		// Cell (1,1) open only to the south, in an otherwise fully walled maze.
		// The cap's two corners (NW, NE — both closed/closed) are now rounded
		// (see ADR 031); the other two (SE, SW — south open, east/west closed)
		// stay sharp and collinear, unaffected.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[1][1].walls.south = false;
		maze.cells[2][1].walls.north = false;

		const segments = computeTubeSegments(maze);
		const cx = 1.5;
		const cy = 1.5;
		const NW = { x: cx - h, y: cy - h };
		const NE = { x: cx + h, y: cy - h };
		const SW = { x: cx - h, y: cy + h };
		const SE = { x: cx + h, y: cy + h };

		const hasSegment = (
			a: { x: number; y: number },
			b: { x: number; y: number },
		) =>
			segments.some(
				(s) =>
					(s.x1 === a.x && s.y1 === a.y && s.x2 === b.x && s.y2 === b.y) ||
					(s.x1 === b.x && s.y1 === b.y && s.x2 === a.x && s.y2 === a.y),
			);
		const reachesPoint = (p: { x: number; y: number }) =>
			segments.some(
				(s) => (s.x1 === p.x && s.y1 === p.y) || (s.x2 === p.x && s.y2 === p.y),
			);

		// The two closed corners (NW, NE) no longer reach their sharp point —
		// they were replaced by a rounding arc (see ADR 031).
		expect(reachesPoint(NW)).toBe(false);
		expect(reachesPoint(NE)).toBe(false);
		const closeTo = (a: number, b: number) => Math.abs(a - b) < 1e-9;
		const arcNearNW = segments
			.filter(isArcSegment)
			.find(
				(arc) =>
					closeTo(
						Math.hypot(arc.x1 - NW.x, arc.y1 - NW.y),
						TUBE_CORNER_RADIUS_RATIO,
					) &&
					closeTo(
						Math.hypot(arc.x2 - NW.x, arc.y2 - NW.y),
						TUBE_CORNER_RADIUS_RATIO,
					),
			);
		const arcNearNE = segments
			.filter(isArcSegment)
			.find(
				(arc) =>
					closeTo(
						Math.hypot(arc.x1 - NE.x, arc.y1 - NE.y),
						TUBE_CORNER_RADIUS_RATIO,
					) &&
					closeTo(
						Math.hypot(arc.x2 - NE.x, arc.y2 - NE.y),
						TUBE_CORNER_RADIUS_RATIO,
					),
			);
		expect(arcNearNW).toBeDefined();
		expect(arcNearNE).toBeDefined();
		// The two open-side corners (SE, SW) still reach their sharp point,
		// unaffected — south is open, east/west are closed, so they differ.
		expect(reachesPoint(SE)).toBe(true);
		expect(reachesPoint(SW)).toBe(true);
		// South arm (open side): 2 edges reaching the cell boundary.
		expect(hasSegment(SW, { x: cx - h, y: 2 })).toBe(true);
		expect(hasSegment(SE, { x: cx + h, y: 2 })).toBe(true);
	});

	it("connects a turn cleanly, with no gap at the two untouched (collinear) corners", () => {
		// Cell (1,1) open to north and east (a turn), closed south/west. The
		// outside (NE) and inside (SW) corners are now rounded (see the
		// dedicated rounding test below) — this test covers the other two
		// hub corners (NW, SE), which stay sharp and collinear, unaffected.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[0][1].walls.south = false;
		maze.cells[1][1].walls.north = false;
		maze.cells[1][1].walls.east = false;
		maze.cells[1][2].walls.west = false;

		const segments = computeTubeSegments(maze);
		const cx = 1.5;
		const cy = 1.5;
		const NW = { x: cx - h, y: cy - h };
		const SE = { x: cx + h, y: cy + h };

		const hasSegment = (
			a: { x: number; y: number },
			b: { x: number; y: number },
		) =>
			segments.some(
				(s) =>
					(s.x1 === a.x && s.y1 === a.y && s.x2 === b.x && s.y2 === b.y) ||
					(s.x1 === b.x && s.y1 === b.y && s.x2 === a.x && s.y2 === a.y),
			);

		expect(hasSegment({ x: cx - h, y: 1 }, NW)).toBe(true);
		expect(hasSegment(SE, { x: 2, y: cy + h })).toBe(true);
	});

	it("treats the entrance's north side and the exit's south side as open, regardless of wall data", () => {
		const maze = buildFullyWalledMaze(2, 2);
		// Every wall closed, including entrance's north and exit's south —
		// the renderer must still show an opening there.
		maze.cells[0][0].walls.east = false;
		maze.cells[0][1].walls.west = false;
		maze.cells[0][1].walls.south = false;
		maze.cells[1][1].walls.north = false;

		const segments = computeTubeSegments(maze);

		const entranceHasOpening = segments.some(
			(s) => (s.y1 === 0 || s.y2 === 0) && (s.x1 !== s.x2 || s.x1 !== 0),
		);
		const exitOpensDownward = segments.some((s) => s.y1 === 2 || s.y2 === 2);
		expect(entranceHasOpening).toBe(true);
		expect(exitOpensDownward).toBe(true);
	});

	it("draws the over axis as 2 uninterrupted full-width lines at a crossing, and gaps the under axis", () => {
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[1][1].walls = {
			north: false,
			south: false,
			east: false,
			west: false,
		};
		maze.crossings = [{ x: 1, y: 1, underAxis: "vertical" }];

		const segments = computeTubeSegments(maze);
		const cy = 1.5;

		// Over axis (horizontal): 2 full-width lines from x=1 to x=2.
		const overTop = segments.find(
			(s) =>
				s.y1 === cy - h &&
				s.y2 === cy - h &&
				Math.min(s.x1, s.x2) === 1 &&
				Math.max(s.x1, s.x2) === 2,
		);
		const overBottom = segments.find(
			(s) =>
				s.y1 === cy + h &&
				s.y2 === cy + h &&
				Math.min(s.x1, s.x2) === 1 &&
				Math.max(s.x1, s.x2) === 2,
		);
		expect(overTop).toBeDefined();
		expect(overBottom).toBeDefined();

		// Under axis (vertical): the arm edges exist at x=1.5±h, but none of
		// them spans the full cell height (y=1 to y=2) uninterrupted — each
		// only reaches from the cell boundary to the hub corner, leaving a
		// real gap at the crossing.
		const cx = 1.5;
		const underEdgeSegments = segments.filter(
			(s) =>
				(s.x1 === cx - h && s.x2 === cx - h) ||
				(s.x1 === cx + h && s.x2 === cx + h),
		);
		expect(underEdgeSegments.length).toBeGreaterThan(0);
		const spansFullCell = underEdgeSegments.some(
			(s) => Math.min(s.y1, s.y2) === 1 && Math.max(s.y1, s.y2) === 2,
		);
		expect(spansFullCell).toBe(false);
	});

	it("produces a valid, non-empty segment list for a generated rectangle-crossing maze", () => {
		const maze = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			type: "rectangle-crossing",
		});

		const segments = computeTubeSegments(maze);

		expect(segments.length).toBeGreaterThan(0);
	});

	it("rounds a turn's outer and inner corners with an arc, leaving the two collinear edges untouched", () => {
		// Cell (1,1) open to north and east (a turn), closed south/west — same
		// setup as the "connects a turn cleanly" test above.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[0][1].walls.south = false;
		maze.cells[1][1].walls.north = false;
		maze.cells[1][1].walls.east = false;
		maze.cells[1][2].walls.west = false;

		// Scoped to cell (1,1)'s own hub corners — the two neighboring cells
		// opened only enough to connect to it (and the maze's entrance at
		// (0,0)) each end up as their own incidental dead end, which also
		// gets rounded (see ADR 031) but is irrelevant to what this test
		// checks.
		const inTargetCell = (s: {
			x1: number;
			x2: number;
			y1: number;
			y2: number;
		}) =>
			s.x1 >= 0.95 &&
			s.x1 <= 2.05 &&
			s.x2 >= 0.95 &&
			s.x2 <= 2.05 &&
			s.y1 >= 0.95 &&
			s.y1 <= 2.05 &&
			s.y2 >= 0.95 &&
			s.y2 <= 2.05;
		const segments = computeTubeSegments(maze).filter(inTargetCell);
		const r = TUBE_CORNER_RADIUS_RATIO;
		const cx = 1.5;
		const cy = 1.5;
		const NE = { x: cx + h, y: cy - h };
		const SW = { x: cx - h, y: cy + h };
		const NW = { x: cx - h, y: cy - h };
		const SE = { x: cx + h, y: cy + h };

		const arcs = segments.filter(isArcSegment);
		expect(arcs).toHaveLength(2);

		const closeTo = (a: number, b: number) => Math.abs(a - b) < 1e-9;
		const arcNearNE = arcs.find(
			(arc) =>
				(closeTo(arc.x1, NE.x) || closeTo(arc.x2, NE.x)) &&
				closeTo(Math.hypot(arc.x1 - NE.x, arc.y1 - NE.y), r) &&
				closeTo(Math.hypot(arc.x2 - NE.x, arc.y2 - NE.y), r),
		);
		const arcNearSW = arcs.find(
			(arc) =>
				closeTo(Math.hypot(arc.x1 - SW.x, arc.y1 - SW.y), r) &&
				closeTo(Math.hypot(arc.x2 - SW.x, arc.y2 - SW.y), r),
		);
		expect(arcNearNE).toBeDefined();
		expect(arcNearSW).toBeDefined();
		expect(arcNearNE?.radius).toBe(r);
		expect(arcNearNE?.sweep).toBe(0);
		expect(arcNearSW?.radius).toBe(r);
		expect(arcNearSW?.sweep).toBe(0);

		// No segment (line or arc) reaches all the way to the rounded corners...
		const reachesPoint = (p: { x: number; y: number }) =>
			segments.some(
				(s) =>
					(closeTo(s.x1, p.x) && closeTo(s.y1, p.y)) ||
					(closeTo(s.x2, p.x) && closeTo(s.y2, p.y)),
			);
		expect(reachesPoint(NE)).toBe(false);
		expect(reachesPoint(SW)).toBe(false);
		// ...but the two untouched, collinear corners are still reached exactly.
		expect(reachesPoint(NW)).toBe(true);
		expect(reachesPoint(SE)).toBe(true);
	});

	it("keeps a straight passage as plain unrounded lines, with no arcs", () => {
		// Row 2 is the only genuinely straight-through cell here (open both
		// north and south) — rows 1 and 3 are themselves dead ends (each open
		// on only one side, purely to connect row 2 to something), and dead
		// ends now get their own corners rounded (see the dedicated dead-end
		// test and ADR 031), which is not what this test is about. Scope the
		// check to row 2's own hub corners only.
		const maze = buildFullyWalledMaze(3, 5);
		maze.cells[1][1].walls.south = false;
		maze.cells[2][1].walls.north = false;
		maze.cells[2][1].walls.south = false;
		maze.cells[3][1].walls.north = false;

		const inRow2 = (s: { x1: number; x2: number; y1: number; y2: number }) =>
			s.x1 >= 0.95 &&
			s.x1 <= 2.05 &&
			s.x2 >= 0.95 &&
			s.x2 <= 2.05 &&
			s.y1 >= 1.95 &&
			s.y1 <= 3.05 &&
			s.y2 >= 1.95 &&
			s.y2 <= 3.05;
		const segments = computeTubeSegments(maze).filter(inRow2);

		expect(segments.filter(isArcSegment)).toHaveLength(0);
	});

	it("keeps a bridge crossing cell itself unrounded, preserving the real gap", () => {
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[1][1].walls = {
			north: false,
			south: false,
			east: false,
			west: false,
		};
		maze.crossings = [{ x: 1, y: 1, underAxis: "vertical" }];

		// Scoped to the crossing cell itself — the maze's entrance (0,0) and
		// exit (2,2) sit outside this region and legitimately get their own
		// corners rounded (see ADR 031), which is irrelevant to what this
		// test checks (the crossing cell's own gap-preserving behavior).
		const inCrossingCell = (s: { x1: number; x2: number }) =>
			s.x1 >= 0.9 && s.x1 <= 2.1 && s.x2 >= 0.9 && s.x2 <= 2.1;
		const segments = computeTubeSegments(maze).filter(inCrossingCell);

		expect(segments.filter(isArcSegment)).toHaveLength(0);
		expect(segments.length).toBeGreaterThan(0);
	});

	// Cell (1,1)'s own hub corners, tangent points included — tight enough to
	// exclude the maze's entrance (0,0) and exit corners, and any incidental
	// dead end created on a neighboring cell purely to open a connection.
	const inTargetCell = (s: {
		x1: number;
		x2: number;
		y1: number;
		y2: number;
	}) =>
		s.x1 >= 0.95 &&
		s.x1 <= 2.05 &&
		s.x2 >= 0.95 &&
		s.x2 <= 2.05 &&
		s.y1 >= 0.95 &&
		s.y1 <= 2.05 &&
		s.y2 >= 0.95 &&
		s.y2 <= 2.05;

	it("rounds both corners of a dead end's cap (see ADR 031)", () => {
		// Cell (1,1) open only to the south, in an otherwise fully walled maze
		// — same setup as the "closes a dead-end cell" test above.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[1][1].walls.south = false;
		maze.cells[2][1].walls.north = false;

		const segments = computeTubeSegments(maze).filter(inTargetCell);

		expect(segments.filter(isArcSegment)).toHaveLength(2);
	});

	it("rounds both corners of a T-junction, leaving the two collinear corners untouched", () => {
		// Cell (1,1) open north, east, and south (closed west only).
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[0][1].walls.south = false;
		maze.cells[1][1].walls.north = false;
		maze.cells[1][1].walls.east = false;
		maze.cells[1][2].walls.west = false;
		maze.cells[1][1].walls.south = false;
		maze.cells[2][1].walls.north = false;

		const segments = computeTubeSegments(maze).filter(inTargetCell);

		expect(segments.filter(isArcSegment)).toHaveLength(2);
	});

	it("rounds all four corners of a full (non-crossing) 4-way junction", () => {
		// Cell (1,1) open on all four sides, but not registered as a bridge
		// crossing — a plain 4-way branch point.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[1][1].walls = {
			north: false,
			south: false,
			east: false,
			west: false,
		};
		maze.cells[0][1].walls.south = false;
		maze.cells[2][1].walls.north = false;
		maze.cells[1][0].walls.east = false;
		maze.cells[1][2].walls.west = false;

		const segments = computeTubeSegments(maze).filter(inTargetCell);

		expect(segments.filter(isArcSegment)).toHaveLength(4);
	});

	it("makes the tube wider than the non-tube area within a cell", () => {
		// The tube occupies 2*h of the cell's width along its axis; it takes
		// more room than the walls/gaps around it once h exceeds a quarter of
		// the cell size (2*h > 1 - 2*h).
		expect(TUBE_HALF_WIDTH_RATIO).toBeGreaterThan(0.25);
	});

	it("keeps the tube narrower than a full cell, leaving a real boundary margin", () => {
		expect(TUBE_HALF_WIDTH_RATIO).toBeLessThan(0.5);
	});
});

describe("computeCellCenter", () => {
	it("returns the plain Cartesian cell center", () => {
		expect(computeCellCenter({ x: 2, y: 1 })).toEqual({ x: 2.5, y: 1.5 });
	});

	it("returns the plain Cartesian cell center for a different position", () => {
		expect(computeCellCenter({ x: 0, y: 0 })).toEqual({ x: 0.5, y: 0.5 });
	});
});
