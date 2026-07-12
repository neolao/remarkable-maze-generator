import { isArcSegment } from "./maze-layout.js";
import type { TubeSegment } from "./maze-layout.js";
import { getMazeRenderStrategy } from "./maze-render-strategy.js";
import { findSolutionBranchPoints, solveMaze } from "./maze-solver.js";
import type { MazePosition } from "./maze-solver.js";
import type { Maze } from "./maze.js";

const DEFAULT_CELL_SIZE_PX = 20;
const STROKE_WIDTH_PX = 2;
const SOLUTION_STROKE_WIDTH_PX = 2;
const SOLUTION_COLOR = "#d91a1a";
const BRANCH_POINT_RADIUS_RATIO = 0.25;

export interface RenderMazeToSvgOptions {
	cellSizePx?: number;
	showSolution?: boolean;
}

function renderLines(
	segments: TubeSegment[],
	cellSizePx: number,
	lineCap: "square" | "round",
): string {
	return segments
		.map((segment) => {
			const x1 = segment.x1 * cellSizePx;
			const y1 = segment.y1 * cellSizePx;
			const x2 = segment.x2 * cellSizePx;
			const y2 = segment.y2 * cellSizePx;

			if (isArcSegment(segment)) {
				const r = segment.radius * cellSizePx;
				return `<path d="M ${x1} ${y1} A ${r} ${r} 0 0 ${segment.sweep} ${x2} ${y2}" stroke="black" stroke-width="${STROKE_WIDTH_PX}" stroke-linecap="${lineCap}" fill="none" />`;
			}

			return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="${STROKE_WIDTH_PX}" stroke-linecap="${lineCap}" />`;
		})
		.join("");
}

function cellCenter(maze: Maze, position: MazePosition, cellSizePx: number) {
	const unitCenter = getMazeRenderStrategy(maze).cellCenter(maze, position);
	return {
		x: unitCenter.x * cellSizePx,
		y: unitCenter.y * cellSizePx,
	};
}

function renderSolutionTrace(
	maze: Maze,
	path: MazePosition[],
	cellSizePx: number,
): string {
	// For "circle", a straight line directly between two consecutive cells'
	// centers looks like a diagonal cutting across the maze whenever they're
	// on different rings — the circle strategy's `solutionPoints` inserts an
	// extra point at each ring boundary so the trace follows the radius
	// through a ring transition instead (see ADR 041).
	const points = getMazeRenderStrategy(maze)
		.solutionPoints(maze, path)
		.map((point) => ({ x: point.x * cellSizePx, y: point.y * cellSizePx }));

	let markup = "";
	for (let i = 0; i < points.length - 1; i++) {
		const from = points[i];
		const to = points[i + 1];
		markup += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${SOLUTION_COLOR}" stroke-width="${SOLUTION_STROKE_WIDTH_PX}" stroke-linecap="round" />`;
	}

	return markup;
}

function renderBranchPointMarkers(
	maze: Maze,
	branchPoints: MazePosition[],
	cellSizePx: number,
): string {
	const radius = cellSizePx * BRANCH_POINT_RADIUS_RATIO;

	return branchPoints
		.map((position) => {
			const center = cellCenter(maze, position, cellSizePx);
			return `<circle cx="${center.x}" cy="${center.y}" r="${radius}" fill="${SOLUTION_COLOR}" />`;
		})
		.join("");
}

export function renderMazeToSvg(
	maze: Maze,
	options: RenderMazeToSvgOptions = {},
): string {
	const cellSizePx = options.cellSizePx ?? DEFAULT_CELL_SIZE_PX;
	const strategy = getMazeRenderStrategy(maze);
	const { width: logicalWidth, height: logicalHeight } =
		strategy.logicalSize(maze);
	const width = logicalWidth * cellSizePx;
	const height = logicalHeight * cellSizePx;

	// Every line is independent — no fill or stroke-width layering. For
	// "rectangle-crossing", each corridor is its own two edge lines with round
	// caps (see ADR 026); every other type draws plain square-capped walls
	// ("circle" draws its ring/sector walls, see ADR 037).
	const lines = renderLines(
		strategy.segments(maze),
		cellSizePx,
		strategy.roundedCaps ? "round" : "square",
	);

	const solutionMarkup = options.showSolution
		? renderSolutionTrace(maze, solveMaze(maze), cellSizePx) +
			renderBranchPointMarkers(maze, findSolutionBranchPoints(maze), cellSizePx)
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="white" />${lines}${solutionMarkup}</svg>`;
}
