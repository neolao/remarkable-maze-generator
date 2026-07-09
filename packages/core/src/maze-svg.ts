import { computeWallSegments } from "./maze-layout.js";
import type { Maze } from "./maze.js";

const DEFAULT_CELL_SIZE_PX = 20;
const WALL_STROKE_WIDTH_PX = 2;

export interface RenderMazeToSvgOptions {
	cellSizePx?: number;
}

export function renderMazeToSvg(
	maze: Maze,
	options: RenderMazeToSvgOptions = {},
): string {
	const cellSizePx = options.cellSizePx ?? DEFAULT_CELL_SIZE_PX;
	const segments = computeWallSegments(maze);

	const width = maze.width * cellSizePx;
	const height = maze.height * cellSizePx;

	const lines = segments
		.map(
			(segment) =>
				`<line x1="${segment.x1 * cellSizePx}" y1="${segment.y1 * cellSizePx}" x2="${segment.x2 * cellSizePx}" y2="${segment.y2 * cellSizePx}" stroke="black" stroke-width="${WALL_STROKE_WIDTH_PX}" stroke-linecap="square" />`,
		)
		.join("");

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="white" />${lines}</svg>`;
}
