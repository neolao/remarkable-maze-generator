import type { ArcSegment, TubeSegment } from "../rendering/maze-layout.js";
import type { CircleCell } from "./cells.js";
import { isInwardOpen } from "./cells.js";
import { computeHubRadius } from "./topology.js";

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
 * maze is laid out in — twice the ring count plus the hub radius (see
 * `computeHubRadius`), since every ring adds exactly 1 unit of radial
 * thickness and the whole ring stack sits pushed outward by the hub's own
 * radius (see ADR 037, ADR 038).
 */
export function computeCircleMazeDiameter(maze: CircleMazeLike): number {
	return (
		2 * (maze.sectorCounts.length + computeHubRadius(maze.sectorCounts[0]))
	);
}

interface Point {
	x: number;
	y: number;
}

// Sector 0 always starts at raw angle 0 on every ring (the topology's
// proportional index mapping keeps that seam radially aligned from the
// center out — see ADR 037), so a single constant rotation applied here
// moves the entrance/exit seam from the right (3 o'clock, the raw default)
// to the top (12 o'clock) for the whole maze at once.
const ANGLE_OFFSET = -Math.PI / 2;

function circlePoint(
	maze: CircleMazeLike,
	radius: number,
	angle: number,
): Point {
	const center = computeCircleMazeDiameter(maze) / 2;
	const adjustedAngle = angle + ANGLE_OFFSET;
	return {
		x: center + radius * Math.cos(adjustedAngle),
		y: center + radius * Math.sin(adjustedAngle),
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
 * outermost ring, skipping the exit sector for a visible opening. The center
 * is a real point, not a boundary, so the whole ring stack is pushed outward
 * by the hub radius (see `computeHubRadius`) and ring 0 gets its own "hub"
 * circle of that same radius instead, skipping the entrance sector the same
 * way — the entrance and exit are both sector 0, so `ANGLE_OFFSET` keeps them
 * pointing the same direction (up).
 */
export function computeCircleMazeSegments(maze: CircleMazeLike): TubeSegment[] {
	validateCircleMazeShape(maze);

	const { sectorCounts, cells } = maze;
	const segments: TubeSegment[] = [];
	const lastRing = sectorCounts.length - 1;
	const hubRadius = computeHubRadius(sectorCounts[0]);

	for (let ring = 0; ring < sectorCounts.length; ring++) {
		const angleStep = (2 * Math.PI) / sectorCounts[ring];
		const innerRadius = ring + hubRadius;
		const outerRadius = ring + 1 + hubRadius;

		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			const startAngle = sector * angleStep;
			const endAngle = (sector + 1) * angleStep;
			const isExit = ring === lastRing && sector === 0;
			const isEntrance = ring === 0 && sector === 0;

			if (ring > 0 && !isInwardOpen(cells, sectorCounts, ring, sector)) {
				segments.push(
					...circleArcSegments(maze, innerRadius, startAngle, endAngle),
				);
			}

			if (ring === 0 && !isEntrance) {
				segments.push(
					...circleArcSegments(maze, hubRadius, startAngle, endAngle),
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
	const hubRadius = computeHubRadius(maze.sectorCounts[0]);
	const radius = position.ring + hubRadius + 0.5;
	return circlePoint(maze, radius, angle);
}

/**
 * The points a solution trace should actually pass through for `path` (a
 * sequence of adjacent cells), instead of just each cell's own center. A
 * straight line directly between two consecutive cells' centers looks like a
 * diagonal cutting across the maze whenever they're on different rings and
 * not at the same angle — so whenever the path changes rings, this inserts
 * an extra point at the shared ring boundary, on the *outer* cell's own
 * angle. That makes the final approach into the outer cell a pure radial
 * line (same angle, only the radius changes) — the passage between two rings
 * reads as following the radius, not cutting across it (see ADR 041). Same-
 * ring moves are untouched, since two cells in the same ring already sit at
 * the angles their own boundaries define.
 */
export function computeCircleSolutionPoints(
	maze: CircleMazeLike,
	path: { ring: number; sector: number }[],
): Point[] {
	const hubRadius = computeHubRadius(maze.sectorCounts[0]);
	const points: Point[] = [];

	for (let i = 0; i < path.length; i++) {
		points.push(computeCircleCellCenter(maze, path[i]));

		if (i < path.length - 1) {
			const current = path[i];
			const next = path[i + 1];

			if (next.ring !== current.ring) {
				const outer = next.ring > current.ring ? next : current;
				const boundaryRadius = Math.max(current.ring, next.ring) + hubRadius;
				const angleStep = (2 * Math.PI) / maze.sectorCounts[outer.ring];
				const angle = (outer.sector + 0.5) * angleStep;
				points.push(circlePoint(maze, boundaryRadius, angle));
			}
		}
	}

	return points;
}
