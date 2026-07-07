import { PDFDocument, rgb } from "pdf-lib";
import type { Maze } from "./maze.js";

export const REMARKABLE_2_PAGE_WIDTH_PT = (1404 / 226) * 72;
export const REMARKABLE_2_PAGE_HEIGHT_PT = (1872 / 226) * 72;

const PAGE_MARGIN_PT = 24;
const WALL_THICKNESS_PT = 1.5;
const WALL_COLOR = rgb(0, 0, 0);

function validateMaze(maze: Maze): void {
	if (
		!Number.isInteger(maze.width) ||
		!Number.isInteger(maze.height) ||
		maze.width <= 0 ||
		maze.height <= 0
	) {
		throw new Error(
			`Cannot render a maze with invalid dimensions, got width=${maze.width}, height=${maze.height}`,
		);
	}
	if (
		maze.cells.length !== maze.height ||
		maze.cells.some((row) => row.length !== maze.width)
	) {
		throw new Error("Maze cells do not match the declared width and height");
	}
}

export async function renderMazeToPdf(maze: Maze): Promise<Uint8Array> {
	validateMaze(maze);

	const document = await PDFDocument.create();
	document.setCreationDate(new Date(0));
	document.setModificationDate(new Date(0));

	const page = document.addPage([
		REMARKABLE_2_PAGE_WIDTH_PT,
		REMARKABLE_2_PAGE_HEIGHT_PT,
	]);

	const drawableWidth = REMARKABLE_2_PAGE_WIDTH_PT - 2 * PAGE_MARGIN_PT;
	const drawableHeight = REMARKABLE_2_PAGE_HEIGHT_PT - 2 * PAGE_MARGIN_PT;
	const cellSize = Math.min(
		drawableWidth / maze.width,
		drawableHeight / maze.height,
	);

	const mazeWidthPt = cellSize * maze.width;
	const mazeHeightPt = cellSize * maze.height;
	const leftOffset = PAGE_MARGIN_PT + (drawableWidth - mazeWidthPt) / 2;
	const topOffset = PAGE_MARGIN_PT + (drawableHeight - mazeHeightPt) / 2;

	const toPdfY = (mazeY: number) =>
		REMARKABLE_2_PAGE_HEIGHT_PT - topOffset - mazeY;

	const drawWall = (x1: number, y1: number, x2: number, y2: number) => {
		page.drawLine({
			start: { x: leftOffset + x1, y: toPdfY(y1) },
			end: { x: leftOffset + x2, y: toPdfY(y2) },
			thickness: WALL_THICKNESS_PT,
			color: WALL_COLOR,
		});
	};

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cells[y][x];
			const px = x * cellSize;
			const py = y * cellSize;

			if (cell.walls.north) drawWall(px, py, px + cellSize, py);
			if (cell.walls.west) drawWall(px, py, px, py + cellSize);
			if (x === maze.width - 1 && cell.walls.east)
				drawWall(px + cellSize, py, px + cellSize, py + cellSize);
			if (y === maze.height - 1 && cell.walls.south)
				drawWall(px, py + cellSize, px + cellSize, py + cellSize);
		}
	}

	return document.save();
}
