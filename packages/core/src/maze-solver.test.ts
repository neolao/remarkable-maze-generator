import { describe, expect, it } from "vitest";
import { findSolutionBranchPoints, solveMaze } from "./maze-solver.js";
import { generateMaze } from "./maze.js";
import type { Cell, Maze } from "./maze.js";

function buildFullyWalledMaze(width: number, height: number): Maze {
	const cells: Cell[][] = Array.from({ length: height }, () =>
		Array.from({ length: width }, () => ({
			walls: { north: true, south: true, east: true, west: true },
		})),
	);
	return { width, height, cells };
}

function assertNoWallCrossed(
	maze: Maze,
	path: Array<{ x: number; y: number }>,
): void {
	for (let i = 0; i < path.length - 1; i++) {
		const from = path[i];
		const to = path[i + 1];
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const fromCell = maze.cells[from.y][from.x];

		if (dx === 1 && dy === 0) expect(fromCell.walls.east).toBe(false);
		else if (dx === -1 && dy === 0) expect(fromCell.walls.west).toBe(false);
		else if (dx === 0 && dy === 1) expect(fromCell.walls.south).toBe(false);
		else if (dx === 0 && dy === -1) expect(fromCell.walls.north).toBe(false);
		else
			throw new Error(
				`Path step from (${from.x},${from.y}) to (${to.x},${to.y}) is not adjacent`,
			);
	}
}

describe("solveMaze", () => {
	it("returns an ordered path from entrance to exit", () => {
		const maze = generateMaze({ width: 10, height: 8, seed: 5 });
		const path = solveMaze(maze);

		expect(path[0]).toEqual({ x: 0, y: 0 });
		expect(path[path.length - 1]).toEqual({ x: 9, y: 7 });
	});

	it("returns a single-cell path when the maze is 1x1", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });
		const path = solveMaze(maze);

		expect(path).toEqual([{ x: 0, y: 0 }]);
	});

	it("never crosses a wall between two consecutive steps", () => {
		const maze = generateMaze({ width: 12, height: 9, seed: 99 });
		const path = solveMaze(maze);

		assertNoWallCrossed(maze, path);
	});

	it("throws a clear error when no path exists between entrance and exit", () => {
		const maze = buildFullyWalledMaze(5, 5);

		expect(() => solveMaze(maze)).toThrow();
	});

	it("never turns between the two axes of a rectangle-crossing bridge cell", () => {
		const maze = generateMaze({
			width: 14,
			height: 14,
			seed: 3,
			type: "rectangle-crossing",
		});
		expect(maze.crossings?.length ?? 0).toBeGreaterThan(0);
		const crossingKeys = new Set(
			(maze.crossings ?? []).map((c) => `${c.x},${c.y}`),
		);

		const path = solveMaze(maze);

		for (let i = 1; i < path.length - 1; i++) {
			if (!crossingKeys.has(`${path[i].x},${path[i].y}`)) continue;

			const incomingAxis =
				path[i - 1].x !== path[i].x ? "horizontal" : "vertical";
			const outgoingAxis =
				path[i + 1].x !== path[i].x ? "horizontal" : "vertical";
			expect(outgoingAxis).toBe(incomingAxis);
		}
	});

	it("finds a valid same-axis route through a crossing cell", () => {
		// Cells addressed as maze.cells[y][x]. Builds a vertical route straight
		// through the crossing cell (1,1): (0,0)-(1,0)-(1,1)-(1,2)-(2,2), plus two
		// unused horizontal "arms" at (1,1) to represent the crossing's other axis.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[0][0].walls.east = false; // (0,0) -> (1,0)
		maze.cells[0][1].walls.west = false;
		maze.cells[0][1].walls.south = false; // (1,0) -> (1,1)
		maze.cells[1][1].walls.north = false;
		maze.cells[1][1].walls.south = false; // (1,1) -> (1,2)
		maze.cells[2][1].walls.north = false;
		maze.cells[2][1].walls.east = false; // (1,2) -> (2,2)
		maze.cells[2][2].walls.west = false;
		maze.cells[1][1].walls.west = false; // (1,1) <-> (0,1), unused horizontal arm
		maze.cells[1][0].walls.east = false;
		maze.cells[1][1].walls.east = false; // (1,1) <-> (2,1), unused horizontal arm
		maze.cells[1][2].walls.west = false;
		maze.crossings = [{ x: 1, y: 1, underAxis: "horizontal" }];

		const path = solveMaze(maze);

		expect(path).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
			{ x: 1, y: 2 },
			{ x: 2, y: 2 },
		]);
	});

	it("walks through the horizontal wraparound on a circle maze", () => {
		// The only open passage is the wraparound itself: west of column 0 is
		// column 2 (the last column), not an invalid out-of-bounds cell (see
		// ADR 034).
		const maze = buildFullyWalledMaze(3, 1);
		maze.type = "circle";
		maze.cells[0][0].walls.west = false;
		maze.cells[0][2].walls.east = false;

		const path = solveMaze(maze);

		expect(path).toEqual([
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
		]);
	});

	it("does not error solving a generated circle maze of a reasonable size", () => {
		const maze = generateMaze({
			width: 10,
			height: 8,
			seed: 7,
			type: "circle",
		});

		expect(() => solveMaze(maze)).not.toThrow();
	});

	it("rejects a route that would require turning between axes at a crossing cell", () => {
		// Cells addressed as maze.cells[y][x]. The only wall-connected route from
		// entrance to exit passes through the crossing cell (1,1), entering from
		// the west (horizontal axis) and leaving to the south (vertical axis) — a
		// turn, which must be forbidden even though every individual wall along
		// the way is open.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[0][0].walls.south = false; // (0,0) -> (0,1)
		maze.cells[1][0].walls.north = false;
		maze.cells[1][0].walls.east = false; // (0,1) -> (1,1)
		maze.cells[1][1].walls.west = false;
		maze.cells[1][1].walls.south = false; // (1,1) -> (1,2)
		maze.cells[2][1].walls.north = false;
		maze.cells[2][1].walls.east = false; // (1,2) -> (2,2)
		maze.cells[2][2].walls.west = false;
		maze.cells[1][1].walls.north = false; // (1,1) <-> (1,0), unused vertical arm
		maze.cells[0][1].walls.south = false;
		maze.cells[1][1].walls.east = false; // (1,1) <-> (2,1), unused horizontal arm
		maze.cells[1][2].walls.west = false;
		maze.crossings = [{ x: 1, y: 1, underAxis: "vertical" }];

		expect(() => solveMaze(maze)).toThrow();
	});
});

describe("findSolutionBranchPoints", () => {
	it("flags a path cell that had an extra open direction beyond arrival and departure", () => {
		// Cells addressed as maze.cells[y][x]. Straight route (0,0)-(1,0)-(2,0)-
		// (2,1)-(2,2), plus one unused dead-end branch off (1,0) going south to
		// (1,1) — (1,0) has 3 open directions (west, east, south) so it must be
		// flagged; every other path cell has exactly 2.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[0][0].walls.east = false; // (0,0) -> (1,0)
		maze.cells[0][1].walls.west = false;
		maze.cells[0][1].walls.east = false; // (1,0) -> (2,0)
		maze.cells[0][2].walls.west = false;
		maze.cells[0][1].walls.south = false; // (1,0) -> (1,1), unused dead end
		maze.cells[1][1].walls.north = false;
		maze.cells[0][2].walls.south = false; // (2,0) -> (2,1)
		maze.cells[1][2].walls.north = false;
		maze.cells[1][2].walls.south = false; // (2,1) -> (2,2)
		maze.cells[2][2].walls.north = false;

		const branchPoints = findSolutionBranchPoints(maze);

		expect(branchPoints).toEqual([{ x: 1, y: 0 }]);
	});

	it("returns an empty list when the maze is 1x1", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });

		expect(findSolutionBranchPoints(maze)).toEqual([]);
	});

	it("never flags a bridge-crossing cell even though all four of its walls are open", () => {
		// Same crossing maze as the "finds a valid same-axis route" solveMaze
		// test above: the crossing cell (1,1) has all four walls open, but the
		// solver's axis lock (see ADR 024) only allows continuing along the
		// entered axis, so it is never a real branch choice for the path.
		const maze = buildFullyWalledMaze(3, 3);
		maze.cells[0][0].walls.east = false; // (0,0) -> (1,0)
		maze.cells[0][1].walls.west = false;
		maze.cells[0][1].walls.south = false; // (1,0) -> (1,1)
		maze.cells[1][1].walls.north = false;
		maze.cells[1][1].walls.south = false; // (1,1) -> (1,2)
		maze.cells[2][1].walls.north = false;
		maze.cells[2][1].walls.east = false; // (1,2) -> (2,2)
		maze.cells[2][2].walls.west = false;
		maze.cells[1][1].walls.west = false; // (1,1) <-> (0,1), unused horizontal arm
		maze.cells[1][0].walls.east = false;
		maze.cells[1][1].walls.east = false; // (1,1) <-> (2,1), unused horizontal arm
		maze.cells[1][2].walls.west = false;
		maze.crossings = [{ x: 1, y: 1, underAxis: "horizontal" }];

		const branchPoints = findSolutionBranchPoints(maze);

		expect(branchPoints).not.toContainEqual({ x: 1, y: 1 });
	});

	it("throws a clear error when no path exists between entrance and exit", () => {
		const maze = buildFullyWalledMaze(5, 5);

		expect(() => findSolutionBranchPoints(maze)).toThrow();
	});
});
