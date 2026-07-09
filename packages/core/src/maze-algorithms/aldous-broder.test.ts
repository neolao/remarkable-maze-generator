import { describe, expect, it } from "vitest";
import { generateAldousBroderMaze } from "./aldous-broder.js";
import { countOpenPassages, countReachableCells } from "./test-helpers.js";

describe("generateAldousBroderMaze", () => {
	it("produces a perfect maze: every cell reachable, with exactly width*height-1 open passages", () => {
		const { cells } = generateAldousBroderMaze({
			width: 8,
			height: 8,
			seed: 7,
		});

		expect(countReachableCells(cells)).toBe(8 * 8);
		expect(countOpenPassages(cells)).toBe(8 * 8 - 1);
	});

	it("generates the same maze twice for the same seed", () => {
		const first = generateAldousBroderMaze({ width: 6, height: 5, seed: 42 });
		const second = generateAldousBroderMaze({ width: 6, height: 5, seed: 42 });

		expect(second.cells).toEqual(first.cells);
	});

	it("produces a different layout for a different seed", () => {
		const first = generateAldousBroderMaze({ width: 6, height: 5, seed: 1 });
		const second = generateAldousBroderMaze({ width: 6, height: 5, seed: 2 });

		expect(second.cells).not.toEqual(first.cells);
	});

	it("handles a 1x1 grid with no wall left to carve", () => {
		const { cells } = generateAldousBroderMaze({
			width: 1,
			height: 1,
			seed: 1,
		});

		expect(countReachableCells(cells)).toBe(1);
		expect(countOpenPassages(cells)).toBe(0);
	});

	it("fully connects a single-row grid", () => {
		const { cells } = generateAldousBroderMaze({
			width: 10,
			height: 1,
			seed: 3,
		});

		expect(countReachableCells(cells)).toBe(10);
		expect(countOpenPassages(cells)).toBe(9);
	});

	it("fully connects a single-column grid", () => {
		const { cells } = generateAldousBroderMaze({
			width: 1,
			height: 10,
			seed: 3,
		});

		expect(countReachableCells(cells)).toBe(10);
		expect(countOpenPassages(cells)).toBe(9);
	});
});
