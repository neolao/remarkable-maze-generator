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

function underAxisAt(
	maze: Maze,
	x: number,
	y: number,
): "vertical" | "horizontal" | undefined {
	return (maze.crossings ?? []).find(
		(crossing) => crossing.x === x && crossing.y === y,
	)?.underAxis;
}

function cellCenter(x: number, y: number): { x: number; y: number } {
	return { x: x + 0.5, y: y + 0.5 };
}

/**
 * Corridor centerline segments in unit cell coordinates, used for the
 * "rectangle-crossing" maze type's thick, rounded-cap path rendering (see ADR
 * 023): one segment per open connection between adjacent cells, plus a stub
 * from the entrance/exit cell center out to the boundary opening.
 *
 * At a crossing cell, only the "over" axis connection is excluded here — it's
 * redrawn separately, on top (see `computeCrossingOverSegments` and ADR 024).
 * The "under" axis connection is a perfectly normal segment like any other:
 * confining the visual cut to only the crossing's own "over" tube (rather
 * than drawing the "under" tube in its own separate, later-painted group)
 * avoids it being accidentally cut by unrelated corridors elsewhere that
 * happen to be painted afterward.
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
				const isOverAxis =
					(selfUnderAxis !== undefined && selfUnderAxis !== "vertical") ||
					(neighborUnderAxis !== undefined && neighborUnderAxis !== "vertical");
				if (!isOverAxis) {
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
				const isOverAxis =
					(selfUnderAxis !== undefined && selfUnderAxis !== "horizontal") ||
					(neighborUnderAxis !== undefined &&
						neighborUnderAxis !== "horizontal");
				if (!isOverAxis) {
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
 * Outer and inner stroke widths (fractions of the cell size) for the
 * "rectangle-crossing" hollow-tube rendering — the single source of truth
 * shared by the PDF/SVG renderers. Each corridor is drawn as a thick black
 * stroke (outer) with a thinner white stroke on top (inner), following the
 * same path, so only a border is visible — matching the reference look
 * (davidbau.com/images/art/mazeshot.png: outlined tubes, not solid fills —
 * see ADR 023).
 */
export const TUBE_OUTER_WIDTH_RATIO = 0.55;
export const TUBE_INNER_WIDTH_RATIO = 0.32;

/**
 * The "over" axis connections (2 per recorded crossing — see ADR 024) as full
 * centerline segments out to the neighboring cell centers, on the axis
 * opposite `underAxis`. `computePathSegments` already draws the "under" axis
 * as a perfectly normal segment; drawing these afterward, on top, is what
 * makes this axis read as passing over the other at the crossing point.
 * Confined to exactly the crossing's own 2 neighbors, so it can never
 * accidentally cut into an unrelated corridor elsewhere in the maze.
 */
export function computeCrossingOverSegments(maze: Maze): LineSegment[] {
	const segments: LineSegment[] = [];

	for (const crossing of maze.crossings ?? []) {
		const { x, y, underAxis } = crossing;
		const center = cellCenter(x, y);
		const overAxis = underAxis === "vertical" ? "horizontal" : "vertical";

		if (overAxis === "vertical") {
			const north = cellCenter(x, y - 1);
			const south = cellCenter(x, y + 1);
			segments.push({ x1: center.x, y1: center.y, x2: north.x, y2: north.y });
			segments.push({ x1: center.x, y1: center.y, x2: south.x, y2: south.y });
		} else {
			const east = cellCenter(x + 1, y);
			const west = cellCenter(x - 1, y);
			segments.push({ x1: center.x, y1: center.y, x2: east.x, y2: east.y });
			segments.push({ x1: center.x, y1: center.y, x2: west.x, y2: west.y });
		}
	}

	return segments;
}
