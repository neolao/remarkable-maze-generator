import {
	type Maze,
	type MazeAlgorithm,
	type MazeType,
	generateMaze,
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidSolutionModeMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidSolutionMode,
} from "@remarkable-maze-generator/core";

export {
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidSolutionModeMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidSolutionMode,
};

export interface GenerateMazeRequestBody {
	width?: number;
	height?: number;
	seed?: number;
	difficulty?: number;
	type?: string;
	algorithm?: string;
	solution?: string;
	showSolution?: boolean;
}

export function buildMazeFromRequest(body: GenerateMazeRequestBody): Maze {
	const { width, height, seed, difficulty, type, algorithm } = body;
	return generateMaze({
		width: width as number,
		height: height as number,
		seed: seed ?? Math.floor(Math.random() * 2 ** 31),
		difficulty,
		type: type as MazeType | undefined,
		algorithm: algorithm as MazeAlgorithm | undefined,
	});
}
