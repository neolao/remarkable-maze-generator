import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSend } from "./send.js";

let workDir: string;
let pdfPath: string;

beforeEach(async () => {
	workDir = await mkdtemp(join(tmpdir(), "remarkable-maze-send-test-"));
	pdfPath = join(workDir, "maze.pdf");
	await writeFile(pdfPath, Buffer.from("%PDF-1.7 fake content"));
});

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true });
});

function textResponse(body: string, status = 200): Response {
	return new Response(body, { status });
}

function createFakeCloudFetch(baseUrl: string) {
	return vi.fn(async (url: string | URL, init?: RequestInit) => {
		const href = String(url);

		if (href === `${baseUrl}/token/json/2/device/new`) {
			return textResponse("fake-device-token");
		}
		if (href === `${baseUrl}/token/json/2/user/new`) {
			return textResponse("fake-user-token");
		}
		if (href === `${baseUrl}/document-storage/json/2/upload/request`) {
			const [payload] = JSON.parse(init?.body as string);
			return textResponse(
				JSON.stringify([
					{
						ID: payload.ID,
						Version: 1,
						Success: true,
						BlobURLPut: `${baseUrl}/blob/put-url`,
					},
				]),
			);
		}
		if (href === `${baseUrl}/blob/put-url`) {
			return textResponse("");
		}
		if (href === `${baseUrl}/document-storage/json/2/upload/update-status`) {
			return textResponse(JSON.stringify([{ Success: true }]));
		}

		throw new Error(`Unexpected fetch call to ${href}`);
	});
}

describe("runSend", () => {
	it("uploads using already-stored credentials without prompting", async () => {
		const baseUrl = "https://fake-remarkable.test";
		const credentialsPath = join(workDir, "credentials.json");
		await writeFile(
			credentialsPath,
			JSON.stringify({ deviceToken: "existing-token" }),
		);

		const fetchMock = createFakeCloudFetch(baseUrl);
		const promptPairingCode = vi.fn();

		const result = await runSend({
			filePath: pdfPath,
			credentialsPath,
			promptPairingCode,
			fetch: fetchMock,
			baseUrl,
		});

		expect(result.visibleName).toBe("maze");
		expect(promptPairingCode).not.toHaveBeenCalled();
	});

	it("prompts for a pairing code on first use and remembers it for next time", async () => {
		const baseUrl = "https://fake-remarkable.test";
		const credentialsPath = join(workDir, "credentials.json");
		const fetchMock = createFakeCloudFetch(baseUrl);
		const promptPairingCode = vi.fn(async () => "12345678");

		await runSend({
			filePath: pdfPath,
			credentialsPath,
			promptPairingCode,
			fetch: fetchMock,
			baseUrl,
		});

		expect(promptPairingCode).toHaveBeenCalledTimes(1);
		const saved = JSON.parse(await readFile(credentialsPath, "utf8"));
		expect(saved).toEqual({ deviceToken: "fake-device-token" });

		const promptAgain = vi.fn();
		await runSend({
			filePath: pdfPath,
			credentialsPath,
			promptPairingCode: promptAgain,
			fetch: fetchMock,
			baseUrl,
		});
		expect(promptAgain).not.toHaveBeenCalled();
	});

	it("rejects with a clear error when the local file does not exist, without prompting or calling the network", async () => {
		const baseUrl = "https://fake-remarkable.test";
		const credentialsPath = join(workDir, "credentials.json");
		const fetchMock = createFakeCloudFetch(baseUrl);
		const promptPairingCode = vi.fn();

		await expect(
			runSend({
				filePath: join(workDir, "missing.pdf"),
				credentialsPath,
				promptPairingCode,
				fetch: fetchMock,
				baseUrl,
			}),
		).rejects.toThrow(/not found/i);

		expect(promptPairingCode).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
