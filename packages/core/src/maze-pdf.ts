import {
	LineCapStyle,
	PDFDocument,
	type PDFFont,
	type PDFPage,
	StandardFonts,
	rgb,
} from "pdf-lib";
import type { LineSegment } from "./maze-layout.js";
import {
	TUBE_INNER_WIDTH_RATIO,
	TUBE_OUTER_WIDTH_RATIO,
	computeCrossingOverSegments,
	computePathSegments,
	computeWallSegments,
} from "./maze-layout.js";
import type { MazePosition } from "./maze-solver.js";
import { solveMaze } from "./maze-solver.js";
import type { Maze } from "./maze.js";

export const REMARKABLE_2_PAGE_WIDTH_PT = (1404 / 226) * 72;
export const REMARKABLE_2_PAGE_HEIGHT_PT = (1872 / 226) * 72;

const PAGE_MARGIN_PT = 24;
const WALL_THICKNESS_PT = 1.5;
const WALL_COLOR = rgb(0, 0, 0);
const TUBE_COLOR = rgb(0, 0, 0);
const TUBE_INNER_COLOR = rgb(1, 1, 1);
const SOLUTION_THICKNESS_PT = 2;
const SOLUTION_COLOR = rgb(0.85, 0.1, 0.1);
const PARAMETERS_LABEL_SIZE_PT = 8;
const PARAMETERS_LABEL_COLOR = rgb(0.45, 0.45, 0.45);
const PARAMETERS_LABEL_Y_PT = PAGE_MARGIN_PT / 2;

export type SolutionDisplayMode = "none" | "extra-page" | "overlay";

export const SOLUTION_MODES: SolutionDisplayMode[] = [
	"none",
	"extra-page",
	"overlay",
];

export function isValidSolutionMode(
	value: string,
): value is SolutionDisplayMode {
	return (SOLUTION_MODES as string[]).includes(value);
}

export function invalidSolutionModeMessage(value: string): string {
	return `Invalid solution mode "${value}", expected one of: ${SOLUTION_MODES.join(", ")}`;
}

export interface RenderMazeToPdfOptions {
	solution?: SolutionDisplayMode;
}

interface MazeLayout {
	cellSize: number;
	leftOffset: number;
	topOffset: number;
}

function computeLayout(maze: Maze): MazeLayout {
	const drawableWidth = REMARKABLE_2_PAGE_WIDTH_PT - 2 * PAGE_MARGIN_PT;
	const drawableHeight = REMARKABLE_2_PAGE_HEIGHT_PT - 2 * PAGE_MARGIN_PT;
	const cellSize = Math.min(
		drawableWidth / maze.width,
		drawableHeight / maze.height,
	);

	const mazeWidthPt = cellSize * maze.width;
	const mazeHeightPt = cellSize * maze.height;

	return {
		cellSize,
		leftOffset: PAGE_MARGIN_PT + (drawableWidth - mazeWidthPt) / 2,
		topOffset: PAGE_MARGIN_PT + (drawableHeight - mazeHeightPt) / 2,
	};
}

function toPdfY(layout: MazeLayout, mazeY: number): number {
	return REMARKABLE_2_PAGE_HEIGHT_PT - layout.topOffset - mazeY;
}

function drawMazeSegments(
	page: PDFPage,
	segments: LineSegment[],
	layout: MazeLayout,
	thickness: number,
	color: ReturnType<typeof rgb>,
	lineCap: LineCapStyle,
): void {
	const { cellSize, leftOffset } = layout;

	for (const segment of segments) {
		page.drawLine({
			start: {
				x: leftOffset + segment.x1 * cellSize,
				y: toPdfY(layout, segment.y1 * cellSize),
			},
			end: {
				x: leftOffset + segment.x2 * cellSize,
				y: toPdfY(layout, segment.y2 * cellSize),
			},
			thickness,
			color,
			lineCap,
		});
	}
}

// A corridor is drawn as a hollow tube: a thick black stroke followed by a
// thinner white stroke on the same path, leaving only a border visible. Each
// group (bridge "under" segments, then the real "over" path segments) must be
// drawn fully — black then white — before the next, so the "over" tube is
// painted last and cleanly covers the "under" tube at a crossing (no manual
// gap math needed — see ADR 023).
function drawTubeGroup(
	page: PDFPage,
	segments: LineSegment[],
	layout: MazeLayout,
): void {
	const outerThickness = layout.cellSize * TUBE_OUTER_WIDTH_RATIO;
	const innerThickness = layout.cellSize * TUBE_INNER_WIDTH_RATIO;
	drawMazeSegments(
		page,
		segments,
		layout,
		outerThickness,
		TUBE_COLOR,
		LineCapStyle.Round,
	);
	drawMazeSegments(
		page,
		segments,
		layout,
		innerThickness,
		TUBE_INNER_COLOR,
		LineCapStyle.Round,
	);
}

function drawSolutionPath(
	page: PDFPage,
	path: MazePosition[],
	layout: MazeLayout,
): void {
	const { cellSize, leftOffset } = layout;
	const cellCenter = (position: MazePosition) => ({
		x: leftOffset + position.x * cellSize + cellSize / 2,
		y: toPdfY(layout, position.y * cellSize + cellSize / 2),
	});

	for (let i = 0; i < path.length - 1; i++) {
		const from = cellCenter(path[i]);
		const to = cellCenter(path[i + 1]);

		page.drawLine({
			start: from,
			end: to,
			thickness: SOLUTION_THICKNESS_PT,
			color: SOLUTION_COLOR,
		});
	}
}

function formatParametersLabel(maze: Maze): string | undefined {
	if (maze.seed === undefined) return undefined;

	const type = maze.type ?? "rectangle";
	const difficulty = maze.difficulty ?? 1;
	return `${type} ${maze.width}x${maze.height} seed=${maze.seed} difficulty=${difficulty}`;
}

function drawParametersLabel(
	page: PDFPage,
	font: PDFFont,
	label: string,
): void {
	const textWidth = font.widthOfTextAtSize(label, PARAMETERS_LABEL_SIZE_PT);
	page.drawText(label, {
		x: (REMARKABLE_2_PAGE_WIDTH_PT - textWidth) / 2,
		y: PARAMETERS_LABEL_Y_PT,
		size: PARAMETERS_LABEL_SIZE_PT,
		font,
		color: PARAMETERS_LABEL_COLOR,
	});
}

function drawMaze(page: PDFPage, maze: Maze, layout: MazeLayout): void {
	if (maze.type === "rectangle-crossing") {
		drawTubeGroup(page, computePathSegments(maze), layout);
		drawTubeGroup(page, computeCrossingOverSegments(maze), layout);
	} else {
		drawMazeSegments(
			page,
			computeWallSegments(maze),
			layout,
			WALL_THICKNESS_PT,
			WALL_COLOR,
			LineCapStyle.Butt,
		);
	}
}

function addMazePages(
	document: PDFDocument,
	font: PDFFont,
	maze: Maze,
	options: RenderMazeToPdfOptions,
): void {
	const solutionMode = options.solution ?? "none";
	const layout = computeLayout(maze);
	const parametersLabel = formatParametersLabel(maze);

	const mazePage = document.addPage([
		REMARKABLE_2_PAGE_WIDTH_PT,
		REMARKABLE_2_PAGE_HEIGHT_PT,
	]);
	drawMaze(mazePage, maze, layout);
	if (parametersLabel) drawParametersLabel(mazePage, font, parametersLabel);

	if (solutionMode === "overlay") {
		drawSolutionPath(mazePage, solveMaze(maze), layout);
	} else if (solutionMode === "extra-page") {
		const solutionPage = document.addPage([
			REMARKABLE_2_PAGE_WIDTH_PT,
			REMARKABLE_2_PAGE_HEIGHT_PT,
		]);
		drawMaze(solutionPage, maze, layout);
		drawSolutionPath(solutionPage, solveMaze(maze), layout);
		if (parametersLabel)
			drawParametersLabel(solutionPage, font, parametersLabel);
	}
}

async function createEmptyDocument(): Promise<PDFDocument> {
	const document = await PDFDocument.create();
	document.setCreationDate(new Date(0));
	document.setModificationDate(new Date(0));
	return document;
}

function validateBatch(mazes: Maze[]): void {
	if (mazes.length === 0) {
		throw new Error("Cannot render a maze batch with zero mazes");
	}
}

export async function renderMazeToPdf(
	maze: Maze,
	options: RenderMazeToPdfOptions = {},
): Promise<Uint8Array> {
	const document = await createEmptyDocument();
	const font = await document.embedFont(StandardFonts.Helvetica);
	addMazePages(document, font, maze, options);
	return document.save();
}

export async function renderMazeBatchToPdf(
	mazes: Maze[],
	options: RenderMazeToPdfOptions = {},
): Promise<Uint8Array> {
	validateBatch(mazes);

	const document = await createEmptyDocument();
	const font = await document.embedFont(StandardFonts.Helvetica);
	for (const maze of mazes) {
		addMazePages(document, font, maze, options);
	}
	return document.save();
}

export async function renderMazeBatchToPdfs(
	mazes: Maze[],
	options: RenderMazeToPdfOptions = {},
): Promise<Uint8Array[]> {
	validateBatch(mazes);

	return Promise.all(mazes.map((maze) => renderMazeToPdf(maze, options)));
}
