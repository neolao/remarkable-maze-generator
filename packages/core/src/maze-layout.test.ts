import { describe, expect, it } from "vitest";
import { computeWallSegments } from "./maze-layout.js";
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
