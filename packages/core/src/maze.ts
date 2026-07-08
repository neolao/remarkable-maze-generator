export interface CellWalls {
	north: boolean;
	south: boolean;
	east: boolean;
	west: boolean;
}

export interface Cell {
	walls: CellWalls;
}

export interface Maze {
	width: number;
	height: number;
	cells: Cell[][];
	type?: string;
	seed?: number;
	difficulty?: number;
}

export interface GenerateMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty?: number;
}

export interface GenerateMazeBatchOptions {
	width: number;
	height: number;
	seed: number;
	count: number;
	difficulty?: number;
}

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const MAZE_TYPE = "rectangle";

interface Direction {
	dx: number;
	dy: number;
	wall: keyof CellWalls;
	opposite: keyof CellWalls;
}

const DIRECTIONS: Direction[] = [
	{ dx: 0, dy: -1, wall: "north", opposite: "south" },
	{ dx: 0, dy: 1, wall: "south", opposite: "north" },
	{ dx: 1, dy: 0, wall: "east", opposite: "west" },
	{ dx: -1, dy: 0, wall: "west", opposite: "east" },
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

export function generateMaze({
	width,
	height,
	seed,
	difficulty = MIN_DIFFICULTY,
}: GenerateMazeOptions): Maze {
	validateDimensions(width, height);
	validateDifficulty(difficulty);

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

		if (unvisitedNeighbors.length === 0) {
			active.splice(index, 1);
			continue;
		}

		const chosen =
			unvisitedNeighbors[Math.floor(random() * unvisitedNeighbors.length)];

		cells[current.y][current.x].walls[chosen.direction.wall] = false;
		cells[chosen.y][chosen.x].walls[chosen.direction.opposite] = false;

		visited[chosen.y][chosen.x] = true;
		active.push({ x: chosen.x, y: chosen.y });
	}

	return { width, height, cells, type: MAZE_TYPE, seed, difficulty };
}

export function generateMazeBatch({
	width,
	height,
	seed,
	count,
	difficulty,
}: GenerateMazeBatchOptions): Maze[] {
	if (!Number.isInteger(count) || count <= 0) {
		throw new Error(
			`Maze batch count must be a positive integer, got count=${count}`,
		);
	}

	return Array.from({ length: count }, (_, index) =>
		generateMaze({ width, height, seed: seed + index, difficulty }),
	);
}
