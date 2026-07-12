import type { CircleMazeCrossing } from "../maze-domain.js";
import {
	type ArcSegment,
	type LineSegment,
	TUBE_HALF_WIDTH_RATIO,
	type TubeSegment,
} from "../rendering/maze-layout.js";
import type { CircleCell } from "./cells.js";
import { isCcwOpen, isInwardOpen } from "./cells.js";
import { computeHubRadius, outwardChildren } from "./topology.js";

interface CircleMazeLike {
	sectorCounts: number[];
	cells: CircleCell[][];
	crossings?: CircleMazeCrossing[];
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

function crossingKey(ring: number, sector: number): string {
	return `${ring},${sector}`;
}

function buildCrossingLookup(
	maze: CircleMazeLike,
): Map<string, CircleMazeCrossing> {
	const lookup = new Map<string, CircleMazeCrossing>();
	for (const crossing of maze.crossings ?? []) {
		lookup.set(crossingKey(crossing.ring, crossing.sector), crossing);
	}
	return lookup;
}

function radialLine(
	maze: CircleMazeLike,
	angle: number,
	fromRadius: number,
	toRadius: number,
): LineSegment {
	const from = circlePoint(maze, fromRadius, angle);
	const to = circlePoint(maze, toRadius, angle);
	return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
}

/**
 * The circle-maze equivalent of `computeTubeSegments` (see ADR 055): each
 * cell's tube is a small hub in local (radius, angle) space — a radial
 * half-width `TUBE_HALF_WIDTH_RATIO` (matching `RADIAL_THICKNESS`'s own unit
 * cell size) and an angular half-width the same ratio of the cell's own
 * angle span, so the tube stays proportionate whether a ring is narrow or
 * wide — plus an "arm" reaching to the cell boundary for each open side
 * (cw/ccw/inward), a flat cap otherwise. The outward side is the one
 * exception: since an outward child lives in the next ring, which may have a
 * different (finer) sector count, its door is sized/positioned from the
 * *child's own* angle and angular step rather than the parent's own — one
 * radial line pair per open child, fanning out naturally when the maze
 * branches — so it always lines up exactly with that same child's own
 * `inwardSide` instead of silently disagreeing on the door's width where
 * ring resolution changes (see ADR 055 follow-up).
 *
 * At a crossing node the *over* axis (see ADR 055) is drawn as two full-span
 * arcs/lines across the entire cell, ignoring the hub entirely; the *under*
 * axis draws its normal open arms only (hub corner to cell boundary), with
 * no cap connecting them across the hub — the real gap where the over-axis
 * tube passes through.
 */
export function computeCircleTubeSegments(maze: CircleMazeLike): TubeSegment[] {
	validateCircleMazeShape(maze);

	const { sectorCounts, cells } = maze;
	const segments: TubeSegment[] = [];
	const hubRadius = computeHubRadius(sectorCounts[0]);
	const lastRing = sectorCounts.length - 1;
	const crossingLookup = buildCrossingLookup(maze);

	for (let ring = 0; ring < sectorCounts.length; ring++) {
		const angleStep = (2 * Math.PI) / sectorCounts[ring];
		const innerRadius = ring + hubRadius;
		const outerRadius = ring + 1 + hubRadius;

		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			segments.push(
				...computeCircleCellTubeSegments(
					maze,
					ring,
					sector,
					angleStep,
					innerRadius,
					outerRadius,
					hubRadius,
					lastRing,
					crossingLookup,
				),
			);
		}
	}

	return segments;
}

function computeCircleCellTubeSegments(
	maze: CircleMazeLike,
	ring: number,
	sector: number,
	angleStep: number,
	innerRadius: number,
	outerRadius: number,
	hubRadius: number,
	lastRing: number,
	crossingLookup: Map<string, CircleMazeCrossing>,
): TubeSegment[] {
	const { sectorCounts, cells } = maze;
	const h = TUBE_HALF_WIDTH_RATIO;
	const startAngle = sector * angleStep;
	const endAngle = (sector + 1) * angleStep;
	const midAngle = (startAngle + endAngle) / 2;
	const midRadius = ring + hubRadius + 0.5;
	const innerHubR = midRadius - h;
	const outerHubR = midRadius + h;
	const hA = h * angleStep;
	const startHubA = midAngle - hA;
	const endHubA = midAngle + hA;

	const isEntrance = ring === 0 && sector === 0;
	const isExit = ring === lastRing && sector === 0;
	const cwOpen = cells[ring][sector].cwOpen;
	const ccwOpen = isCcwOpen(cells, sectorCounts, ring, sector);
	const inwardOpen =
		ring === 0 ? isEntrance : isInwardOpen(cells, sectorCounts, ring, sector);

	const cwSide = (open: boolean): TubeSegment[] =>
		open
			? [
					...circleArcSegments(maze, innerHubR, endHubA, endAngle),
					...circleArcSegments(maze, outerHubR, endHubA, endAngle),
				]
			: [radialLine(maze, endHubA, innerHubR, outerHubR)];

	const ccwSide = (open: boolean): TubeSegment[] =>
		open
			? [
					...circleArcSegments(maze, innerHubR, startAngle, startHubA),
					...circleArcSegments(maze, outerHubR, startAngle, startHubA),
				]
			: [radialLine(maze, startHubA, innerHubR, outerHubR)];

	const inwardSide = (open: boolean): TubeSegment[] =>
		open
			? [
					radialLine(maze, startHubA, innerRadius, innerHubR),
					radialLine(maze, endHubA, innerRadius, innerHubR),
				]
			: circleArcSegments(maze, innerHubR, startHubA, endHubA);

	// The outward side is the one place a cell's own angular resolution isn't
	// authoritative: an outward child lives in the *next* ring, which may have
	// a different (finer) sector count. Sizing/positioning this door from the
	// parent's own angle would silently disagree with the same door as drawn
	// by the child's own `inwardSide` (using the child's angle) — see the
	// door-size mismatch this fixes. Deferring to each open child's own angle
	// keeps both sides in exact agreement, and naturally fans out one door per
	// open child when the maze branches at this node.
	const outwardSide = (): TubeSegment[] => {
		if (ring === lastRing) {
			return isExit
				? [
						radialLine(maze, startHubA, outerHubR, outerRadius),
						radialLine(maze, endHubA, outerHubR, outerRadius),
					]
				: circleArcSegments(maze, outerHubR, startHubA, endHubA);
		}

		const openChildren = outwardChildren(sectorCounts, ring, sector).filter(
			(_, index) => cells[ring][sector].outwardOpen[index],
		);

		if (openChildren.length === 0) {
			return circleArcSegments(maze, outerHubR, startHubA, endHubA);
		}

		const childAngleStep = (2 * Math.PI) / sectorCounts[ring + 1];
		return openChildren.flatMap((child) => {
			const childMidAngle = (child + 0.5) * childAngleStep;
			const childHalfAngle = h * childAngleStep;
			return [
				radialLine(
					maze,
					childMidAngle - childHalfAngle,
					outerHubR,
					outerRadius,
				),
				radialLine(
					maze,
					childMidAngle + childHalfAngle,
					outerHubR,
					outerRadius,
				),
			];
		});
	};

	const crossing = crossingLookup.get(crossingKey(ring, sector));
	if (crossing) {
		const overAxis = crossing.underAxis === "radial" ? "tangential" : "radial";

		if (overAxis === "tangential") {
			return [
				...circleArcSegments(maze, innerHubR, startAngle, endAngle),
				...circleArcSegments(maze, outerHubR, startAngle, endAngle),
				...inwardSide(true),
				...outwardSide(),
			];
		}
		return [
			radialLine(maze, startHubA, innerRadius, outerRadius),
			radialLine(maze, endHubA, innerRadius, outerRadius),
			...cwSide(true),
			...ccwSide(true),
		];
	}

	return [
		...cwSide(cwOpen),
		...ccwSide(ccwOpen),
		...inwardSide(inwardOpen),
		...outwardSide(),
	];
}
