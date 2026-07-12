import { describe, expect, it } from "vitest";
import { computeMazeFormFieldVisibility } from "./maze-form-field-visibility.js";

describe("computeMazeFormFieldVisibility", () => {
	it("shows algorithm and difficulty, hides candidates, for default rectangle + growing-tree + no path length", () => {
		const result = computeMazeFormFieldVisibility({
			type: "rectangle",
			algorithm: "growing-tree",
			pathLength: undefined,
		});

		expect(result).toEqual({
			showAlgorithm: true,
			showDifficulty: true,
			showPathLengthCandidates: false,
			effectiveAlgorithm: "growing-tree",
		});
	});

	it("shows path-length-candidates once a path length target is set", () => {
		const result = computeMazeFormFieldVisibility({
			type: "rectangle",
			algorithm: "growing-tree",
			pathLength: "short",
		});

		expect(result.showPathLengthCandidates).toBe(true);
	});

	it("hides the algorithm field and forces growing-tree for rectangle-crossing, even if a different algorithm was previously selected", () => {
		const result = computeMazeFormFieldVisibility({
			type: "rectangle-crossing",
			algorithm: "kruskal",
			pathLength: undefined,
		});

		expect(result).toEqual({
			showAlgorithm: false,
			showDifficulty: true,
			showPathLengthCandidates: false,
			effectiveAlgorithm: "growing-tree",
		});
	});

	it("hides difficulty for a non-growing-tree algorithm on a type that allows algorithm choice", () => {
		const result = computeMazeFormFieldVisibility({
			type: "circle",
			algorithm: "wilson",
			pathLength: undefined,
		});

		expect(result).toEqual({
			showAlgorithm: true,
			showDifficulty: false,
			showPathLengthCandidates: false,
			effectiveAlgorithm: "wilson",
		});
	});

	it("hides the algorithm field and forces growing-tree for circle-crossing, even if a different algorithm was previously selected", () => {
		const result = computeMazeFormFieldVisibility({
			type: "circle-crossing",
			algorithm: "wilson",
			pathLength: undefined,
		});

		expect(result).toEqual({
			showAlgorithm: false,
			showDifficulty: true,
			showPathLengthCandidates: false,
			effectiveAlgorithm: "growing-tree",
		});
	});

	it("keeps the algorithm field visible and unforced when rectangle-crossing is paired with growing-tree", () => {
		const result = computeMazeFormFieldVisibility({
			type: "rectangle",
			algorithm: "aldous-broder",
			pathLength: "long",
		});

		expect(result).toEqual({
			showAlgorithm: true,
			showDifficulty: false,
			showPathLengthCandidates: true,
			effectiveAlgorithm: "aldous-broder",
		});
	});
});
