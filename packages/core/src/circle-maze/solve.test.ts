import { describe, expect, it } from "vitest";
import { generateCircleMaze } from "./generate.js";
import { findCircleSolutionBranchPoints, solveCircleMaze } from "./solve.js";

describe("solveCircleMaze", () => {
	it("returns a path starting at the center and ending on the outermost ring", () => {
		const maze = generateCircleMaze({ width: 8, height: 6, seed: 3 });

		const path = solveCircleMaze(maze);

		expect(path[0]).toEqual({ ring: 0, sector: 0 });
		expect(path[path.length - 1]).toEqual({
			ring: maze.sectorCounts.length - 1,
			sector: 0,
		});
	});

	it("never crosses a wall between two consecutive steps", () => {
		const maze = generateCircleMaze({ width: 8, height: 6, seed: 9 });

		const path = solveCircleMaze(maze);

		for (let i = 0; i < path.length - 1; i++) {
			const from = path[i];
			const to = path[i + 1];
			const sameRing = from.ring === to.ring;
			const adjacentRing = Math.abs(from.ring - to.ring) === 1;
			expect(sameRing || adjacentRing).toBe(true);
		}
	});

	it("returns a single-node path for a 1x1 maze", () => {
		const maze = generateCircleMaze({ width: 1, height: 1, seed: 1 });

		expect(solveCircleMaze(maze)).toEqual([{ ring: 0, sector: 0 }]);
	});

	it("throws a clear error when no path exists between the center and the outer ring", () => {
		const maze = generateCircleMaze({ width: 4, height: 3, seed: 1 });
		// Sever every connection out of the center cell.
		maze.cells[0][0].cwOpen = false;
		maze.cells[0][3].cwOpen = false;
		maze.cells[0][0].outwardOpen = maze.cells[0][0].outwardOpen.map(
			() => false,
		);

		expect(() => solveCircleMaze(maze)).toThrow();
	});
});

describe("findCircleSolutionBranchPoints", () => {
	it("returns an empty list for a 1x1 maze", () => {
		const maze = generateCircleMaze({ width: 1, height: 1, seed: 1 });

		expect(findCircleSolutionBranchPoints(maze)).toEqual([]);
	});

	it("only flags path nodes with more than 2 open directions, excluding start and end", () => {
		const maze = generateCircleMaze({
			width: 8,
			height: 10,
			seed: 3,
			difficulty: 5,
		});

		const path = solveCircleMaze(maze);
		const branchPoints = findCircleSolutionBranchPoints(maze);

		for (const point of branchPoints) {
			const isEndpoint =
				(point.ring === path[0].ring && point.sector === path[0].sector) ||
				(point.ring === path[path.length - 1].ring &&
					point.sector === path[path.length - 1].sector);
			expect(isEndpoint).toBe(false);
		}
		expect(branchPoints.length).toBeGreaterThan(0);
	});
});
