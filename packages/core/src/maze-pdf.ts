import {
	LineCapStyle,
	PDFDocument,
	type PDFFont,
	type PDFPage,
	StandardFonts,
	rgb,
} from "pdf-lib";
import {
	computeCircleMazeDiameter,
	computeCircleMazeSegments,
	computeCircleSolutionPoints,
} from "./circle-maze/render.js";
import type { TubeSegment } from "./maze-layout.js";
import {
	computeCellCenter,
	computeTubeSegments,
	computeWallSegments,
	isArcSegment,
} from "./maze-layout.js";
import type { MazePosition } from "./maze-solver.js";
import { solveMaze } from "./maze-solver.js";
import type { Maze } from "./maze.js";

export const REMARKABLE_2_PAGE_WIDTH_PT = (1404 / 226) * 72;
export const REMARKABLE_2_PAGE_HEIGHT_PT = (1872 / 226) * 72;

const PAGE_MARGIN_PT = 24;
const STROKE_THICKNESS_PT = 1.5;
const STROKE_COLOR = rgb(0, 0, 0);
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

// The "circle" type lays out its segments in a square bounding box sized by
// its diameter (see ADR 037), not by `maze.width`/`maze.height` directly —
// every other type keeps using its cell grid dimensions as before.
function logicalLayoutSize(maze: Maze): { width: number; height: number } {
	if (maze.type === "circle") {
		const diameter = computeCircleMazeDiameter({
			sectorCounts: maze.circleSectorCounts ?? [],
			cells: maze.circleCells ?? [],
		});
		return { width: diameter, height: diameter };
	}
	return { width: maze.width, height: maze.height };
}

function computeLayout(maze: Maze): MazeLayout {
	const { width: logicalWidth, height: logicalHeight } =
		logicalLayoutSize(maze);
	const drawableWidth = REMARKABLE_2_PAGE_WIDTH_PT - 2 * PAGE_MARGIN_PT;
	const drawableHeight = REMARKABLE_2_PAGE_HEIGHT_PT - 2 * PAGE_MARGIN_PT;
	const cellSize = Math.min(
		drawableWidth / logicalWidth,
		drawableHeight / logicalHeight,
	);

	const mazeWidthPt = cellSize * logicalWidth;
	const mazeHeightPt = cellSize * logicalHeight;

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
	segments: TubeSegment[],
	layout: MazeLayout,
	thickness: number,
	color: ReturnType<typeof rgb>,
	lineCap: LineCapStyle,
): void {
	const { cellSize, leftOffset } = layout;
	// pdf-lib's drawSvgPath() applies its own translate-then-flip-Y transform
	// ("SVG path Y axis is opposite pdf-lib's" — see its own source), so an
	// arc's path coordinates must stay in plain, unflipped, Y-down page
	// points (matching how the classic SVG renderer reads the very same
	// segments) with this anchor absorbing the offset/flip — pre-flipping
	// them here as well, the way drawLine's own points are computed, would
	// double-flip and silently draw the arc off in the wrong place (this
	// broke the very first PDF render of a rounded corner: the shortened
	// straight edges appeared correctly but the arc connecting them never
	// showed up at all).
	const svgPathAnchor = {
		x: leftOffset,
		y: REMARKABLE_2_PAGE_HEIGHT_PT - layout.topOffset,
	};

	for (const segment of segments) {
		if (isArcSegment(segment)) {
			const x1 = segment.x1 * cellSize;
			const y1 = segment.y1 * cellSize;
			const x2 = segment.x2 * cellSize;
			const y2 = segment.y2 * cellSize;
			const radius = segment.radius * cellSize;
			page.drawSvgPath(
				`M ${x1} ${y1} A ${radius} ${radius} 0 0 ${segment.sweep} ${x2} ${y2}`,
				{
					x: svgPathAnchor.x,
					y: svgPathAnchor.y,
					borderColor: color,
					borderWidth: thickness,
					borderLineCap: lineCap,
				},
			);
			continue;
		}

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

function drawSolutionPath(
	page: PDFPage,
	maze: Maze,
	path: MazePosition[],
	layout: MazeLayout,
): void {
	const { cellSize, leftOffset } = layout;
	const toPdfPoint = (unitCenter: { x: number; y: number }) => ({
		x: leftOffset + unitCenter.x * cellSize,
		y: toPdfY(layout, unitCenter.y * cellSize),
	});

	// For "circle", a straight line directly between two consecutive cells'
	// centers looks like a diagonal cutting across the maze whenever they're
	// on different rings — `computeCircleSolutionPoints` inserts an extra
	// point at each ring boundary so the trace follows the radius through a
	// ring transition instead (see ADR 041).
	const points =
		maze.type === "circle"
			? computeCircleSolutionPoints(
					{
						sectorCounts: maze.circleSectorCounts ?? [],
						cells: maze.circleCells ?? [],
					},
					path.map((position) => ({ ring: position.y, sector: position.x })),
				).map(toPdfPoint)
			: path.map((position) => toPdfPoint(computeCellCenter(position)));

	for (let i = 0; i < points.length - 1; i++) {
		page.drawLine({
			start: points[i],
			end: points[i + 1],
			thickness: SOLUTION_THICKNESS_PT,
			color: SOLUTION_COLOR,
		});
	}
}

function formatParametersLabel(maze: Maze): string | undefined {
	if (maze.seed === undefined) return undefined;

	const type = maze.type ?? "rectangle";
	const difficulty = maze.difficulty ?? 1;
	const algorithm = maze.algorithm ?? "growing-tree";
	return `${type} ${maze.width}x${maze.height} seed=${maze.seed} difficulty=${difficulty} algorithm=${algorithm}`;
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
		// Every line is independent — no fill or stroke-width layering. Each
		// corridor is its own two edge lines (see ADR 026).
		drawMazeSegments(
			page,
			computeTubeSegments(maze),
			layout,
			STROKE_THICKNESS_PT,
			STROKE_COLOR,
			LineCapStyle.Round,
		);
	} else if (maze.type === "circle") {
		drawMazeSegments(
			page,
			computeCircleMazeSegments({
				sectorCounts: maze.circleSectorCounts ?? [],
				cells: maze.circleCells ?? [],
			}),
			layout,
			STROKE_THICKNESS_PT,
			STROKE_COLOR,
			LineCapStyle.Butt,
		);
	} else {
		drawMazeSegments(
			page,
			computeWallSegments(maze),
			layout,
			STROKE_THICKNESS_PT,
			STROKE_COLOR,
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
		drawSolutionPath(mazePage, maze, solveMaze(maze), layout);
	} else if (solutionMode === "extra-page") {
		const solutionPage = document.addPage([
			REMARKABLE_2_PAGE_WIDTH_PT,
			REMARKABLE_2_PAGE_HEIGHT_PT,
		]);
		drawMaze(solutionPage, maze, layout);
		drawSolutionPath(solutionPage, maze, solveMaze(maze), layout);
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
