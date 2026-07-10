import { generateCircleAldousBroderMaze } from "./aldous-broder.js";
import type { CircleCell } from "./cells.js";
import { generateCircleGrowingTreeMaze } from "./growing-tree.js";
import { generateCircleKruskalMaze } from "./kruskal.js";
import { generateCircleWilsonMaze } from "./wilson.js";

export type CircleMazeAlgorithm =
	| "growing-tree"
	| "kruskal"
	| "wilson"
	| "aldous-broder";

const MIN_DIFFICULTY = 1;
const DEFAULT_ALGORITHM: CircleMazeAlgorithm = "growing-tree";

export interface GenerateCircleMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty?: number;
	algorithm?: CircleMazeAlgorithm;
}

export interface CircleMaze {
	sectorCounts: number[];
	cells: CircleCell[][];
}

/**
 * Generates a real growing-sector circular maze (see ADR 037) — the
 * innermost ring starts with `width` sectors, growing outward as needed to
 * keep passages from ballooning tangentially, with `height` rings total.
 * Same 4 selectable algorithms as the rectangular grid, entirely
 * reimplemented against this graph rather than shared with it.
 */
export function generateCircleMaze({
	width,
	height,
	seed,
	difficulty = MIN_DIFFICULTY,
	algorithm = DEFAULT_ALGORITHM,
}: GenerateCircleMazeOptions): CircleMaze {
	switch (algorithm) {
		case "growing-tree":
			return generateCircleGrowingTreeMaze({ width, height, seed, difficulty });
		case "kruskal":
			return generateCircleKruskalMaze({ width, height, seed });
		case "wilson":
			return generateCircleWilsonMaze({ width, height, seed });
		case "aldous-broder":
			return generateCircleAldousBroderMaze({ width, height, seed });
	}
}
