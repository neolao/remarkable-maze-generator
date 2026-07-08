import { describe, expect, it, vi } from "vitest";
import type { RemarkableSession } from "./remarkable-auth.js";
import { uploadPdf } from "./remarkable-upload.js";

const FAKE_PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function createFakeSession(
	uploadPdfImpl: (name: string, buffer: Uint8Array) => Promise<unknown>,
) {
	return { uploadPdf: vi.fn(uploadPdfImpl) } as unknown as RemarkableSession;
}

describe("uploadPdf", () => {
	it("reads the local file and uploads it under the given visible name", async () => {
		const uploadPdfImpl = vi.fn(async () => ({}));
		const session = createFakeSession(uploadPdfImpl);
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await uploadPdf(session, "/tmp/maze.pdf", "My Maze", { readFile });

		expect(readFile).toHaveBeenCalledWith("/tmp/maze.pdf");
		expect(uploadPdfImpl).toHaveBeenCalledWith("My Maze", FAKE_PDF_BYTES);
	});

	it("rejects without a valid session and never touches the filesystem", async () => {
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await expect(
			uploadPdf(undefined, "/tmp/maze.pdf", "My Maze", { readFile }),
		).rejects.toThrow(/session/i);

		expect(readFile).not.toHaveBeenCalled();
	});

	it("rejects when the local file does not exist, without calling upload", async () => {
		const uploadPdfImpl = vi.fn(async () => ({}));
		const session = createFakeSession(uploadPdfImpl);
		const readFile = vi.fn(async () => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});

		await expect(
			uploadPdf(session, "/tmp/missing.pdf", "My Maze", { readFile }),
		).rejects.toThrow(/not found/i);

		expect(uploadPdfImpl).not.toHaveBeenCalled();
	});

	it("wraps an upload failure with a clear error", async () => {
		const session = createFakeSession(async () => {
			throw new Error("server exploded");
		});
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await expect(
			uploadPdf(session, "/tmp/maze.pdf", "My Maze", { readFile }),
		).rejects.toThrow(/upload/i);
	});
});
