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
 * The circle-maze equivalent of `computeTubeSegments` (see ADR 055 for the
 * original per-cell hub design; redesigned per ADR 057's own follow-up to
 * fix a recurring class of disconnected-tube bugs — see below). Unlike the
 * rectangular grid, a cell's *outward* side can face several neighbors at
 * once (the next ring out may subdivide further), each at its own angle —
 * so every side is anchored directly to this cell's own **true** angular
 * boundaries (`startAngle`/`endAngle`), not to a separately inset "hub"
 * window: the two are always in exact agreement by construction, since
 * `outwardChildren` always exactly partitions `[startAngle, endAngle]` (see
 * ADR 040), instead of needing to be kept in sync by hand.
 *
 * Concretely: `inwardSide`/`outwardSide` each draw a full-width arc at
 * `innerHubR`/`outerHubR` spanning this cell's own entire `[startAngle,
 * endAngle]`, punctuated by a door-sized notch wherever a connection is
 * open (fanning out to one notch per open child on the outward side).
 * `cwSide`/`ccwSide` are reduced to the simplest possible cases: a closed
 * tangential wall is one plain radial line at this cell's own true
 * boundary angle; an open one draws *nothing* at all, since the same-ring
 * neighbor's own inward/outward arcs already reach that exact same
 * boundary point on their own, meeting with no gap and no coordination
 * needed between the two cells. The 4 hub corners — now simply
 * `(innerHubR/outerHubR) × (startAngle/endAngle)` — round the same way as
 * before wherever their two adjacent sides share the same open/closed
 * state.
 *
 * At a crossing node (see ADR 055) the *over* axis reads as continuous:
 * tangential-over draws its two full-width arcs unconditionally (the same
 * shape a plain closed cell's own arcs already have); radial-over bridges
 * straight through the hub's own interior at this cell's own door angle,
 * then hands off to `outwardSide`'s own child-aware positioning from
 * `outerHubR` onward. The *under* axis is left to its normal, restricted
 * self, which only ever reaches to `innerHubR`/`outerHubR` — never through
 * the hub's own interior — leaving the real gap where the over-axis tube
 * cuts across. Crossing cells are excluded from corner rounding.
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
	// This cell's own door half-width, used whenever *this* cell's own
	// inward side (a 1:1 relationship, never fanning out) is open. Sized
	// from the physical radius rather than the ring's own angular step, so
	// a door's physical (Cartesian) width stays consistent across rings —
	// angleStep alone stays flat across a whole "sector count band" while
	// the radius (and so the arc length it carves out) keeps growing ring
	// by ring within that band (see ADR 055 follow-up).
	const hA = h / midRadius;

	const isEntrance = ring === 0 && sector === 0;
	const isExit = ring === lastRing && sector === 0;
	const cwOpen = cells[ring][sector].cwOpen;
	const ccwOpen = isCcwOpen(cells, sectorCounts, ring, sector);
	const inwardOpen =
		ring === 0 ? isEntrance : isInwardOpen(cells, sectorCounts, ring, sector);
	const outwardOpenAny =
		ring === lastRing ? isExit : cells[ring][sector].outwardOpen.some(Boolean);

	// A closed tangential wall is one plain radial line at this cell's own
	// true boundary angle. An open one draws nothing: the same-ring
	// neighbor's own inward/outward arcs (below) already reach that exact
	// same point on their own — same radius, same angle, no coordination
	// needed between the two cells for them to meet with no gap.
	const cwSegment = (): TubeSegment[] =>
		cwOpen ? [] : [radialLine(maze, endAngle, innerHubR, outerHubR)];
	const ccwSegment = (): TubeSegment[] =>
		ccwOpen ? [] : [radialLine(maze, startAngle, innerHubR, outerHubR)];

	// For ring 0, `inwardOpen` is really "is this the entrance sector" (see
	// above) rather than a real neighbor relationship, but the geometry is
	// identical either way: a full-width cap when closed, or a door-sized
	// notch — margins capped on both sides, exactly like every other open
	// inward side — when open, `innerRadius` already being ring 0's own hub
	// radius. Capping those margins here too (rather than leaving them
	// bare, as an earlier version of this did for the entrance specifically)
	// is what gives the entrance's own ccw/cw walls a real corner to meet,
	// instead of a dangling stub reaching into open air (see ADR 057
	// follow-up).
	const inwardSide = (): TubeSegment[] => {
		if (!inwardOpen) {
			return circleArcSegments(maze, innerHubR, startAngle, endAngle);
		}
		const doorStart = midAngle - hA;
		const doorEnd = midAngle + hA;
		return [
			...circleArcSegments(maze, innerHubR, startAngle, doorStart),
			radialLine(maze, doorStart, innerRadius, innerHubR),
			radialLine(maze, doorEnd, innerRadius, innerHubR),
			...circleArcSegments(maze, innerHubR, doorEnd, endAngle),
		];
	};

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
	// (`childStart`/`childEnd`), and each open child capped on both margins
	// around its own (narrower) door. Since `outwardChildren` always exactly
	// partitions this cell's own `[startAngle, endAngle]` (see ADR 040),
	// walking every child in order leaves no angular gap regardless of how
	// their own doors happen to be positioned or sized, and the very first
	// and last pieces always land exactly on this cell's own `startAngle`/
	// `endAngle` — the same points `cwSegment`/`ccwSegment` anchor to.
	const outwardSide = (): TubeSegment[] => {
		if (ring === lastRing) {
			if (!isExit)
				return circleArcSegments(maze, outerHubR, startAngle, endAngle);
			// Same door-with-capped-margins shape as every other open side —
			// leaving the margins bare here left the exit cell's own cw/ccw
			// walls with a dangling stub reaching into open air (see ADR 057
			// follow-up), the same bug the entrance had.
			const doorStart = midAngle - hA;
			const doorEnd = midAngle + hA;
			return [
				...circleArcSegments(maze, outerHubR, startAngle, doorStart),
				radialLine(maze, doorStart, outerHubR, outerRadius),
				radialLine(maze, doorEnd, outerHubR, outerRadius),
				...circleArcSegments(maze, outerHubR, doorEnd, endAngle),
			];
		}

		const children = outwardChildren(sectorCounts, ring, sector);
		if (children.length === 0) {
			return circleArcSegments(maze, outerHubR, startAngle, endAngle);
		}

		const childAngleStep = (2 * Math.PI) / sectorCounts[ring + 1];
		const childMidRadius = ring + 1 + hubRadius + 0.5;
		const childHalfAngle = h / childMidRadius;

		return children.flatMap((child, index) => {
			const childStart = child * childAngleStep;
			const childEnd = (child + 1) * childAngleStep;

			if (!cells[ring][sector].outwardOpen[index]) {
				return circleArcSegments(maze, outerHubR, childStart, childEnd);
			}

			const childMidAngle = (child + 0.5) * childAngleStep;
			const doorStart = childMidAngle - childHalfAngle;
			const doorEnd = childMidAngle + childHalfAngle;
			return [
				...circleArcSegments(maze, outerHubR, childStart, doorStart),
				radialLine(maze, doorStart, outerHubR, outerRadius),
				radialLine(maze, doorEnd, outerHubR, outerRadius),
				...circleArcSegments(maze, outerHubR, doorEnd, childEnd),
			];
		});
	};

	const crossing = crossingLookup.get(crossingKey(ring, sector));
	if (crossing) {
		const overAxis = crossing.underAxis === "radial" ? "tangential" : "radial";

		if (overAxis === "tangential") {
			// The tangential axis reads as fully open/continuous: the same two
			// full-width arcs a plain closed cell's own inward/outward sides
			// already draw, just unconditionally. The radial axis is left to
			// its normal, restricted self (`inwardSide`/`outwardSide`, which
			// only ever reach as far as `innerHubR`/`outerHubR`, never into the
			// hub's own interior) — that alone leaves the real gap where the
			// tangential tube passes through.
			return [
				...circleArcSegments(maze, innerHubR, startAngle, endAngle),
				...circleArcSegments(maze, outerHubR, startAngle, endAngle),
				...inwardSide(),
				...outwardSide(),
			];
		}

		// The radial axis reads as fully open/continuous: bridge straight
		// through the hub's own interior — the part `inwardSide`/`outwardSide`
		// normally leave alone — at this cell's own door angle, then hand off
		// to `outwardSide`'s own child-aware positioning from `outerHubR`
		// onward, so it still lands exactly on whichever open child's own door
		// the crossing continues into. The tangential axis shows the real gap
		// simply by staying its normal (here: topologically forced open) self
		// — drawing nothing — while these two bridging lines visibly cut
		// across the space an uninterrupted tangential tube would occupy.
		const doorStart = midAngle - hA;
		const doorEnd = midAngle + hA;
		return [
			radialLine(maze, doorStart, innerRadius, outerHubR),
			radialLine(maze, doorEnd, innerRadius, outerHubR),
			...outwardSide(),
		];
	}

	// Every hub corner where the two adjacent sides share the same
	// open/closed state is a "real" corner — the two lines that would meet
	// there are genuinely perpendicular (one radial, one tangential), so it
	// gets rounded; a corner whose two sides differ is already collinear
	// with its neighbor and stays untouched.
	const innerStartCorner = circlePoint(maze, innerHubR, startAngle);
	const innerEndCorner = circlePoint(maze, innerHubR, endAngle);
	const outerStartCorner = circlePoint(maze, outerHubR, startAngle);
	const outerEndCorner = circlePoint(maze, outerHubR, endAngle);

	const corners: { point: Point; real: boolean }[] = [
		{ point: innerStartCorner, real: inwardOpen === ccwOpen },
		{ point: innerEndCorner, real: inwardOpen === cwOpen },
		{ point: outerEndCorner, real: outwardOpenAny === cwOpen },
		{ point: outerStartCorner, real: outwardOpenAny === ccwOpen },
	];

	const rawSegments = [
		...cwSegment(),
		...ccwSegment(),
		...inwardSide(),
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
