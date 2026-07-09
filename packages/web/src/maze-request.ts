import {
	type Maze,
	generateMaze,
	invalidSolutionModeMessage,
	isValidSolutionMode,
} from "@remarkable-maze-generator/core";

export { invalidSolutionModeMessage, isValidSolutionMode };

export interface GenerateMazeRequestBody {
	width?: number;
	height?: number;
	seed?: number;
	difficulty?: number;
	solution?: string;
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
