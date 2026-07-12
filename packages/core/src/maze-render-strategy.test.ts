import { describe, expect, it } from "vitest";
import {
	computeCircleCellCenter,
	computeCircleMazeDiameter,
	computeCircleMazeSegments,
	computeCircleSolutionPoints,
} from "./circle-maze/render.js";
import { MAZE_TYPES } from "./maze-domain.js";
import {
	computeCellCenter,
	computeTubeSegments,
	computeWallSegments,
} from "./maze-layout.js";
import { getMazeRenderStrategy } from "./maze-render-strategy.js";
import { solveMaze } from "./maze-solver.js";
import { generateMaze } from "./maze.js";

describe("getMazeRenderStrategy", () => {
	it.each(MAZE_TYPES)(
		"registers a render strategy for every maze type (%s)",
		(type) => {
			const maze = generateMaze({ width: 5, height: 5, seed: 1, type });

			const strategy = getMazeRenderStrategy(maze);

			expect(strategy.logicalSize(maze)).toBeDefined();
			expect(strategy.segments(maze)).toBeDefined();
			expect(typeof strategy.roundedCaps).toBe("boolean");
			expect(strategy.cellCenter(maze, { x: 0, y: 0 })).toBeDefined();
			expect(strategy.solutionPoints(maze, [])).toEqual([]);
		},
	);

	it("resolves the rectangle strategy: plain dimensions, square caps, wall segments", () => {
		const maze = generateMaze({
			width: 6,
			height: 4,
			seed: 2,
			type: "rectangle",
		});
		const strategy = getMazeRenderStrategy(maze);

		expect(strategy.logicalSize(maze)).toEqual({ width: 6, height: 4 });
		expect(strategy.roundedCaps).toBe(false);
		expect(strategy.segments(maze)).toEqual(computeWallSegments(maze));
		expect(strategy.cellCenter(maze, { x: 2, y: 1 })).toEqual(
			computeCellCenter({ x: 2, y: 1 }),
		);
	});

	it("defaults to the rectangle strategy when maze.type is unset", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 3 });
		maze.type = undefined;

		const strategy = getMazeRenderStrategy(maze);

		expect(strategy.roundedCaps).toBe(false);
		expect(strategy.segments(maze)).toEqual(computeWallSegments(maze));
	});

	it("resolves the rectangle-crossing strategy: rounded caps, tube segments", () => {
		const maze = generateMaze({
			width: 6,
			height: 4,
			seed: 2,
			type: "rectangle-crossing",
		});
		const strategy = getMazeRenderStrategy(maze);

		expect(strategy.roundedCaps).toBe(true);
		expect(strategy.segments(maze)).toEqual(computeTubeSegments(maze));
	});

	it("resolves the circle strategy: diameter-based size, ring/sector segments and centers", () => {
		const maze = generateMaze({ width: 8, height: 6, seed: 5, type: "circle" });
		const strategy = getMazeRenderStrategy(maze);
		const circleLike = {
			sectorCounts: maze.circleSectorCounts ?? [],
			cells: maze.circleCells ?? [],
		};
		const expectedDiameter = computeCircleMazeDiameter(circleLike);

		expect(strategy.logicalSize(maze)).toEqual({
			width: expectedDiameter,
			height: expectedDiameter,
		});
		expect(strategy.roundedCaps).toBe(false);
		expect(strategy.segments(maze)).toEqual(
			computeCircleMazeSegments(circleLike),
		);
		expect(strategy.cellCenter(maze, { x: 0, y: 1 })).toEqual(
			computeCircleCellCenter(circleLike, { ring: 1, sector: 0 }),
		);
	});

	it("computes solution points for a rectangle maze as plain cell centers", () => {
		const maze = generateMaze({
			width: 5,
			height: 5,
			seed: 9,
			type: "rectangle",
		});
		const path = solveMaze(maze);
		const strategy = getMazeRenderStrategy(maze);

		expect(strategy.solutionPoints(maze, path)).toEqual(
			path.map((position) => computeCellCenter(position)),
		);
	});

	it("computes solution points for a circle maze via ring-boundary insertion", () => {
		const maze = generateMaze({ width: 8, height: 6, seed: 9, type: "circle" });
		const path = solveMaze(maze);
		const strategy = getMazeRenderStrategy(maze);
		const circleLike = {
			sectorCounts: maze.circleSectorCounts ?? [],
			cells: maze.circleCells ?? [],
		};
		const expected = computeCircleSolutionPoints(
			circleLike,
			path.map((position) => ({ ring: position.y, sector: position.x })),
		);

		expect(strategy.solutionPoints(maze, path)).toEqual(expected);
	});
});
