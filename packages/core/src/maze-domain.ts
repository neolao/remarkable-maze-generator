import type { CircleCell } from "./circle-maze/cells.js";

export interface CellWalls {
	north: boolean;
	south: boolean;
	east: boolean;
	west: boolean;
}

export interface Cell {
	walls: CellWalls;
}

export interface MazeCrossing {
	x: number;
	y: number;
	/**
	 * Which axis was the pre-existing passage that got tunneled under. Purely a
	 * rendering hint (see ADR 023/024) — both axes are real, walkable
	 * connections either way.
	 */
	underAxis: "vertical" | "horizontal";
}

export type MazeType = "rectangle" | "rectangle-crossing" | "circle";

export const MAZE_TYPES: MazeType[] = [
	"rectangle",
	"rectangle-crossing",
	"circle",
];

export function isValidMazeType(value: string): value is MazeType {
	return (MAZE_TYPES as string[]).includes(value);
}

export function invalidMazeTypeMessage(value: string): string {
	return `Invalid maze type "${value}", expected one of: ${MAZE_TYPES.join(", ")}`;
}

export type MazeAlgorithm =
	| "growing-tree"
	| "kruskal"
	| "wilson"
	| "aldous-broder";

export const MAZE_ALGORITHMS: MazeAlgorithm[] = [
	"growing-tree",
	"kruskal",
	"wilson",
	"aldous-broder",
];

export function isValidMazeAlgorithm(value: string): value is MazeAlgorithm {
	return (MAZE_ALGORITHMS as string[]).includes(value);
}

export function invalidMazeAlgorithmMessage(value: string): string {
	return `Invalid maze algorithm "${value}", expected one of: ${MAZE_ALGORITHMS.join(", ")}`;
}

export type PathLengthTarget = "short" | "medium" | "long";

export const PATH_LENGTH_TARGETS: PathLengthTarget[] = [
	"short",
	"medium",
	"long",
];

export function isValidPathLengthTarget(
	value: string,
): value is PathLengthTarget {
	return (PATH_LENGTH_TARGETS as string[]).includes(value);
}

export function invalidPathLengthTargetMessage(value: string): string {
	return `Invalid path length target "${value}", expected one of: ${PATH_LENGTH_TARGETS.join(", ")}`;
}

// Bounds the number of candidate generations tried when `pathLength` is set
// (see ADR 046), trading match quality for a predictable worst-case
// generation time. Used as the default when `pathLengthCandidateCount` is
// not provided.
export const PATH_LENGTH_MAX_ATTEMPTS = 10;

// Upper bound on a user-supplied `pathLengthCandidateCount` (see ADR 047):
// each candidate is a full generation + solve pass, so an unbounded value
// would let a single request turn into an unpredictably long-running loop.
export const MAX_PATH_LENGTH_CANDIDATE_COUNT = 50;

export interface Maze {
	width: number;
	height: number;
	cells: Cell[][];
	type?: MazeType;
	seed?: number;
	difficulty?: number;
	algorithm?: MazeAlgorithm;
	crossings?: MazeCrossing[];
	/**
	 * The real growing-sector circle topology (see ADR 037) — only set for
	 * `type: "circle"`, whose cells don't fit the rectangular `cells` grid
	 * above (a variable number of sectors per ring, not a uniform 2D array),
	 * so it lives in these two separate fields instead. `cells` is an empty
	 * array on a circle maze.
	 */
	circleSectorCounts?: number[];
	circleCells?: CircleCell[][];
	pathLength?: PathLengthTarget;
}

export interface GenerateMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty?: number;
	type?: MazeType;
	algorithm?: MazeAlgorithm;
	pathLength?: PathLengthTarget;
	pathLengthCandidateCount?: number;
}

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;
export const DEFAULT_MAZE_TYPE: MazeType = "rectangle";
export const DEFAULT_MAZE_ALGORITHM: MazeAlgorithm = "growing-tree";

export const MAX_DIMENSION = 200;

export function validateDimensions(width: number, height: number): void {
	if (
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width <= 0 ||
		height <= 0 ||
		width > MAX_DIMENSION ||
		height > MAX_DIMENSION
	) {
		throw new Error(
			`Maze width and height must be integers between 1 and ${MAX_DIMENSION}, got width=${width}, height=${height}`,
		);
	}
}

export function validateDifficulty(difficulty: number): void {
	if (
		!Number.isInteger(difficulty) ||
		difficulty < MIN_DIFFICULTY ||
		difficulty > MAX_DIFFICULTY
	) {
		throw new Error(
			`Maze difficulty must be an integer between ${MIN_DIFFICULTY} and ${MAX_DIFFICULTY}, got difficulty=${difficulty}`,
		);
	}
}

export function validateType(type: MazeType): void {
	if (!isValidMazeType(type)) {
		throw new Error(invalidMazeTypeMessage(type));
	}
}

export function validateAlgorithm(algorithm: MazeAlgorithm): void {
	if (!isValidMazeAlgorithm(algorithm)) {
		throw new Error(invalidMazeAlgorithmMessage(algorithm));
	}
}

export function validatePathLengthTarget(pathLength: PathLengthTarget): void {
	if (!isValidPathLengthTarget(pathLength)) {
		throw new Error(invalidPathLengthTargetMessage(pathLength));
	}
}

export function validatePathLengthCandidateCount(
	pathLength: PathLengthTarget | undefined,
	candidateCount: number | undefined,
): void {
	if (candidateCount === undefined) return;

	if (pathLength === undefined) {
		throw new Error(
			'"pathLengthCandidateCount" can only be used together with a "pathLength" target',
		);
	}

	if (
		!Number.isInteger(candidateCount) ||
		candidateCount <= 0 ||
		candidateCount > MAX_PATH_LENGTH_CANDIDATE_COUNT
	) {
		throw new Error(
			`Path length candidate count must be an integer between 1 and ${MAX_PATH_LENGTH_CANDIDATE_COUNT}, got pathLengthCandidateCount=${candidateCount}`,
		);
	}
}

// Bridge crossings are carved as part of the growing-tree traversal itself
// (see ADR 024) — no other algorithm knows how to produce them (see ADR 033).
export function validateTypeAlgorithmCompatibility(
	type: MazeType,
	algorithm: MazeAlgorithm,
): void {
	if (type === "rectangle-crossing" && algorithm !== "growing-tree") {
		throw new Error(
			`Maze type "rectangle-crossing" is only supported by the "growing-tree" algorithm, got algorithm="${algorithm}"`,
		);
	}
}
