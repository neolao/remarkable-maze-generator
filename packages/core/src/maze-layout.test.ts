import { describe, expect, it } from "vitest";
import {
	computeCrossingBridgeSegments,
	computePathSegments,
	computeWallSegments,
} from "./maze-layout.js";
import { generateMaze } from "./maze.js";

describe("computeWallSegments", () => {
	it("returns one segment per walled side, skipping the entrance and exit openings", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 42 });

		const segments = computeWallSegments(maze);

		let expectedCount = 0;
		for (let y = 0; y < maze.height; y++) {
			for (let x = 0; x < maze.width; x++) {
				const cell = maze.cells[y][x];
				const isEntrance = x === 0 && y === 0;
				const isExit = x === maze.width - 1 && y === maze.height - 1;
				if (cell.walls.north && !isEntrance) expectedCount++;
				if (cell.walls.west) expectedCount++;
				if (x === maze.width - 1 && cell.walls.east) expectedCount++;
				if (y === maze.height - 1 && cell.walls.south && !isExit)
					expectedCount++;
			}
		}

		expect(segments).toHaveLength(expectedCount);
	});

	it("handles the minimal 1x1 maze", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });

		const segments = computeWallSegments(maze);

		expect(Array.isArray(segments)).toBe(true);
	});

	it("never draws the entrance's north wall even if the cell has it walled", () => {
		const maze = generateMaze({ width: 3, height: 3, seed: 1 });
		maze.cells[0][0].walls.north = true;

		const segments = computeWallSegments(maze);

		const hasEntranceNorthWall = segments.some(
			(segment) =>
				segment.x1 === 0 &&
				segment.y1 === 0 &&
				segment.x2 === 1 &&
				segment.y2 === 0,
		);
		expect(hasEntranceNorthWall).toBe(false);
	});

	it("never draws the exit's south wall even if the cell has it walled", () => {
		const maze = generateMaze({ width: 3, height: 3, seed: 1 });
		const lastY = maze.height - 1;
		const lastX = maze.width - 1;
		maze.cells[lastY][lastX].walls.south = true;

		const segments = computeWallSegments(maze);

		const hasExitSouthWall = segments.some(
			(segment) =>
				segment.x1 === lastX &&
				segment.y1 === lastY + 1 &&
				segment.x2 === lastX + 1 &&
				segment.y2 === lastY + 1,
		);
		expect(hasExitSouthWall).toBe(false);
	});

	it("throws a clear error for a maze with invalid dimensions", () => {
		const invalidMaze = generateMaze({ width: 3, height: 3, seed: 1 });
		invalidMaze.width = 0;

		expect(() => computeWallSegments(invalidMaze)).toThrow();
	});

	it("throws when cells do not match the declared width and height", () => {
		const invalidMaze = generateMaze({ width: 3, height: 3, seed: 1 });
		invalidMaze.cells.pop();

		expect(() => computeWallSegments(invalidMaze)).toThrow();
	});
});

describe("computePathSegments", () => {
	function countOpenConnections(maze: ReturnType<typeof generateMaze>) {
		let count = 0;
		for (let y = 0; y < maze.height; y++) {
			for (let x = 0; x < maze.width; x++) {
				const cell = maze.cells[y][x];
				if (!cell.walls.south && y < maze.height - 1) count++;
				if (!cell.walls.east && x < maze.width - 1) count++;
			}
		}
		return count;
	}

	it("returns one centerline segment per open connection, plus an entrance and an exit stub", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 42 });

		const segments = computePathSegments(maze);

		expect(segments).toHaveLength(countOpenConnections(maze) + 2);
	});

	it("includes a stub from the entrance cell center to the top boundary", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 1 });

		const segments = computePathSegments(maze);

		const hasEntranceStub = segments.some(
			(segment) =>
				(segment.x1 === 0.5 &&
					segment.y1 === 0.5 &&
					segment.x2 === 0.5 &&
					segment.y2 === 0) ||
				(segment.x2 === 0.5 &&
					segment.y2 === 0.5 &&
					segment.x1 === 0.5 &&
					segment.y1 === 0),
		);
		expect(hasEntranceStub).toBe(true);
	});

	it("includes a stub from the exit cell center to the bottom boundary", () => {
		const maze = generateMaze({ width: 5, height: 4, seed: 1 });

		const segments = computePathSegments(maze);
		const exitCenter = { x: maze.width - 0.5, y: maze.height - 0.5 };

		const hasExitStub = segments.some(
			(segment) =>
				(segment.x1 === exitCenter.x &&
					segment.y1 === exitCenter.y &&
					segment.x2 === exitCenter.x &&
					segment.y2 === maze.height) ||
				(segment.x2 === exitCenter.x &&
					segment.y2 === exitCenter.y &&
					segment.x1 === exitCenter.x &&
					segment.y1 === maze.height),
		);
		expect(hasExitStub).toBe(true);
	});

	it("returns exactly the entrance and exit stubs for the minimal 1x1 maze", () => {
		const maze = generateMaze({ width: 1, height: 1, seed: 1 });

		const segments = computePathSegments(maze);

		expect(segments).toHaveLength(2);
	});

	it("throws a clear error for a maze with invalid dimensions", () => {
		const invalidMaze = generateMaze({ width: 3, height: 3, seed: 1 });
		invalidMaze.width = 0;

		expect(() => computePathSegments(invalidMaze)).toThrow();
	});
});

describe("computeCrossingBridgeSegments", () => {
	it("returns two short segments for each recorded crossing", () => {
		const maze = generateMaze({
			width: 12,
			height: 12,
			seed: 3,
			type: "rectangle-crossing",
		});

		const segments = computeCrossingBridgeSegments(maze);

		expect(segments).toHaveLength((maze.crossings?.length ?? 0) * 2);
	});

	it("returns no segments when the maze has no recorded crossings", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 1 });

		expect(computeCrossingBridgeSegments(maze)).toEqual([]);
	});

	it("draws a horizontal gapped stub for a vertical through-passage", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 1 });
		maze.cells[2][2].walls = {
			north: false,
			south: false,
			east: true,
			west: true,
		};
		maze.crossings = [{ x: 2, y: 2 }];

		const segments = computeCrossingBridgeSegments(maze);

		expect(segments).toHaveLength(2);
		for (const segment of segments) {
			expect(segment.y1).toBeCloseTo(2.5);
			expect(segment.y2).toBeCloseTo(2.5);
		}
		const xs = segments.flatMap((segment) => [segment.x1, segment.x2]);
		expect(Math.min(...xs)).toBe(2);
		expect(Math.max(...xs)).toBe(3);
		const innerEdges = segments.map((segment) =>
			Math.max(segment.x1, segment.x2) <= 2.5
				? Math.max(segment.x1, segment.x2)
				: Math.min(segment.x1, segment.x2),
		);
		expect(Math.min(...innerEdges)).toBeGreaterThan(2);
		expect(Math.max(...innerEdges)).toBeLessThan(3);
	});

	it("draws a vertical gapped stub for a horizontal through-passage", () => {
		const maze = generateMaze({ width: 5, height: 5, seed: 1 });
		maze.cells[2][2].walls = {
			north: true,
			south: true,
			east: false,
			west: false,
		};
		maze.crossings = [{ x: 2, y: 2 }];

		const segments = computeCrossingBridgeSegments(maze);

		expect(segments).toHaveLength(2);
		for (const segment of segments) {
			expect(segment.x1).toBeCloseTo(2.5);
			expect(segment.x2).toBeCloseTo(2.5);
		}
	});
});
