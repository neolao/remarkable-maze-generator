import type { ArcSegment, TubeSegment } from "../maze-layout.js";
import type { CircleCell } from "./cells.js";
import { isInwardOpen } from "./cells.js";

interface CircleMazeLike {
	sectorCounts: number[];
	cells: CircleCell[][];
}

function validateCircleMazeShape(maze: CircleMazeLike): void {
	if (
		maze.cells.length !== maze.sectorCounts.length ||
		maze.cells.some((ring, index) => ring.length !== maze.sectorCounts[index])
	) {
		throw new Error(
			"Circle maze cells do not match the declared sector counts",
		);
	}
}

/**
 * Side length (in unit cell coordinates) of the square bounding box a circle
 * maze is laid out in — twice the ring count, since ring 0's inner radius is
 * the exact center point (radius 0) and each ring adds exactly 1 unit of
 * radial thickness (see ADR 037).
 */
export function computeCircleMazeDiameter(maze: CircleMazeLike): number {
	return 2 * maze.sectorCounts.length;
}

interface Point {
	x: number;
	y: number;
}

function circlePoint(
	maze: CircleMazeLike,
	radius: number,
	angle: number,
): Point {
	const center = computeCircleMazeDiameter(maze) / 2;
	return {
		x: center + radius * Math.cos(angle),
		y: center + radius * Math.sin(angle),
	};
}

// The shared ArcSegment renderer always draws the *minor* arc between its two
// endpoints (a fixed SVG "large-arc-flag" of 0), so any span at or beyond
// 180° must be split in half, recursively, until every piece is safely under
// that threshold — same reasoning as the rectangular-grid `circle` type's
// superseded polar renderer (see ADR 034/037).
function circleArcSegments(
	maze: CircleMazeLike,
	radius: number,
	startAngle: number,
	endAngle: number,
): ArcSegment[] {
	if (endAngle - startAngle >= Math.PI) {
		const midAngle = (startAngle + endAngle) / 2;
		return [
			...circleArcSegments(maze, radius, startAngle, midAngle),
			...circleArcSegments(maze, radius, midAngle, endAngle),
		];
	}

	const from = circlePoint(maze, radius, startAngle);
	const to = circlePoint(maze, radius, endAngle);
	return [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y, radius, sweep: 1 }];
}

/**
 * Wall segments for the real growing-sector circle maze (see ADR 037), in the
 * same unit coordinate system the PDF/SVG renderers already scale/offset
 * generically for every maze type. Ring-boundary walls become arcs (drawn
 * from the *outer* ring's own sectors, at their own angular resolution, since
 * that ring may subdivide the boundary further than the inner one);
 * sector-boundary walls (`cwOpen`) become radial lines. The maze's absolute
 * outer edge (no ring further out to own it) is drawn directly from the
 * outermost ring, skipping the exit sector for a visible opening — there is
 * no equivalent opening at the center, which is a real point, not a
 * boundary.
 */
export function computeCircleMazeSegments(maze: CircleMazeLike): TubeSegment[] {
	validateCircleMazeShape(maze);

	const { sectorCounts, cells } = maze;
	const segments: TubeSegment[] = [];
	const lastRing = sectorCounts.length - 1;

	for (let ring = 0; ring < sectorCounts.length; ring++) {
		const angleStep = (2 * Math.PI) / sectorCounts[ring];
		const innerRadius = ring;
		const outerRadius = ring + 1;

		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			const startAngle = sector * angleStep;
			const endAngle = (sector + 1) * angleStep;
			const isExit = ring === lastRing && sector === 0;

			if (ring > 0 && !isInwardOpen(cells, sectorCounts, ring, sector)) {
				segments.push(
					...circleArcSegments(maze, innerRadius, startAngle, endAngle),
				);
			}

			if (!cells[ring][sector].cwOpen) {
				const from = circlePoint(maze, innerRadius, endAngle);
				const to = circlePoint(maze, outerRadius, endAngle);
				segments.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
			}

			if (ring === lastRing && !isExit) {
				segments.push(
					...circleArcSegments(maze, outerRadius, startAngle, endAngle),
				);
			}
		}
	}

	return segments;
}

/**
 * The physical center of cell (ring, sector), in the same unit coordinate
 * system as `computeCircleMazeSegments` — used to place the solution trace
 * and branch-point markers.
 */
export function computeCircleCellCenter(
	maze: CircleMazeLike,
	position: { ring: number; sector: number },
): Point {
	const angleStep = (2 * Math.PI) / maze.sectorCounts[position.ring];
	const angle = (position.sector + 0.5) * angleStep;
	const radius = position.ring + 0.5;
	return circlePoint(maze, radius, angle);
}
