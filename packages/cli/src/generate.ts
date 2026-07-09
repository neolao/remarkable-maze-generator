import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	type MazeType,
	type SolutionDisplayMode,
	generateMaze,
	invalidMazeTypeMessage,
	invalidSolutionModeMessage,
	isValidMazeType,
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
	solution?: string;
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

	const maze = generateMaze({
		width: options.width,
		height: options.height,
		seed,
		difficulty: options.difficulty,
		type: options.type as MazeType | undefined,
	});
	const pdfBytes = await renderMazeToPdf(maze, {
		solution: options.solution as SolutionDisplayMode | undefined,
	});
	await writeFile(outputPath, pdfBytes);

	return { outputPath };
}
