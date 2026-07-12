import { describe, expect, it } from "vitest";
import { findSolutionBranchPoints } from "../maze-solver.js";
import { generateMaze } from "../maze.js";
import { computeTubeSegments } from "./maze-layout.js";
import { renderMazeToSvg } from "./maze-svg.js";

function countLineElements(svg: string): number {
	return (svg.match(/<line /g) || []).length;
}

function countPathElements(svg: string): number {
	return (svg.match(/<path /g) || []).length;
}

function countCircleElements(svg: string): number {
	return (svg.match(/<circle /g) || []).length;
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

	it("renders a rectangle-crossing maze as independent rounded-cap tube edge lines, not walls", () => {
		const maze = generateMaze({
			width: 12,
			height: 12,
			seed: 3,
			type: "rectangle-crossing",
		});
		expect(maze.crossings?.length ?? 0).toBeGreaterThan(0);

		const svg = renderMazeToSvg(maze);

		// One <line> or <path> (rounded turn corners, see ADR 030) per tube
		// edge segment (both edges of every corridor — see ADR 026) — every
		// segment is an independent solid stroke, no fill/border layering.
		expect(countLineElements(svg) + countPathElements(svg)).toBe(
			computeTubeSegments(maze).length,
		);
		expect(svg).toContain('stroke-linecap="round"');
		expect(countPathElements(svg)).toBeGreaterThan(0);
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
		expect(countLineElements(svg)).toBe(computeTubeSegments(maze).length);
	});

	it("renders a circle-crossing maze as rounded-cap tube edge lines on the polar layout", () => {
		const maze = generateMaze({
			width: 10,
			height: 10,
			seed: 3,
			type: "circle-crossing",
		});
		expect(maze.circleCrossings?.length ?? 0).toBeGreaterThan(0);

		const svg = renderMazeToSvg(maze);

		expect(countLineElements(svg) + countPathElements(svg)).toBeGreaterThan(0);
		expect(svg).toContain('stroke-linecap="round"');
	});

	it("renders a circle-crossing maze too small for any crossing without error", () => {
		const maze = generateMaze({
			width: 1,
			height: 1,
			seed: 1,
			type: "circle-crossing",
		});

		expect(maze.circleCrossings).toEqual([]);
		expect(() => renderMazeToSvg(maze)).not.toThrow();
	});

	it("does not draw a solution trace or branch markers when showSolution is left disabled", () => {
		const maze = generateMaze({ width: 8, height: 8, seed: 4, difficulty: 5 });

		const svg = renderMazeToSvg(maze);

		expect(svg).not.toContain('stroke="#d91a1a"');
		expect(countCircleElements(svg)).toBe(0);
	});

	it("draws the solution trace and one circle per branch point when showSolution is enabled", () => {
		const maze = generateMaze({ width: 8, height: 8, seed: 4, difficulty: 5 });
		const branchPoints = findSolutionBranchPoints(maze);
		expect(branchPoints.length).toBeGreaterThan(0);

		const svg = renderMazeToSvg(maze, { showSolution: true });

		expect(svg).toContain('stroke="#d91a1a"');
		expect(countCircleElements(svg)).toBe(branchPoints.length);
	});

	it("draws the solution trace without any branch marker on a straight 1x2 maze", () => {
		const maze = generateMaze({ width: 1, height: 2, seed: 1 });

		const svg = renderMazeToSvg(maze, { showSolution: true });

		expect(svg).toContain('stroke="#d91a1a"');
		expect(countCircleElements(svg)).toBe(0);
	});

	it("renders the minimal 1x1 maze with showSolution enabled without error", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });

		const svg = renderMazeToSvg(maze, { showSolution: true });

		expect(svg.startsWith("<svg")).toBe(true);
		expect(countCircleElements(svg)).toBe(0);
	});
});
