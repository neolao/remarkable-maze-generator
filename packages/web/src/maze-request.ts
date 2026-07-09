import {
	type Maze,
	type SolutionDisplayMode,
	generateMaze,
} from "@remarkable-maze-generator/core";

export const SOLUTION_MODES: SolutionDisplayMode[] = [
	"none",
	"extra-page",
	"overlay",
];

export interface GenerateMazeRequestBody {
	width?: number;
	height?: number;
	seed?: number;
	difficulty?: number;
	solution?: string;
}

export function isValidSolutionMode(
	value: string,
): value is SolutionDisplayMode {
	return (SOLUTION_MODES as string[]).includes(value);
}

export function invalidSolutionModeMessage(value: string): string {
	return `Invalid solution mode "${value}", expected one of: ${SOLUTION_MODES.join(", ")}`;
}

export function buildMazeFromRequest(body: GenerateMazeRequestBody): Maze {
	const { width, height, seed, difficulty } = body;
	return generateMaze({
		width: width as number,
		height: height as number,
		seed: seed ?? Math.floor(Math.random() * 2 ** 31),
		difficulty,
	});
}
