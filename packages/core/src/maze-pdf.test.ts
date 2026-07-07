import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
	REMARKABLE_2_PAGE_HEIGHT_PT,
	REMARKABLE_2_PAGE_WIDTH_PT,
	renderMazeToPdf,
} from "./maze-pdf.js";
import { generateMaze } from "./maze.js";
import type { Maze } from "./maze.js";

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
});
