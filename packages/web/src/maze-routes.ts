import {
	type SolutionDisplayMode,
	generateMaze,
	renderMazeToPdf,
} from "@remarkable-maze-generator/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const SOLUTION_MODES: SolutionDisplayMode[] = ["none", "extra-page", "overlay"];

interface GenerateMazeRequestBody {
	width?: number;
	height?: number;
	seed?: number;
	difficulty?: number;
	solution?: string;
}

function isValidSolutionMode(value: string): value is SolutionDisplayMode {
	return (SOLUTION_MODES as string[]).includes(value);
}

async function handleGenerateMaze(
	request: FastifyRequest<{ Body: GenerateMazeRequestBody }>,
	reply: FastifyReply,
) {
	const { width, height, seed, difficulty, solution } = request.body ?? {};

	if (solution !== undefined && !isValidSolutionMode(solution)) {
		reply.code(400);
		return {
			error: `Invalid solution mode "${solution}", expected one of: ${SOLUTION_MODES.join(", ")}`,
		};
	}

	let pdfBytes: Uint8Array;
	try {
		const maze = generateMaze({
			width: width as number,
			height: height as number,
			seed: seed ?? Math.floor(Math.random() * 2 ** 31),
			difficulty,
		});
		pdfBytes = await renderMazeToPdf(maze, { solution });
	} catch (error) {
		reply.code(400);
		return { error: (error as Error).message };
	}

	reply.header("content-type", "application/pdf");
	return Buffer.from(pdfBytes);
}

export function registerMazeRoutes(app: FastifyInstance): void {
	app.post("/api/mazes/generate", handleGenerateMaze);
}
