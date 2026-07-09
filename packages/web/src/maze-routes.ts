import {
	renderMazeToPdf,
	renderMazeToSvg,
} from "@remarkable-maze-generator/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	type GenerateMazeRequestBody,
	buildMazeFromRequest,
	invalidSolutionModeMessage,
	isValidSolutionMode,
} from "./maze-request.js";

async function handleGenerateMaze(
	request: FastifyRequest<{ Body: GenerateMazeRequestBody }>,
	reply: FastifyReply,
) {
	const body = request.body ?? {};
	const { solution } = body;

	if (solution !== undefined && !isValidSolutionMode(solution)) {
		reply.code(400);
		return { error: invalidSolutionModeMessage(solution) };
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
