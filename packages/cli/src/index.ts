#!/usr/bin/env node
import { CORE_VERSION } from "@remarkable-maze-generator/core";
import { Command } from "commander";
import { parseIntegerOption } from "./cli-options.js";
import { runGenerate } from "./generate.js";

const program = new Command();

program
	.name("remarkable-maze")
	.description("Generates mazes as PDF for reMarkable")
	.version(CORE_VERSION);

program
	.command("generate")
	.description("Generate a maze and save it as a PDF")
	.requiredOption("--width <number>", "maze width in cells")
	.requiredOption("--height <number>", "maze height in cells")
	.option("--seed <number>", "random seed (defaults to a random value)")
	.option("--output <path>", "output PDF file path (defaults to ./maze.pdf)")
	.action(
		async (opts: {
			width: string;
			height: string;
			seed?: string;
			output?: string;
		}) => {
			try {
				const width = parseIntegerOption(opts.width, "--width");
				const height = parseIntegerOption(opts.height, "--height");
				const seed =
					opts.seed === undefined
						? undefined
						: parseIntegerOption(opts.seed, "--seed");

				const { outputPath } = await runGenerate({
					width,
					height,
					seed,
					output: opts.output,
				});
				console.log(`Maze written to ${outputPath}`);
			} catch (error) {
				console.error(`Error: ${(error as Error).message}`);
				process.exitCode = 1;
			}
		},
	);

program.parse();
