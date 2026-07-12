import { generateCircleAldousBroderMaze } from "./circle-maze/aldous-broder.js";
import type { CircleMaze } from "./circle-maze/generate.js";
import { generateCircleGrowingTreeMaze } from "./circle-maze/growing-tree.js";
import { generateCircleKruskalMaze } from "./circle-maze/kruskal.js";
import { generateCircleWilsonMaze } from "./circle-maze/wilson.js";
import { generateAldousBroderMaze } from "./maze-algorithms/aldous-broder.js";
import { generateGrowingTreeMaze } from "./maze-algorithms/growing-tree.js";
import { generateKruskalMaze } from "./maze-algorithms/kruskal.js";
import { generateWilsonMaze } from "./maze-algorithms/wilson.js";
import type { Cell, MazeAlgorithm, MazeCrossing } from "./maze-domain.js";

export interface GenerateRectangularCellsOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
	allowsCrossings: boolean;
}

export interface GeneratedCells {
	cells: Cell[][];
	crossings: MazeCrossing[];
}

export interface GenerateCircleAlgorithmOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
	allowsCrossings: boolean;
}

interface MazeAlgorithmStrategy {
	generateRectangular(options: GenerateRectangularCellsOptions): GeneratedCells;
	generateCircle(options: GenerateCircleAlgorithmOptions): CircleMaze;
}

// The single registration point for a generation algorithm's two
// implementations — one against the rectangular grid, one against the
// circle's growing-sector graph (see ADR 037) — replacing what used to be
// two separate switch statements (in maze.ts and circle-maze/generate.ts)
// that had to be kept in sync by hand (see ADR 049).
const MAZE_ALGORITHM_STRATEGIES: Record<MazeAlgorithm, MazeAlgorithmStrategy> =
	{
		"growing-tree": {
			generateRectangular: generateGrowingTreeMaze,
			generateCircle: generateCircleGrowingTreeMaze,
		},
		kruskal: {
			generateRectangular: (options) => ({
				cells: generateKruskalMaze(options).cells,
				crossings: [],
			}),
			generateCircle: ({ width, height, seed }) => ({
				...generateCircleKruskalMaze({ width, height, seed }),
				crossings: [],
			}),
		},
		wilson: {
			generateRectangular: (options) => ({
				cells: generateWilsonMaze(options).cells,
				crossings: [],
			}),
			generateCircle: ({ width, height, seed }) => ({
				...generateCircleWilsonMaze({ width, height, seed }),
				crossings: [],
			}),
		},
		"aldous-broder": {
			generateRectangular: (options) => ({
				cells: generateAldousBroderMaze(options).cells,
				crossings: [],
			}),
			generateCircle: ({ width, height, seed }) => ({
				...generateCircleAldousBroderMaze({ width, height, seed }),
				crossings: [],
			}),
		},
	};

export function generateRectangularCells(
	algorithm: MazeAlgorithm,
	options: GenerateRectangularCellsOptions,
): GeneratedCells {
	return MAZE_ALGORITHM_STRATEGIES[algorithm].generateRectangular(options);
}

export function generateCircleCellsForAlgorithm(
	algorithm: MazeAlgorithm,
	options: GenerateCircleAlgorithmOptions,
): CircleMaze {
	return MAZE_ALGORITHM_STRATEGIES[algorithm].generateCircle(options);
}
