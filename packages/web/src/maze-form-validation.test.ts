import { describe, expect, it } from "vitest";
import { validateMazeFormInput } from "./maze-form-validation.js";

describe("validateMazeFormInput", () => {
	it("accepts valid width, height and difficulty", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
		});

		expect(result).toEqual({
			valid: true,
			value: {
				width: 10,
				height: 8,
				difficulty: 3,
				type: "rectangle",
				algorithm: "growing-tree",
				solution: "none",
			},
		});
	});

	it("defaults the maze type to rectangle when not provided", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
		});

		expect(result.valid).toBe(true);
		expect(result.valid && result.value.type).toBe("rectangle");
	});

	it("accepts rectangle-crossing as a valid maze type", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			type: "rectangle-crossing",
		});

		expect(result).toEqual({
			valid: true,
			value: {
				width: 10,
				height: 8,
				difficulty: 3,
				type: "rectangle-crossing",
				algorithm: "growing-tree",
				solution: "none",
			},
		});
	});

	it("accepts circle as a valid maze type", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			type: "circle",
		});

		expect(result).toEqual({
			valid: true,
			value: {
				width: 10,
				height: 8,
				difficulty: 3,
				type: "circle",
				algorithm: "growing-tree",
				solution: "none",
			},
		});
	});

	it("rejects an unknown maze type with a clear message", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			type: "hexagon",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/hexagon/),
		});
	});

	it("accepts the minimal width and height of 1", () => {
		const result = validateMazeFormInput({
			width: "1",
			height: "1",
			difficulty: "1",
		});

		expect(result.valid).toBe(true);
	});

	it.each([1, 5])(
		"accepts difficulty at the boundary value %i",
		(difficulty) => {
			const result = validateMazeFormInput({
				width: "5",
				height: "5",
				difficulty: String(difficulty),
			});

			expect(result.valid).toBe(true);
		},
	);

	it("rejects a missing width with a clear message", () => {
		const result = validateMazeFormInput({
			width: "",
			height: "5",
			difficulty: "1",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/width/i),
		});
	});

	it("rejects a non-integer height", () => {
		const result = validateMazeFormInput({
			width: "5",
			height: "3.5",
			difficulty: "1",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/height/i),
		});
	});

	it("rejects a width of zero", () => {
		const result = validateMazeFormInput({
			width: "0",
			height: "5",
			difficulty: "1",
		});

		expect(result.valid).toBe(false);
	});

	it("rejects a negative height", () => {
		const result = validateMazeFormInput({
			width: "5",
			height: "-2",
			difficulty: "1",
		});

		expect(result.valid).toBe(false);
	});

	it("rejects a difficulty below the minimum bound", () => {
		const result = validateMazeFormInput({
			width: "5",
			height: "5",
			difficulty: "0",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/difficulty/i),
		});
	});

	it("rejects a difficulty above the maximum bound", () => {
		const result = validateMazeFormInput({
			width: "5",
			height: "5",
			difficulty: "6",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/difficulty/i),
		});
	});

	it("rejects a non-numeric difficulty", () => {
		const result = validateMazeFormInput({
			width: "5",
			height: "5",
			difficulty: "abc",
		});

		expect(result.valid).toBe(false);
	});

	it("defaults the solution display mode to none when not provided", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
		});

		expect(result.valid).toBe(true);
		expect(result.valid && result.value.solution).toBe("none");
	});

	it("accepts overlay as a valid solution display mode", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			solution: "overlay",
		});

		expect(result).toEqual({
			valid: true,
			value: {
				width: 10,
				height: 8,
				difficulty: 3,
				type: "rectangle",
				algorithm: "growing-tree",
				solution: "overlay",
			},
		});
	});

	it("accepts extra-page as a valid solution display mode", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			solution: "extra-page",
		});

		expect(result.valid).toBe(true);
		expect(result.valid && result.value.solution).toBe("extra-page");
	});

	it("rejects an unknown solution display mode with a clear message", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			solution: "confetti",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/confetti/),
		});
	});

	it("defaults the maze algorithm to growing-tree when not provided", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
		});

		expect(result.valid).toBe(true);
		expect(result.valid && result.value.algorithm).toBe("growing-tree");
	});

	it.each(["kruskal", "wilson", "aldous-broder"])(
		"accepts %s as a valid maze algorithm",
		(algorithm) => {
			const result = validateMazeFormInput({
				width: "10",
				height: "8",
				difficulty: "3",
				algorithm,
			});

			expect(result.valid).toBe(true);
			expect(result.valid && result.value.algorithm).toBe(algorithm);
		},
	);

	it("rejects an unknown maze algorithm with a clear message", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			algorithm: "prim",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/prim/),
		});
	});

	it("leaves pathLength unset when not provided, behaving exactly as before", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
		});

		expect(result.valid).toBe(true);
		expect(result.valid && result.value.pathLength).toBeUndefined();
	});

	it.each(["short", "medium", "long"])(
		"accepts %s as a valid pathLength target",
		(pathLength) => {
			const result = validateMazeFormInput({
				width: "10",
				height: "8",
				difficulty: "3",
				pathLength,
			});

			expect(result.valid).toBe(true);
			expect(result.valid && result.value.pathLength).toBe(pathLength);
		},
	);

	it("rejects an unknown pathLength value with a clear message", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			pathLength: "extra-long",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/extra-long/),
		});
	});

	it("leaves pathLengthCandidateCount unset when not provided, behaving exactly as before", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			pathLength: "long",
		});

		expect(result.valid).toBe(true);
		expect(
			result.valid && result.value.pathLengthCandidateCount,
		).toBeUndefined();
	});

	it("accepts a valid pathLengthCandidateCount alongside a pathLength target", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			pathLength: "long",
			pathLengthCandidateCount: "5",
		});

		expect(result.valid).toBe(true);
		expect(result.valid && result.value.pathLengthCandidateCount).toBe(5);
	});

	it("rejects pathLengthCandidateCount set without a pathLength target", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			pathLengthCandidateCount: "5",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/candidate count/i),
		});
	});

	it("rejects a non-integer pathLengthCandidateCount with a clear message", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			pathLength: "long",
			pathLengthCandidateCount: "abc",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/candidate count/i),
		});
	});

	it("rejects a zero pathLengthCandidateCount with a clear message", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			pathLength: "long",
			pathLengthCandidateCount: "0",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/candidate count/i),
		});
	});

	it("rejects a pathLengthCandidateCount above the maximum allowed", () => {
		const result = validateMazeFormInput({
			width: "10",
			height: "8",
			difficulty: "3",
			pathLength: "long",
			pathLengthCandidateCount: "51",
		});

		expect(result).toEqual({
			valid: false,
			error: expect.stringMatching(/candidate count/i),
		});
	});
});
