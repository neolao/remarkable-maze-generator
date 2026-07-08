import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { authenticate, uploadPdf } from "@remarkable-maze-generator/core";
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
