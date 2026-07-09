import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { authenticate, uploadPdf } from "@remarkable-maze-generator/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./server.js";

vi.mock("@remarkable-maze-generator/core", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@remarkable-maze-generator/core")>();
	return {
		...actual,
		authenticate: vi.fn(),
		uploadPdf: vi.fn(),
	};
});

const authenticateMock = vi.mocked(authenticate);
const uploadPdfMock = vi.mocked(uploadPdf);

let workDir: string;
let credentialsPath: string;

beforeEach(async () => {
	workDir = await mkdtemp(join(tmpdir(), "remarkable-maze-web-routes-test-"));
	credentialsPath = join(workDir, "credentials.json");
	authenticateMock.mockReset();
	uploadPdfMock.mockReset();
});

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true });
});

describe("GET /api/remarkable/status", () => {
	it("reports not authenticated when no credentials are stored", async () => {
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "GET",
			url: "/api/remarkable/status",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ authenticated: false });
	});

	it("reports authenticated when credentials are already stored", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "GET",
			url: "/api/remarkable/status",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ authenticated: true });
	});
});

describe("POST /api/remarkable/pair", () => {
	it("pairs successfully with a valid pairing code", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/remarkable/pair",
			payload: { pairingCode: "12345678" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ authenticated: true });
		expect(authenticateMock).toHaveBeenCalledWith(
			expect.anything(),
			"12345678",
		);
	});

	it("returns 400 when the pairing code is missing", async () => {
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/remarkable/pair",
			payload: {},
		});

		expect(response.statusCode).toBe(400);
		expect(authenticateMock).not.toHaveBeenCalled();
	});

	it("returns 400 when the pairing code is rejected by reMarkable Cloud", async () => {
		authenticateMock.mockRejectedValue(
			new Error("Invalid or expired pairing code."),
		);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/remarkable/pair",
			payload: { pairingCode: "bad-code" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toEqual({
			error: "Invalid or expired pairing code.",
		});
	});
});

describe("POST /api/mazes/send", () => {
	it("returns 409 not_authenticated when no credentials are stored", async () => {
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42 },
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toEqual({ error: "not_authenticated" });
		expect(authenticateMock).not.toHaveBeenCalled();
	});

	it("uploads the regenerated maze PDF when already authenticated", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		const fakeSession = {};
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ visibleName: "rectangle 5x5" });
		expect(uploadPdfMock).toHaveBeenCalledWith(
			fakeSession,
			expect.any(String),
			"rectangle 5x5",
			expect.objectContaining({ readFile: expect.any(Function) }),
		);
	});

	it("omits the seed from the default visible name", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 20, height: 15, seed: 12345 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ visibleName: "rectangle 20x15" });
	});

	it("uses the requested maze type in the default visible name", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, type: "rectangle-crossing" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			visibleName: "rectangle-crossing 5x5",
		});
	});

	it("uses a custom visible name when provided", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42, visibleName: "My Maze" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ visibleName: "My Maze" });
	});

	it("returns 400 with a clear message when width is missing", async () => {
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { height: 5 },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toEqual({ error: expect.any(String) });
		expect(authenticateMock).not.toHaveBeenCalled();
	});

	it("returns 400 when the solution mode is invalid", async () => {
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, solution: "invalid-mode" },
		});

		expect(response.statusCode).toBe(400);
	});

	it("returns 400 when the maze type is unknown", async () => {
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, type: "unknown-type" },
		});

		expect(response.statusCode).toBe(400);
		expect(authenticateMock).not.toHaveBeenCalled();
	});

	it("returns 502 when reMarkable Cloud authentication fails despite stored credentials", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		authenticateMock.mockRejectedValue(
			new Error("Failed to authenticate with reMarkable Cloud"),
		);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42 },
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toEqual({
			error: "Failed to authenticate with reMarkable Cloud",
		});
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("returns 502 with a clear message when the upload fails", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		uploadPdfMock.mockRejectedValue(
			new Error("Failed to upload the PDF to reMarkable Cloud: network error"),
		);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42 },
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toEqual({
			error: "Failed to upload the PDF to reMarkable Cloud: network error",
		});
	});

	it("forwards the target folder to the upload step", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		const fakeSession = {};
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42, folder: "Mazes" },
		});

		expect(response.statusCode).toBe(200);
		expect(uploadPdfMock).toHaveBeenCalledWith(
			fakeSession,
			expect.any(String),
			"rectangle 5x5",
			expect.objectContaining({ folder: "Mazes" }),
		);
	});

	it("uploads to the account root when no folder is specified", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		const fakeSession = {};
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42 },
		});

		expect(response.statusCode).toBe(200);
		expect(uploadPdfMock).toHaveBeenCalledWith(
			fakeSession,
			expect.any(String),
			"rectangle 5x5",
			expect.objectContaining({ folder: undefined }),
		);
	});

	it("returns 502 with a clear message when the target folder does not exist", async () => {
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		uploadPdfMock.mockRejectedValue(
			new Error(
				'Failed to upload the PDF to reMarkable Cloud: Folder "Missing" was not found on reMarkable Cloud. Create it first, then try again.',
			),
		);
		const app = buildServer({ credentialsPath });

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/send",
			payload: { width: 5, height: 5, seed: 42, folder: "Missing" },
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toEqual({
			error:
				'Failed to upload the PDF to reMarkable Cloud: Folder "Missing" was not found on reMarkable Cloud. Create it first, then try again.',
		});
	});
});
