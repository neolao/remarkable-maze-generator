import { describe, expect, it, vi } from "vitest";
import type { RemarkableSession } from "./remarkable-auth.js";
import { uploadPdf } from "./remarkable-upload.js";

const VALID_SESSION: RemarkableSession = {
	deviceToken: "device-token",
	userToken: "user-token",
};
const FAKE_PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

function textResponse(body: unknown, status = 200): Response {
	return new Response(typeof body === "string" ? body : JSON.stringify(body), {
		status,
	});
}

function createFetchMock(baseUrl: string) {
	return vi.fn(async (url: string | URL, init?: RequestInit) => {
		const href = String(url);

		if (href === `${baseUrl}/document-storage/json/2/upload/request`) {
			const [payload] = JSON.parse(init?.body as string);
			return textResponse([
				{
					ID: payload.ID,
					Version: 1,
					Success: true,
					BlobURLPut: `${baseUrl}/blob/put-url`,
				},
			]);
		}

		if (href === `${baseUrl}/blob/put-url`) {
			return textResponse("", 200);
		}

		if (href === `${baseUrl}/document-storage/json/2/upload/update-status`) {
			return textResponse([{ Success: true }]);
		}

		throw new Error(`Unexpected fetch call to ${href}`);
	});
}

describe("uploadPdf", () => {
	it("uploads a local PDF file to reMarkable Cloud", async () => {
		const baseUrl = "https://fake-remarkable.test";
		const fetchMock = createFetchMock(baseUrl);
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);

		await uploadPdf(VALID_SESSION, "/tmp/maze.pdf", "Maze", {
			fetch: fetchMock,
			baseUrl,
			readFile,
		});

		expect(readFile).toHaveBeenCalledWith("/tmp/maze.pdf");
		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calledUrls).toEqual([
			`${baseUrl}/document-storage/json/2/upload/request`,
			`${baseUrl}/blob/put-url`,
			`${baseUrl}/document-storage/json/2/upload/update-status`,
		]);
	});

	it("rejects without a valid session and never touches the filesystem or network", async () => {
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);
		const fetchMock = vi.fn();

		await expect(
			uploadPdf(undefined, "/tmp/maze.pdf", "Maze", {
				fetch: fetchMock,
				readFile,
			}),
		).rejects.toThrow(/session/i);

		expect(readFile).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects when the local file does not exist, before any network call", async () => {
		const readFile = vi.fn(async () => {
			throw Object.assign(new Error("ENOENT: no such file or directory"), {
				code: "ENOENT",
			});
		});
		const fetchMock = vi.fn();

		await expect(
			uploadPdf(VALID_SESSION, "/tmp/missing.pdf", "Maze", {
				fetch: fetchMock,
				readFile,
			}),
		).rejects.toThrow(/not found/i);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects with a clear error when the cloud service responds with a failure", async () => {
		const readFile = vi.fn(async () => FAKE_PDF_BYTES);
		const fetchMock = vi.fn(async () => textResponse("server error", 500));

		await expect(
			uploadPdf(VALID_SESSION, "/tmp/maze.pdf", "Maze", {
				fetch: fetchMock,
				readFile,
			}),
		).rejects.toThrow();
	});
});
