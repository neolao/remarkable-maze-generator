export interface CellWalls {
	north: boolean;
	south: boolean;
	east: boolean;
	west: boolean;
}

export interface Cell {
	walls: CellWalls;
}

export interface MazeCrossing {
	x: number;
	y: number;
	/**
	 * Which axis was the pre-existing passage that got tunneled under. Purely a
	 * rendering hint (see ADR 023/024) — both axes are real, walkable
	 * connections either way.
	 */
	underAxis: "vertical" | "horizontal";
}

export type MazeType = "rectangle" | "rectangle-crossing";

export const MAZE_TYPES: MazeType[] = ["rectangle", "rectangle-crossing"];

export function isValidMazeType(value: string): value is MazeType {
	return (MAZE_TYPES as string[]).includes(value);
}

export function invalidMazeTypeMessage(value: string): string {
	return `Invalid maze type "${value}", expected one of: ${MAZE_TYPES.join(", ")}`;
}

export interface Maze {
	width: number;
	height: number;
	cells: Cell[][];
	type?: MazeType;
	seed?: number;
	difficulty?: number;
	crossings?: MazeCrossing[];
}

export interface GenerateMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty?: number;
	type?: MazeType;
}

export interface GenerateMazeBatchOptions {
	width: number;
	height: number;
	seed: number;
	count: number;
	difficulty?: number;
	type?: MazeType;
}

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_MAZE_TYPE: MazeType = "rectangle";

type Axis = "vertical" | "horizontal";

interface Direction {
	dx: number;
	dy: number;
	wall: keyof CellWalls;
	opposite: keyof CellWalls;
	axis: Axis;
}

const DIRECTIONS: Direction[] = [
	{ dx: 0, dy: -1, wall: "north", opposite: "south", axis: "vertical" },
	{ dx: 0, dy: 1, wall: "south", opposite: "north", axis: "vertical" },
	{ dx: 1, dy: 0, wall: "east", opposite: "west", axis: "horizontal" },
	{ dx: -1, dy: 0, wall: "west", opposite: "east", axis: "horizontal" },
];

function createSeededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function createGrid(width: number, height: number): Cell[][] {
	return Array.from({ length: height }, () =>
		Array.from({ length: width }, () => ({
			walls: { north: true, south: true, east: true, west: true },
		})),
	);
}

function validateDimensions(width: number, height: number): void {
	if (
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width <= 0 ||
		height <= 0
	) {
		throw new Error(
			`Maze width and height must be positive integers, got width=${width}, height=${height}`,
		);
	}
}

function validateDifficulty(difficulty: number): void {
	if (
		!Number.isInteger(difficulty) ||
		difficulty < MIN_DIFFICULTY ||
		difficulty > MAX_DIFFICULTY
	) {
		throw new Error(
			`Maze difficulty must be an integer between ${MIN_DIFFICULTY} and ${MAX_DIFFICULTY}, got difficulty=${difficulty}`,
		);
	}
}

function validateType(type: MazeType): void {
	if (!isValidMazeType(type)) {
		throw new Error(invalidMazeTypeMessage(type));
	}
}

// A cell is a valid tunnel-through candidate when it currently carries exactly
// one straight passage (both walls open on one axis, both closed on the
// other) — the shape a real bridge crossing needs to duck under (see ADR 024).
function straightPassageAxis(walls: CellWalls): Axis | undefined {
	if (!walls.north && !walls.south && walls.east && walls.west)
		return "vertical";
	if (!walls.east && !walls.west && walls.north && walls.south)
		return "horizontal";
	return undefined;
}

export function generateMaze({
	width,
	height,
	seed,
	difficulty = MIN_DIFFICULTY,
	type = DEFAULT_MAZE_TYPE,
}: GenerateMazeOptions): Maze {
	validateDimensions(width, height);
	validateDifficulty(difficulty);
	validateType(type);

	const random = createSeededRandom(seed);
	const cells = createGrid(width, height);
	const visited = Array.from({ length: height }, () =>
		new Array<boolean>(width).fill(false),
	);

	// Growing tree algorithm (see ADR 015): picking the most recently added
	// active cell (probability 0) reduces to the recursive backtracker (long
	// corridors, few branch points); picking a random active cell (probability
	// 1) is structurally equivalent to Prim's algorithm (many branch points).
	const randomSelectionProbability =
		(difficulty - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY);

	const allowsCrossings = type === "rectangle-crossing";
	const crossings: MazeCrossing[] = [];
	const isUsedAsCrossing = (x: number, y: number) =>
		(x === 0 && y === 0) ||
		(x === width - 1 && y === height - 1) ||
		crossings.some((crossing) => crossing.x === x && crossing.y === y);
	// Keeping crossings apart from one another avoids a "ladder" of several
	// crossings stacked back-to-back between the same two parallel corridors,
	// which reads as a repeating structural pattern rather than an occasional,
	// notable bridge (see ADR 024 follow-up).
	const isAdjacentToCrossing = (x: number, y: number) =>
		crossings.some(
			(crossing) => Math.abs(crossing.x - x) + Math.abs(crossing.y - y) === 1,
		);

	const active: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
	visited[0][0] = true;

	while (active.length > 0) {
		const index =
			randomSelectionProbability > 0 && random() < randomSelectionProbability
				? Math.floor(random() * active.length)
				: active.length - 1;
		const current = active[index];

		const unvisitedNeighbors = DIRECTIONS.map((direction) => ({
			direction,
			x: current.x + direction.dx,
			y: current.y + direction.dy,
		})).filter(
			(neighbor) =>
				neighbor.x >= 0 &&
				neighbor.x < width &&
				neighbor.y >= 0 &&
				neighbor.y < height &&
				!visited[neighbor.y][neighbor.x],
		);

		// A tunnel candidate reaches a new, unvisited cell by ducking straight
		// through an already-visited neighbor's existing perpendicular passage,
		// creating a real bridge crossing (see ADR 024) instead of extending to
		// an adjacent unvisited cell directly.
		const tunnelCandidates = allowsCrossings
			? DIRECTIONS.map((direction) => {
					const tunnelX = current.x + direction.dx;
					const tunnelY = current.y + direction.dy;
					const targetX = tunnelX + direction.dx;
					const targetY = tunnelY + direction.dy;
					return { direction, tunnelX, tunnelY, targetX, targetY };
				}).filter(({ direction, tunnelX, tunnelY, targetX, targetY }) => {
					if (
						tunnelX < 0 ||
						tunnelX >= width ||
						tunnelY < 0 ||
						tunnelY >= height
					)
						return false;
					if (!visited[tunnelY][tunnelX]) return false;
					if (isUsedAsCrossing(tunnelX, tunnelY)) return false;
					if (isAdjacentToCrossing(tunnelX, tunnelY)) return false;
					if (
						targetX < 0 ||
						targetX >= width ||
						targetY < 0 ||
						targetY >= height
					)
						return false;
					if (visited[targetY][targetX]) return false;

					const existingAxis = straightPassageAxis(
						cells[tunnelY][tunnelX].walls,
					);
					return existingAxis !== undefined && existingAxis !== direction.axis;
				})
			: [];

		const totalCandidates = unvisitedNeighbors.length + tunnelCandidates.length;

		if (totalCandidates === 0) {
			active.splice(index, 1);
			continue;
		}

		const choice = Math.floor(random() * totalCandidates);

		if (choice < unvisitedNeighbors.length) {
			const chosen = unvisitedNeighbors[choice];

			cells[current.y][current.x].walls[chosen.direction.wall] = false;
			cells[chosen.y][chosen.x].walls[chosen.direction.opposite] = false;

			visited[chosen.y][chosen.x] = true;
			active.push({ x: chosen.x, y: chosen.y });
		} else {
			const { direction, tunnelX, tunnelY, targetX, targetY } =
				tunnelCandidates[choice - unvisitedNeighbors.length];
			const underAxis = straightPassageAxis(cells[tunnelY][tunnelX].walls);
			if (!underAxis)
				throw new Error(
					"Unreachable: tunnel candidate lost its straight passage",
				);

			cells[current.y][current.x].walls[direction.wall] = false;
			cells[tunnelY][tunnelX].walls[direction.opposite] = false;
			cells[tunnelY][tunnelX].walls[direction.wall] = false;
			cells[targetY][targetX].walls[direction.opposite] = false;

			crossings.push({ x: tunnelX, y: tunnelY, underAxis });
			visited[targetY][targetX] = true;
			active.push({ x: targetX, y: targetY });
		}
	}

	return {
		width,
		height,
		cells,
		type,
		seed,
		difficulty,
		crossings: allowsCrossings ? crossings : undefined,
	};
}

export function generateMazeBatch({
	width,
	height,
	seed,
	count,
	difficulty,
	type,
}: GenerateMazeBatchOptions): Maze[] {
	if (!Number.isInteger(count) || count <= 0) {
		throw new Error(
			`Maze batch count must be a positive integer, got count=${count}`,
		);
	}

	return Array.from({ length: count }, (_, index) =>
		generateMaze({ width, height, seed: seed + index, difficulty, type }),
	);
}
