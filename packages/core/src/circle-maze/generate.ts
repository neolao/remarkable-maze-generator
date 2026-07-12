import { generateCircleCellsForAlgorithm } from "../maze-algorithm-registry.js";
import type { CircleCell } from "./cells.js";

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
 * reimplemented against this graph rather than shared with it; the
 * per-algorithm dispatch itself lives in the shared registry (see ADR 049)
 * so it stays in sync with the rectangular grid's dispatch.
 */
export function generateCircleMaze({
	width,
	height,
	seed,
	difficulty = MIN_DIFFICULTY,
	algorithm = DEFAULT_ALGORITHM,
}: GenerateCircleMazeOptions): CircleMaze {
	return generateCircleCellsForAlgorithm(algorithm, {
		width,
		height,
		seed,
		difficulty,
	});
}
