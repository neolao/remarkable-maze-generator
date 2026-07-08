import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { authenticate, uploadPdf } from "@remarkable-maze-generator/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSend } from "./send.js";

vi.mock("@remarkable-maze-generator/core", () => ({
	authenticate: vi.fn(),
	uploadPdf: vi.fn(),
}));

const authenticateMock = vi.mocked(authenticate);
const uploadPdfMock = vi.mocked(uploadPdf);

let workDir: string;
let pdfPath: string;

beforeEach(async () => {
	workDir = await mkdtemp(join(tmpdir(), "remarkable-maze-send-test-"));
	pdfPath = join(workDir, "maze.pdf");
	await writeFile(pdfPath, Buffer.from("%PDF-1.7 fake content"));
	authenticateMock.mockReset();
	uploadPdfMock.mockReset();
});

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true });
});

describe("runSend", () => {
	it("uploads using already-stored credentials without prompting", async () => {
		const credentialsPath = join(workDir, "credentials.json");
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);

		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue(fakeSession as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const promptPairingCode = vi.fn();

		const result = await runSend({
			filePath: pdfPath,
			credentialsPath,
			promptPairingCode,
		});

		expect(result.visibleName).toBe("maze");
		expect(promptPairingCode).not.toHaveBeenCalled();
		expect(uploadPdfMock).toHaveBeenCalledWith(
			fakeSession,
			pdfPath,
			"maze",
			expect.anything(),
		);
	});

	it("prompts for a pairing code on first use", async () => {
		const credentialsPath = join(workDir, "credentials.json");
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the opaque core session type
		authenticateMock.mockResolvedValue({} as any);
		uploadPdfMock.mockResolvedValue(undefined);
		const promptPairingCode = vi.fn(async () => "12345678");

		await runSend({ filePath: pdfPath, credentialsPath, promptPairingCode });

		expect(promptPairingCode).toHaveBeenCalledTimes(1);
		expect(authenticateMock).toHaveBeenCalledWith(
			expect.anything(),
			"12345678",
		);
	});

	it("rejects with a clear error when the local file does not exist, without prompting or authenticating", async () => {
		const credentialsPath = join(workDir, "credentials.json");
		const promptPairingCode = vi.fn();

		await expect(
			runSend({
				filePath: join(workDir, "missing.pdf"),
				credentialsPath,
				promptPairingCode,
			}),
		).rejects.toThrow(/not found/i);

		expect(promptPairingCode).not.toHaveBeenCalled();
		expect(authenticateMock).not.toHaveBeenCalled();
	});
});
