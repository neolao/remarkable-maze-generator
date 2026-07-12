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

	it("defaults to the rectangle type when the type option is omitted", async () => {
		const withoutType = await runGenerate({
			width: 8,
			height: 6,
			seed: 3,
			output: join(workDir, "without-type.pdf"),
			cwd: workDir,
		});
		const withExplicitType = await runGenerate({
			width: 8,
			height: 6,
			seed: 3,
			type: "rectangle",
			output: join(workDir, "with-type.pdf"),
			cwd: workDir,
		});

		const [withoutBytes, withBytes] = await Promise.all([
			readFile(withoutType.outputPath),
			readFile(withExplicitType.outputPath),
		]);
		expect(withoutBytes).toEqual(withBytes);
	});

	it("forwards the type option, producing a maze with bridge crossings", async () => {
		const rectangle = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			output: join(workDir, "rectangle.pdf"),
			cwd: workDir,
		});
		const crossing = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			type: "rectangle-crossing",
			output: join(workDir, "crossing.pdf"),
			cwd: workDir,
		});

		const [rectangleBytes, crossingBytes] = await Promise.all([
			readFile(rectangle.outputPath),
			readFile(crossing.outputPath),
		]);
		expect(crossingBytes).not.toEqual(rectangleBytes);
	});

	it("rejects an invalid maze type with a clear error", async () => {
		await expect(
			runGenerate({
				width: 5,
				height: 5,
				seed: 1,
				type: "hexagon",
				cwd: workDir,
			}),
		).rejects.toThrow(/hexagon/);
	});

	it("forwards the circle type, producing a maze rendered as a circle", async () => {
		const rectangle = await runGenerate({
			width: 12,
			height: 8,
			seed: 3,
			output: join(workDir, "rectangle.pdf"),
			cwd: workDir,
		});
		const circle = await runGenerate({
			width: 12,
			height: 8,
			seed: 3,
			type: "circle",
			output: join(workDir, "circle.pdf"),
			cwd: workDir,
		});

		const [rectangleBytes, circleBytes] = await Promise.all([
			readFile(rectangle.outputPath),
			readFile(circle.outputPath),
		]);
		expect(circleBytes).not.toEqual(rectangleBytes);
	});

	it("forwards the circle-crossing type, producing a maze with bridge crossings on the polar layout", async () => {
		const circle = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			type: "circle",
			output: join(workDir, "circle.pdf"),
			cwd: workDir,
		});
		const crossing = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			type: "circle-crossing",
			output: join(workDir, "circle-crossing.pdf"),
			cwd: workDir,
		});

		const [circleBytes, crossingBytes] = await Promise.all([
			readFile(circle.outputPath),
			readFile(crossing.outputPath),
		]);
		expect(crossingBytes).not.toEqual(circleBytes);
	});

	it("rejects the circle-crossing type combined with a non-growing-tree algorithm", async () => {
		await expect(
			runGenerate({
				width: 10,
				height: 10,
				seed: 1,
				type: "circle-crossing",
				algorithm: "kruskal",
				cwd: workDir,
			}),
		).rejects.toThrow(/circle-crossing.*growing-tree/);
	});

	it("defaults to the growing-tree algorithm when the algorithm option is omitted", async () => {
		const withoutAlgorithm = await runGenerate({
			width: 8,
			height: 6,
			seed: 3,
			output: join(workDir, "without-algorithm.pdf"),
			cwd: workDir,
		});
		const withExplicitAlgorithm = await runGenerate({
			width: 8,
			height: 6,
			seed: 3,
			algorithm: "growing-tree",
			output: join(workDir, "with-algorithm.pdf"),
			cwd: workDir,
		});

		const [withoutBytes, withBytes] = await Promise.all([
			readFile(withoutAlgorithm.outputPath),
			readFile(withExplicitAlgorithm.outputPath),
		]);
		expect(withoutBytes).toEqual(withBytes);
	});

	it("forwards the algorithm option, producing a different maze than the default algorithm", async () => {
		const growingTree = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			output: join(workDir, "growing-tree.pdf"),
			cwd: workDir,
		});
		const kruskal = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			algorithm: "kruskal",
			output: join(workDir, "kruskal.pdf"),
			cwd: workDir,
		});

		const [growingTreeBytes, kruskalBytes] = await Promise.all([
			readFile(growingTree.outputPath),
			readFile(kruskal.outputPath),
		]);
		expect(kruskalBytes).not.toEqual(growingTreeBytes);
	});

	it("rejects an invalid maze algorithm with a clear error", async () => {
		await expect(
			runGenerate({
				width: 5,
				height: 5,
				seed: 1,
				algorithm: "prim",
				cwd: workDir,
			}),
		).rejects.toThrow(/prim/);
	});

	it("rejects the rectangle-crossing type combined with a non-growing-tree algorithm", async () => {
		await expect(
			runGenerate({
				width: 10,
				height: 10,
				seed: 1,
				type: "rectangle-crossing",
				algorithm: "kruskal",
				cwd: workDir,
			}),
		).rejects.toThrow(/rectangle-crossing.*growing-tree/);
	});

	it("keeps producing the exact same maze when pathLength is omitted", async () => {
		const withoutOption = await runGenerate({
			width: 8,
			height: 6,
			seed: 3,
			output: join(workDir, "without-path-length.pdf"),
			cwd: workDir,
		});
		const withUndefined = await runGenerate({
			width: 8,
			height: 6,
			seed: 3,
			pathLength: undefined,
			output: join(workDir, "with-undefined-path-length.pdf"),
			cwd: workDir,
		});

		const [withoutBytes, withBytes] = await Promise.all([
			readFile(withoutOption.outputPath),
			readFile(withUndefined.outputPath),
		]);
		expect(withoutBytes).toEqual(withBytes);
	});

	it("forwards the pathLength option, producing a different maze than without it", async () => {
		const withoutOption = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			output: join(workDir, "without-path-length.pdf"),
			cwd: workDir,
		});
		const long = await runGenerate({
			width: 12,
			height: 12,
			seed: 3,
			pathLength: "long",
			output: join(workDir, "long.pdf"),
			cwd: workDir,
		});

		const [withoutBytes, longBytes] = await Promise.all([
			readFile(withoutOption.outputPath),
			readFile(long.outputPath),
		]);
		expect(longBytes).not.toEqual(withoutBytes);
	});

	it("rejects an invalid pathLength value with a clear error", async () => {
		await expect(
			runGenerate({
				width: 5,
				height: 5,
				seed: 1,
				pathLength: "extra-long",
				cwd: workDir,
			}),
		).rejects.toThrow(/extra-long/);
	});

	it("forwards the pathLengthCandidateCount option, producing a different maze than the default candidate count", async () => {
		const withDefault = await runGenerate({
			width: 8,
			height: 6,
			seed: 1,
			pathLength: "long",
			output: join(workDir, "default-candidates.pdf"),
			cwd: workDir,
		});
		const withOneCandidate = await runGenerate({
			width: 8,
			height: 6,
			seed: 1,
			pathLength: "long",
			pathLengthCandidateCount: 1,
			output: join(workDir, "one-candidate.pdf"),
			cwd: workDir,
		});

		const [defaultBytes, oneCandidateBytes] = await Promise.all([
			readFile(withDefault.outputPath),
			readFile(withOneCandidate.outputPath),
		]);
		expect(oneCandidateBytes).not.toEqual(defaultBytes);
	});

	it("rejects a pathLengthCandidateCount set without a pathLength target", async () => {
		await expect(
			runGenerate({
				width: 5,
				height: 5,
				seed: 1,
				pathLengthCandidateCount: 3,
				cwd: workDir,
			}),
		).rejects.toThrow(/pathLengthCandidateCount/);
	});

	it("rejects a non-positive pathLengthCandidateCount with a clear error", async () => {
		await expect(
			runGenerate({
				width: 5,
				height: 5,
				seed: 1,
				pathLength: "long",
				pathLengthCandidateCount: 0,
				cwd: workDir,
			}),
		).rejects.toThrow(/candidate count/i);
	});
});
