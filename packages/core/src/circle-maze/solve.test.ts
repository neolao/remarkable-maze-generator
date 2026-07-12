import { describe, expect, it } from "vitest";
import { carveEdge, createCircleGrid } from "./cells.js";
import { generateCircleMaze } from "./generate.js";
import { findCircleSolutionBranchPoints, solveCircleMaze } from "./solve.js";

// A 3-ring, 3-sector-per-ring maze (growth ratio 1 throughout), fully closed
// by default via createCircleGrid, with exactly the edges needed for a
// deliberate route from the center (0,0) to the outer ring's sector 0 (2,0)
// carved in by hand — mirrors maze-solver.test.ts's buildFullyWalledMaze +
// manual wall-opening pattern for the rectangular crossing tests (see ADR
// 055). A crossing sits at (ring 1, sector 1): its "under" (pre-existing)
// axis is radial (an inward leg to (0,1) and an outward leg to (2,1), both
// dangling/unused by the intended route), its "over" (tunneled) axis is
// tangential (cw from (1,0) to (1,1), then on to (1,2)).
function buildCircleCrossingMaze(includeAxisEscapeRoute: boolean) {
	const sectorCounts = [3, 3, 3];
	const cells = createCircleGrid(sectorCounts);

	carveEdge(
		cells,
		sectorCounts,
		{ ring: 0, sector: 0 },
		{ ring: 1, sector: 0 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 1, sector: 0 },
		{ ring: 1, sector: 1 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 0, sector: 1 },
		{ ring: 1, sector: 1 },
	);
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 1, sector: 1 },
		{ ring: 2, sector: 1 },
	);

	if (includeAxisEscapeRoute) {
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 1 },
			{ ring: 1, sector: 2 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 1, sector: 2 },
			{ ring: 2, sector: 2 },
		);
		carveEdge(
			cells,
			sectorCounts,
			{ ring: 2, sector: 2 },
			{ ring: 2, sector: 1 },
		);
	}
	carveEdge(
		cells,
		sectorCounts,
		{ ring: 2, sector: 1 },
		{ ring: 2, sector: 0 },
	);

	return {
		sectorCounts,
		cells,
		crossings: [{ ring: 1, sector: 1, underAxis: "radial" as const }],
	};
}

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

	it("finds a valid same-axis route through a crossing node (see ADR 055), ignoring a shorter route that would require a turn", () => {
		const maze = buildCircleCrossingMaze(true);

		const path = solveCircleMaze(maze);

		expect(path).toEqual([
			{ ring: 0, sector: 0 },
			{ ring: 1, sector: 0 },
			{ ring: 1, sector: 1 },
			{ ring: 1, sector: 2 },
			{ ring: 2, sector: 2 },
			{ ring: 2, sector: 1 },
			{ ring: 2, sector: 0 },
		]);
	});

	it("rejects a route that would require turning between axes at a crossing node", () => {
		const maze = buildCircleCrossingMaze(false);

		expect(() => solveCircleMaze(maze)).toThrow();
	});

	it("never turns between the two axes of a bridge crossing node on a generated circle-crossing maze", () => {
		const maze = generateCircleMaze({
			width: 12,
			height: 12,
			seed: 3,
			allowsCrossings: true,
		});
		expect(maze.crossings.length).toBeGreaterThan(0);
		const crossingKeys = new Set(
			maze.crossings.map((c) => `${c.ring},${c.sector}`),
		);

		const path = solveCircleMaze(maze);

		for (let i = 1; i < path.length - 1; i++) {
			if (!crossingKeys.has(`${path[i].ring},${path[i].sector}`)) continue;

			const incomingAxis =
				path[i - 1].ring !== path[i].ring ? "radial" : "tangential";
			const outgoingAxis =
				path[i + 1].ring !== path[i].ring ? "radial" : "tangential";
			expect(outgoingAxis).toBe(incomingAxis);
		}
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

	it("never flags a bridge crossing node even though it has 4 open directions (see ADR 055)", () => {
		const maze = buildCircleCrossingMaze(true);

		const branchPoints = findCircleSolutionBranchPoints(maze);

		expect(branchPoints).not.toContainEqual({ ring: 1, sector: 1 });
	});

	it("never flags a crossing node as a branch point on a generated circle-crossing maze", () => {
		const maze = generateCircleMaze({
			width: 12,
			height: 12,
			seed: 3,
			allowsCrossings: true,
		});
		expect(maze.crossings.length).toBeGreaterThan(0);

		const branchPoints = findCircleSolutionBranchPoints(maze);

		for (const crossing of maze.crossings) {
			expect(branchPoints).not.toContainEqual({
				ring: crossing.ring,
				sector: crossing.sector,
			});
		}
	});
});
