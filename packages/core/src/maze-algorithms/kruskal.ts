import type { Cell } from "../maze.js";
import { createGrid, createSeededRandom, wrapCoordinate } from "./shared.js";

export interface GenerateKruskalMazeOptions {
	width: number;
	height: number;
	seed: number;
	wrapsHorizontally: boolean;
}

export interface KruskalMazeResult {
	cells: Cell[][];
}

interface Edge {
	x: number;
	y: number;
	// The wall carved on this cell, and the opposite wall on the neighbor it
	// connects to. Only east/south are listed per cell, since every passage is
	// covered exactly once that way (its west/north mirror lives on the
	// neighboring cell's own entry).
	direction: "east" | "south";
}

// A disjoint-set over the flattened cell indices, tracking which cells are
// already connected by carved passages so a candidate edge that would close a
// cycle is skipped (see randomized Kruskal's algorithm).
class DisjointSet {
	private readonly parent: number[];

	constructor(size: number) {
		this.parent = Array.from({ length: size }, (_, index) => index);
	}

	find(index: number): number {
		if (this.parent[index] !== index) {
			this.parent[index] = this.find(this.parent[index]);
		}
		return this.parent[index];
	}

	union(a: number, b: number): boolean {
		const rootA = this.find(a);
		const rootB = this.find(b);
		if (rootA === rootB) return false;
		this.parent[rootA] = rootB;
		return true;
	}
}

function shuffle<T>(items: T[], random: () => number): T[] {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Randomized Kruskal's algorithm (see ADR 033): list every candidate passage
// once, shuffle it, then carve each one in turn unless it would connect two
// cells already reachable from one another — the classic minimum-spanning-tree
// construction, but over randomly ordered edges instead of weights.
export function generateKruskalMaze({
	width,
	height,
	seed,
	wrapsHorizontally,
}: GenerateKruskalMazeOptions): KruskalMazeResult {
	const random = createSeededRandom(seed);
	const cells = createGrid(width, height);

	const edges: Edge[] = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (x + 1 < width) edges.push({ x, y, direction: "east" });
			if (y + 1 < height) edges.push({ x, y, direction: "south" });
		}
		// Closes the ring: the last column's east neighbor is column 0 (see
		// ADR 034). Skipped when width is 1 — that "neighbor" would be the same
		// cell, not a real second connection.
		if (wrapsHorizontally && width > 1) {
			edges.push({ x: width - 1, y, direction: "east" });
		}
	}

	const disjointSet = new DisjointSet(width * height);
	const cellIndex = (x: number, y: number) => y * width + x;

	for (const edge of shuffle(edges, random)) {
		const neighborX =
			edge.direction === "east"
				? wrapCoordinate(edge.x + 1, width, wrapsHorizontally)
				: edge.x;
		const neighborY = edge.direction === "south" ? edge.y + 1 : edge.y;

		const connected = disjointSet.union(
			cellIndex(edge.x, edge.y),
			cellIndex(neighborX, neighborY),
		);
		if (!connected) continue;

		if (edge.direction === "east") {
			cells[edge.y][edge.x].walls.east = false;
			cells[neighborY][neighborX].walls.west = false;
		} else {
			cells[edge.y][edge.x].walls.south = false;
			cells[neighborY][neighborX].walls.north = false;
		}
	}

	return { cells };
}
