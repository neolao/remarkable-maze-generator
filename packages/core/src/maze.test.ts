import { describe, expect, it } from "vitest";
import { totalNodeCount as totalCircleNodeCount } from "./circle-maze/cells.js";
import { countReachableNodes as countCircleReachableNodes } from "./circle-maze/test-helpers.js";
import { solveMaze } from "./maze-solver.js";
import {
	MAZE_ALGORITHMS,
	MAZE_TYPES,
	PATH_LENGTH_MAX_ATTEMPTS,
	PATH_LENGTH_TARGETS,
	generateMaze,
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidPathLengthTargetMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidPathLengthTarget,
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
		{ width: 201, height: 5 },
		{ width: 5, height: 201 },
	])(
		"rejects invalid dimensions width=$width height=$height",
		({ width, height }) => {
			expect(() => generateMaze({ width, height, seed: 1 })).toThrow();
		},
	);

	it("accepts dimensions at the maximum allowed size", () => {
		const maze = generateMaze({ width: 200, height: 200, seed: 1 });

		expect(maze.width).toBe(200);
		expect(maze.height).toBe(200);
	});

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
	it("lists rectangle, rectangle-crossing and circle as the valid maze types", () => {
		expect(MAZE_TYPES).toEqual(["rectangle", "rectangle-crossing", "circle"]);
	});

	it.each(MAZE_TYPES)("accepts %s as a valid maze type", (type) => {
		expect(isValidMazeType(type)).toBe(true);
	});

	it("rejects an unknown maze type", () => {
		expect(isValidMazeType("hexagon")).toBe(false);
	});

	it("describes the allowed values in the invalid maze type message", () => {
		expect(invalidMazeTypeMessage("hexagon")).toBe(
			'Invalid maze type "hexagon", expected one of: rectangle, rectangle-crossing, circle',
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

describe("MAZE_ALGORITHMS / isValidMazeAlgorithm / invalidMazeAlgorithmMessage", () => {
	it("lists growing-tree, kruskal, wilson and aldous-broder as the valid maze algorithms", () => {
		expect(MAZE_ALGORITHMS).toEqual([
			"growing-tree",
			"kruskal",
			"wilson",
			"aldous-broder",
		]);
	});

	it.each(MAZE_ALGORITHMS)(
		"accepts %s as a valid maze algorithm",
		(algorithm) => {
			expect(isValidMazeAlgorithm(algorithm)).toBe(true);
		},
	);

	it("rejects an unknown maze algorithm", () => {
		expect(isValidMazeAlgorithm("prim")).toBe(false);
	});

	it("describes the allowed values in the invalid maze algorithm message", () => {
		expect(invalidMazeAlgorithmMessage("prim")).toBe(
			'Invalid maze algorithm "prim", expected one of: growing-tree, kruskal, wilson, aldous-broder',
		);
	});
});

describe("generateMaze - algorithm option", () => {
	it("defaults to the growing-tree algorithm when not specified", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 1 });

		expect(maze.algorithm).toBe("growing-tree");
	});

	it("produces the exact same maze whether the growing-tree algorithm is implicit or explicit", () => {
		const implicit = generateMaze({
			width: 8,
			height: 6,
			seed: 42,
			difficulty: 3,
		});
		const explicit = generateMaze({
			width: 8,
			height: 6,
			seed: 42,
			difficulty: 3,
			algorithm: "growing-tree",
		});

		expect(explicit).toEqual(implicit);
	});

	it("rejects an invalid maze algorithm", () => {
		expect(() =>
			generateMaze({
				width: 5,
				height: 5,
				seed: 1,
				// biome-ignore lint/suspicious/noExplicitAny: deliberately passing an invalid algorithm to test validation
				algorithm: "prim" as any,
			}),
		).toThrow();
	});
});

describe("generateMaze - kruskal algorithm", () => {
	it("records the kruskal algorithm on the returned maze", () => {
		const maze = generateMaze({
			width: 6,
			height: 6,
			seed: 1,
			algorithm: "kruskal",
		});

		expect(maze.algorithm).toBe("kruskal");
	});

	it("produces a maze where every cell is reachable from any other cell", () => {
		const maze = generateMaze({
			width: 10,
			height: 10,
			seed: 7,
			algorithm: "kruskal",
		});

		expect(countReachableCells(maze)).toBe(10 * 10);
	});

	it("rejects the rectangle-crossing type combined with a non-growing-tree algorithm", () => {
		expect(() =>
			generateMaze({
				width: 10,
				height: 10,
				seed: 1,
				type: "rectangle-crossing",
				algorithm: "kruskal",
			}),
		).toThrow(/rectangle-crossing.*growing-tree/);
	});

	it("still rejects invalid dimensions regardless of the chosen algorithm", () => {
		expect(() =>
			generateMaze({
				width: 0,
				height: 5,
				seed: 1,
				algorithm: "kruskal",
			}),
		).toThrow();
	});

	it("ignores the difficulty option (not yet tunable for kruskal)", () => {
		const easy = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			algorithm: "kruskal",
			difficulty: 1,
		});
		const hard = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			algorithm: "kruskal",
			difficulty: 5,
		});

		expect(hard.cells).toEqual(easy.cells);
	});
});

describe("generateMaze - wilson algorithm", () => {
	it("records the wilson algorithm on the returned maze", () => {
		const maze = generateMaze({
			width: 6,
			height: 6,
			seed: 1,
			algorithm: "wilson",
		});

		expect(maze.algorithm).toBe("wilson");
	});

	it("produces a maze where every cell is reachable from any other cell", () => {
		const maze = generateMaze({
			width: 10,
			height: 10,
			seed: 7,
			algorithm: "wilson",
		});

		expect(countReachableCells(maze)).toBe(10 * 10);
	});

	it("rejects the rectangle-crossing type combined with the wilson algorithm", () => {
		expect(() =>
			generateMaze({
				width: 10,
				height: 10,
				seed: 1,
				type: "rectangle-crossing",
				algorithm: "wilson",
			}),
		).toThrow(/rectangle-crossing.*growing-tree/);
	});

	it("ignores the difficulty option (not yet tunable for wilson)", () => {
		const easy = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			algorithm: "wilson",
			difficulty: 1,
		});
		const hard = generateMaze({
			width: 10,
			height: 10,
			seed: 5,
			algorithm: "wilson",
			difficulty: 5,
		});

		expect(hard.cells).toEqual(easy.cells);
	});
});

describe("generateMaze - aldous-broder algorithm", () => {
	it("records the aldous-broder algorithm on the returned maze", () => {
		const maze = generateMaze({
			width: 6,
			height: 6,
			seed: 1,
			algorithm: "aldous-broder",
		});

		expect(maze.algorithm).toBe("aldous-broder");
	});

	it("produces a maze where every cell is reachable from any other cell", () => {
		const maze = generateMaze({
			width: 10,
			height: 10,
			seed: 7,
			algorithm: "aldous-broder",
		});

		expect(countReachableCells(maze)).toBe(10 * 10);
	});

	it("rejects the rectangle-crossing type combined with the aldous-broder algorithm", () => {
		expect(() =>
			generateMaze({
				width: 10,
				height: 10,
				seed: 1,
				type: "rectangle-crossing",
				algorithm: "aldous-broder",
			}),
		).toThrow(/rectangle-crossing.*growing-tree/);
	});

	it("ignores the difficulty option (not yet tunable for aldous-broder)", () => {
		const easy = generateMaze({
			width: 8,
			height: 8,
			seed: 5,
			algorithm: "aldous-broder",
			difficulty: 1,
		});
		const hard = generateMaze({
			width: 8,
			height: 8,
			seed: 5,
			algorithm: "aldous-broder",
			difficulty: 5,
		});

		expect(hard.cells).toEqual(easy.cells);
	});
});

describe("generateMaze - circle type", () => {
	it("records the circle type on the returned maze, with an empty rectangular cells grid", () => {
		const maze = generateMaze({ width: 8, height: 6, seed: 1, type: "circle" });

		expect(maze.type).toBe("circle");
		expect(maze.cells).toEqual([]);
	});

	it("carries the growing-sector topology and cell data for every algorithm (see ADR 037)", () => {
		for (const algorithm of MAZE_ALGORITHMS) {
			const maze = generateMaze({
				width: 8,
				height: 6,
				seed: 3,
				type: "circle",
				algorithm,
			});

			expect(maze.circleSectorCounts?.length).toBe(6);
			expect(
				countCircleReachableNodes({
					sectorCounts: maze.circleSectorCounts ?? [],
					cells: maze.circleCells ?? [],
				}),
			).toBe(totalCircleNodeCount(maze.circleSectorCounts ?? []));
		}
	});

	it("does not error on a 1x1 circle maze", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1, type: "circle" });

		expect(maze.circleSectorCounts).toEqual([1]);
	});

	it("does not restrict the circle type to a specific algorithm", () => {
		for (const algorithm of MAZE_ALGORITHMS) {
			expect(() =>
				generateMaze({
					width: 6,
					height: 6,
					seed: 1,
					type: "circle",
					algorithm,
				}),
			).not.toThrow();
		}
	});

	it("still applies difficulty to the growing-tree algorithm with the circle type", () => {
		const easy = generateMaze({
			width: 12,
			height: 12,
			seed: 3,
			type: "circle",
			algorithm: "growing-tree",
			difficulty: 1,
		});
		const hard = generateMaze({
			width: 12,
			height: 12,
			seed: 3,
			type: "circle",
			algorithm: "growing-tree",
			difficulty: 5,
		});

		expect(hard.circleCells).not.toEqual(easy.circleCells);
	});

	it("generates the same circle maze twice for the same seed", () => {
		const first = generateMaze({
			width: 10,
			height: 8,
			seed: 42,
			type: "circle",
			algorithm: "aldous-broder",
		});
		const second = generateMaze({
			width: 10,
			height: 8,
			seed: 42,
			type: "circle",
			algorithm: "aldous-broder",
		});

		expect(second.circleCells).toEqual(first.circleCells);
	});
});

describe("PATH_LENGTH_TARGETS / isValidPathLengthTarget / invalidPathLengthTargetMessage", () => {
	it("lists short, medium and long as the valid path length targets", () => {
		expect(PATH_LENGTH_TARGETS).toEqual(["short", "medium", "long"]);
	});

	it.each(PATH_LENGTH_TARGETS)(
		"accepts %s as a valid path length target",
		(target) => {
			expect(isValidPathLengthTarget(target)).toBe(true);
		},
	);

	it("rejects an unknown path length target", () => {
		expect(isValidPathLengthTarget("extra-long")).toBe(false);
	});

	it("describes the allowed values in the invalid path length target message", () => {
		expect(invalidPathLengthTargetMessage("extra-long")).toBe(
			'Invalid path length target "extra-long", expected one of: short, medium, long',
		);
	});
});

describe("generateMaze - pathLength option", () => {
	it("performs a single-seed generation exactly as before when pathLength is not specified", () => {
		const withOption = generateMaze({ width: 8, height: 6, seed: 42 });
		const withoutMentioningIt = generateMaze({
			width: 8,
			height: 6,
			seed: 42,
			pathLength: undefined,
		});

		expect(withOption.seed).toBe(42);
		expect(withOption.pathLength).toBeUndefined();
		expect(withoutMentioningIt).toEqual(withOption);
	});

	it("rejects an invalid pathLength value", () => {
		expect(() =>
			generateMaze({
				width: 5,
				height: 5,
				seed: 1,
				// biome-ignore lint/suspicious/noExplicitAny: deliberately passing an invalid target to test validation
				pathLength: "extra-long" as any,
			}),
		).toThrow();
	});

	it("selects the candidate with the longest solution path among the attempted seeds when pathLength is 'long'", () => {
		const width = 10;
		const height = 10;
		const seed = 100;
		const difficulty = 3;

		const attempts = Array.from({ length: PATH_LENGTH_MAX_ATTEMPTS }, (_, i) =>
			generateMaze({ width, height, seed: seed + i, difficulty }),
		);
		const lengths = attempts.map((candidate) => solveMaze(candidate).length);
		const expectedWinner = attempts[lengths.indexOf(Math.max(...lengths))];

		const result = generateMaze({
			width,
			height,
			seed,
			difficulty,
			pathLength: "long",
		});

		expect(result.seed).toBe(expectedWinner.seed);
		expect(solveMaze(result).length).toBe(Math.max(...lengths));
	});

	it("selects the candidate with the shortest solution path among the attempted seeds when pathLength is 'short'", () => {
		const width = 10;
		const height = 10;
		const seed = 100;
		const difficulty = 3;

		const attempts = Array.from({ length: PATH_LENGTH_MAX_ATTEMPTS }, (_, i) =>
			generateMaze({ width, height, seed: seed + i, difficulty }),
		);
		const lengths = attempts.map((candidate) => solveMaze(candidate).length);
		const expectedWinner = attempts[lengths.indexOf(Math.min(...lengths))];

		const result = generateMaze({
			width,
			height,
			seed,
			difficulty,
			pathLength: "short",
		});

		expect(result.seed).toBe(expectedWinner.seed);
		expect(solveMaze(result).length).toBe(Math.min(...lengths));
	});

	it("selects the candidate closest to the median solution length among the attempted seeds when pathLength is 'medium'", () => {
		const width = 10;
		const height = 10;
		const seed = 100;
		const difficulty = 3;

		const attempts = Array.from({ length: PATH_LENGTH_MAX_ATTEMPTS }, (_, i) =>
			generateMaze({ width, height, seed: seed + i, difficulty }),
		);
		const lengths = attempts.map((candidate) => solveMaze(candidate).length);
		const sorted = [...lengths].sort((a, b) => a - b);
		const median = sorted[Math.floor((sorted.length - 1) / 2)];
		const expectedWinnerIndex = lengths.reduce(
			(bestIndex, length, index) =>
				Math.abs(length - median) < Math.abs(lengths[bestIndex] - median)
					? index
					: bestIndex,
			0,
		);
		const expectedWinner = attempts[expectedWinnerIndex];

		const result = generateMaze({
			width,
			height,
			seed,
			difficulty,
			pathLength: "medium",
		});

		expect(result.seed).toBe(expectedWinner.seed);
	});

	it("generates the same maze for the same seed and pathLength target", () => {
		const first = generateMaze({
			width: 10,
			height: 10,
			seed: 7,
			pathLength: "short",
		});
		const second = generateMaze({
			width: 10,
			height: 10,
			seed: 7,
			pathLength: "short",
		});

		expect(second).toEqual(first);
	});

	it("does not throw and still returns a solvable maze on a tiny grid with little variation between candidates", () => {
		const maze = generateMaze({
			width: 2,
			height: 2,
			seed: 1,
			pathLength: "long",
		});

		expect(maze.width).toBe(2);
		expect(maze.height).toBe(2);
		expect(solveMaze(maze).length).toBeGreaterThan(0);
	});

	it("also works for the circle maze type", () => {
		const result = generateMaze({
			width: 10,
			height: 10,
			seed: 3,
			type: "circle",
			pathLength: "long",
		});

		expect(result.type).toBe("circle");
		expect(solveMaze(result).length).toBeGreaterThan(0);
	});
});
