import type { CircleMazeCrossing } from "../maze-domain.js";
import {
	type ArcSegment,
	type LineSegment,
	TUBE_CORNER_RADIUS_RATIO,
	TUBE_HALF_WIDTH_RATIO,
	type TubeSegment,
	roundCorner,
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

// Same arc as `circleArcSegments`, but guarantees a real shared vertex
// (rather than just visually passing through) at every one of `splitAngles`
// that falls strictly inside `[startAngle, endAngle]` — used by the outward
// side to give a cell's own hub corners a real vertex even when a child's
// own slot/door isn't aligned with them (see the outward side's own doc
// comment, ADR 055 follow-up).
function circleArcSegmentsSplitAt(
	maze: CircleMazeLike,
	radius: number,
	startAngle: number,
	endAngle: number,
	splitAngles: number[],
): ArcSegment[] {
	const bounds = [
		startAngle,
		...splitAngles.filter((a) => a > startAngle + 1e-9 && a < endAngle - 1e-9),
		endAngle,
	].sort((a, b) => a - b);

	const segments: ArcSegment[] = [];
	for (let i = 0; i < bounds.length - 1; i++) {
		segments.push(...circleArcSegments(maze, radius, bounds[i], bounds[i + 1]));
	}
	return segments;
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
 * The circle-maze equivalent of `computeTubeSegments` (see ADR 055, hub
 * sizing redesigned per its first follow-up, corner rounding added per its
 * second — see ADR 056): each cell's tube is a small hub in local (radius,
 * angle) space, plus an "arm" reaching to the cell boundary for each open
 * side (cw/ccw/inward/outward), a flat cap otherwise. Both the hub's radial
 * half-width (`TUBE_HALF_WIDTH_RATIO`) and its angular half-width are sized
 * in absolute (Cartesian) terms rather than as a fraction of the ring's own
 * angular step — a ring's sector count only gets recomputed at growth
 * boundaries, so an angleStep-relative width would otherwise keep growing
 * ring by ring within a same-count band, purely because the radius keeps
 * growing while the angular step doesn't. The outward side sizes/positions
 * each open child's own door from *that child's own* angle and radius rather
 * than the parent's, so it always agrees exactly with the same door as drawn
 * by the child's own inward side, fanning out one door per open child when
 * the maze branches. Every hub corner where two adjacent sides share the
 * same open/closed state — the same "real corner" rule the rectangular tube
 * renderer uses — is rounded with `roundCorner`: unlike the rectangular
 * grid, this corner isn't always fixed at 90° in absolute terms, but it *is*
 * always between one radial-direction side and one tangential-direction
 * side of the same cell, which are inherently perpendicular, so the same
 * 90°-only formula applies correctly here too.
 *
 * At a crossing node the *over* axis (see ADR 055) is drawn as two full-span
 * arcs/lines across the entire cell, ignoring the hub entirely; the *under*
 * axis draws its normal open arms only (hub corner to cell boundary), with
 * no cap connecting them across the hub — the real gap where the over-axis
 * tube passes through. Crossing cells are excluded from corner rounding.
 */
export function computeCircleTubeSegments(maze: CircleMazeLike): TubeSegment[] {
	validateCircleMazeShape(maze);

	const { sectorCounts } = maze;
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
	// An angular half-width sized from the *radius* rather than the ring's own
	// angular step keeps the hub's physical (Cartesian) width consistent
	// across rings — angleStep alone stays flat across a whole "sector count
	// band" while the radius (and so the arc length it carves out) keeps
	// growing ring by ring within that band (see ADR 055 follow-up).
	const hA = h / midRadius;
	const startHubA = midAngle - hA;
	const endHubA = midAngle + hA;

	const isEntrance = ring === 0 && sector === 0;
	const isExit = ring === lastRing && sector === 0;
	const cwOpen = cells[ring][sector].cwOpen;
	const ccwOpen = isCcwOpen(cells, sectorCounts, ring, sector);
	const inwardOpen =
		ring === 0 ? isEntrance : isInwardOpen(cells, sectorCounts, ring, sector);
	const outwardOpenAny =
		ring === lastRing ? isExit : cells[ring][sector].outwardOpen.some(Boolean);

	// Open outward doors, computed once up front (`outwardSide` below reuses
	// this same list): a corner (`startHubA`/`endHubA`) sometimes lands
	// *inside* an open child's own door rather than in a capped margin —
	// a child's own slot is generally not aligned with this cell's own
	// narrower hub window (see ADR 055 follow-up) — in which case a cw/ccw
	// closed side has nothing at the hub boundary to meet: reaching all the
	// way to `outerHubR` there would poke the wall stub straight into the
	// open doorway with nothing to visually close it off. `clippedOuterReach`
	// retracts that one corner back to the nearest door edge instead.
	const outwardDoors: { start: number; end: number }[] =
		ring === lastRing
			? []
			: outwardChildren(sectorCounts, ring, sector)
					.filter((_, index) => cells[ring][sector].outwardOpen[index])
					.map((child) => {
						const childAngleStep = (2 * Math.PI) / sectorCounts[ring + 1];
						const childMidRadius = ring + 1 + hubRadius + 0.5;
						const childHalfAngle = h / childMidRadius;
						const childMidAngle = (child + 0.5) * childAngleStep;
						return {
							start: childMidAngle - childHalfAngle,
							end: childMidAngle + childHalfAngle,
						};
					});

	// A corner inside an open door has nothing at `outerHubR` to visually
	// close it off (the doorway must stay open there) — reaching the wall
	// stub out to the corner anyway leaves it dangling mid-passage with a
	// round cap, reading as a stray, disconnected fragment. Retracting the
	// wall to stop at the hub's own middle radius avoids that without
	// otherwise changing this cell's geometry.
	const fallsInsideOpenDoor = (angle: number): boolean =>
		outwardDoors.some((d) => angle > d.start && angle < d.end);

	const cwSide = (open: boolean): TubeSegment[] =>
		open
			? [
					...circleArcSegments(maze, innerHubR, endHubA, endAngle),
					...circleArcSegments(maze, outerHubR, endHubA, endAngle),
				]
			: [
					radialLine(
						maze,
						endHubA,
						innerHubR,
						fallsInsideOpenDoor(endHubA) ? midRadius : outerHubR,
					),
				];

	const ccwSide = (open: boolean): TubeSegment[] =>
		open
			? [
					...circleArcSegments(maze, innerHubR, startAngle, startHubA),
					...circleArcSegments(maze, outerHubR, startAngle, startHubA),
				]
			: [
					radialLine(
						maze,
						startHubA,
						innerHubR,
						fallsInsideOpenDoor(startHubA) ? midRadius : outerHubR,
					),
				];

	const inwardSide = (open: boolean): TubeSegment[] =>
		open
			? [
					radialLine(maze, startHubA, innerRadius, innerHubR),
					radialLine(maze, endHubA, innerRadius, innerHubR),
				]
			: circleArcSegments(maze, innerHubR, startHubA, endHubA);

	// The outward side is the one place a cell's own angular resolution isn't
	// authoritative: an outward child lives in the *next* ring, which may have
	// a different (finer) sector count. Sizing/positioning each door from its
	// own open child's own angle would silently disagree with the same door
	// as drawn by the child's own `inwardSide` (using the child's angle) —
	// see ADR 055 follow-up. Deferring to each child's own angle and radius
	// keeps both sides in exact agreement, and naturally fans out one door
	// per open child when the maze branches at this node.
	//
	// Every child's own angular slot is walked individually — not just the
	// open ones — each closed child capped across its *own* full slot
	// (`childStart`/`childEnd`, not this cell's own narrower hub width), and
	// each open child capped on both margins around its own (narrower) door.
	// A child's own hub half-width is typically a majority, but not all, of
	// its own slot's half-width (see ADR 055 follow-up) — both an edge
	// child's own door position and, even for a centered child, the margin
	// left over on either side of its own door within its own slot, often
	// fall outside this cell's own `[startHubA, endHubA]` window. Capping
	// each child across its own full slot minus its own door — instead of
	// this cell's narrower hub window — is what actually guarantees a closed
	// boundary with no gap between this cell's own hub corners, each child's
	// own door, and every other child's own slot; since `outwardChildren`
	// always exactly partitions this cell's own `[startAngle, endAngle]`
	// (see ADR 040), walking every child in order leaves no angular gap
	// regardless of how their own doors happen to be positioned or sized.
	const outwardSide = (): TubeSegment[] => {
		if (ring === lastRing) {
			return isExit
				? [
						radialLine(maze, startHubA, outerHubR, outerRadius),
						radialLine(maze, endHubA, outerHubR, outerRadius),
					]
				: circleArcSegments(maze, outerHubR, startHubA, endHubA);
		}

		const children = outwardChildren(sectorCounts, ring, sector);
		if (children.length === 0) {
			return circleArcSegments(maze, outerHubR, startHubA, endHubA);
		}

		const childAngleStep = (2 * Math.PI) / sectorCounts[ring + 1];
		const childMidRadius = ring + 1 + hubRadius + 0.5;
		const childHalfAngle = h / childMidRadius;
		// This cell's own hub corners frequently fall *inside* one of the cap
		// arcs below rather than exactly at one of their endpoints (a child's
		// own slot/door is generally not aligned with this cell's narrower hub
		// window — see ADR 055 follow-up) — visually seamless (the arc's own
		// sweep still passes right through that point), but it leaves the
		// hub corner without a real shared vertex, undercounting this cell's
		// own connectivity to the rest of the maze and permanently losing the
		// chance to round that corner. Splitting any cap arc that spans across
		// one of these two corners into two pieces, exactly at the corner,
		// restores a real shared vertex there at no visual cost.
		const capArc = (radius: number, from: number, to: number): ArcSegment[] =>
			circleArcSegmentsSplitAt(maze, radius, from, to, [startHubA, endHubA]);

		return children.flatMap((child, index) => {
			const childStart = child * childAngleStep;
			const childEnd = (child + 1) * childAngleStep;

			if (!cells[ring][sector].outwardOpen[index]) {
				return capArc(outerHubR, childStart, childEnd);
			}

			const childMidAngle = (child + 0.5) * childAngleStep;
			const doorStart = childMidAngle - childHalfAngle;
			const doorEnd = childMidAngle + childHalfAngle;
			return [
				...capArc(outerHubR, childStart, doorStart),
				radialLine(maze, doorStart, outerHubR, outerRadius),
				radialLine(maze, doorEnd, outerHubR, outerRadius),
				...capArc(outerHubR, doorEnd, childEnd),
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

	// Every hub corner where the two adjacent sides share the same
	// open/closed state is a "real" corner — the two lines that would meet
	// there are genuinely perpendicular (one radial, one tangential), so it
	// gets rounded (see ADR 056 follow-up); a corner whose two sides differ
	// is already collinear with its neighbor and stays untouched.
	const innerStartCorner = circlePoint(maze, innerHubR, startHubA);
	const innerEndCorner = circlePoint(maze, innerHubR, endHubA);
	const outerStartCorner = circlePoint(maze, outerHubR, startHubA);
	const outerEndCorner = circlePoint(maze, outerHubR, endHubA);

	if (process.env.DEBUG_CELL_TAG) {
		console.error(
			"CELL",
			ring,
			sector,
			JSON.stringify({
				cwOpen,
				ccwOpen,
				inwardOpen,
				outwardOpenAny,
				innerStartCorner,
				innerEndCorner,
				outerStartCorner,
				outerEndCorner,
				isCrossing: Boolean(crossing),
			}),
		);
	}

	const corners: { point: Point; real: boolean }[] = [
		{ point: innerStartCorner, real: inwardOpen === ccwOpen },
		{ point: innerEndCorner, real: inwardOpen === cwOpen },
		{ point: outerEndCorner, real: outwardOpenAny === cwOpen },
		{ point: outerStartCorner, real: outwardOpenAny === ccwOpen },
	];

	const rawSegments = [
		...cwSide(cwOpen),
		...ccwSide(ccwOpen),
		...inwardSide(inwardOpen),
		...outwardSide(),
	];

	return roundRealHubCorners(rawSegments, corners);
}

function unit(from: Point, to: Point): Point {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy);
	return { x: dx / length, y: dy / length };
}

// Rotates a unit vector the same 90° step the rectangular tube's own fixed
// `CLOCKWISE_DIRECTIONS` cycle encodes (north -> east -> south -> west, each
// obtained from the previous one by exactly this transform: `(x, y) -> (-y,
// x)`). A hub corner's two directions aren't fixed compass directions the
// way a rectangular cell's are — they depend on the corner's own angle on
// the ring — so instead of a lookup table, this recomputes the same
// rotational check geometrically: whichever of the two touching directions
// lands on the other after this rotation goes first when handing the pair
// to `roundCorner`, otherwise its sweep comes out flipped (see ADR 031).
function rotate90(v: Point): Point {
	return { x: -v.y, y: v.x };
}

/**
 * Rounds every "real" hub corner in `rawSegments` (see
 * `computeCircleCellTubeSegments`), shortening whichever segment endpoints
 * land exactly on one — mirrors the rectangular tube's own
 * `roundRealCorners`, generalized from 4 fixed compass corners to 4 corner
 * *points* computed in Cartesian space (a hub corner's own two neighboring
 * directions aren't fixed compass directions here, so they're derived
 * relative to the corner point itself instead of from a shared lookup
 * table). Unlike the rectangular grid, a hub corner's two touching pieces
 * are never two lines — one side is always tangential (an arc when open, a
 * radial line when closed) and the other always radial (a line when open,
 * an arc cap when closed), so exactly one of the two is an `ArcSegment`.
 * Its endpoint is shortened the same way as a line's (straight-line
 * distance from the vertex toward the arc's own far endpoint) — a valid
 * approximation given the rounding radius is small relative to the arc's
 * own radius — while its `radius`/`sweep` are preserved unchanged via the
 * spread below, instead of being flattened into a straight line.
 */
function roundRealHubCorners(
	rawSegments: TubeSegment[],
	corners: { point: Point; real: boolean }[],
): TubeSegment[] {
	const startOverride = new Map<number, Point>();
	const endOverride = new Map<number, Point>();
	const arcs: ArcSegment[] = [];

	for (const { point, real } of corners) {
		if (!real) continue;

		const touching: { index: number; end: "start" | "end" }[] = [];
		rawSegments.forEach((segment, index) => {
			if (
				Math.abs(segment.x1 - point.x) < 1e-9 &&
				Math.abs(segment.y1 - point.y) < 1e-9
			) {
				touching.push({ index, end: "start" });
			} else if (
				Math.abs(segment.x2 - point.x) < 1e-9 &&
				Math.abs(segment.y2 - point.y) < 1e-9
			) {
				touching.push({ index, end: "end" });
			}
		});
		if (touching.length !== 2) continue;

		const farPointOf = ({ index, end }: (typeof touching)[number]): Point => {
			const segment = rawSegments[index];
			return end === "start"
				? { x: segment.x2, y: segment.y2 }
				: { x: segment.x1, y: segment.y1 };
		};

		const far0 = farPointOf(touching[0]);
		const far1 = farPointOf(touching[1]);
		const direction0 = unit(point, far0);
		const direction1 = unit(point, far1);
		const rotated0 = rotate90(direction0);
		const goesFirst =
			Math.abs(rotated0.x - direction1.x) < 1e-6 &&
			Math.abs(rotated0.y - direction1.y) < 1e-6;
		const orderedTouching = goesFirst
			? [touching[0], touching[1]]
			: [touching[1], touching[0]];
		const orderedFar = goesFirst ? [far0, far1] : [far1, far0];

		const radius = TUBE_CORNER_RADIUS_RATIO;
		const { tangent1, tangent2, arc } = roundCorner(
			point,
			orderedFar[0],
			orderedFar[1],
			radius,
		);

		const overrideMap = (end: "start" | "end") =>
			end === "start" ? startOverride : endOverride;
		overrideMap(orderedTouching[0].end).set(orderedTouching[0].index, tangent1);
		overrideMap(orderedTouching[1].end).set(orderedTouching[1].index, tangent2);
		arcs.push(arc);
	}

	const roundedSegments = rawSegments.map((segment, index) => {
		const start = startOverride.get(index) ?? { x: segment.x1, y: segment.y1 };
		const end = endOverride.get(index) ?? { x: segment.x2, y: segment.y2 };
		return { ...segment, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
	});

	return [...roundedSegments, ...arcs];
}
