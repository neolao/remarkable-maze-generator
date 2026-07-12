import { describe, expect, it } from "vitest";
import { generateCircleAldousBroderMaze } from "./circle-maze/aldous-broder.js";
import { generateCircleGrowingTreeMaze } from "./circle-maze/growing-tree.js";
import { generateCircleKruskalMaze } from "./circle-maze/kruskal.js";
import { generateCircleWilsonMaze } from "./circle-maze/wilson.js";
import {
	generateCircleCellsForAlgorithm,
	generateRectangularCells,
} from "./maze-algorithm-registry.js";
import { generateAldousBroderMaze } from "./maze-algorithms/aldous-broder.js";
import { generateGrowingTreeMaze } from "./maze-algorithms/growing-tree.js";
import { generateKruskalMaze } from "./maze-algorithms/kruskal.js";
import { generateWilsonMaze } from "./maze-algorithms/wilson.js";
import { MAZE_ALGORITHMS } from "./maze-domain.js";

describe("generateRectangularCells", () => {
	it.each(MAZE_ALGORITHMS)(
		"registers a rectangular generator for every maze algorithm (%s)",
		(algorithm) => {
			expect(() =>
				generateRectangularCells(algorithm, {
					width: 5,
					height: 5,
					seed: 1,
					difficulty: 1,
					allowsCrossings: false,
				}),
			).not.toThrow();
		},
	);

	it("delegates to generateGrowingTreeMaze for the growing-tree algorithm, crossings included", () => {
		const options = {
			width: 6,
			height: 6,
			seed: 7,
			difficulty: 3,
			allowsCrossings: true,
		};
		const expected = generateGrowingTreeMaze(options);

		expect(generateRectangularCells("growing-tree", options)).toEqual(expected);
	});

	it("delegates to generateKruskalMaze for the kruskal algorithm, with no crossings", () => {
		const options = {
			width: 6,
			height: 6,
			seed: 7,
			difficulty: 1,
			allowsCrossings: false,
		};
		const expected = generateKruskalMaze(options).cells;

		const result = generateRectangularCells("kruskal", options);

		expect(result.cells).toEqual(expected);
		expect(result.crossings).toEqual([]);
	});

	it("delegates to generateWilsonMaze for the wilson algorithm, with no crossings", () => {
		const options = {
			width: 6,
			height: 6,
			seed: 11,
			difficulty: 1,
			allowsCrossings: false,
		};
		const expected = generateWilsonMaze(options).cells;

		const result = generateRectangularCells("wilson", options);

		expect(result.cells).toEqual(expected);
		expect(result.crossings).toEqual([]);
	});

	it("delegates to generateAldousBroderMaze for the aldous-broder algorithm, with no crossings", () => {
		const options = {
			width: 6,
			height: 6,
			seed: 13,
			difficulty: 1,
			allowsCrossings: false,
		};
		const expected = generateAldousBroderMaze(options).cells;

		const result = generateRectangularCells("aldous-broder", options);

		expect(result.cells).toEqual(expected);
		expect(result.crossings).toEqual([]);
	});

	it("ignores difficulty for the kruskal algorithm, unlike growing-tree", () => {
		const low = generateRectangularCells("kruskal", {
			width: 6,
			height: 6,
			seed: 3,
			difficulty: 1,
			allowsCrossings: false,
		});
		const high = generateRectangularCells("kruskal", {
			width: 6,
			height: 6,
			seed: 3,
			difficulty: 5,
			allowsCrossings: false,
		});

		expect(high.cells).toEqual(low.cells);
	});
});

describe("generateCircleCellsForAlgorithm", () => {
	it.each(MAZE_ALGORITHMS)(
		"registers a circle generator for every maze algorithm (%s)",
		(algorithm) => {
			expect(() =>
				generateCircleCellsForAlgorithm(algorithm, {
					width: 6,
					height: 4,
					seed: 1,
					difficulty: 1,
					allowsCrossings: false,
				}),
			).not.toThrow();
		},
	);

	it("delegates to generateCircleGrowingTreeMaze for the growing-tree algorithm, crossings included", () => {
		const options = {
			width: 6,
			height: 4,
			seed: 9,
			difficulty: 4,
			allowsCrossings: true,
		};
		const expected = generateCircleGrowingTreeMaze(options);

		expect(generateCircleCellsForAlgorithm("growing-tree", options)).toEqual(
			expected,
		);
	});

	it("delegates to generateCircleKruskalMaze for the kruskal algorithm, with no crossings", () => {
		const options = {
			width: 6,
			height: 4,
			seed: 9,
			difficulty: 1,
			allowsCrossings: false,
		};
		const expected = generateCircleKruskalMaze({
			width: 6,
			height: 4,
			seed: 9,
		});

		const result = generateCircleCellsForAlgorithm("kruskal", options);

		expect(result).toEqual({ ...expected, crossings: [] });
	});

	it("delegates to generateCircleWilsonMaze for the wilson algorithm, with no crossings", () => {
		const options = {
			width: 6,
			height: 4,
			seed: 9,
			difficulty: 1,
			allowsCrossings: false,
		};
		const expected = generateCircleWilsonMaze({ width: 6, height: 4, seed: 9 });

		const result = generateCircleCellsForAlgorithm("wilson", options);

		expect(result).toEqual({ ...expected, crossings: [] });
	});

	it("delegates to generateCircleAldousBroderMaze for the aldous-broder algorithm, with no crossings", () => {
		const options = {
			width: 6,
			height: 4,
			seed: 9,
			difficulty: 1,
			allowsCrossings: false,
		};
		const expected = generateCircleAldousBroderMaze({
			width: 6,
			height: 4,
			seed: 9,
		});

		const result = generateCircleCellsForAlgorithm("aldous-broder", options);

		expect(result).toEqual({ ...expected, crossings: [] });
	});
});
