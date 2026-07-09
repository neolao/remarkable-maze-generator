import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileCredentialStore } from "./remarkable-credential-store.js";

let workDir: string;

beforeEach(async () => {
	workDir = await mkdtemp(join(tmpdir(), "remarkable-maze-web-cred-test-"));
});

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true });
});

describe("createFileCredentialStore", () => {
	it("returns null when no credentials file exists yet", async () => {
		const store = createFileCredentialStore(
			join(workDir, "nested", "credentials.json"),
		);

		await expect(store.load()).resolves.toBeNull();
	});

	it("persists and reloads credentials, creating missing parent directories", async () => {
		const filePath = join(workDir, "nested", "credentials.json");
		const store = createFileCredentialStore(filePath);

		await store.save({ deviceToken: "abc123" });

		await expect(store.load()).resolves.toEqual({ deviceToken: "abc123" });
	});

	it("restricts the credentials file to owner read/write permissions", async () => {
		const filePath = join(workDir, "credentials.json");
		const store = createFileCredentialStore(filePath);

		await store.save({ deviceToken: "abc123" });

		const stats = await stat(filePath);
		expect(stats.mode & 0o777).toBe(0o600);
	});

	it("overwrites previously stored credentials on a second save", async () => {
		const filePath = join(workDir, "credentials.json");
		const store = createFileCredentialStore(filePath);

		await store.save({ deviceToken: "first-token" });
		await store.save({ deviceToken: "second-token" });

		await expect(store.load()).resolves.toEqual({
			deviceToken: "second-token",
		});
	});
});
