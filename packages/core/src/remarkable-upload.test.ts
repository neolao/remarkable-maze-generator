import { describe, expect, it, vi } from "vitest";
import type { RemarkableSession } from "./remarkable-auth.js";
import { uploadPdf } from "./remarkable-upload.js";

const FAKE_PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

interface FakeSessionOverrides {
	uploadPdf?: (name: string, buffer: Uint8Array) => Promise<unknown>;
	listItems?: () => Promise<unknown[]>;
	putFolder?: (name: string) => Promise<{ id: string; hash: string }>;
	putPdf?: (
		name: string,
		buffer: Uint8Array,
		opts?: unknown,
	) => Promise<unknown>;
}

function createFakeSession(overrides: FakeSessionOverrides = {}) {
	return {
		uploadPdf: vi.fn(overrides.uploadPdf ?? (async () => ({}))),
		listItems: vi.fn(overrides.listItems ?? (async () => [])),
		putFolder: vi.fn(
			overrides.putFolder ?? (async () => ({ id: "new-folder-id", hash: "h" })),
		),
		putPdf: vi.fn(overrides.putPdf ?? (async () => ({}))),
	} as unknown as RemarkableSession;
}

describe("uploadPdf", () => {
	it("reads the local file and uploads it under the given visible name", async () => {
		const session = createFakeSession();
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await uploadPdf(session, "/tmp/maze.pdf", "My Maze", { readFile });

		expect(readFile).toHaveBeenCalledWith("/tmp/maze.pdf");
		// biome-ignore lint/suspicious/noExplicitAny: accessing the fake session's mocked methods
		expect((session as any).uploadPdf).toHaveBeenCalledWith(
			"My Maze",
			FAKE_PDF_BYTES,
		);
	});

	it("rejects without a valid session and never touches the filesystem", async () => {
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await expect(
			uploadPdf(undefined, "/tmp/maze.pdf", "My Maze", { readFile }),
		).rejects.toThrow(/session/i);

		expect(readFile).not.toHaveBeenCalled();
	});

	it("rejects when the local file does not exist, without calling upload", async () => {
		const session = createFakeSession();
		const readFile = vi.fn(async () => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});

		await expect(
			uploadPdf(session, "/tmp/missing.pdf", "My Maze", { readFile }),
		).rejects.toThrow(/not found/i);

		// biome-ignore lint/suspicious/noExplicitAny: accessing the fake session's mocked methods
		expect((session as any).uploadPdf).not.toHaveBeenCalled();
	});

	it("wraps an upload failure with a clear error", async () => {
		const session = createFakeSession({
			uploadPdf: async () => {
				throw new Error("server exploded");
			},
		});
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await expect(
			uploadPdf(session, "/tmp/maze.pdf", "My Maze", { readFile }),
		).rejects.toThrow(/upload/i);
	});

	it("uploads into an existing folder by resolving its id", async () => {
		const session = createFakeSession({
			listItems: async () => [
				{
					type: "CollectionType",
					id: "folder-123",
					visibleName: "Mazes",
					parent: "",
				},
			],
		});
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await uploadPdf(session, "/tmp/maze.pdf", "My Maze", {
			readFile,
			folder: "Mazes",
		});

		// biome-ignore lint/suspicious/noExplicitAny: accessing the fake session's mocked methods
		const fakeSession = session as any;
		expect(fakeSession.putPdf).toHaveBeenCalledWith("My Maze", FAKE_PDF_BYTES, {
			parent: "folder-123",
		});
		expect(fakeSession.putFolder).not.toHaveBeenCalled();
		expect(fakeSession.uploadPdf).not.toHaveBeenCalled();
	});

	it("rejects with a clear error when the named folder does not exist", async () => {
		const session = createFakeSession({
			listItems: async () => [
				{
					type: "CollectionType",
					id: "other-id",
					visibleName: "Other Folder",
					parent: "",
				},
			],
		});
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await expect(
			uploadPdf(session, "/tmp/maze.pdf", "My Maze", {
				readFile,
				folder: "Missing Folder",
			}),
		).rejects.toThrow(/folder/i);

		// biome-ignore lint/suspicious/noExplicitAny: accessing the fake session's mocked methods
		const fakeSession = session as any;
		expect(fakeSession.putFolder).not.toHaveBeenCalled();
		expect(fakeSession.putPdf).not.toHaveBeenCalled();
	});

	it("uploads to the root when no folder is specified", async () => {
		const session = createFakeSession();
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await uploadPdf(session, "/tmp/maze.pdf", "My Maze", { readFile });

		// biome-ignore lint/suspicious/noExplicitAny: accessing the fake session's mocked methods
		const fakeSession = session as any;
		expect(fakeSession.listItems).not.toHaveBeenCalled();
		expect(fakeSession.putFolder).not.toHaveBeenCalled();
		expect(fakeSession.uploadPdf).toHaveBeenCalledWith(
			"My Maze",
			FAKE_PDF_BYTES,
		);
	});

	it("wraps a folder resolution failure with a clear error", async () => {
		const session = createFakeSession({
			listItems: async () => {
				throw new Error("network blip");
			},
		});
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await expect(
			uploadPdf(session, "/tmp/maze.pdf", "My Maze", {
				readFile,
				folder: "Mazes",
			}),
		).rejects.toThrow(/upload/i);
	});
});
