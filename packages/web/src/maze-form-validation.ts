import {
	type MazeAlgorithm,
	type MazeType,
	type PathLengthTarget,
	type SolutionDisplayMode,
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidPathLengthTargetMessage,
	invalidSolutionModeMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidPathLengthTarget,
	isValidSolutionMode,
} from "@remarkable-maze-generator/core";

export interface MazeFormInput {
	width: string;
	height: string;
	difficulty: string;
	type?: string;
	algorithm?: string;
	solution?: string;
	pathLength?: string;
}

export interface MazeFormValue {
	width: number;
	height: number;
	difficulty: number;
	type: MazeType;
	algorithm: MazeAlgorithm;
	solution: SolutionDisplayMode;
	pathLength?: PathLengthTarget;
}

export type MazeFormValidationResult =
	| { valid: true; value: MazeFormValue }
	| { valid: false; error: string };

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_MAZE_TYPE: MazeType = "rectangle";
const DEFAULT_MAZE_ALGORITHM: MazeAlgorithm = "growing-tree";
const DEFAULT_SOLUTION_MODE: SolutionDisplayMode = "none";

function parsePositiveInteger(raw: string, fieldLabel: string): number {
	if (raw.trim() === "" || !/^-?\d+$/.test(raw.trim())) {
		throw new Error(`${fieldLabel} must be a whole number`);
	}

	const value = Number.parseInt(raw, 10);
	if (value <= 0) {
		throw new Error(`${fieldLabel} must be greater than zero`);
	}

	return value;
}

function parseDifficulty(raw: string): number {
	if (raw.trim() === "" || !/^-?\d+$/.test(raw.trim())) {
		throw new Error("Difficulty must be a whole number");
	}

	const value = Number.parseInt(raw, 10);
	if (value < MIN_DIFFICULTY || value > MAX_DIFFICULTY) {
		throw new Error(
			`Difficulty must be between ${MIN_DIFFICULTY} and ${MAX_DIFFICULTY}`,
		);
	}

	return value;
}

function parseMazeType(raw: string | undefined): MazeType {
	const type = raw?.trim() || DEFAULT_MAZE_TYPE;
	if (!isValidMazeType(type)) {
		throw new Error(invalidMazeTypeMessage(type));
	}
	return type;
}

function parseMazeAlgorithm(raw: string | undefined): MazeAlgorithm {
	const algorithm = raw?.trim() || DEFAULT_MAZE_ALGORITHM;
	if (!isValidMazeAlgorithm(algorithm)) {
		throw new Error(invalidMazeAlgorithmMessage(algorithm));
	}
	return algorithm;
}

function parseSolutionMode(raw: string | undefined): SolutionDisplayMode {
	const solution = raw?.trim() || DEFAULT_SOLUTION_MODE;
	if (!isValidSolutionMode(solution)) {
		throw new Error(invalidSolutionModeMessage(solution));
	}
	return solution;
}

// Unlike type/algorithm/solution, an unset pathLength has no default value to
// fall back to: it means "no path-length filtering", a distinct behavior from
// any of the three actual targets (see ADR 046).
function parsePathLength(
	raw: string | undefined,
): PathLengthTarget | undefined {
	const trimmed = raw?.trim();
	if (!trimmed) return undefined;
	if (!isValidPathLengthTarget(trimmed)) {
		throw new Error(invalidPathLengthTargetMessage(trimmed));
	}
	return trimmed;
}

export function validateMazeFormInput(
	input: MazeFormInput,
): MazeFormValidationResult {
	try {
		const width = parsePositiveInteger(input.width, "Width");
		const height = parsePositiveInteger(input.height, "Height");
		const difficulty = parseDifficulty(input.difficulty);
		const type = parseMazeType(input.type);
		const algorithm = parseMazeAlgorithm(input.algorithm);
		const solution = parseSolutionMode(input.solution);
		const pathLength = parsePathLength(input.pathLength);

		return {
			valid: true,
			value: {
				width,
				height,
				difficulty,
				type,
				algorithm,
				solution,
				pathLength,
			},
		};
	} catch (error) {
		return { valid: false, error: (error as Error).message };
	}
}
