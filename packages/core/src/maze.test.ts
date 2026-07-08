import { describe, expect, it } from "vitest";
import { generateMaze, generateMazeBatch } from "./maze.js";

function countReachableCells(maze: ReturnType<typeof generateMaze>): number {
	const visited = new Set<string>();
	const stack = [{ x: 0, y: 0 }];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) break;
		const key = `${current.x},${current.y}`;
		if (visited.has(key)) continue;
		visited.add(key);

		const cell = maze.cells[current.y]?.[current.x];
		if (!cell) continue;

		if (!cell.walls.north) stack.push({ x: current.x, y: current.y - 1 });
		if (!cell.walls.south) stack.push({ x: current.x, y: current.y + 1 });
		if (!cell.walls.east) stack.push({ x: current.x + 1, y: current.y });
		if (!cell.walls.west) stack.push({ x: current.x - 1, y: current.y });
	}

	return visited.size;
}

describe("generateMaze", () => {
	it("generates a maze with the given width and height", () => {
		const maze = generateMaze({ width: 5, height: 4, seed: 1 });

		expect(maze.width).toBe(5);
		expect(maze.height).toBe(4);
		expect(maze.cells).toHaveLength(4);
		for (const row of maze.cells) {
			expect(row).toHaveLength(5);
		}
	});

	it("generates the same maze twice when given the same seed", () => {
		const first = generateMaze({ width: 8, height: 6, seed: 42 });
		const second = generateMaze({ width: 8, height: 6, seed: 42 });

		expect(second.cells).toEqual(first.cells);
	});

	it("generates a maze where every cell is reachable from any other cell", () => {
		const maze = generateMaze({ width: 10, height: 10, seed: 7 });

		expect(countReachableCells(maze)).toBe(10 * 10);
	});

	it("produces a different layout for a different seed", () => {
		const first = generateMaze({ width: 8, height: 6, seed: 1 });
		const second = generateMaze({ width: 8, height: 6, seed: 2 });

		expect(second.cells).not.toEqual(first.cells);
	});

	it.each([
		{ width: 0, height: 5 },
		{ width: 5, height: 0 },
		{ width: -3, height: 5 },
		{ width: 5, height: -3 },
	])(
		"rejects invalid dimensions width=$width height=$height",
		({ width, height }) => {
			expect(() => generateMaze({ width, height, seed: 1 })).toThrow();
		},
	);
});

describe("generateMazeBatch", () => {
	it("generates the requested number of distinct mazes", () => {
		const mazes = generateMazeBatch({
			width: 6,
			height: 6,
			seed: 10,
			count: 5,
		});

		expect(mazes).toHaveLength(5);
		const uniqueLayouts = new Set(
			mazes.map((maze) => JSON.stringify(maze.cells)),
		);
		expect(uniqueLayouts.size).toBe(5);
	});

	it("produces a batch of 1 identical to a single generateMaze call", () => {
		const [batchMaze] = generateMazeBatch({
			width: 8,
			height: 6,
			seed: 42,
			count: 1,
		});
		const singleMaze = generateMaze({ width: 8, height: 6, seed: 42 });

		expect(batchMaze).toEqual(singleMaze);
	});

	it("reproduces the exact same batch when given the same starting seed", () => {
		const first = generateMazeBatch({ width: 5, height: 5, seed: 7, count: 3 });
		const second = generateMazeBatch({
			width: 5,
			height: 5,
			seed: 7,
			count: 3,
		});

		expect(second).toEqual(first);
	});

	it.each([{ count: 0 }, { count: -2 }])(
		"rejects an invalid batch count=$count",
		({ count }) => {
			expect(() =>
				generateMazeBatch({ width: 5, height: 5, seed: 1, count }),
			).toThrow();
		},
	);
});
