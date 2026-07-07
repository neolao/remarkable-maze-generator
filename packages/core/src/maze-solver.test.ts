import { describe, expect, it } from "vitest";
import { solveMaze } from "./maze-solver.js";
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
});
