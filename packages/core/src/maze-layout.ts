import type { Maze } from "./maze.js";

export interface LineSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

function validateMazeShape(maze: Maze): void {
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

/**
 * Wall segments in unit cell coordinates (cellSize=1, top-left origin, Y-down).
 * Shared by every maze renderer so entrance/exit opening rules stay in one place.
 */
export function computeWallSegments(maze: Maze): LineSegment[] {
	validateMazeShape(maze);

	const segments: LineSegment[] = [];

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cells[y][x];
			const isEntrance = x === 0 && y === 0;
			const isExit = x === maze.width - 1 && y === maze.height - 1;

			if (cell.walls.north && !isEntrance) {
				segments.push({ x1: x, y1: y, x2: x + 1, y2: y });
			}
			if (cell.walls.west) {
				segments.push({ x1: x, y1: y, x2: x, y2: y + 1 });
			}
			if (x === maze.width - 1 && cell.walls.east) {
				segments.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 });
			}
			if (y === maze.height - 1 && cell.walls.south && !isExit) {
				segments.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1 });
			}
		}
	}

	return segments;
}

/**
 * Half-width (as a fraction of the cell size) of the "rectangle-crossing"
 * tube: each corridor is drawn as its two edge lines, offset this much from
 * the centerline on either side — two independent solid strokes, no
 * fill/border trick (see ADR 026). Above 0.25 the tube occupies more of the
 * cell than the walls/gaps around it (see ADR 029).
 */
export const TUBE_HALF_WIDTH_RATIO = 0.35;

function crossingAt(maze: Maze, x: number, y: number) {
	return (maze.crossings ?? []).find(
		(crossing) => crossing.x === x && crossing.y === y,
	);
}

/**
 * The two edge lines of every corridor in a "rectangle-crossing" maze, in
 * unit cell coordinates (see ADR 026). Computed per cell as the boundary of
 * a "hub" (a small square at the cell center, sized `2 * halfWidth`) plus an
 * "arm" reaching to the cell boundary for each open side — closed sides get
 * a flat cap across the hub instead. Adjacent cells' arms meet exactly at
 * the shared cell boundary, so straight runs and turns connect with no gap,
 * using only simple independent line segments (no stroke-width layering).
 *
 * At a crossing cell, the *over* axis is drawn as two straight lines running
 * the full width/height of the cell, uninterrupted; the *under* axis's arms
 * stop at the hub corners without crossing it, leaving a real gap exactly
 * where the over-axis tube passes.
 */
export function computeTubeSegments(maze: Maze): LineSegment[] {
	validateMazeShape(maze);

	const h = TUBE_HALF_WIDTH_RATIO;
	const segments: LineSegment[] = [];

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			segments.push(...computeCellTubeSegments(maze, x, y, h));
		}
	}

	return segments;
}

function computeCellTubeSegments(
	maze: Maze,
	x: number,
	y: number,
	h: number,
): LineSegment[] {
	const cx = x + 0.5;
	const cy = y + 0.5;
	const NW = { x: cx - h, y: cy - h };
	const NE = { x: cx + h, y: cy - h };
	const SE = { x: cx + h, y: cy + h };
	const SW = { x: cx - h, y: cy + h };

	const crossing = crossingAt(maze, x, y);
	if (crossing) {
		const overAxis =
			crossing.underAxis === "vertical" ? "horizontal" : "vertical";

		if (overAxis === "horizontal") {
			return [
				{ x1: x, y1: cy - h, x2: x + 1, y2: cy - h },
				{ x1: x, y1: cy + h, x2: x + 1, y2: cy + h },
				{ x1: NW.x, y1: NW.y, x2: cx - h, y2: y },
				{ x1: NE.x, y1: NE.y, x2: cx + h, y2: y },
				{ x1: SW.x, y1: SW.y, x2: cx - h, y2: y + 1 },
				{ x1: SE.x, y1: SE.y, x2: cx + h, y2: y + 1 },
			];
		}
		return [
			{ x1: cx - h, y1: y, x2: cx - h, y2: y + 1 },
			{ x1: cx + h, y1: y, x2: cx + h, y2: y + 1 },
			{ x1: NW.x, y1: NW.y, x2: x, y2: cy - h },
			{ x1: SW.x, y1: SW.y, x2: x, y2: cy + h },
			{ x1: NE.x, y1: NE.y, x2: x + 1, y2: cy - h },
			{ x1: SE.x, y1: SE.y, x2: x + 1, y2: cy + h },
		];
	}

	const cell = maze.cells[y][x];
	const isEntrance = x === 0 && y === 0;
	const isExit = x === maze.width - 1 && y === maze.height - 1;
	const segments: LineSegment[] = [];

	if (!cell.walls.north || isEntrance) {
		segments.push({ x1: cx - h, y1: y, x2: NW.x, y2: NW.y });
		segments.push({ x1: cx + h, y1: y, x2: NE.x, y2: NE.y });
	} else {
		segments.push({ x1: NW.x, y1: NW.y, x2: NE.x, y2: NE.y });
	}

	if (!cell.walls.south || isExit) {
		segments.push({ x1: SW.x, y1: SW.y, x2: cx - h, y2: y + 1 });
		segments.push({ x1: SE.x, y1: SE.y, x2: cx + h, y2: y + 1 });
	} else {
		segments.push({ x1: SW.x, y1: SW.y, x2: SE.x, y2: SE.y });
	}

	if (!cell.walls.east) {
		segments.push({ x1: NE.x, y1: NE.y, x2: x + 1, y2: cy - h });
		segments.push({ x1: SE.x, y1: SE.y, x2: x + 1, y2: cy + h });
	} else {
		segments.push({ x1: NE.x, y1: NE.y, x2: SE.x, y2: SE.y });
	}

	if (!cell.walls.west) {
		segments.push({ x1: NW.x, y1: NW.y, x2: x, y2: cy - h });
		segments.push({ x1: SW.x, y1: SW.y, x2: x, y2: cy + h });
	} else {
		segments.push({ x1: NW.x, y1: NW.y, x2: SW.x, y2: SW.y });
	}

	return segments;
}
