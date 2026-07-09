import {
	type CredentialStore,
	type Maze,
	authenticate,
	renderMazeToPdf,
	uploadPdf,
} from "@remarkable-maze-generator/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	type GenerateMazeRequestBody,
	buildMazeFromRequest,
	invalidSolutionModeMessage,
	isValidSolutionMode,
} from "./maze-request.js";

interface PairRequestBody {
	pairingCode?: string;
}

interface SendMazeRequestBody extends GenerateMazeRequestBody {
	visibleName?: string;
}

function defaultVisibleName(maze: Maze): string {
	return `${maze.type ?? "maze"}-${maze.width}x${maze.height}-${maze.seed}`;
}

async function handleGetStatus(store: CredentialStore) {
	const credentials = await store.load();
	return { authenticated: credentials !== null };
}

async function handlePair(
	store: CredentialStore,
	request: FastifyRequest<{ Body: PairRequestBody }>,
	reply: FastifyReply,
) {
	const pairingCode = request.body?.pairingCode?.trim();

	if (!pairingCode) {
		reply.code(400);
		return { error: "A pairing code is required" };
	}

	try {
		await authenticate(store, pairingCode);
	} catch (error) {
		reply.code(400);
		return { error: (error as Error).message };
	}

	return { authenticated: true };
}

async function handleSendMaze(
	store: CredentialStore,
	request: FastifyRequest<{ Body: SendMazeRequestBody }>,
	reply: FastifyReply,
) {
	const body = request.body ?? {};
	const { solution, visibleName: requestedVisibleName } = body;

	if (solution !== undefined && !isValidSolutionMode(solution)) {
		reply.code(400);
		return { error: invalidSolutionModeMessage(solution) };
	}

	let maze: Maze;
	let pdfBytes: Uint8Array;
	try {
		maze = buildMazeFromRequest(body);
		pdfBytes = await renderMazeToPdf(maze, { solution });
	} catch (error) {
		reply.code(400);
		return { error: (error as Error).message };
	}

	const existing = await store.load();
	if (!existing) {
		reply.code(409);
		return { error: "not_authenticated" };
	}

	let session: Awaited<ReturnType<typeof authenticate>>;
	try {
		session = await authenticate(store, "");
	} catch (error) {
		reply.code(502);
		return { error: (error as Error).message };
	}

	const visibleName = requestedVisibleName ?? defaultVisibleName(maze);

	try {
		await uploadPdf(session, `${visibleName}.pdf`, visibleName, {
			readFile: async () => pdfBytes,
		});
	} catch (error) {
		reply.code(502);
		return { error: (error as Error).message };
	}

	return { visibleName };
}

export function registerRemarkableRoutes(
	app: FastifyInstance,
	store: CredentialStore,
): void {
	app.get("/api/remarkable/status", () => handleGetStatus(store));
	app.post<{ Body: PairRequestBody }>(
		"/api/remarkable/pair",
		(request, reply) => handlePair(store, request, reply),
	);
	app.post<{ Body: SendMazeRequestBody }>("/api/mazes/send", (request, reply) =>
		handleSendMaze(store, request, reply),
	);
}
