import { describe, expect, it } from "vitest";
import {
	MAZE_TYPES,
	generateMaze,
	generateMazeBatch,
	invalidMazeTypeMessage,
	isValidMazeType,
} from "./maze.js";

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

// Traces an actual step-by-step path from the entrance to every cell,
// respecting both walls and — at a crossing cell — the rule that a path may
// never turn from one axis onto the other (mirrors solveMaze's own traversal
// rules, see ADR 024). Returns the set of cells a path was successfully
// traced to.
function findCellsReachableByATraceablePath(
	maze: ReturnType<typeof generateMaze>,
): Set<string> {
	type Axis = "" | "vertical" | "horizontal";
	interface Node {
		x: number;
		y: number;
		axis: Axis;
	}

	const isCrossing = (x: number, y: number) =>
		(maze.crossings ?? []).some(
			(crossing) => crossing.x === x && crossing.y === y,
		);

	const reachableCells = new Set<string>(["0,0"]);
	const visitedNodes = new Set<string>(["0,0,"]);
	const queue: Node[] = [{ x: 0, y: 0, axis: "" }];

	while (queue.length > 0) {
		const node = queue.shift();
		if (!node) break;
		const cell = maze.cells[node.y][node.x];
		const cellIsCrossing = isCrossing(node.x, node.y);

		const tryMove = (
			open: boolean,
			dx: number,
			dy: number,
			axis: "vertical" | "horizontal",
		) => {
			if (!open) return;
			if (cellIsCrossing && node.axis !== "" && axis !== node.axis) return;

			const x = node.x + dx;
			const y = node.y + dy;
			const nextAxis: Axis = isCrossing(x, y) ? axis : "";
			const key = `${x},${y},${nextAxis}`;
			if (visitedNodes.has(key)) return;

			visitedNodes.add(key);
			reachableCells.add(`${x},${y}`);
			queue.push({ x, y, axis: nextAxis });
		};

		tryMove(!cell.walls.north, 0, -1, "vertical");
		tryMove(!cell.walls.south, 0, 1, "vertical");
		tryMove(!cell.walls.east, 1, 0, "horizontal");
		tryMove(!cell.walls.west, -1, 0, "horizontal");
	}

	return reachableCells;
}

const DEGREE_DIRECTIONS = [
	{ dx: 0, dy: -1, wall: "north" as const },
	{ dx: 0, dy: 1, wall: "south" as const },
	{ dx: 1, dy: 0, wall: "east" as const },
	{ dx: -1, dy: 0, wall: "west" as const },
];

function cellDegree(cell: { walls: Record<string, boolean> }): number {
	return [
		cell.walls.north,
		cell.walls.south,
		cell.walls.east,
		cell.walls.west,
	].filter((wall) => !wall).length;
}

// Measures, for every dead-end branch (a corridor dangling off a branch point
// or trailing from the entrance/exit), how many cells it spans before
// reaching a branch point (3+ open walls). Only meaningful for the plain
// `rectangle` type, where "degree" directly reflects corridor topology.
function computeDeadEndBranchLengths(
	maze: ReturnType<typeof generateMaze>,
): number[] {
	const lengths: number[] = [];
	const entranceKey = "0,0";
	const exitKey = `${maze.width - 1},${maze.height - 1}`;

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const key = `${x},${y}`;
			if (key === entranceKey || key === exitKey) continue;
			const cell = maze.cells[y][x];
			if (cellDegree(cell) !== 1) continue;

			const openDirection = DEGREE_DIRECTIONS.find(
				(direction) => !cell.walls[direction.wall],
			);
			if (!openDirection) continue;

			let length = 1;
			let previous = { x, y };
			let current = { x: x + openDirection.dx, y: y + openDirection.dy };

			while (true) {
				const currentKey = `${current.x},${current.y}`;
				const currentCell = maze.cells[current.y][current.x];
				const degree = cellDegree(currentCell);
				if (degree >= 3) break;

				length++;
				if (currentKey === entranceKey || currentKey === exitKey) break;
				if (degree === 1) break;

				const next = DEGREE_DIRECTIONS.filter(
					(direction) => !currentCell.walls[direction.wall],
				)
					.map((direction) => ({
						x: current.x + direction.dx,
						y: current.y + direction.dy,
					}))
					.find((cell) => !(cell.x === previous.x && cell.y === previous.y));
				if (!next) break;

				previous = current;
				current = next;
			}
			lengths.push(length);
		}
	}
	return lengths;
}

function averageDeadEndBranchLength(mazes: ReturnType<typeof generateMaze>[]) {
	const lengths = mazes.flatMap(computeDeadEndBranchLengths);
	return lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
}

function shortDeadEndBranchRatio(mazes: ReturnType<typeof generateMaze>[]) {
	const lengths = mazes.flatMap(computeDeadEndBranchLengths);
	return lengths.filter((length) => length <= 2).length / lengths.length;
}

function countBranchPoints(maze: ReturnType<typeof generateMaze>): number {
	let branchPoints = 0;
	for (const row of maze.cells) {
		for (const cell of row) {
			const openings = [
				cell.walls.north,
				cell.walls.south,
				cell.walls.east,
				cell.walls.west,
			].filter((wall) => !wall).length;
			if (openings >= 3) branchPoints++;
		}
	}
	return branchPoints;
}

describe("generateMaze", () => {
	it("includes the resolved generation parameters on the returned maze", () => {
		const maze = generateMaze({ width: 5, height: 4, seed: 7, difficulty: 3 });

		expect(maze.type).toBe("rectangle");
		expect(maze.seed).toBe(7);
		expect(maze.difficulty).toBe(3);
	});

	it("defaults the maze's recorded difficulty to 1 when not specified", () => {
		const maze = generateMaze({ width: 5, height: 4, seed: 7 });

		expect(maze.difficulty).toBe(1);
	});

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

	it("can trace an actual path from the entrance to every single cell (rectangle type)", () => {
		const maze = generateMaze({ width: 10, height: 10, seed: 7 });

		expect(findCellsReachableByATraceablePath(maze).size).toBe(10 * 10);
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

	it("produces a maze with more branch points at higher difficulty, for the same size and seed", () => {
		const easy = generateMaze({
			width: 16,
			height: 16,
			seed: 3,
			difficulty: 1,
		});
		const hard = generateMaze({
			width: 16,
			height: 16,
			seed: 3,
			difficulty: 5,
		});

		expect(countBranchPoints(hard)).toBeGreaterThan(countBranchPoints(easy));
	});

	it("defaults to the easiest difficulty (fewest branch points) when not specified", () => {
		const withoutOption = generateMaze({ width: 10, height: 10, seed: 5 });
		const explicitEasy = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			difficulty: 1,
		});

		expect(withoutOption.cells).toEqual(explicitEasy.cells);
	});

	it("keeps every cell reachable at the hardest difficulty", () => {
		const maze = generateMaze({
			width: 10,
			height: 10,
			seed: 7,
			difficulty: 5,
		});

		expect(countReachableCells(maze)).toBe(10 * 10);
	});

	it.each([{ difficulty: 1 }, { difficulty: 5 }])(
		"accepts the boundary difficulty value $difficulty",
		({ difficulty }) => {
			expect(() =>
				generateMaze({ width: 5, height: 5, seed: 1, difficulty }),
			).not.toThrow();
		},
	);

	it.each([{ difficulty: 0 }, { difficulty: 6 }, { difficulty: 2.5 }])(
		"rejects an invalid difficulty=$difficulty",
		({ difficulty }) => {
			expect(() =>
				generateMaze({ width: 5, height: 5, seed: 1, difficulty }),
			).toThrow();
		},
	);
});

describe("generateMaze - dead-end branch length", () => {
	const seeds = Array.from({ length: 20 }, (_, index) => index);

	it("produces noticeably longer dead-end branches on average at difficulty 3, for a representative sample of seeds", () => {
		const mazes = seeds.map((seed) =>
			generateMaze({ width: 16, height: 16, seed, difficulty: 3 }),
		);

		// Baseline measured before this change (same seeds/size): avg ~2.20,
		// ~72.8% of dead ends were 1-2 cells long.
		expect(averageDeadEndBranchLength(mazes)).toBeGreaterThan(2.4);
		expect(shortDeadEndBranchRatio(mazes)).toBeLessThan(0.7);
	});

	it("keeps many branch points while still lengthening dead ends at the hardest difficulty", () => {
		const mazes = seeds.map((seed) =>
			generateMaze({ width: 16, height: 16, seed, difficulty: 5 }),
		);

		// Baseline measured before this change (same seeds/size): avg ~1.97,
		// ~75.8% of dead ends were 1-2 cells long.
		expect(averageDeadEndBranchLength(mazes)).toBeGreaterThan(2.3);
		expect(shortDeadEndBranchRatio(mazes)).toBeLessThan(0.7);
		const totalBranchPoints = mazes.reduce(
			(sum, maze) => sum + countBranchPoints(maze),
			0,
		);
		expect(totalBranchPoints / mazes.length).toBeGreaterThan(40);
	});

	it("does not change dead-end branch length at the easiest difficulty (no branching decision is ever made)", () => {
		const mazes = seeds.map((seed) =>
			generateMaze({ width: 16, height: 16, seed, difficulty: 1 }),
		);

		// Baseline measured before this change (same seeds/size): avg ~2.11.
		// Difficulty 1 never rolls the random-vs-recent choice, so the new
		// minimum branch-commit rule never triggers (see ADR 032).
		const avg = averageDeadEndBranchLength(mazes);
		expect(avg).toBeGreaterThan(1.9);
		expect(avg).toBeLessThan(2.3);
	});

	it("still fully connects a maze too small to contain a long dead-end branch", () => {
		const maze = generateMaze({ width: 2, height: 2, seed: 1, difficulty: 5 });

		expect(countReachableCells(maze)).toBe(4);
	});

	it("still generates the same maze twice at difficulty 5 (deterministic under the new selection rule)", () => {
		const first = generateMaze({
			width: 16,
			height: 16,
			seed: 42,
			difficulty: 5,
		});
		const second = generateMaze({
			width: 16,
			height: 16,
			seed: 42,
			difficulty: 5,
		});

		expect(second.cells).toEqual(first.cells);
	});
});

describe("MAZE_TYPES / isValidMazeType / invalidMazeTypeMessage", () => {
	it("lists rectangle and rectangle-crossing as the valid maze types", () => {
		expect(MAZE_TYPES).toEqual(["rectangle", "rectangle-crossing"]);
	});

	it.each(MAZE_TYPES)("accepts %s as a valid maze type", (type) => {
		expect(isValidMazeType(type)).toBe(true);
	});

	it("rejects an unknown maze type", () => {
		expect(isValidMazeType("hexagon")).toBe(false);
	});

	it("describes the allowed values in the invalid maze type message", () => {
		expect(invalidMazeTypeMessage("hexagon")).toBe(
			'Invalid maze type "hexagon", expected one of: rectangle, rectangle-crossing',
		);
	});
});

describe("generateMaze - type option", () => {
	it("defaults to the rectangle type when not specified, with no crossings", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 1 });

		expect(maze.type).toBe("rectangle");
		expect(maze.crossings).toBeUndefined();
	});

	it("rejects an invalid maze type", () => {
		expect(() =>
			// biome-ignore lint/suspicious/noExplicitAny: deliberately passing an invalid type to test validation
			generateMaze({ width: 5, height: 5, seed: 1, type: "hexagon" as any }),
		).toThrow();
	});

	it("records at least one crossing for a rectangle-crossing maze of a reasonable size", () => {
		const maze = generateMaze({
			width: 12,
			height: 12,
			seed: 3,
			type: "rectangle-crossing",
		});

		expect(maze.type).toBe("rectangle-crossing");
		expect(maze.crossings?.length ?? 0).toBeGreaterThan(0);
	});

	it("produces no crossings for a maze too small to contain one", () => {
		const maze = generateMaze({
			width: 1,
			height: 1,
			seed: 1,
			type: "rectangle-crossing",
		});

		expect(maze.crossings).toEqual([]);
	});

	it("never marks the entrance or exit cell as a crossing", () => {
		const maze = generateMaze({
			width: 6,
			height: 6,
			seed: 9,
			type: "rectangle-crossing",
		});
		const exit = { x: maze.width - 1, y: maze.height - 1 };

		for (const crossing of maze.crossings ?? []) {
			expect(crossing).not.toEqual({ x: 0, y: 0 });
			expect(crossing).not.toEqual(exit);
		}
	});

	it("opens all 4 walls at each recorded crossing cell — both passages are real, walkable connections", () => {
		const maze = generateMaze({
			width: 12,
			height: 12,
			seed: 3,
			type: "rectangle-crossing",
		});
		expect(maze.crossings?.length ?? 0).toBeGreaterThan(0);

		for (const crossing of maze.crossings ?? []) {
			const cell = maze.cells[crossing.y][crossing.x];
			expect(cell.walls).toEqual({
				north: false,
				south: false,
				east: false,
				west: false,
			});
			expect(["vertical", "horizontal"]).toContain(crossing.underAxis);
		}
	});

	it("keeps every cell reachable from the entrance for a rectangle-crossing maze", () => {
		const maze = generateMaze({
			width: 14,
			height: 14,
			seed: 3,
			type: "rectangle-crossing",
		});

		expect(countReachableCells(maze)).toBe(14 * 14);
	});

	it("never places two crossings next to each other, avoiding a repeating ladder pattern", () => {
		const maze = generateMaze({
			width: 20,
			height: 20,
			seed: 11,
			type: "rectangle-crossing",
		});
		const crossings = maze.crossings ?? [];
		expect(crossings.length).toBeGreaterThan(0);

		for (const a of crossings) {
			for (const b of crossings) {
				if (a === b) continue;
				expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeGreaterThan(1);
			}
		}
	});

	it("can trace an actual path from the entrance to every single cell, never turning at a crossing (rectangle-crossing type)", () => {
		const maze = generateMaze({
			width: 14,
			height: 14,
			seed: 3,
			type: "rectangle-crossing",
		});
		expect(maze.crossings?.length ?? 0).toBeGreaterThan(0);

		expect(findCellsReachableByATraceablePath(maze).size).toBe(14 * 14);
	});

	it("generates the same crossings for the same seed", () => {
		const first = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			type: "rectangle-crossing",
		});
		const second = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			type: "rectangle-crossing",
		});

		expect(second.crossings).toEqual(first.crossings);
	});
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

	it("applies the given difficulty to every maze in the batch", () => {
		const [batchMaze] = generateMazeBatch({
			width: 8,
			height: 6,
			seed: 42,
			count: 1,
			difficulty: 5,
		});
		const singleMaze = generateMaze({
			width: 8,
			height: 6,
			seed: 42,
			difficulty: 5,
		});

		expect(batchMaze).toEqual(singleMaze);
	});

	it("gives each maze in a batch its own resolved seed", () => {
		const mazes = generateMazeBatch({
			width: 5,
			height: 5,
			seed: 10,
			count: 3,
		});

		expect(mazes.map((maze) => maze.seed)).toEqual([10, 11, 12]);
	});

	it("forwards the maze type to every maze in the batch", () => {
		const mazes = generateMazeBatch({
			width: 8,
			height: 8,
			seed: 1,
			count: 2,
			type: "rectangle-crossing",
		});

		for (const maze of mazes) {
			expect(maze.type).toBe("rectangle-crossing");
		}
	});
});
