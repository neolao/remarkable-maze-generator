import {
	PATH_THICKNESS_RATIO,
	computeCrossingUnderSegments,
	computePathSegments,
	computeWallSegments,
} from "./maze-layout.js";
import type { LineSegment } from "./maze-layout.js";
import type { Maze } from "./maze.js";

const DEFAULT_CELL_SIZE_PX = 20;
const WALL_STROKE_WIDTH_PX = 2;

export interface RenderMazeToSvgOptions {
	cellSizePx?: number;
}

function renderLines(
	segments: LineSegment[],
	cellSizePx: number,
	strokeWidthPx: number,
	lineCap: "square" | "round",
): string {
	return segments
		.map(
			(segment) =>
				`<line x1="${segment.x1 * cellSizePx}" y1="${segment.y1 * cellSizePx}" x2="${segment.x2 * cellSizePx}" y2="${segment.y2 * cellSizePx}" stroke="black" stroke-width="${strokeWidthPx}" stroke-linecap="${lineCap}" />`,
		)
		.join("");
}

export function renderMazeToSvg(
	maze: Maze,
	options: RenderMazeToSvgOptions = {},
): string {
	const cellSizePx = options.cellSizePx ?? DEFAULT_CELL_SIZE_PX;
	const width = maze.width * cellSizePx;
	const height = maze.height * cellSizePx;

	// Every segment is drawn independently as a single solid stroke — no
	// fill/border trick. A crossing's over-axis is a normal, uninterrupted
	// segment; its under-axis has a real, drawn gap at the crossing point
	// (see ADR 025), so no paint-order tricks are needed anywhere.
	const lines =
		maze.type === "rectangle-crossing"
			? renderLines(
					[...computePathSegments(maze), ...computeCrossingUnderSegments(maze)],
					cellSizePx,
					cellSizePx * PATH_THICKNESS_RATIO,
					"round",
				)
			: renderLines(
					computeWallSegments(maze),
					cellSizePx,
					WALL_STROKE_WIDTH_PX,
					"square",
				);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="white" />${lines}</svg>`;
}
