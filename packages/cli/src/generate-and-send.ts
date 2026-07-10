import { runGenerate } from "./generate.js";
import { runSend } from "./send.js";

export interface GenerateAndSendOptions {
	width: number;
	height: number;
	seed?: number;
	difficulty?: number;
	type?: string;
	algorithm?: string;
	solution?: string;
	pathLength?: string;
	output?: string;
	cwd?: string;
	visibleName?: string;
	folder?: string;
	credentialsPath?: string;
	promptPairingCode?: () => Promise<string>;
}

export interface GenerateAndSendResult {
	outputPath: string;
	visibleName: string;
}

export class UploadAfterGenerateError extends Error {
	readonly outputPath: string;

	constructor(
		message: string,
		outputPath: string,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "UploadAfterGenerateError";
		this.outputPath = outputPath;
	}
}

function defaultVisibleName(
	width: number,
	height: number,
	seed: number,
): string {
	return `rectangle-${width}x${height}-${seed}`;
}

export async function runGenerateAndSend(
	options: GenerateAndSendOptions,
): Promise<GenerateAndSendResult> {
	const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);

	const { outputPath } = await runGenerate({
		width: options.width,
		height: options.height,
		seed,
		difficulty: options.difficulty,
		type: options.type,
		algorithm: options.algorithm,
		solution: options.solution,
		pathLength: options.pathLength,
		output: options.output,
		cwd: options.cwd,
	});

	const visibleName =
		options.visibleName ??
		defaultVisibleName(options.width, options.height, seed);

	try {
		await runSend({
			filePath: outputPath,
			visibleName,
			folder: options.folder,
			credentialsPath: options.credentialsPath,
			promptPairingCode: options.promptPairingCode,
		});
	} catch (cause) {
		throw new UploadAfterGenerateError(
			`Maze generated at ${outputPath}, but upload to reMarkable Cloud failed: ${(cause as Error).message}`,
			outputPath,
			{ cause },
		);
	}

	return { outputPath, visibleName };
}
