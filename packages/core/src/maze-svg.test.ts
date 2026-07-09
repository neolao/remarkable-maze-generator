import { describe, expect, it } from "vitest";
import {
	computeCrossingUnderSegments,
	computePathSegments,
} from "./maze-layout.js";
import { renderMazeToSvg } from "./maze-svg.js";
import { generateMaze } from "./maze.js";

function countLineElements(svg: string): number {
	return (svg.match(/<line /g) || []).length;
}

describe("renderMazeToSvg", () => {
	it("renders one <line> per wall segment for a nominal maze", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 42 });

		const svg = renderMazeToSvg(maze);

		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg.trim().endsWith("</svg>")).toBe(true);
		expect(countLineElements(svg)).toBeGreaterThan(0);
	});

	it("scales the viewBox with the maze dimensions and the cell size option", () => {
		const maze = generateMaze({ width: 4, height: 3, seed: 1 });

		const svg = renderMazeToSvg(maze, { cellSizePx: 10 });

		expect(svg).toContain('viewBox="0 0 40 30"');
		expect(svg).toContain('width="40"');
		expect(svg).toContain('height="30"');
	});

	it("renders the minimal 1x1 maze without error", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });

		const svg = renderMazeToSvg(maze);

		expect(svg.startsWith("<svg")).toBe(true);
	});

	it("renders a larger maze without error", () => {
		const maze = generateMaze({ width: 30, height: 20, seed: 7 });

		const svg = renderMazeToSvg(maze);

		expect(countLineElements(svg)).toBeGreaterThan(0);
	});

	it("throws a clear error for a maze with invalid dimensions", () => {
		const invalidMaze = generateMaze({ width: 3, height: 3, seed: 1 });
		invalidMaze.width = 0;

		expect(() => renderMazeToSvg(invalidMaze)).toThrow();
	});

	it("renders a rectangle-crossing maze as independent rounded-cap solid lines, not walls", () => {
		const maze = generateMaze({
			width: 12,
			height: 12,
			seed: 3,
			type: "rectangle-crossing",
		});
		expect(maze.crossings?.length ?? 0).toBeGreaterThan(0);

		const svg = renderMazeToSvg(maze);

		// One <line> per path segment, plus one per crossing under-axis
		// segment (see ADR 025) — every segment is an independent solid
		// stroke, no fill/border layering.
		const expectedCount =
			computePathSegments(maze).length +
			computeCrossingUnderSegments(maze).length;
		expect(countLineElements(svg)).toBe(expectedCount);
		expect(svg).toContain('stroke-linecap="round"');
	});

	it("renders a rectangle-crossing maze too small for any crossing without error", () => {
		const maze = generateMaze({
			width: 1,
			height: 1,
			seed: 1,
			type: "rectangle-crossing",
		});

		const svg = renderMazeToSvg(maze);

		expect(maze.crossings).toEqual([]);
		expect(countLineElements(svg)).toBe(computePathSegments(maze).length);
	});
});
