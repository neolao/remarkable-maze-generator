import type { CircleCell } from "./circle-maze/cells.js";
import { generateCircleMaze } from "./circle-maze/generate.js";
import { generateAldousBroderMaze } from "./maze-algorithms/aldous-broder.js";
import { generateGrowingTreeMaze } from "./maze-algorithms/growing-tree.js";
import { generateKruskalMaze } from "./maze-algorithms/kruskal.js";
import { generateWilsonMaze } from "./maze-algorithms/wilson.js";
import { solveMaze } from "./maze-solver.js";

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

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_MAZE_TYPE: MazeType = "rectangle";
const DEFAULT_MAZE_ALGORITHM: MazeAlgorithm = "growing-tree";

const MAX_DIMENSION = 200;

function validateDimensions(width: number, height: number): void {
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

function validateDifficulty(difficulty: number): void {
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

function validateType(type: MazeType): void {
	if (!isValidMazeType(type)) {
		throw new Error(invalidMazeTypeMessage(type));
	}
}

function validateAlgorithm(algorithm: MazeAlgorithm): void {
	if (!isValidMazeAlgorithm(algorithm)) {
		throw new Error(invalidMazeAlgorithmMessage(algorithm));
	}
}

function validatePathLengthTarget(pathLength: PathLengthTarget): void {
	if (!isValidPathLengthTarget(pathLength)) {
		throw new Error(invalidPathLengthTargetMessage(pathLength));
	}
}

function validatePathLengthCandidateCount(
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
function validateTypeAlgorithmCompatibility(
	type: MazeType,
	algorithm: MazeAlgorithm,
): void {
	if (type === "rectangle-crossing" && algorithm !== "growing-tree") {
		throw new Error(
			`Maze type "rectangle-crossing" is only supported by the "growing-tree" algorithm, got algorithm="${algorithm}"`,
		);
	}
}

interface GenerateCellsOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
	allowsCrossings: boolean;
}

interface GeneratedCells {
	cells: Cell[][];
	crossings: MazeCrossing[];
}

function generateCells(
	algorithm: MazeAlgorithm,
	options: GenerateCellsOptions,
): GeneratedCells {
	switch (algorithm) {
		case "growing-tree":
			return generateGrowingTreeMaze(options);
		case "kruskal":
			return { cells: generateKruskalMaze(options).cells, crossings: [] };
		case "wilson":
			return { cells: generateWilsonMaze(options).cells, crossings: [] };
		case "aldous-broder":
			return { cells: generateAldousBroderMaze(options).cells, crossings: [] };
	}
}

interface GenerateCandidateOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
	type: MazeType;
	algorithm: MazeAlgorithm;
}

function generateMazeCandidate({
	width,
	height,
	seed,
	difficulty,
	type,
	algorithm,
}: GenerateCandidateOptions): Maze {
	if (type === "circle") {
		const { sectorCounts, cells: circleCells } = generateCircleMaze({
			width,
			height,
			seed,
			difficulty,
			algorithm,
		});

		return {
			width,
			height,
			cells: [],
			type,
			seed,
			difficulty,
			algorithm,
			circleSectorCounts: sectorCounts,
			circleCells,
		};
	}

	const allowsCrossings = type === "rectangle-crossing";
	const { cells, crossings } = generateCells(algorithm, {
		width,
		height,
		seed,
		difficulty,
		allowsCrossings,
	});

	return {
		width,
		height,
		cells,
		type,
		seed,
		difficulty,
		algorithm,
		crossings: allowsCrossings ? crossings : undefined,
	};
}

// Ranks candidates by their solution path length (see ADR 046): "short" and
// "long" pick the extremes, "medium" picks whichever candidate lands closest
// to the (lower) median — ties keep the earliest-generated candidate, so
// selection stays deterministic for a given base seed.
function selectCandidateByPathLength(
	candidates: Maze[],
	pathLength: PathLengthTarget,
): Maze {
	const lengths = candidates.map((candidate) => solveMaze(candidate).length);

	if (pathLength === "short") {
		return candidates[lengths.indexOf(Math.min(...lengths))];
	}

	if (pathLength === "long") {
		return candidates[lengths.indexOf(Math.max(...lengths))];
	}

	const sortedLengths = [...lengths].sort((a, b) => a - b);
	const median = sortedLengths[Math.floor((sortedLengths.length - 1) / 2)];
	const winnerIndex = lengths.reduce(
		(bestIndex, length, index) =>
			Math.abs(length - median) < Math.abs(lengths[bestIndex] - median)
				? index
				: bestIndex,
		0,
	);

	return candidates[winnerIndex];
}

export function generateMaze({
	width,
	height,
	seed,
	difficulty = MIN_DIFFICULTY,
	type = DEFAULT_MAZE_TYPE,
	algorithm = DEFAULT_MAZE_ALGORITHM,
	pathLength,
	pathLengthCandidateCount,
}: GenerateMazeOptions): Maze {
	validateDimensions(width, height);
	validateDifficulty(difficulty);
	validateType(type);
	validateAlgorithm(algorithm);
	validateTypeAlgorithmCompatibility(type, algorithm);
	validatePathLengthCandidateCount(pathLength, pathLengthCandidateCount);

	if (pathLength === undefined) {
		return generateMazeCandidate({
			width,
			height,
			seed,
			difficulty,
			type,
			algorithm,
		});
	}

	validatePathLengthTarget(pathLength);

	const candidates = Array.from(
		{ length: pathLengthCandidateCount ?? PATH_LENGTH_MAX_ATTEMPTS },
		(_, attempt) =>
			generateMazeCandidate({
				width,
				height,
				seed: seed + attempt,
				difficulty,
				type,
				algorithm,
			}),
	);

	return { ...selectCandidateByPathLength(candidates, pathLength), pathLength };
}
