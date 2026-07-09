import {
	TUBE_INNER_WIDTH_RATIO,
	TUBE_OUTER_WIDTH_RATIO,
	computeCrossingOverSegments,
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
	stroke: "black" | "white",
	lineCap: "square" | "round",
): string {
	return segments
		.map(
			(segment) =>
				`<line x1="${segment.x1 * cellSizePx}" y1="${segment.y1 * cellSizePx}" x2="${segment.x2 * cellSizePx}" y2="${segment.y2 * cellSizePx}" stroke="${stroke}" stroke-width="${strokeWidthPx}" stroke-linecap="${lineCap}" />`,
		)
		.join("");
}

// A corridor is drawn as a hollow tube: a thick black stroke followed by a
// thinner white stroke on the same path, leaving only a border visible. Each
// group (all normal path segments — which already include a crossing's
// "under" axis, see ADR 024 — then a crossing's "over" axis segments) is
// drawn fully — black then white — before moving to the next, so the "over"
// tube is painted last and cleanly covers the "under" tube at each crossing,
// without disturbing any unrelated corridor elsewhere (see ADR 023/024).
function renderTubeGroup(segments: LineSegment[], cellSizePx: number): string {
	return (
		renderLines(
			segments,
			cellSizePx,
			cellSizePx * TUBE_OUTER_WIDTH_RATIO,
			"black",
			"round",
		) +
		renderLines(
			segments,
			cellSizePx,
			cellSizePx * TUBE_INNER_WIDTH_RATIO,
			"white",
			"round",
		)
	);
}

export function renderMazeToSvg(
	maze: Maze,
	options: RenderMazeToSvgOptions = {},
): string {
	const cellSizePx = options.cellSizePx ?? DEFAULT_CELL_SIZE_PX;
	const width = maze.width * cellSizePx;
	const height = maze.height * cellSizePx;

	const lines =
		maze.type === "rectangle-crossing"
			? renderTubeGroup(computePathSegments(maze), cellSizePx) +
				renderTubeGroup(computeCrossingOverSegments(maze), cellSizePx)
			: renderLines(
					computeWallSegments(maze),
					cellSizePx,
					WALL_STROKE_WIDTH_PX,
					"black",
					"square",
				);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="white" />${lines}</svg>`;
}
