import { describe, expect, it } from "vitest";
import { generateKruskalMaze } from "./kruskal.js";
import { countOpenPassages, countReachableCells } from "./test-helpers.js";

describe("generateKruskalMaze", () => {
	it("produces a perfect maze: every cell reachable, with exactly width*height-1 open passages", () => {
		const { cells } = generateKruskalMaze({ width: 10, height: 8, seed: 7 });

		expect(countReachableCells(cells)).toBe(10 * 8);
		expect(countOpenPassages(cells)).toBe(10 * 8 - 1);
	});

	it("generates the same maze twice for the same seed", () => {
		const first = generateKruskalMaze({ width: 8, height: 6, seed: 42 });
		const second = generateKruskalMaze({ width: 8, height: 6, seed: 42 });

		expect(second.cells).toEqual(first.cells);
	});

	it("produces a different layout for a different seed", () => {
		const first = generateKruskalMaze({ width: 8, height: 6, seed: 1 });
		const second = generateKruskalMaze({ width: 8, height: 6, seed: 2 });

		expect(second.cells).not.toEqual(first.cells);
	});

	it("handles a 1x1 grid with no wall left to carve", () => {
		const { cells } = generateKruskalMaze({ width: 1, height: 1, seed: 1 });

		expect(countReachableCells(cells)).toBe(1);
		expect(countOpenPassages(cells)).toBe(0);
	});

	it("fully connects a single-row grid", () => {
		const { cells } = generateKruskalMaze({ width: 12, height: 1, seed: 3 });

		expect(countReachableCells(cells)).toBe(12);
		expect(countOpenPassages(cells)).toBe(11);
	});

	it("fully connects a single-column grid", () => {
		const { cells } = generateKruskalMaze({ width: 1, height: 12, seed: 3 });

		expect(countReachableCells(cells)).toBe(12);
		expect(countOpenPassages(cells)).toBe(11);
	});
});
