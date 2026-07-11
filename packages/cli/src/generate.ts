import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	type MazeAlgorithm,
	type MazeType,
	type PathLengthTarget,
	type SolutionDisplayMode,
	generateMaze,
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidPathLengthTargetMessage,
	invalidSolutionModeMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidPathLengthTarget,
	isValidSolutionMode,
	renderMazeToPdf,
} from "@remarkable-maze-generator/core";

const DEFAULT_OUTPUT_FILENAME = "maze.pdf";

export interface GenerateOptions {
	width: number;
	height: number;
	seed?: number;
	difficulty?: number;
	type?: string;
	algorithm?: string;
	solution?: string;
	pathLength?: string;
	pathLengthCandidateCount?: number;
	output?: string;
	cwd?: string;
}

export interface GenerateResult {
	outputPath: string;
}

export async function runGenerate(
	options: GenerateOptions,
): Promise<GenerateResult> {
	const cwd = options.cwd ?? process.cwd();
	const outputPath = resolve(cwd, options.output ?? DEFAULT_OUTPUT_FILENAME);
	const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);

	if (
		options.solution !== undefined &&
		!isValidSolutionMode(options.solution)
	) {
		throw new Error(invalidSolutionModeMessage(options.solution));
	}
	if (options.type !== undefined && !isValidMazeType(options.type)) {
		throw new Error(invalidMazeTypeMessage(options.type));
	}
	if (
		options.algorithm !== undefined &&
		!isValidMazeAlgorithm(options.algorithm)
	) {
		throw new Error(invalidMazeAlgorithmMessage(options.algorithm));
	}
	if (
		options.pathLength !== undefined &&
		!isValidPathLengthTarget(options.pathLength)
	) {
		throw new Error(invalidPathLengthTargetMessage(options.pathLength));
	}

	const maze = generateMaze({
		width: options.width,
		height: options.height,
		seed,
		difficulty: options.difficulty,
		type: options.type as MazeType | undefined,
		algorithm: options.algorithm as MazeAlgorithm | undefined,
		pathLength: options.pathLength as PathLengthTarget | undefined,
		pathLengthCandidateCount: options.pathLengthCandidateCount,
	});
	const pdfBytes = await renderMazeToPdf(maze, {
		solution: options.solution as SolutionDisplayMode | undefined,
	});
	await writeFile(outputPath, pdfBytes);

	return { outputPath };
}
