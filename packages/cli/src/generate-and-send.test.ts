import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { authenticate, uploadPdf } from "@remarkable-maze-generator/core";
import { PDFDocument } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runGenerateAndSend } from "./generate-and-send.js";

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
	workDir = await mkdtemp(
		join(tmpdir(), "remarkable-maze-generate-and-send-test-"),
	);
	credentialsPath = join(workDir, "credentials.json");
	await writeFile(
		credentialsPath,
		JSON.stringify({ deviceToken: "existing-token" }),
	);
	authenticateMock.mockReset();
	uploadPdfMock.mockReset();
});

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true });
});

describe("runGenerateAndSend", () => {
	it("generates a maze PDF and uploads it to reMarkable Cloud in one step", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const result = await runGenerateAndSend({
			width: 5,
			height: 5,
			seed: 1,
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		expect(result.outputPath).toBe(join(workDir, "maze.pdf"));
		const bytes = await readFile(result.outputPath);
		expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
		expect(uploadPdfMock).toHaveBeenCalledWith(
			fakeSession,
			result.outputPath,
			result.visibleName,
			expect.anything(),
		);
	});

	it("keeps the local PDF and reports a clear error when upload fails after generation succeeds", async () => {
		authenticateMock.mockRejectedValue(new Error("network unreachable"));
		const outputPath = join(workDir, "custom.pdf");

		await expect(
			runGenerateAndSend({
				width: 5,
				height: 5,
				seed: 1,
				output: outputPath,
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow(/generated.*upload.*failed/is);

		await expect(access(outputPath)).resolves.toBeUndefined();
		const bytes = await readFile(outputPath);
		expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
	});

	it("accepts the same width, height and seed options as the standalone generate command", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await expect(
			runGenerateAndSend({
				width: 0,
				height: 5,
				seed: 1,
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow();
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("defaults the visible name to rectangle-{width}x{height}-{seed} when not provided", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const result = await runGenerateAndSend({
			width: 8,
			height: 6,
			seed: 42,
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		expect(result.visibleName).toBe("rectangle-8x6-42");
	});

	it("uses the explicitly provided visible name instead of the default", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const result = await runGenerateAndSend({
			width: 8,
			height: 6,
			seed: 42,
			visibleName: "my-custom-maze",
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		expect(result.visibleName).toBe("my-custom-maze");
	});

	it("forwards the target folder option to the upload step", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await runGenerateAndSend({
			width: 5,
			height: 5,
			seed: 1,
			folder: "Mazes",
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		expect(uploadPdfMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ folder: "Mazes" }),
		);
	});

	it("forwards the difficulty option to maze generation", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await expect(
			runGenerateAndSend({
				width: 5,
				height: 5,
				seed: 1,
				difficulty: 9,
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow();
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("forwards the solution option to PDF generation", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const result = await runGenerateAndSend({
			width: 6,
			height: 6,
			seed: 3,
			solution: "extra-page",
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		const doc = await PDFDocument.load(await readFile(result.outputPath));
		expect(doc.getPageCount()).toBe(2);
	});

	it("rejects an invalid solution value before attempting to authenticate or upload", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await expect(
			runGenerateAndSend({
				width: 5,
				height: 5,
				seed: 1,
				solution: "side-panel",
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow(/side-panel/);
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("forwards the type option to maze generation", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const result = await runGenerateAndSend({
			width: 12,
			height: 12,
			seed: 3,
			type: "rectangle-crossing",
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		const doc = await PDFDocument.load(await readFile(result.outputPath));
		expect(doc.getPageCount()).toBe(1);
	});

	it("rejects an invalid maze type before attempting to authenticate or upload", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await expect(
			runGenerateAndSend({
				width: 5,
				height: 5,
				seed: 1,
				type: "hexagon",
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow(/hexagon/);
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("forwards the algorithm option to maze generation", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const growingTree = await runGenerateAndSend({
			width: 12,
			height: 12,
			seed: 3,
			output: join(workDir, "growing-tree.pdf"),
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});
		const kruskal = await runGenerateAndSend({
			width: 12,
			height: 12,
			seed: 3,
			algorithm: "kruskal",
			output: join(workDir, "kruskal.pdf"),
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		const [growingTreeBytes, kruskalBytes] = await Promise.all([
			readFile(growingTree.outputPath),
			readFile(kruskal.outputPath),
		]);
		expect(kruskalBytes).not.toEqual(growingTreeBytes);
	});

	it("rejects an invalid maze algorithm before attempting to authenticate or upload", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await expect(
			runGenerateAndSend({
				width: 5,
				height: 5,
				seed: 1,
				algorithm: "prim",
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow(/prim/);
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("forwards the pathLength option to maze generation", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const withoutOption = await runGenerateAndSend({
			width: 12,
			height: 12,
			seed: 3,
			output: join(workDir, "without-path-length.pdf"),
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});
		const long = await runGenerateAndSend({
			width: 12,
			height: 12,
			seed: 3,
			pathLength: "long",
			output: join(workDir, "long.pdf"),
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		const [withoutBytes, longBytes] = await Promise.all([
			readFile(withoutOption.outputPath),
			readFile(long.outputPath),
		]);
		expect(longBytes).not.toEqual(withoutBytes);
	});

	it("forwards the pathLengthCandidateCount option to maze generation", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		const withDefault = await runGenerateAndSend({
			width: 8,
			height: 6,
			seed: 1,
			pathLength: "long",
			output: join(workDir, "default-candidates.pdf"),
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});
		const withOneCandidate = await runGenerateAndSend({
			width: 8,
			height: 6,
			seed: 1,
			pathLength: "long",
			pathLengthCandidateCount: 1,
			output: join(workDir, "one-candidate.pdf"),
			cwd: workDir,
			credentialsPath,
			promptPairingCode: vi.fn(),
		});

		const [defaultBytes, oneCandidateBytes] = await Promise.all([
			readFile(withDefault.outputPath),
			readFile(withOneCandidate.outputPath),
		]);
		expect(oneCandidateBytes).not.toEqual(defaultBytes);
	});

	it("rejects a pathLengthCandidateCount set without a pathLength target before attempting to authenticate or upload", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await expect(
			runGenerateAndSend({
				width: 5,
				height: 5,
				seed: 1,
				pathLengthCandidateCount: 3,
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow(/pathLengthCandidateCount/);
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("rejects an invalid pathLength value before attempting to authenticate or upload", async () => {
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);

		await expect(
			runGenerateAndSend({
				width: 5,
				height: 5,
				seed: 1,
				pathLength: "extra-long",
				cwd: workDir,
				credentialsPath,
				promptPairingCode: vi.fn(),
			}),
		).rejects.toThrow(/extra-long/);
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(uploadPdfMock).not.toHaveBeenCalled();
	});

	it("prompts for a pairing code on first use, like the standalone send command", async () => {
		const freshCredentialsPath = join(workDir, "fresh-credentials.json");
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const promptPairingCode = vi.fn(async () => "12345678");

		await runGenerateAndSend({
			width: 5,
			height: 5,
			seed: 1,
			cwd: workDir,
			credentialsPath: freshCredentialsPath,
			promptPairingCode,
		});

		expect(promptPairingCode).toHaveBeenCalledTimes(1);
		expect(authenticateMock).toHaveBeenCalledWith(
			expect.anything(),
			"12345678",
		);
	});
});
