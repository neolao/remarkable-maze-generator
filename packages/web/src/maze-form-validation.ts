import {
	type MazeType,
	invalidMazeTypeMessage,
	isValidMazeType,
} from "@remarkable-maze-generator/core";

export interface MazeFormInput {
	width: string;
	height: string;
	difficulty: string;
	type?: string;
}

export interface MazeFormValue {
	width: number;
	height: number;
	difficulty: number;
	type: MazeType;
}

export type MazeFormValidationResult =
	| { valid: true; value: MazeFormValue }
	| { valid: false; error: string };

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_MAZE_TYPE: MazeType = "rectangle";

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

export function validateMazeFormInput(
	input: MazeFormInput,
): MazeFormValidationResult {
	try {
		const width = parsePositiveInteger(input.width, "Width");
		const height = parsePositiveInteger(input.height, "Height");
		const difficulty = parseDifficulty(input.difficulty);
		const type = parseMazeType(input.type);

		return { valid: true, value: { width, height, difficulty, type } };
	} catch (error) {
		return { valid: false, error: (error as Error).message };
	}
}
