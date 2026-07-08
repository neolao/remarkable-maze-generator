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
}

export interface GenerateMazeOptions {
	width: number;
	height: number;
	seed: number;
}

export interface GenerateMazeBatchOptions {
	width: number;
	height: number;
	seed: number;
	count: number;
}

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

export function generateMaze({
	width,
	height,
	seed,
}: GenerateMazeOptions): Maze {
	validateDimensions(width, height);

	const random = createSeededRandom(seed);
	const cells = createGrid(width, height);
	const visited = Array.from({ length: height }, () =>
		new Array<boolean>(width).fill(false),
	);

	const stack: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
	visited[0][0] = true;

	while (stack.length > 0) {
		const current = stack[stack.length - 1];

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
			stack.pop();
			continue;
		}

		const chosen =
			unvisitedNeighbors[Math.floor(random() * unvisitedNeighbors.length)];

		cells[current.y][current.x].walls[chosen.direction.wall] = false;
		cells[chosen.y][chosen.x].walls[chosen.direction.opposite] = false;

		visited[chosen.y][chosen.x] = true;
		stack.push({ x: chosen.x, y: chosen.y });
	}

	return { width, height, cells };
}

export function generateMazeBatch({
	width,
	height,
	seed,
	count,
}: GenerateMazeBatchOptions): Maze[] {
	if (!Number.isInteger(count) || count <= 0) {
		throw new Error(
			`Maze batch count must be a positive integer, got count=${count}`,
		);
	}

	return Array.from({ length: count }, (_, index) =>
		generateMaze({ width, height, seed: seed + index }),
	);
}
