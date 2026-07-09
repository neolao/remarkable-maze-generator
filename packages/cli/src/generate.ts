import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	type SolutionDisplayMode,
	generateMaze,
	invalidSolutionModeMessage,
	isValidSolutionMode,
	renderMazeToPdf,
} from "@remarkable-maze-generator/core";

const DEFAULT_OUTPUT_FILENAME = "maze.pdf";

export interface GenerateOptions {
	width: number;
	height: number;
	seed?: number;
	difficulty?: number;
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

	const maze = generateMaze({
		width: options.width,
		height: options.height,
		seed,
		difficulty: options.difficulty,
	});
	const pdfBytes = await renderMazeToPdf(maze, {
		solution: options.solution as SolutionDisplayMode | undefined,
	});
	await writeFile(outputPath, pdfBytes);

	return { outputPath };
}
