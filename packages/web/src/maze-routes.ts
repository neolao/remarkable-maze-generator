import {
	type Maze,
	type SolutionDisplayMode,
	generateMaze,
	renderMazeToPdf,
	renderMazeToSvg,
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

function buildMazeFromRequest(body: GenerateMazeRequestBody): Maze {
	const { width, height, seed, difficulty } = body;
	return generateMaze({
		width: width as number,
		height: height as number,
		seed: seed ?? Math.floor(Math.random() * 2 ** 31),
		difficulty,
	});
}

async function handleGenerateMaze(
	request: FastifyRequest<{ Body: GenerateMazeRequestBody }>,
	reply: FastifyReply,
) {
	const body = request.body ?? {};
	const { solution } = body;

	if (solution !== undefined && !isValidSolutionMode(solution)) {
		reply.code(400);
		return {
			error: `Invalid solution mode "${solution}", expected one of: ${SOLUTION_MODES.join(", ")}`,
		};
	}

	let pdfBytes: Uint8Array;
	try {
		const maze = buildMazeFromRequest(body);
		pdfBytes = await renderMazeToPdf(maze, { solution });
	} catch (error) {
		reply.code(400);
		return { error: (error as Error).message };
	}

	reply.header("content-type", "application/pdf");
	return Buffer.from(pdfBytes);
}

function handleGenerateMazePreview(
	request: FastifyRequest<{ Body: GenerateMazeRequestBody }>,
	reply: FastifyReply,
) {
	let svg: string;
	try {
		const maze = buildMazeFromRequest(request.body ?? {});
		svg = renderMazeToSvg(maze);
	} catch (error) {
		reply.code(400);
		return { error: (error as Error).message };
	}

	reply.header("content-type", "image/svg+xml");
	return svg;
}

export function registerMazeRoutes(app: FastifyInstance): void {
	app.post("/api/mazes/generate", handleGenerateMaze);
	app.post("/api/mazes/preview", handleGenerateMazePreview);
}
