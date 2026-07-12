import type { Cell } from "../maze-domain.js";
import { DIRECTIONS, createGrid, createSeededRandom } from "./shared.js";

export interface GenerateAldousBroderMazeOptions {
	width: number;
	height: number;
	seed: number;
}

export interface AldousBroderMazeResult {
	cells: Cell[][];
}

// Aldous-Broder algorithm (see ADR 033): take a plain random walk over the
// grid, and whenever it steps onto a cell it has never visited before, carve
// the passage that got it there. Like Wilson's, this samples uniformly among
// every possible spanning tree, but with a much simpler walk at the cost of
// visiting already-carved cells repeatedly before the maze is complete.
export function generateAldousBroderMaze({
	width,
	height,
	seed,
}: GenerateAldousBroderMazeOptions): AldousBroderMazeResult {
	const random = createSeededRandom(seed);
	const cells = createGrid(width, height);

	const visited = Array.from({ length: height }, () =>
		new Array<boolean>(width).fill(false),
	);
	visited[0][0] = true;
	let remaining = width * height - 1;

	let current = { x: 0, y: 0 };

	while (remaining > 0) {
		const candidateDirections = DIRECTIONS.filter((direction) => {
			const nx = current.x + direction.dx;
			const ny = current.y + direction.dy;
			return nx >= 0 && nx < width && ny >= 0 && ny < height;
		});
		const direction =
			candidateDirections[Math.floor(random() * candidateDirections.length)];
		const next = {
			x: current.x + direction.dx,
			y: current.y + direction.dy,
		};

		if (!visited[next.y][next.x]) {
			cells[current.y][current.x].walls[direction.wall] = false;
			cells[next.y][next.x].walls[direction.opposite] = false;
			visited[next.y][next.x] = true;
			remaining--;
		}

		current = next;
	}

	return { cells };
}
