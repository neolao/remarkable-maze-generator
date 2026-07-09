#!/usr/bin/env node
import { CORE_VERSION } from "@remarkable-maze-generator/core";
import { Command } from "commander";
import { parseIntegerOption } from "./cli-options.js";
import { runGenerateAndSend } from "./generate-and-send.js";
import { runGenerate } from "./generate.js";
import { runSend } from "./send.js";

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
	.option(
		"--difficulty <number>",
		"difficulty from 1 (easiest, fewest branch points) to 5 (hardest, most branch points); defaults to 1",
	)
	.option("--output <path>", "output PDF file path (defaults to ./maze.pdf)")
	.option(
		"--type <type>",
		"maze type: rectangle, or rectangle-crossing (defaults to rectangle)",
	)
	.option(
		"--solution <mode>",
		"solution display mode: none, extra-page, or overlay (defaults to none)",
	)
	.action(
		async (opts: {
			width: string;
			height: string;
			seed?: string;
			difficulty?: string;
			type?: string;
			solution?: string;
			output?: string;
		}) => {
			try {
				const width = parseIntegerOption(opts.width, "--width");
				const height = parseIntegerOption(opts.height, "--height");
				const seed =
					opts.seed === undefined
						? undefined
						: parseIntegerOption(opts.seed, "--seed");
				const difficulty =
					opts.difficulty === undefined
						? undefined
						: parseIntegerOption(opts.difficulty, "--difficulty");

				const { outputPath } = await runGenerate({
					width,
					height,
					seed,
					difficulty,
					type: opts.type,
					solution: opts.solution,
					output: opts.output,
				});
				console.log(`Maze written to ${outputPath}`);
			} catch (error) {
				console.error(`Error: ${(error as Error).message}`);
				process.exitCode = 1;
			}
		},
	);

program
	.command("send")
	.description("Upload a local PDF file to reMarkable Cloud")
	.argument("<file>", "path to the local PDF file to upload")
	.option(
		"--visible-name <name>",
		"name to show on the reMarkable tablet (defaults to the file name)",
	)
	.option(
		"--folder <name>",
		"reMarkable Cloud folder to upload into (must already exist)",
	)
	.action(
		async (file: string, opts: { visibleName?: string; folder?: string }) => {
			try {
				const { visibleName } = await runSend({
					filePath: file,
					visibleName: opts.visibleName,
					folder: opts.folder,
				});
				console.log(
					`Uploaded "${file}" to reMarkable Cloud as "${visibleName}"${opts.folder ? ` in "${opts.folder}"` : ""}.`,
				);
			} catch (error) {
				console.error(`Error: ${(error as Error).message}`);
				process.exitCode = 1;
			}
		},
	);

program
	.command("generate-and-send")
	.description(
		"Generate a maze, save it as a PDF, and upload it to reMarkable Cloud in one step",
	)
	.requiredOption("--width <number>", "maze width in cells")
	.requiredOption("--height <number>", "maze height in cells")
	.option("--seed <number>", "random seed (defaults to a random value)")
	.option(
		"--difficulty <number>",
		"difficulty from 1 (easiest, fewest branch points) to 5 (hardest, most branch points); defaults to 1",
	)
	.option("--output <path>", "output PDF file path (defaults to ./maze.pdf)")
	.option(
		"--visible-name <name>",
		"name to show on the reMarkable tablet (defaults to rectangle-<width>x<height>-<seed>)",
	)
	.option(
		"--folder <name>",
		"reMarkable Cloud folder to upload into (must already exist)",
	)
	.option(
		"--type <type>",
		"maze type: rectangle, or rectangle-crossing (defaults to rectangle)",
	)
	.option(
		"--solution <mode>",
		"solution display mode: none, extra-page, or overlay (defaults to none)",
	)
	.action(
		async (opts: {
			width: string;
			height: string;
			seed?: string;
			difficulty?: string;
			output?: string;
			visibleName?: string;
			folder?: string;
			type?: string;
			solution?: string;
		}) => {
			try {
				const width = parseIntegerOption(opts.width, "--width");
				const height = parseIntegerOption(opts.height, "--height");
				const seed =
					opts.seed === undefined
						? undefined
						: parseIntegerOption(opts.seed, "--seed");
				const difficulty =
					opts.difficulty === undefined
						? undefined
						: parseIntegerOption(opts.difficulty, "--difficulty");

				const { outputPath, visibleName } = await runGenerateAndSend({
					width,
					height,
					seed,
					difficulty,
					type: opts.type,
					solution: opts.solution,
					output: opts.output,
					visibleName: opts.visibleName,
					folder: opts.folder,
				});
				console.log(
					`Maze written to ${outputPath} and uploaded to reMarkable Cloud as "${visibleName}"${opts.folder ? ` in "${opts.folder}"` : ""}.`,
				);
			} catch (error) {
				console.error(`Error: ${(error as Error).message}`);
				process.exitCode = 1;
			}
		},
	);

program.parse();
