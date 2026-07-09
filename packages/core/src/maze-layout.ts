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

function cellCenter(x: number, y: number): { x: number; y: number } {
	return { x: x + 0.5, y: y + 0.5 };
}

function underAxisAt(
	maze: Maze,
	x: number,
	y: number,
): "vertical" | "horizontal" | undefined {
	return (maze.crossings ?? []).find(
		(crossing) => crossing.x === x && crossing.y === y,
	)?.underAxis;
}

/**
 * Stroke width (as a fraction of the cell size) for the "rectangle-crossing"
 * path rendering — a single, independent solid line per segment, no fill or
 * border trick (see ADR 025).
 */
export const PATH_THICKNESS_RATIO = 0.15;

// Half-length (in unit cell coordinates) of the real, geometric gap left in
// the under-axis line at a crossing — proportional to the line's own
// thickness so the break is clearly wider than the stroke, with a bit of
// margin either side.
const CROSSING_GAP_HALF_LENGTH = PATH_THICKNESS_RATIO + 0.05;

/**
 * Corridor centerline segments in unit cell coordinates, used for the
 * "rectangle-crossing" maze type's path rendering (see ADR 023/025): one
 * segment per open connection between adjacent cells, plus a stub from the
 * entrance/exit cell center out to the boundary opening.
 *
 * At a crossing cell, only the *over*-axis connections are included here
 * (drawn as perfectly ordinary, uninterrupted segments) — the *under*-axis
 * connections are excluded; `computeCrossingUnderSegments` draws them
 * instead, with a real geometric gap at the crossing point (see ADR 025).
 */
export function computePathSegments(maze: Maze): LineSegment[] {
	validateMazeShape(maze);

	const segments: LineSegment[] = [];

	for (let y = 0; y < maze.height; y++) {
		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cells[y][x];
			const center = cellCenter(x, y);
			const selfUnderAxis = underAxisAt(maze, x, y);

			if (!cell.walls.south && y < maze.height - 1) {
				const neighborUnderAxis = underAxisAt(maze, x, y + 1);
				const isUnderAxis =
					selfUnderAxis === "vertical" || neighborUnderAxis === "vertical";
				if (!isUnderAxis) {
					const neighbor = cellCenter(x, y + 1);
					segments.push({
						x1: center.x,
						y1: center.y,
						x2: neighbor.x,
						y2: neighbor.y,
					});
				}
			}
			if (!cell.walls.east && x < maze.width - 1) {
				const neighborUnderAxis = underAxisAt(maze, x + 1, y);
				const isUnderAxis =
					selfUnderAxis === "horizontal" || neighborUnderAxis === "horizontal";
				if (!isUnderAxis) {
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
 * The *under*-axis connections at each recorded crossing (see ADR 024): 2
 * segments, each reaching all the way to its real neighbor's center (so the
 * corridor stays fully, visibly connected beyond the crossing), but stopping
 * just short of the crossing's own center — a real, drawn gap rather than a
 * later paint-order trick, sized to clear the line's own thickness (see ADR
 * 025).
 */
export function computeCrossingUnderSegments(maze: Maze): LineSegment[] {
	const segments: LineSegment[] = [];

	for (const crossing of maze.crossings ?? []) {
		const { x, y, underAxis } = crossing;
		const center = cellCenter(x, y);

		if (underAxis === "vertical") {
			const north = cellCenter(x, y - 1);
			const south = cellCenter(x, y + 1);
			segments.push({
				x1: north.x,
				y1: north.y,
				x2: center.x,
				y2: center.y - CROSSING_GAP_HALF_LENGTH,
			});
			segments.push({
				x1: south.x,
				y1: south.y,
				x2: center.x,
				y2: center.y + CROSSING_GAP_HALF_LENGTH,
			});
		} else {
			const east = cellCenter(x + 1, y);
			const west = cellCenter(x - 1, y);
			segments.push({
				x1: east.x,
				y1: east.y,
				x2: center.x + CROSSING_GAP_HALF_LENGTH,
				y2: center.y,
			});
			segments.push({
				x1: west.x,
				y1: west.y,
				x2: center.x - CROSSING_GAP_HALF_LENGTH,
				y2: center.y,
			});
		}
	}

	return segments;
}
