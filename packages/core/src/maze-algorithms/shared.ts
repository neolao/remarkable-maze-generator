import type { Cell, CellWalls } from "../maze-domain.js";

export interface Direction {
	dx: number;
	dy: number;
	wall: keyof CellWalls;
	opposite: keyof CellWalls;
}

// North/south/east/west, shared by every algorithm that carves a passage
// between two adjacent cells (see ADR 033 — algorithms are otherwise kept
// isolated from one another, but this basic 4-neighbor topology is not
// algorithm-specific tuning logic).
export const DIRECTIONS: Direction[] = [
	{ dx: 0, dy: -1, wall: "north", opposite: "south" },
	{ dx: 0, dy: 1, wall: "south", opposite: "north" },
	{ dx: 1, dy: 0, wall: "east", opposite: "west" },
	{ dx: -1, dy: 0, wall: "west", opposite: "east" },
];

export function createSeededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function createGrid(width: number, height: number): Cell[][] {
	return Array.from({ length: height }, () =>
		Array.from({ length: width }, () => ({
			walls: { north: true, south: true, east: true, west: true },
		})),
	);
}
