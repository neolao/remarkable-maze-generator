import type { Maze } from "./maze.js";

export interface LineSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface ArcSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	radius: number;
	sweep: 0 | 1;
}

export type TubeSegment = LineSegment | ArcSegment;

export function isArcSegment(segment: TubeSegment): segment is ArcSegment {
	return "radius" in segment;
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
 * Minimum radius (in ring-width units, i.e. the same unit as one cell) of the
 * hole at the very center of a "circle" maze. A plain `0` would put every
 * sector's inner corner at the exact same point, which is both visually
 * cluttered and geometrically degenerate for the entrance opening — see
 * `computeCircleInnerRadius` for the actual (usually larger) radius used.
 */
export const CIRCLE_INNER_RADIUS_RATIO = 1;

/**
 * The actual inner radius used for a given maze: at least
 * `CIRCLE_INNER_RADIUS_RATIO`, but grown as needed so the innermost ring's
 * passage is at least as wide (tangentially, `radius * angleStep`) as a
 * ring's own radial thickness (1 unit). Without this, a maze with many
 * sectors would pinch its passages down to needle-thin wedges near the
 * center while the outermost ring stayed comfortably wide — the sector angle
 * shrinks the available tangential space at any fixed radius, and that space
 * only grows in from there, never back out (see ADR 034 follow-up).
 */
export function computeCircleInnerRadius(maze: Maze): number {
	const angleStep = (2 * Math.PI) / maze.width;
	return Math.max(CIRCLE_INNER_RADIUS_RATIO, 1 / angleStep);
}

/**
 * Side length (in unit cell coordinates) of the square bounding box a
 * "circle" maze is laid out in — the same coordinate system `computeCircleSegments`
 * and `computeCellCenter` use, so the PDF/SVG renderers can size their canvas
 * from this the same way they use `maze.width`/`maze.height` for the other
 * types.
 */
export function computeCircleDiameter(maze: Maze): number {
	return 2 * (computeCircleInnerRadius(maze) + maze.height);
}

function circlePoint(maze: Maze, radius: number, angle: number): Point {
	const center = computeCircleDiameter(maze) / 2;
	return {
		x: center + radius * Math.cos(angle),
		y: center + radius * Math.sin(angle),
	};
}

// The existing ArcSegment renderer always draws the *minor* arc between its
// two endpoints (a fixed SVG "large-arc-flag" of 0 — see `drawMazeSegments`
// and `renderLines`), so any span at or beyond 180° must be split in half,
// recursively, until every piece is safely under that threshold.
function circleArcSegments(
	maze: Maze,
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
	// Sweep 1 (the SVG "positive-angle" direction) matches increasing angle in
	// `circlePoint`'s Y-down parametrization, so this always traces the short
	// way from `startAngle` to `endAngle` — confirmed by rendering a real
	// circle maze end-to-end (see the "Rendering" runtime smoke check).
	return [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y, radius, sweep: 1 }];
}

/**
 * Wall segments for the "circle" maze type, in the same unit coordinate
 * system as `computeWallSegments` (scaled/offset identically by the PDF/SVG
 * renderers) — a column becomes an angular sector, a row a concentric ring
 * (row 0 innermost, see ADR 034). Ring-boundary walls (`north`/`south`)
 * become arcs; the sole angular boundary between two sectors (`west`) becomes
 * a radial line — `east` is never drawn separately, since generation always
 * mirrors it onto the next sector's own `west` (including across the
 * wraparound), the same way interior walls are never double-drawn in
 * `computeWallSegments`.
 */
export function computeCircleSegments(maze: Maze): TubeSegment[] {
	validateMazeShape(maze);

	const segments: TubeSegment[] = [];
	const angleStep = (2 * Math.PI) / maze.width;
	const innerRadiusBase = computeCircleInnerRadius(maze);

	for (let y = 0; y < maze.height; y++) {
		const innerRadius = innerRadiusBase + y;
		const outerRadius = innerRadiusBase + y + 1;

		for (let x = 0; x < maze.width; x++) {
			const cell = maze.cells[y][x];
			const isEntrance = x === 0 && y === 0;
			const isExit = x === maze.width - 1 && y === maze.height - 1;
			const startAngle = x * angleStep;
			const endAngle = (x + 1) * angleStep;

			if (cell.walls.north && !isEntrance) {
				segments.push(
					...circleArcSegments(maze, innerRadius, startAngle, endAngle),
				);
			}
			if (cell.walls.west) {
				const from = circlePoint(maze, innerRadius, startAngle);
				const to = circlePoint(maze, outerRadius, startAngle);
				segments.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
			}
			if (y === maze.height - 1 && cell.walls.south && !isExit) {
				segments.push(
					...circleArcSegments(maze, outerRadius, startAngle, endAngle),
				);
			}
		}
	}

	return segments;
}

/**
 * The physical center of cell (x,y), in the same unit coordinate system as
 * the wall/tube/circle segment computations above — used to place the
 * solution trace and branch-point markers correctly regardless of maze type.
 */
export function computeCellCenter(
	maze: Maze,
	position: { x: number; y: number },
): Point {
	if (maze.type !== "circle") {
		return { x: position.x + 0.5, y: position.y + 0.5 };
	}

	const angleStep = (2 * Math.PI) / maze.width;
	const angle = (position.x + 0.5) * angleStep;
	const radius = computeCircleInnerRadius(maze) + position.y + 0.5;
	return circlePoint(maze, radius, angle);
}

/**
 * Half-width (as a fraction of the cell size) of the "rectangle-crossing"
 * tube: each corridor is drawn as its two edge lines, offset this much from
 * the centerline on either side — two independent solid strokes, no
 * fill/border trick (see ADR 026). Above 0.25 the tube occupies more of the
 * cell than the walls/gaps around it (see ADR 029).
 */
export const TUBE_HALF_WIDTH_RATIO = 0.35;

/**
 * Fillet radius (as a fraction of the cell size) used to round every real
 * 90° corner of a tube's hub — turns, dead ends, T-junctions, and full
 * 4-way junctions all get their sharp corners rounded this way. Straight
 * passages (no corner to round) and bridge crossings (need their exact gap)
 * are unaffected (see ADR 030 and ADR 031).
 */
export const TUBE_CORNER_RADIUS_RATIO = 0.08;

function crossingAt(maze: Maze, x: number, y: number) {
	return (maze.crossings ?? []).find(
		(crossing) => crossing.x === x && crossing.y === y,
	);
}

interface Point {
	x: number;
	y: number;
}

function unit(from: Point, to: Point): Point {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy);
	return { x: dx / length, y: dy / length };
}

/**
 * Replaces the sharp 90° corner at `vertex` — shared by two edges reaching
 * toward `farPoint1` and `farPoint2` — with an arc tangent to both, each
 * edge shortened by `radius` from the vertex (see ADR 030). The resulting
 * sweep direction was confirmed by rendering a real turn end-to-end (a
 * single isolated corner rendered on its own was not enough to catch a
 * flipped sweep — it only becomes visually obvious once both of a turn's
 * edges are rendered together and the tube either stays a consistent width
 * around the bend or visibly pinches).
 */
function roundCorner(
	vertex: Point,
	farPoint1: Point,
	farPoint2: Point,
	radius: number,
): { tangent1: Point; tangent2: Point; arc: ArcSegment } {
	const r1 = unit(vertex, farPoint1);
	const r2 = unit(vertex, farPoint2);
	const tangent1 = {
		x: vertex.x + radius * r1.x,
		y: vertex.y + radius * r1.y,
	};
	const tangent2 = {
		x: vertex.x + radius * r2.x,
		y: vertex.y + radius * r2.y,
	};
	const sweep = r1.x * r2.y - r1.y * r2.x > 0 ? 0 : 1;

	return {
		tangent1,
		tangent2,
		arc: {
			x1: tangent1.x,
			y1: tangent1.y,
			x2: tangent2.x,
			y2: tangent2.y,
			radius,
			sweep,
		},
	};
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
export function computeTubeSegments(maze: Maze): TubeSegment[] {
	validateMazeShape(maze);

	const h = TUBE_HALF_WIDTH_RATIO;
	const segments: TubeSegment[] = [];

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
): TubeSegment[] {
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
	const northOpen = !cell.walls.north || isEntrance;
	const southOpen = !cell.walls.south || isExit;
	const eastOpen = !cell.walls.east;
	const westOpen = !cell.walls.west;

	const rawSegments: LineSegment[] = [];

	if (northOpen) {
		rawSegments.push({ x1: cx - h, y1: y, x2: NW.x, y2: NW.y });
		rawSegments.push({ x1: cx + h, y1: y, x2: NE.x, y2: NE.y });
	} else {
		rawSegments.push({ x1: NW.x, y1: NW.y, x2: NE.x, y2: NE.y });
	}

	if (southOpen) {
		rawSegments.push({ x1: SW.x, y1: SW.y, x2: cx - h, y2: y + 1 });
		rawSegments.push({ x1: SE.x, y1: SE.y, x2: cx + h, y2: y + 1 });
	} else {
		rawSegments.push({ x1: SW.x, y1: SW.y, x2: SE.x, y2: SE.y });
	}

	if (eastOpen) {
		rawSegments.push({ x1: NE.x, y1: NE.y, x2: x + 1, y2: cy - h });
		rawSegments.push({ x1: SE.x, y1: SE.y, x2: x + 1, y2: cy + h });
	} else {
		rawSegments.push({ x1: NE.x, y1: NE.y, x2: SE.x, y2: SE.y });
	}

	if (westOpen) {
		rawSegments.push({ x1: NW.x, y1: NW.y, x2: x, y2: cy - h });
		rawSegments.push({ x1: SW.x, y1: SW.y, x2: x, y2: cy + h });
	} else {
		rawSegments.push({ x1: NW.x, y1: NW.y, x2: SW.x, y2: SW.y });
	}

	// A cell with no open side at all isn't part of any corridor — it never
	// occurs in a generated maze (the growing-tree algorithm always visits
	// every cell), so its sharp hub square is left as-is rather than rounded.
	if (!northOpen && !southOpen && !eastOpen && !westOpen) {
		return rawSegments;
	}

	// A hub corner is a real 90° corner — needing rounding — only when its
	// two adjacent sides are in the *same* open/closed state (both open, or
	// both closed): the two lines meeting there are then genuinely
	// perpendicular. When the two sides differ, the corner is already
	// collinear with its neighboring straight edge and is left untouched
	// (see ADR 031, generalizing ADR 030's turn-only rounding to every
	// corner shape — dead ends, T-junctions, and full 4-way junctions).
	const corners = [
		{ point: NW, real: northOpen === westOpen },
		{ point: NE, real: northOpen === eastOpen },
		{ point: SE, real: southOpen === eastOpen },
		{ point: SW, real: southOpen === westOpen },
	];

	return roundRealCorners(rawSegments, corners, TUBE_CORNER_RADIUS_RATIO);
}

// Clockwise cyclic order (in this Y-down system) of the four axis-aligned
// directions a corner's two segments can point in. `roundCorner`'s sweep
// only comes out correct when its two far points are given in this order —
// whichever direction is immediately followed by the other in this cycle
// (wrapping from west back to north) goes first. Segment array order alone
// isn't reliable for this: which of the two touching segments happens to
// appear first in `rawSegments` depends on which sides are open/closed, not
// on rotational direction, so relying on it silently flips the sweep for
// some corners while happening to work for others (caught by the dedicated
// turn-rounding test after generalizing item 023's rounding — see ADR 031).
const CLOCKWISE_DIRECTIONS: Point[] = [
	{ x: 0, y: -1 }, // north
	{ x: 1, y: 0 }, // east
	{ x: 0, y: 1 }, // south
	{ x: -1, y: 0 }, // west
];

/**
 * Shortens whichever `rawSegments` endpoints land exactly on a "real"
 * corner and connects each such pair with a rounding arc (see ADR 030 and
 * ADR 031). Far points and directions are always computed from the original,
 * untouched `rawSegments` positions — never from another corner's
 * already-shortened tangent point — so a segment that happens to touch two
 * real corners (e.g. a dead-end cap) rounds correctly at both ends
 * regardless of processing order.
 */
function roundRealCorners(
	rawSegments: LineSegment[],
	corners: { point: Point; real: boolean }[],
	radius: number,
): TubeSegment[] {
	const startOverride = new Map<number, Point>();
	const endOverride = new Map<number, Point>();
	const arcs: ArcSegment[] = [];

	for (const { point, real } of corners) {
		if (!real) continue;

		const touching: { index: number; end: "start" | "end" }[] = [];
		rawSegments.forEach((segment, index) => {
			if (segment.x1 === point.x && segment.y1 === point.y) {
				touching.push({ index, end: "start" });
			} else if (segment.x2 === point.x && segment.y2 === point.y) {
				touching.push({ index, end: "end" });
			}
		});

		const farPointOf = ({ index, end }: (typeof touching)[number]): Point => {
			const segment = rawSegments[index];
			return end === "start"
				? { x: segment.x2, y: segment.y2 }
				: { x: segment.x1, y: segment.y1 };
		};

		const far0 = farPointOf(touching[0]);
		const far1 = farPointOf(touching[1]);
		const direction0 = unit(point, far0);
		const clockwiseIndex0 = CLOCKWISE_DIRECTIONS.findIndex(
			(d) => d.x === direction0.x && d.y === direction0.y,
		);
		const direction1 = unit(point, far1);
		const clockwiseIndex1 = CLOCKWISE_DIRECTIONS.findIndex(
			(d) => d.x === direction1.x && d.y === direction1.y,
		);
		const goesFirst = (clockwiseIndex0 + 1) % 4 === clockwiseIndex1;
		const orderedTouching = goesFirst
			? [touching[0], touching[1]]
			: [touching[1], touching[0]];
		const orderedFar = goesFirst ? [far0, far1] : [far1, far0];

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
		return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
	});

	return [...roundedSegments, ...arcs];
}
