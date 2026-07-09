import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
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

	it("forwards the difficulty option, producing a different maze than the default difficulty", async () => {
		const easy = await runGenerate({
			width: 16,
			height: 16,
			seed: 3,
			output: join(workDir, "easy.pdf"),
			cwd: workDir,
		});
		const hard = await runGenerate({
			width: 16,
			height: 16,
			seed: 3,
			difficulty: 5,
			output: join(workDir, "hard.pdf"),
			cwd: workDir,
		});

		const [easyBytes, hardBytes] = await Promise.all([
			readFile(easy.outputPath),
			readFile(hard.outputPath),
		]);
		expect(easyBytes).not.toEqual(hardBytes);
	});

	it("rejects an invalid difficulty with a clear error", async () => {
		await expect(
			runGenerate({
				width: 5,
				height: 5,
				seed: 1,
				difficulty: 9,
				cwd: workDir,
			}),
		).rejects.toThrow();
	});

	it("includes the solution as an extra page when solution mode is extra-page", async () => {
		const result = await runGenerate({
			width: 6,
			height: 6,
			seed: 3,
			solution: "extra-page",
			cwd: workDir,
		});

		const doc = await PDFDocument.load(await readFile(result.outputPath));
		expect(doc.getPageCount()).toBe(2);
	});

	it("overlays the solution on the single maze page when solution mode is overlay", async () => {
		const withoutSolution = await runGenerate({
			width: 6,
			height: 6,
			seed: 3,
			output: join(workDir, "without.pdf"),
			cwd: workDir,
		});
		const withOverlay = await runGenerate({
			width: 6,
			height: 6,
			seed: 3,
			solution: "overlay",
			output: join(workDir, "with-overlay.pdf"),
			cwd: workDir,
		});

		const doc = await PDFDocument.load(await readFile(withOverlay.outputPath));
		expect(doc.getPageCount()).toBe(1);
		const [withoutBytes, withOverlayBytes] = await Promise.all([
			readFile(withoutSolution.outputPath),
			readFile(withOverlay.outputPath),
		]);
		expect(withOverlayBytes).not.toEqual(withoutBytes);
	});

	it("keeps producing a single page with no solution when solution mode is omitted", async () => {
		const result = await runGenerate({
			width: 6,
			height: 6,
			seed: 3,
			cwd: workDir,
		});

		const doc = await PDFDocument.load(await readFile(result.outputPath));
		expect(doc.getPageCount()).toBe(1);
	});

	it("rejects an invalid solution value with a clear error", async () => {
		await expect(
			runGenerate({
				width: 5,
				height: 5,
				seed: 1,
				solution: "side-panel",
				cwd: workDir,
			}),
		).rejects.toThrow(/side-panel/);
	});
});
