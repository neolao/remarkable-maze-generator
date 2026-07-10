import type { Cell } from "../maze.js";
import {
	DIRECTIONS,
	type Direction,
	createGrid,
	createSeededRandom,
} from "./shared.js";

export interface GenerateWilsonMazeOptions {
	width: number;
	height: number;
	seed: number;
}

export interface WilsonMazeResult {
	cells: Cell[][];
}

interface Position {
	x: number;
	y: number;
}

function positionKey(position: Position): string {
	return `${position.x},${position.y}`;
}

// Wilson's algorithm (see ADR 033): repeatedly loop-erased-random-walk from a
// cell outside the maze until the walk reaches a cell already in the maze,
// then carve that walk's final (loop-free) path in. Unlike Kruskal's or the
// growing tree, this produces a maze sampled uniformly among every possible
// spanning tree of the grid, with no structural bias at all.
export function generateWilsonMaze({
	width,
	height,
	seed,
}: GenerateWilsonMazeOptions): WilsonMazeResult {
	const random = createSeededRandom(seed);
	const cells = createGrid(width, height);

	const inMaze = Array.from({ length: height }, () =>
		new Array<boolean>(width).fill(false),
	);
	inMaze[0][0] = true;

	const allCells: Position[] = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			allCells.push({ x, y });
		}
	}

	let remaining = width * height - 1;

	while (remaining > 0) {
		let start: Position;
		do {
			start = allCells[Math.floor(random() * allCells.length)];
		} while (inMaze[start.y][start.x]);

		// The loop-erased random walk: `path` holds the current walk and
		// `pathDirections[i]` the direction taken from `path[i]` to
		// `path[i+1]`. `positionInPath` lets a revisit collapse the loop it
		// just closed back to its first occurrence instead of leaving a
		// dead-end detour behind.
		const path: Position[] = [start];
		const pathDirections: Direction[] = [];
		const positionInPath = new Map<string, number>([[positionKey(start), 0]]);

		let current = start;
		while (!inMaze[current.y][current.x]) {
			const candidateDirections = DIRECTIONS.filter((direction) => {
				const nx = current.x + direction.dx;
				const ny = current.y + direction.dy;
				return nx >= 0 && nx < width && ny >= 0 && ny < height;
			});
			const direction =
				candidateDirections[Math.floor(random() * candidateDirections.length)];
			const next: Position = {
				x: current.x + direction.dx,
				y: current.y + direction.dy,
			};
			const key = positionKey(next);

			const loopStart = positionInPath.get(key);
			if (loopStart !== undefined) {
				while (path.length > loopStart + 1) {
					const removed = path.pop();
					if (removed) positionInPath.delete(positionKey(removed));
					pathDirections.pop();
				}
			} else {
				path.push(next);
				pathDirections.push(direction);
				positionInPath.set(key, path.length - 1);
			}
			current = next;
		}

		for (let i = 0; i < path.length - 1; i++) {
			const a = path[i];
			const b = path[i + 1];
			const direction = pathDirections[i];

			cells[a.y][a.x].walls[direction.wall] = false;
			cells[b.y][b.x].walls[direction.opposite] = false;

			if (!inMaze[a.y][a.x]) {
				inMaze[a.y][a.x] = true;
				remaining--;
			}
		}
	}

	return { cells };
}
