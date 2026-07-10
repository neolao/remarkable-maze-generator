import { generateAldousBroderMaze } from "./maze-algorithms/aldous-broder.js";
import { generateGrowingTreeMaze } from "./maze-algorithms/growing-tree.js";
import { generateKruskalMaze } from "./maze-algorithms/kruskal.js";
import { generateWilsonMaze } from "./maze-algorithms/wilson.js";

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

export interface Maze {
	width: number;
	height: number;
	cells: Cell[][];
	type?: MazeType;
	seed?: number;
	difficulty?: number;
	algorithm?: MazeAlgorithm;
	crossings?: MazeCrossing[];
}

export interface GenerateMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty?: number;
	type?: MazeType;
	algorithm?: MazeAlgorithm;
}

export interface GenerateMazeBatchOptions {
	width: number;
	height: number;
	seed: number;
	count: number;
	difficulty?: number;
	type?: MazeType;
	algorithm?: MazeAlgorithm;
}

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_MAZE_TYPE: MazeType = "rectangle";
const DEFAULT_MAZE_ALGORITHM: MazeAlgorithm = "growing-tree";

function validateDimensions(width: number, height: number): void {
	if (
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width <= 0 ||
		height <= 0
	) {
		throw new Error(
			`Maze width and height must be positive integers, got width=${width}, height=${height}`,
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
	wrapsHorizontally: boolean;
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

export function generateMaze({
	width,
	height,
	seed,
	difficulty = MIN_DIFFICULTY,
	type = DEFAULT_MAZE_TYPE,
	algorithm = DEFAULT_MAZE_ALGORITHM,
}: GenerateMazeOptions): Maze {
	validateDimensions(width, height);
	validateDifficulty(difficulty);
	validateType(type);
	validateAlgorithm(algorithm);
	validateTypeAlgorithmCompatibility(type, algorithm);

	const allowsCrossings = type === "rectangle-crossing";
	const wrapsHorizontally = type === "circle";
	const { cells, crossings } = generateCells(algorithm, {
		width,
		height,
		seed,
		difficulty,
		allowsCrossings,
		wrapsHorizontally,
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

export function generateMazeBatch({
	width,
	height,
	seed,
	count,
	difficulty,
	type,
	algorithm,
}: GenerateMazeBatchOptions): Maze[] {
	if (!Number.isInteger(count) || count <= 0) {
		throw new Error(
			`Maze batch count must be a positive integer, got count=${count}`,
		);
	}

	return Array.from({ length: count }, (_, index) =>
		generateMaze({
			width,
			height,
			seed: seed + index,
			difficulty,
			type,
			algorithm,
		}),
	);
}
