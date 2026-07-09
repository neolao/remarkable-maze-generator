import {
	type Maze,
	type MazeType,
	generateMaze,
	invalidMazeTypeMessage,
	invalidSolutionModeMessage,
	isValidMazeType,
	isValidSolutionMode,
} from "@remarkable-maze-generator/core";

export {
	invalidMazeTypeMessage,
	invalidSolutionModeMessage,
	isValidMazeType,
	isValidSolutionMode,
};

export interface GenerateMazeRequestBody {
	width?: number;
	height?: number;
	seed?: number;
	difficulty?: number;
	type?: string;
	solution?: string;
	showSolution?: boolean;
}

export function buildMazeFromRequest(body: GenerateMazeRequestBody): Maze {
	const { width, height, seed, difficulty, type } = body;
	return generateMaze({
		width: width as number,
		height: height as number,
		seed: seed ?? Math.floor(Math.random() * 2 ** 31),
		difficulty,
		type: type as MazeType | undefined,
	});
}
