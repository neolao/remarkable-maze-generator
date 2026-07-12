import { describe, expect, it } from "vitest";
import { totalNodeCount } from "./cells.js";
import { generateCircleMaze } from "./generate.js";
import { countOpenEdges, countReachableNodes } from "./test-helpers.js";
import { computeCircleSectorCounts } from "./topology.js";

const ALGORITHMS = [
	"growing-tree",
	"kruskal",
	"wilson",
	"aldous-broder",
] as const;

describe("generateCircleMaze", () => {
	it.each(ALGORITHMS)(
		"produces a perfect maze with the %s algorithm: every node reachable, exactly nodeCount-1 open edges",
		(algorithm) => {
			const maze = generateCircleMaze({
				width: 8,
				height: 6,
				seed: 3,
				algorithm,
			});
			const totalNodes = totalNodeCount(maze.sectorCounts);

			expect(countReachableNodes(maze)).toBe(totalNodes);
			expect(countOpenEdges(maze)).toBe(totalNodes - 1);
		},
	);

	it.each(ALGORITHMS)(
		"generates the same maze twice for the same seed with the %s algorithm",
		(algorithm) => {
			const first = generateCircleMaze({
				width: 8,
				height: 6,
				seed: 42,
				algorithm,
			});
			const second = generateCircleMaze({
				width: 8,
				height: 6,
				seed: 42,
				algorithm,
			});

			expect(second.cells).toEqual(first.cells);
		},
	);

	it("produces a different layout for a different seed", () => {
		const first = generateCircleMaze({ width: 8, height: 6, seed: 1 });
		const second = generateCircleMaze({ width: 8, height: 6, seed: 2 });

		expect(second.cells).not.toEqual(first.cells);
	});

	it("uses the growing-tree algorithm and difficulty 1 by default", () => {
		const withoutOptions = generateCircleMaze({ width: 8, height: 6, seed: 5 });
		const explicit = generateCircleMaze({
			width: 8,
			height: 6,
			seed: 5,
			algorithm: "growing-tree",
			difficulty: 1,
		});

		expect(withoutOptions.cells).toEqual(explicit.cells);
	});

	it("produces a structurally different spanning tree at a higher difficulty (growing-tree), same total edge count", () => {
		const easy = generateCircleMaze({
			width: 8,
			height: 10,
			seed: 3,
			algorithm: "growing-tree",
			difficulty: 1,
		});
		const hard = generateCircleMaze({
			width: 8,
			height: 10,
			seed: 3,
			algorithm: "growing-tree",
			difficulty: 5,
		});

		expect(countOpenEdges(hard)).toBe(countOpenEdges(easy));
		expect(hard.cells).not.toEqual(easy.cells);
	});

	it.each([
		{ width: 1, height: 1 },
		{ width: 1, height: 5 },
		{ width: 5, height: 1 },
	])(
		"does not error on a tiny maze width=$width height=$height",
		({ width, height }) => {
			const maze = generateCircleMaze({ width, height, seed: 1 });
			const totalNodes = totalNodeCount(maze.sectorCounts);

			expect(countReachableNodes(maze)).toBe(totalNodes);
			expect(countOpenEdges(maze)).toBe(totalNodes - 1);
		},
	);

	it("matches computeCircleSectorCounts for the resolved sector layout", () => {
		const maze = generateCircleMaze({ width: 8, height: 6, seed: 1 });

		expect(maze.sectorCounts).toEqual(computeCircleSectorCounts(8, 6));
	});

	it("does not produce crossings by default", () => {
		const maze = generateCircleMaze({ width: 10, height: 10, seed: 3 });

		expect(maze.crossings).toEqual([]);
	});

	it("produces at least one crossing when allowsCrossings is true, on a maze large enough to contain one", () => {
		const maze = generateCircleMaze({
			width: 10,
			height: 10,
			seed: 3,
			allowsCrossings: true,
		});

		expect(maze.crossings.length).toBeGreaterThan(0);
	});

	it("still produces a spanning tree plus one extra edge per crossing (reachability unaffected)", () => {
		const maze = generateCircleMaze({
			width: 10,
			height: 10,
			seed: 3,
			allowsCrossings: true,
		});
		expect(maze.crossings.length).toBeGreaterThan(0);

		const totalNodes = totalNodeCount(maze.sectorCounts);
		expect(countReachableNodes(maze)).toBe(totalNodes);
		expect(countOpenEdges(maze)).toBe(totalNodes - 1 + maze.crossings.length);
	});
});
