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
 * Corridor centerline segments in unit cell coordinates, used for the
 * "rectangle-crossing" maze type's thick, rounded-cap path rendering (see ADR
 * 023): one segment per open connection between adjacent cells, plus a stub
 * from the entrance/exit cell center out to the boundary opening.
 */
export function computePathSegments(maze: Maze): LineSegment[] {
	validateMazeShape(maze);

	const segments: LineSegment[] = [];
	const cellCenter = (x: number, y: number) => ({ x: x + 0.5, y: y + 0.5 });

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cells[y][x];
			const center = cellCenter(x, y);

			if (!cell.walls.south && y < maze.height - 1) {
				const neighbor = cellCenter(x, y + 1);
				segments.push({
					x1: center.x,
					y1: center.y,
					x2: neighbor.x,
					y2: neighbor.y,
				});
			}
			if (!cell.walls.east && x < maze.width - 1) {
				const neighbor = cellCenter(x + 1, y);
				segments.push({
					x1: center.x,
					y1: center.y,
					x2: neighbor.x,
					y2: neighbor.y,
				});
			}
		}
	}

	const entranceCenter = cellCenter(0, 0);
	segments.push({
		x1: entranceCenter.x,
		y1: entranceCenter.y,
		x2: entranceCenter.x,
		y2: 0,
	});

	const exitCenter = cellCenter(maze.width - 1, maze.height - 1);
	segments.push({
		x1: exitCenter.x,
		y1: exitCenter.y,
		x2: exitCenter.x,
		y2: maze.height,
	});

	return segments;
}

/**
 * Stroke thickness for the "rectangle-crossing" path rendering, as a fraction
 * of the cell size — the single source of truth shared by both the layout
 * (bridge gap sizing) and the PDF/SVG renderers. Matches the proportions of
 * David Bau's original maze generator (pypdfmaze: `wall=0.3` of the half-cell,
 * i.e. 0.15 of the full cell — see ADR 023), which reads as a clean, legible
 * tube instead of a thick blob.
 */
export const PATH_THICKNESS_RATIO = 0.15;

const CROSSING_GAP_START = 0.32;
const CROSSING_GAP_END = 0.68;

/**
 * Decorative "under" stub for each recorded bridge crossing (see ADR 022): two
 * short segments with a gap in the middle, drawn perpendicular to the cell's
 * real through-passage, so it reads as passing underneath it. Confined to the
 * crossing cell itself (not extending into neighbors), matching the reference
 * implementation's own crossing cue (see ADR 023).
 */
export function computeCrossingBridgeSegments(maze: Maze): LineSegment[] {
	const segments: LineSegment[] = [];

	for (const crossing of maze.crossings ?? []) {
		const { x, y } = crossing;
		const cell = maze.cells[y][x];
		const verticalPassage = !cell.walls.north && !cell.walls.south;

		if (verticalPassage) {
			const stubY = y + 0.5;
			segments.push({
				x1: x,
				y1: stubY,
				x2: x + CROSSING_GAP_START,
				y2: stubY,
			});
			segments.push({
				x1: x + CROSSING_GAP_END,
				y1: stubY,
				x2: x + 1,
				y2: stubY,
			});
		} else {
			const stubX = x + 0.5;
			segments.push({
				x1: stubX,
				y1: y,
				x2: stubX,
				y2: y + CROSSING_GAP_START,
			});
			segments.push({
				x1: stubX,
				y1: y + CROSSING_GAP_END,
				x2: stubX,
				y2: y + 1,
			});
		}
	}

	return segments;
}
