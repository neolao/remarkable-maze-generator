import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
	TUBE_CORNER_RADIUS_RATIO,
	TUBE_HALF_WIDTH_RATIO,
	computeTubeSegments,
} from "./maze-layout.js";
import {
	REMARKABLE_2_PAGE_HEIGHT_PT,
	REMARKABLE_2_PAGE_WIDTH_PT,
	SOLUTION_MODES,
	invalidSolutionModeMessage,
	isValidSolutionMode,
	renderMazeBatchToPdf,
	renderMazeBatchToPdfs,
	renderMazeToPdf,
} from "./maze-pdf.js";
import { generateMaze, generateMazeBatch } from "./maze.js";
import type { Maze } from "./maze.js";

function countStrokedLines(pdfBytes: Uint8Array): number {
	const text = Buffer.from(pdfBytes).toString("latin1");
	const streamMatch = text.match(/stream\r?\n([\s\S]*?)endstream/);
	if (!streamMatch) throw new Error("No content stream found in PDF");

	const compressed = Buffer.from(streamMatch[1], "latin1");
	const content = inflateSync(compressed).toString("latin1");

	return (content.match(/^S$/gm) || []).length;
}

// A rounded tube corner is drawn via pdf-lib's drawSvgPath(), which wraps
// each call in its own "q ... Q" graphics-state block: a "cm" matrix
// encoding the anchor translate + the library's own Y-flip (its own source
// comment: "SVG path Y axis is opposite pdf-lib's"), followed by a "m"
// (moveto, the path's true start point) and one or more cubic Bézier "c"
// curves — all in coordinates *local* to that block's "cm" (i.e. exactly
// `segment.x * cellSize`/`segment.y * cellSize`, unflipped, un-offset).
// Reading a block's raw local start/end position back out and comparing it
// to that same simple formula catches a wrong coordinate transform: an
// earlier version pre-flipped Y itself *and* let pdf-lib's own "cm" flip it
// again, which left the arc's straight neighbors correctly shortened but
// silently drew the connecting curve at the wrong position — invisible in
// the real render, not just misshapen — while still emitting a normal
// moveto/curve/stroke sequence, so a test only counting strokes, or only
// checking the curve's coordinates stayed within the page bounds, couldn't
// tell the difference (both weaker checks were tried and missed this bug).
// Blocks are scoped by "q"/"Q" so a plain drawLine()'s own unrelated "m" line
// is never mistaken for the start of a neighboring arc's path.
function extractArcPaths(
	pdfBytes: Uint8Array,
): { start: { x: number; y: number }; end: { x: number; y: number } }[] {
	const text = Buffer.from(pdfBytes).toString("latin1");
	const streamMatch = text.match(/stream\r?\n([\s\S]*?)endstream/);
	if (!streamMatch) throw new Error("No content stream found in PDF");

	const compressed = Buffer.from(streamMatch[1], "latin1");
	const content = inflateSync(compressed).toString("latin1");

	const pathOpRegex =
		/^(-?[\d.]+) (-?[\d.]+) m$|^(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) c$/gm;
	const paths: {
		start: { x: number; y: number };
		end: { x: number; y: number };
	}[] = [];

	for (const block of content.split(/^Q$/m)) {
		if (!/ c$/m.test(block)) continue; // no arc in this graphics-state block

		let current: { x: number; y: number } | undefined;
		for (const match of block.matchAll(pathOpRegex)) {
			if (match[1] !== undefined) {
				current = { x: Number(match[1]), y: Number(match[2]) };
				paths.push({ start: current, end: current });
			} else if (current) {
				current = { x: Number(match[7]), y: Number(match[8]) };
				paths[paths.length - 1].end = current;
			}
		}
	}

	return paths;
}

function decodeHexStrings(content: string): string {
	return content.replace(/<([0-9A-Fa-f]+)>/g, (_, hex: string) =>
		Buffer.from(hex, "hex").toString("latin1"),
	);
}

function decompressAllContentStreams(pdfBytes: Uint8Array): string[] {
	const text = Buffer.from(pdfBytes).toString("latin1");
	const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
	const streams: string[] = [];
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex.exec loop
	while ((match = streamRegex.exec(text)) !== null) {
		try {
			streams.push(
				decodeHexStrings(
					inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"),
				),
			);
		} catch {
			// Not a deflate-compressed stream (e.g. an embedded resource); skip it.
		}
	}
	return streams;
}

function countExpectedWalls(maze: Maze): number {
	let count = 0;
	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cells[y][x];
			if (cell.walls.north) count++;
			if (cell.walls.west) count++;
			if (x === maze.width - 1 && cell.walls.east) count++;
			if (y === maze.height - 1 && cell.walls.south) count++;
		}
	}
	return count;
}

describe("renderMazeToPdf", () => {
	it("produces a valid PDF file from a generated maze", async () => {
		const maze = generateMaze({ width: 8, height: 6, seed: 1 });
		const pdfBytes = await renderMazeToPdf(maze);

		const header = Buffer.from(pdfBytes.slice(0, 5)).toString("ascii");
		expect(header).toBe("%PDF-");
	});

	it("fits a small maze within the reMarkable 2 page size without resizing the page", async () => {
		const maze = generateMaze({ width: 2, height: 2, seed: 1 });
		const pdfBytes = await renderMazeToPdf(maze);

		const doc = await PDFDocument.load(pdfBytes);
		const page = doc.getPage(0);
		expect(page.getWidth()).toBeCloseTo(REMARKABLE_2_PAGE_WIDTH_PT, 1);
		expect(page.getHeight()).toBeCloseTo(REMARKABLE_2_PAGE_HEIGHT_PT, 1);
	});

	it("fits a large maze within the reMarkable 2 page size without resizing the page", async () => {
		const maze = generateMaze({ width: 40, height: 50, seed: 1 });
		const pdfBytes = await renderMazeToPdf(maze);

		const doc = await PDFDocument.load(pdfBytes);
		const page = doc.getPage(0);
		expect(page.getWidth()).toBeCloseTo(REMARKABLE_2_PAGE_WIDTH_PT, 1);
		expect(page.getHeight()).toBeCloseTo(REMARKABLE_2_PAGE_HEIGHT_PT, 1);
	});

	it("renders the same maze twice into visually identical PDF bytes", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 42 });

		const first = await renderMazeToPdf(maze);
		const second = await renderMazeToPdf(maze);

		expect(Buffer.from(second)).toEqual(Buffer.from(first));
	});

	it("rejects a maze with invalid dimensions instead of producing a corrupt PDF", async () => {
		const invalidMaze: Maze = { width: 0, height: 0, cells: [] };

		await expect(renderMazeToPdf(invalidMaze)).rejects.toThrow();
	});

	it("produces a single page with no solution when the option is not set", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 3 });
		const pdfBytes = await renderMazeToPdf(maze);

		const doc = await PDFDocument.load(pdfBytes);
		expect(doc.getPageCount()).toBe(1);
	});

	it("produces two pages when the solution is requested as an extra page", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 3 });
		const pdfBytes = await renderMazeToPdf(maze, { solution: "extra-page" });

		const doc = await PDFDocument.load(pdfBytes);
		expect(doc.getPageCount()).toBe(2);
	});

	it("produces a single page with the solution overlaid when requested", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 3 });
		const withoutSolution = await renderMazeToPdf(maze);
		const withOverlay = await renderMazeToPdf(maze, { solution: "overlay" });

		const doc = await PDFDocument.load(withOverlay);
		expect(doc.getPageCount()).toBe(1);
		expect(Buffer.from(withOverlay)).not.toEqual(Buffer.from(withoutSolution));
	});

	it("does not error when rendering a 1x1 maze with the solution enabled", async () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });

		await expect(
			renderMazeToPdf(maze, { solution: "extra-page" }),
		).resolves.toBeInstanceOf(Uint8Array);
		await expect(
			renderMazeToPdf(maze, { solution: "overlay" }),
		).resolves.toBeInstanceOf(Uint8Array);
	});

	it("leaves a visible opening in the boundary at the entrance and the exit", async () => {
		const maze = generateMaze({ width: 8, height: 6, seed: 3 });
		const pdfBytes = await renderMazeToPdf(maze);

		const strokedLines = countStrokedLines(pdfBytes);
		const expectedWalls = countExpectedWalls(maze);

		expect(strokedLines).toBe(expectedWalls - 2);
	});

	it("still shows an opening on a 1x1 maze, where entrance and exit are the same cell", async () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });
		const pdfBytes = await renderMazeToPdf(maze);

		expect(countStrokedLines(pdfBytes)).toBe(2);
	});

	it("draws a rectangle-crossing maze as independent tube edge strokes, not walls", async () => {
		const maze = generateMaze({
			width: 8,
			height: 6,
			seed: 3,
			type: "rectangle-crossing",
		});
		expect(maze.crossings?.length ?? 0).toBeGreaterThan(0);

		const pdfBytes = await renderMazeToPdf(maze);

		const strokedLines = countStrokedLines(pdfBytes);
		// One stroke per tube edge segment (both edges of every corridor —
		// see ADR 026) — every segment is an independent solid stroke, no
		// fill/border layering.
		expect(strokedLines).toBe(computeTubeSegments(maze).length);
	});

	it("draws a rounded tube corner's curve at its actual expected local position", async () => {
		// A hand-built 3x3 maze with a single dead end at (1,1) — same shape
		// as maze-layout.test.ts's dead-end tests — so the exact unit-cell
		// position of its one rounded corner (NW) is known precisely. Each
		// arc's path coordinates are local to its own "cm"-transformed
		// graphics-state block — i.e. exactly `unitCoordinate * cellSize`,
		// with no further offset or flip to reproduce (see extractArcPaths).
		const maze: Maze = {
			width: 3,
			height: 3,
			type: "rectangle-crossing",
			cells: Array.from({ length: 3 }, () =>
				Array.from({ length: 3 }, () => ({
					walls: { north: true, south: true, east: true, west: true },
				})),
			),
		};
		maze.cells[1][1].walls.south = false;
		maze.cells[2][1].walls.north = false;

		const pageMarginPt = 24; // PAGE_MARGIN_PT in maze-pdf.ts
		const cellSizePt = (REMARKABLE_2_PAGE_WIDTH_PT - 2 * pageMarginPt) / 3;

		const h = TUBE_HALF_WIDTH_RATIO;
		const r = TUBE_CORNER_RADIUS_RATIO;
		const NW = { x: 1.5 - h, y: 1.5 - h };
		// The two tangent points shortening NW's cap segments, in unit-cell
		// coordinates — matches the geometry asserted directly in
		// maze-layout.test.ts's "closes a dead-end cell" test.
		const expectedTangents = [
			{ x: NW.x + r, y: NW.y },
			{ x: NW.x, y: NW.y + r },
		].map((p) => ({ x: p.x * cellSizePt, y: p.y * cellSizePt }));

		const pdfBytes = await renderMazeToPdf(maze);
		const arcs = extractArcPaths(pdfBytes);
		expect(arcs.length).toBeGreaterThan(0);

		const closeTo = (a: number, b: number) => Math.abs(a - b) < 0.01;
		const arcPoints = arcs.flatMap((arc) => [arc.start, arc.end]);
		for (const expected of expectedTangents) {
			const match = arcPoints.some(
				(p) => closeTo(p.x, expected.x) && closeTo(p.y, expected.y),
			);
			expect(match).toBe(true);
		}
	});

	it("does not error rendering a 1x1 rectangle-crossing maze, which has no room for a crossing", async () => {
		const maze = generateMaze({
			width: 1,
			height: 1,
			seed: 1,
			type: "rectangle-crossing",
		});

		expect(maze.crossings).toEqual([]);
		await expect(renderMazeToPdf(maze)).resolves.toBeInstanceOf(Uint8Array);
	});
});

describe("renderMazeBatchToPdf", () => {
	it("combines N mazes into a single PDF with one page per maze", async () => {
		const mazes = generateMazeBatch({
			width: 6,
			height: 6,
			seed: 10,
			count: 4,
		});
		const pdfBytes = await renderMazeBatchToPdf(mazes);

		const doc = await PDFDocument.load(pdfBytes);
		expect(doc.getPageCount()).toBe(4);
	});

	it("produces a batch of 1 identical to the single-maze renderer", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 5 });

		const batchBytes = await renderMazeBatchToPdf([maze]);
		const singleBytes = await renderMazeToPdf(maze);

		expect(Buffer.from(batchBytes)).toEqual(Buffer.from(singleBytes));
	});

	it("reflects a different maze in the resulting PDF bytes", async () => {
		const [mazeA] = generateMazeBatch({
			width: 6,
			height: 6,
			seed: 20,
			count: 2,
		});
		const mazeB = generateMaze({ width: 6, height: 6, seed: 999 });

		const original = await renderMazeBatchToPdf([mazeA, mazeA]);
		const changed = await renderMazeBatchToPdf([mazeA, mazeB]);

		expect(Buffer.from(changed)).not.toEqual(Buffer.from(original));
	});

	it("applies the solution option to every page in the batch", async () => {
		const mazes = generateMazeBatch({
			width: 6,
			height: 6,
			seed: 30,
			count: 2,
		});

		const withoutSolution = await renderMazeBatchToPdf(mazes);
		const withExtraPages = await renderMazeBatchToPdf(mazes, {
			solution: "extra-page",
		});

		const doc = await PDFDocument.load(withExtraPages);
		expect(doc.getPageCount()).toBe(4);
		expect(Buffer.from(withExtraPages)).not.toEqual(
			Buffer.from(withoutSolution),
		);
	});

	it("rejects an empty batch instead of producing an empty PDF", async () => {
		await expect(renderMazeBatchToPdf([])).rejects.toThrow();
	});
});

describe("isValidSolutionMode", () => {
	it.each(SOLUTION_MODES)("accepts %j as a valid solution mode", (mode) => {
		expect(isValidSolutionMode(mode)).toBe(true);
	});

	it("rejects a value that is not one of the known solution modes", () => {
		expect(isValidSolutionMode("side-panel")).toBe(false);
	});

	it("rejects an empty string", () => {
		expect(isValidSolutionMode("")).toBe(false);
	});
});

describe("invalidSolutionModeMessage", () => {
	it("mentions the offending value and lists the valid modes", () => {
		const message = invalidSolutionModeMessage("side-panel");

		expect(message).toContain("side-panel");
		for (const mode of SOLUTION_MODES) {
			expect(message).toContain(mode);
		}
	});
});

describe("renderMazeBatchToPdfs", () => {
	it("returns one separate valid PDF per maze", async () => {
		const mazes = generateMazeBatch({
			width: 6,
			height: 6,
			seed: 40,
			count: 3,
		});
		const pdfs = await renderMazeBatchToPdfs(mazes);

		expect(pdfs).toHaveLength(3);
		for (const pdfBytes of pdfs) {
			const header = Buffer.from(pdfBytes.slice(0, 5)).toString("ascii");
			expect(header).toBe("%PDF-");
			const doc = await PDFDocument.load(pdfBytes);
			expect(doc.getPageCount()).toBe(1);
		}
	});

	it("produces a batch of 1 identical to the single-maze renderer", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 55 });

		const [batchPdf] = await renderMazeBatchToPdfs([maze]);
		const singlePdf = await renderMazeToPdf(maze);

		expect(Buffer.from(batchPdf)).toEqual(Buffer.from(singlePdf));
	});

	it("applies the solution option to every separate PDF", async () => {
		const mazes = generateMazeBatch({
			width: 6,
			height: 6,
			seed: 60,
			count: 2,
		});

		const pdfs = await renderMazeBatchToPdfs(mazes, { solution: "extra-page" });

		for (const pdfBytes of pdfs) {
			const doc = await PDFDocument.load(pdfBytes);
			expect(doc.getPageCount()).toBe(2);
		}
	});

	it("rejects an empty batch instead of returning an empty array", async () => {
		await expect(renderMazeBatchToPdfs([])).rejects.toThrow();
	});
});

describe("renderMazeToPdf parameters footer", () => {
	it("includes the maze type, dimensions, seed and difficulty when the maze carries them", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 42, difficulty: 3 });
		const pdfBytes = await renderMazeToPdf(maze);

		const content = decompressAllContentStreams(pdfBytes).join("\n");
		expect(content).toContain("rectangle");
		expect(content).toContain("6x6");
		expect(content).toContain("seed=42");
		expect(content).toContain("difficulty=3");
	});

	it("includes the maze algorithm when the maze carries it", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 42 });
		const pdfBytes = await renderMazeToPdf(maze);

		const content = decompressAllContentStreams(pdfBytes).join("\n");
		expect(content).toContain("algorithm=growing-tree");
	});

	it("also shows the parameters on the separate solution page", async () => {
		const maze = generateMaze({ width: 6, height: 6, seed: 7, difficulty: 2 });
		const pdfBytes = await renderMazeToPdf(maze, { solution: "extra-page" });

		const streams = decompressAllContentStreams(pdfBytes);
		const streamsWithLabel = streams.filter((content) =>
			content.includes("seed=7"),
		);
		expect(streamsWithLabel).toHaveLength(2);
	});

	it("does not add a footer or change the output when the maze has no generation parameters", async () => {
		const generated = generateMaze({ width: 4, height: 4, seed: 1 });
		const maze: Maze = {
			width: generated.width,
			height: generated.height,
			cells: generated.cells,
		};

		const withParameters = await renderMazeToPdf(generated);
		const withoutParameters = await renderMazeToPdf(maze);

		const content = decompressAllContentStreams(withoutParameters).join("\n");
		expect(content).not.toContain("seed=");
		expect(Buffer.from(withoutParameters)).not.toEqual(
			Buffer.from(withParameters),
		);
	});

	it("does not error when adding the parameters footer to a 1x1 maze", async () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 5, difficulty: 1 });

		await expect(renderMazeToPdf(maze)).resolves.toBeInstanceOf(Uint8Array);
	});
});
