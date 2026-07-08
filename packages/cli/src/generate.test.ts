import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runGenerate } from "./generate.js";

let workDir: string;

beforeEach(async () => {
	workDir = await mkdtemp(join(tmpdir(), "remarkable-maze-cli-test-"));
});

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true });
});

describe("runGenerate", () => {
	it("writes a maze PDF at the given output path", async () => {
		const outputPath = join(workDir, "custom.pdf");

		const result = await runGenerate({
			width: 5,
			height: 5,
			seed: 1,
			output: outputPath,
			cwd: workDir,
		});

		expect(result.outputPath).toBe(outputPath);
		const bytes = await readFile(outputPath);
		expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
	});

	it("writes to a sensible default location when no output path is given", async () => {
		const result = await runGenerate({
			width: 5,
			height: 5,
			seed: 1,
			cwd: workDir,
		});

		expect(result.outputPath).toBe(join(workDir, "maze.pdf"));
		const bytes = await readFile(result.outputPath);
		expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
	});

	it("produces the same maze content for the same seed regardless of output path", async () => {
		const first = await runGenerate({
			width: 6,
			height: 6,
			seed: 7,
			output: join(workDir, "a.pdf"),
			cwd: workDir,
		});
		const second = await runGenerate({
			width: 6,
			height: 6,
			seed: 7,
			output: join(workDir, "b.pdf"),
			cwd: workDir,
		});

		const [bytesA, bytesB] = await Promise.all([
			readFile(first.outputPath),
			readFile(second.outputPath),
		]);
		expect(bytesA).toEqual(bytesB);
	});

	it.each([
		{ width: 0, height: 5 },
		{ width: 5, height: -3 },
	])(
		"rejects invalid dimensions width=$width height=$height with a clear error",
		async ({ width, height }) => {
			await expect(
				runGenerate({ width, height, seed: 1, cwd: workDir }),
			).rejects.toThrow();
		},
	);
});
