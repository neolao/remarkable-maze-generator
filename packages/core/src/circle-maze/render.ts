import type { CircleMazeCrossing } from "../maze-domain.js";
import {
	type ArcSegment,
	type LineSegment,
	TUBE_HALF_WIDTH_RATIO,
	type TubeSegment,
} from "../rendering/maze-layout.js";
import type { CircleCell } from "./cells.js";
import { isInwardOpen } from "./cells.js";
import { computeHubRadius, cwSector, outwardChildren } from "./topology.js";

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

// How far a crossing's *under* axis channel stops short of the crossing
// node's own center, as a fraction of the full node-to-node span — the real
// gap that reads as "this passage doesn't connect here, it tunnels under"
// (see ADR 055 follow-up).
const CROSSING_GAP_FRACTION = 0.35;

function offsetLinePair(
	from: Point,
	to: Point,
	halfWidth: number,
): [LineSegment, LineSegment] {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy) || 1;
	const px = (-dy / length) * halfWidth;
	const py = (dx / length) * halfWidth;
	return [
		{ x1: from.x + px, y1: from.y + py, x2: to.x + px, y2: to.y + py },
		{ x1: from.x - px, y1: from.y - py, x2: to.x - px, y2: to.y - py },
	];
}

function lerp(from: Point, to: Point, fraction: number): Point {
	return {
		x: from.x + (to.x - from.x) * fraction,
		y: from.y + (to.y - from.y) * fraction,
	};
}

/**
 * Whether `(ring, sector)` is a crossing node whose *under* axis (see ADR
 * 055) is `axis` — the direction in which its channel(s) must stop short of
 * its own center, leaving the real gap the *over* axis tunnels through.
 */
function needsCrossingGap(
	crossingLookup: Map<string, CircleMazeCrossing>,
	ring: number,
	sector: number,
	axis: "radial" | "tangential",
): boolean {
	const crossing = crossingLookup.get(crossingKey(ring, sector));
	return crossing !== undefined && crossing.underAxis === axis;
}

/**
 * A tangential (cw) channel between two same-ring neighbors, as two
 * concentric arcs offset `halfWidth` in/out from the ring's own mid-radius —
 * the exact offset of a circular arc is another circular arc, so this is
 * always a true constant-width channel, never an approximation (see ADR 055
 * follow-up). `fromGap`/`toGap` shorten the corresponding end when it lands
 * on a crossing node's tangential-axis gap.
 */
function tangentialChannel(
	maze: CircleMazeLike,
	hubRadius: number,
	ring: number,
	fromSector: number,
	fromGap: boolean,
	toGap: boolean,
): TubeSegment[] {
	const halfWidth = TUBE_HALF_WIDTH_RATIO;
	const angleStep = (2 * Math.PI) / maze.sectorCounts[ring];
	const midRadius = ring + hubRadius + 0.5;
	const fromAngle = (fromSector + 0.5) * angleStep;
	const toAngle = fromAngle + angleStep;
	const startAngle = fromGap
		? fromAngle + CROSSING_GAP_FRACTION * angleStep
		: fromAngle;
	const endAngle = toGap
		? toAngle - CROSSING_GAP_FRACTION * angleStep
		: toAngle;

	return [
		...circleArcSegments(maze, midRadius - halfWidth, startAngle, endAngle),
		...circleArcSegments(maze, midRadius + halfWidth, startAngle, endAngle),
	];
}

/**
 * A radial (outward) channel between an inner cell and one of its outer
 * children, as two Cartesian-parallel lines offset `halfWidth` from the
 * straight line between their two centers — a true constant-width channel
 * regardless of whether the child sits at the same angle as its parent (see
 * ADR 055 follow-up). `fromGap`/`toGap` shorten the corresponding end when it
 * lands on a crossing node's radial-axis gap.
 */
function radialChannel(
	maze: CircleMazeLike,
	innerRing: number,
	innerSector: number,
	outerSector: number,
	fromGap: boolean,
	toGap: boolean,
): TubeSegment[] {
	const innerCenter = computeCircleCellCenter(maze, {
		ring: innerRing,
		sector: innerSector,
	});
	const outerCenter = computeCircleCellCenter(maze, {
		ring: innerRing + 1,
		sector: outerSector,
	});
	const from = fromGap
		? lerp(innerCenter, outerCenter, CROSSING_GAP_FRACTION)
		: innerCenter;
	const to = toGap
		? lerp(outerCenter, innerCenter, CROSSING_GAP_FRACTION)
		: outerCenter;

	return offsetLinePair(from, to, TUBE_HALF_WIDTH_RATIO);
}

/**
 * A small constant-radius circle (4 quarter-arcs, pure Cartesian — no
 * dependency on the maze's own rotation or center) marking a node where two
 * or more channels meet. Reaching channels straight into a shared point
 * leaves a visible sharp kink at every turn (two lines crossing at different
 * tangent angles, never smoothly joined); overlaying this small hub "blob"
 * hides that kink the same way a real pipe joint would, without needing
 * per-corner tangent-circle math (see ADR 055 follow-up).
 */
function hubCircle(center: Point, radius: number): ArcSegment[] {
	const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
	const points = angles.map((angle) => ({
		x: center.x + radius * Math.cos(angle),
		y: center.y + radius * Math.sin(angle),
	}));
	return points.map((from, index) => {
		const to = points[(index + 1) % points.length];
		return { x1: from.x, y1: from.y, x2: to.x, y2: to.y, radius, sweep: 1 };
	});
}

/**
 * The circle-maze equivalent of `computeTubeSegments` (see ADR 055,
 * redesigned per its follow-up): rather than a per-cell polar "hub" whose
 * angular proportions silently drift out of sync with a neighboring ring's
 * own resolution, every *open* connection is drawn as its own constant-width
 * channel directly between the two cells' real centers — a pair of
 * concentric arcs for a same-ring (tangential) connection, a pair of
 * Cartesian-parallel lines for a cross-ring (radial) one. Closed sides reuse
 * `computeCircleMazeSegments`'s already-correct thin-wall geometry outright
 * (entrance/exit openings, ring-boundary/hub arcs and all), plus a matching
 * stub channel connecting the entrance/exit cell to the maze's own boundary.
 *
 * At a crossing node (see ADR 055), every one of its connections still gets
 * a channel, but the *under* axis's two channels each stop
 * `CROSSING_GAP_FRACTION` short of the crossing's own center instead of
 * reaching it — a real, physical gap — while the *over* axis's channel(s)
 * reach the center normally, exactly like an ordinary open node, reading as
 * the tunneled-through passage passing underneath uninterrupted.
 */
export function computeCircleTubeSegments(maze: CircleMazeLike): TubeSegment[] {
	validateCircleMazeShape(maze);

	const { sectorCounts, cells } = maze;
	const hubRadius = computeHubRadius(sectorCounts[0]);
	const lastRing = sectorCounts.length - 1;
	const crossingLookup = buildCrossingLookup(maze);
	const segments: TubeSegment[] = [...computeCircleMazeSegments(maze)];

	// Nodes that end up with at least one channel reaching their own center —
	// every one of these gets a small hub joint at the end, except crossing
	// nodes (see `hubCircle`), which must stay hub-less so the under-axis gap
	// carved into their channels stays visible instead of being papered over.
	const hubNodes = new Set<string>();
	const markHubNode = (ring: number, sector: number) => {
		if (!crossingLookup.has(crossingKey(ring, sector))) {
			hubNodes.add(crossingKey(ring, sector));
		}
	};

	for (let ring = 0; ring < sectorCounts.length; ring++) {
		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			if (cells[ring][sector].cwOpen) {
				const neighborSector = cwSector(sectorCounts, ring, sector);
				segments.push(
					...tangentialChannel(
						maze,
						hubRadius,
						ring,
						sector,
						needsCrossingGap(crossingLookup, ring, sector, "tangential"),
						needsCrossingGap(
							crossingLookup,
							ring,
							neighborSector,
							"tangential",
						),
					),
				);
				markHubNode(ring, sector);
				markHubNode(ring, neighborSector);
			}

			outwardChildren(sectorCounts, ring, sector).forEach((child, index) => {
				if (!cells[ring][sector].outwardOpen[index]) return;
				segments.push(
					...radialChannel(
						maze,
						ring,
						sector,
						child,
						needsCrossingGap(crossingLookup, ring, sector, "radial"),
						needsCrossingGap(crossingLookup, ring + 1, child, "radial"),
					),
				);
				markHubNode(ring, sector);
				markHubNode(ring + 1, child);
			});
		}
	}

	const entranceHubPoint = circlePoint(maze, hubRadius, 0);
	segments.push(
		...offsetLinePair(
			entranceHubPoint,
			computeCircleCellCenter(maze, { ring: 0, sector: 0 }),
			TUBE_HALF_WIDTH_RATIO,
		),
	);
	markHubNode(0, 0);

	const exitBoundaryPoint = circlePoint(maze, lastRing + 1 + hubRadius, 0);
	segments.push(
		...offsetLinePair(
			computeCircleCellCenter(maze, { ring: lastRing, sector: 0 }),
			exitBoundaryPoint,
			TUBE_HALF_WIDTH_RATIO,
		),
	);
	markHubNode(lastRing, 0);

	for (const key of hubNodes) {
		const [ring, sector] = key.split(",").map(Number);
		segments.push(
			...hubCircle(
				computeCircleCellCenter(maze, { ring, sector }),
				TUBE_HALF_WIDTH_RATIO,
			),
		);
	}

	return segments;
}
