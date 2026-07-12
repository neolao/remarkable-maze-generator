import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	MAX_PATH_LENGTH_CANDIDATE_COUNT,
	MAZE_ALGORITHMS,
	MAZE_TYPES,
	PATH_LENGTH_TARGETS,
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidPathLengthTargetMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidPathLengthTarget,
	validateAlgorithm,
	validateDifficulty,
	validateDimensions,
	validatePathLengthCandidateCount,
	validatePathLengthTarget,
	validateType,
	validateTypeAlgorithmCompatibility,
} from "./maze-domain.js";

describe("MAZE_TYPES / isValidMazeType / invalidMazeTypeMessage", () => {
	it("lists rectangle, rectangle-crossing, circle and circle-crossing as the valid maze types", () => {
		expect(MAZE_TYPES).toEqual([
			"rectangle",
			"rectangle-crossing",
			"circle",
			"circle-crossing",
		]);
	});

	it.each(MAZE_TYPES)("accepts %s as a valid maze type", (type) => {
		expect(isValidMazeType(type)).toBe(true);
	});

	it("rejects an unknown maze type", () => {
		expect(isValidMazeType("hexagon")).toBe(false);
	});

	it("describes the allowed values in the invalid maze type message", () => {
		expect(invalidMazeTypeMessage("hexagon")).toBe(
			'Invalid maze type "hexagon", expected one of: rectangle, rectangle-crossing, circle, circle-crossing',
		);
	});
});

describe("MAZE_ALGORITHMS / isValidMazeAlgorithm / invalidMazeAlgorithmMessage", () => {
	it("lists growing-tree, kruskal, wilson and aldous-broder as the valid maze algorithms", () => {
		expect(MAZE_ALGORITHMS).toEqual([
			"growing-tree",
			"kruskal",
			"wilson",
			"aldous-broder",
		]);
	});

	it.each(MAZE_ALGORITHMS)(
		"accepts %s as a valid maze algorithm",
		(algorithm) => {
			expect(isValidMazeAlgorithm(algorithm)).toBe(true);
		},
	);

	it("rejects an unknown maze algorithm", () => {
		expect(isValidMazeAlgorithm("prim")).toBe(false);
	});

	it("describes the allowed values in the invalid maze algorithm message", () => {
		expect(invalidMazeAlgorithmMessage("prim")).toBe(
			'Invalid maze algorithm "prim", expected one of: growing-tree, kruskal, wilson, aldous-broder',
		);
	});
});

describe("PATH_LENGTH_TARGETS / isValidPathLengthTarget / invalidPathLengthTargetMessage", () => {
	it("lists short, medium and long as the valid path length targets", () => {
		expect(PATH_LENGTH_TARGETS).toEqual(["short", "medium", "long"]);
	});

	it.each(PATH_LENGTH_TARGETS)(
		"accepts %s as a valid path length target",
		(target) => {
			expect(isValidPathLengthTarget(target)).toBe(true);
		},
	);

	it("rejects an unknown path length target", () => {
		expect(isValidPathLengthTarget("extra-long")).toBe(false);
	});

	it("describes the allowed values in the invalid path length target message", () => {
		expect(invalidPathLengthTargetMessage("extra-long")).toBe(
			'Invalid path length target "extra-long", expected one of: short, medium, long',
		);
	});
});

describe("validateDimensions", () => {
	it.each([
		{ width: 1, height: 1 },
		{ width: 200, height: 200 },
		{ width: 5, height: 4 },
	])("accepts width=$width height=$height", ({ width, height }) => {
		expect(() => validateDimensions(width, height)).not.toThrow();
	});

	it.each([
		{ width: 0, height: 5 },
		{ width: 5, height: 0 },
		{ width: -3, height: 5 },
		{ width: 5, height: -3 },
		{ width: 201, height: 5 },
		{ width: 5, height: 201 },
		{ width: 2.5, height: 5 },
	])("rejects width=$width height=$height", ({ width, height }) => {
		expect(() => validateDimensions(width, height)).toThrow();
	});

	it("names both offending values in the error message", () => {
		expect(() => validateDimensions(0, -3)).toThrow(/width=0, height=-3/);
	});
});

describe("validateDifficulty", () => {
	it.each([1, 3, 5])("accepts difficulty=%d", (difficulty) => {
		expect(() => validateDifficulty(difficulty)).not.toThrow();
	});

	it.each([0, 6, 2.5])("rejects difficulty=%d", (difficulty) => {
		expect(() => validateDifficulty(difficulty)).toThrow();
	});
});

describe("validateType / validateAlgorithm", () => {
	it("accepts every listed maze type", () => {
		for (const type of MAZE_TYPES) {
			expect(() => validateType(type)).not.toThrow();
		}
	});

	it("rejects an unknown maze type", () => {
		// biome-ignore lint/suspicious/noExplicitAny: deliberately passing an invalid type to test validation
		expect(() => validateType("hexagon" as any)).toThrow(/hexagon/);
	});

	it("accepts every listed maze algorithm", () => {
		for (const algorithm of MAZE_ALGORITHMS) {
			expect(() => validateAlgorithm(algorithm)).not.toThrow();
		}
	});

	it("rejects an unknown maze algorithm", () => {
		// biome-ignore lint/suspicious/noExplicitAny: deliberately passing an invalid algorithm to test validation
		expect(() => validateAlgorithm("prim" as any)).toThrow(/prim/);
	});
});

describe("validateTypeAlgorithmCompatibility", () => {
	it.each(["kruskal", "wilson", "aldous-broder"] as const)(
		"rejects rectangle-crossing combined with %s",
		(algorithm) => {
			expect(() =>
				validateTypeAlgorithmCompatibility("rectangle-crossing", algorithm),
			).toThrow(/rectangle-crossing.*growing-tree/);
		},
	);

	it("accepts rectangle-crossing combined with growing-tree", () => {
		expect(() =>
			validateTypeAlgorithmCompatibility("rectangle-crossing", "growing-tree"),
		).not.toThrow();
	});

	it.each(["kruskal", "wilson", "aldous-broder"] as const)(
		"rejects circle-crossing combined with %s",
		(algorithm) => {
			expect(() =>
				validateTypeAlgorithmCompatibility("circle-crossing", algorithm),
			).toThrow(/circle-crossing.*growing-tree/);
		},
	);

	it("accepts circle-crossing combined with growing-tree", () => {
		expect(() =>
			validateTypeAlgorithmCompatibility("circle-crossing", "growing-tree"),
		).not.toThrow();
	});

	it.each(["rectangle", "circle"] as const)(
		"accepts %s combined with any algorithm",
		(type) => {
			for (const algorithm of MAZE_ALGORITHMS) {
				expect(() =>
					validateTypeAlgorithmCompatibility(type, algorithm),
				).not.toThrow();
			}
		},
	);
});

describe("validatePathLengthTarget", () => {
	it.each(PATH_LENGTH_TARGETS)("accepts %s", (target) => {
		expect(() => validatePathLengthTarget(target)).not.toThrow();
	});

	it("rejects an unknown target", () => {
		expect(() =>
			// biome-ignore lint/suspicious/noExplicitAny: deliberately passing an invalid target to test validation
			validatePathLengthTarget("extra-long" as any),
		).toThrow(/extra-long/);
	});
});

describe("validatePathLengthCandidateCount", () => {
	it("accepts an unset candidate count regardless of pathLength", () => {
		expect(() =>
			validatePathLengthCandidateCount(undefined, undefined),
		).not.toThrow();
		expect(() =>
			validatePathLengthCandidateCount("long", undefined),
		).not.toThrow();
	});

	it("accepts a valid candidate count within bounds", () => {
		expect(() => validatePathLengthCandidateCount("short", 1)).not.toThrow();
		expect(() =>
			validatePathLengthCandidateCount(
				"short",
				MAX_PATH_LENGTH_CANDIDATE_COUNT,
			),
		).not.toThrow();
	});

	it("rejects a candidate count set without a pathLength target", () => {
		expect(() => validatePathLengthCandidateCount(undefined, 3)).toThrow(
			/pathLengthCandidateCount.*pathLength/,
		);
	});

	it("rejects a non-integer candidate count", () => {
		expect(() => validatePathLengthCandidateCount("short", 2.5)).toThrow();
	});

	it("rejects a candidate count of zero or below", () => {
		expect(() => validatePathLengthCandidateCount("short", 0)).toThrow();
		expect(() => validatePathLengthCandidateCount("short", -1)).toThrow();
	});

	it("rejects a candidate count above the maximum allowed", () => {
		expect(() =>
			validatePathLengthCandidateCount(
				"short",
				MAX_PATH_LENGTH_CANDIDATE_COUNT + 1,
			),
		).toThrow();
	});
});

// Encodes the DDD boundary this module establishes (see ADR 050): generation,
// rendering, and reMarkable Cloud code depend on the domain module, never the
// reverse. Only the type-only `CircleCell` import (needed to describe
// `Maze.circleCells`'s own shape) is allowed through — everything else from
// those areas is forbidden, so a future addition can't quietly reintroduce
// the coupling this module was extracted to remove.
describe("maze-domain module boundary", () => {
	it("has no import dependency on generation, rendering, or reMarkable Cloud modules", () => {
		const sourcePath = fileURLToPath(
			new URL("./maze-domain.ts", import.meta.url),
		);
		const source = readFileSync(sourcePath, "utf-8");
		const importLines = source
			.split("\n")
			.filter((line) => /^import /.test(line));

		const allowedException =
			/^import type \{ CircleCell \} from "\.\/circle-maze\/cells\.js";$/;

		const forbiddenPatterns = [
			/from ["']\.\/maze\.js["']/,
			/from ["']\.\/maze-algorithm-registry\.js["']/,
			/from ["'].*maze-algorithms\//,
			/from ["'].*circle-maze\//,
			/from ["']\.\/maze-pdf\.js["']/,
			/from ["']\.\/maze-svg\.js["']/,
			/from ["']\.\/maze-layout\.js["']/,
			/from ["']\.\/maze-render-strategy\.js["']/,
			/from ["']\.\/maze-solver\.js["']/,
			/from ["'].*remarkable-/,
		];

		for (const line of importLines) {
			if (allowedException.test(line)) continue;

			for (const pattern of forbiddenPatterns) {
				expect(
					pattern.test(line),
					`maze-domain.ts should not contain forbidden import: "${line}"`,
				).toBe(false);
			}
		}
	});
});
