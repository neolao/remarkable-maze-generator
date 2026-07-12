import type {
	MazeAlgorithm,
	MazeType,
	PathLengthTarget,
} from "@remarkable-maze-generator/core";

export interface MazeFormFieldVisibilityInput {
	type: MazeType;
	algorithm: MazeAlgorithm;
	pathLength: PathLengthTarget | undefined;
}

export interface MazeFormFieldVisibility {
	showAlgorithm: boolean;
	showDifficulty: boolean;
	showPathLengthCandidates: boolean;
	effectiveAlgorithm: MazeAlgorithm;
}

// Only growing-tree can produce a rectangle-crossing maze (core rejects any
// other combination) — see ADR 022/033/053.
const FORCED_ALGORITHM_FOR_RECTANGLE_CROSSING: MazeAlgorithm = "growing-tree";

// Only growing-tree reads the difficulty knob — see maze-algorithms/growing-tree.ts and ADR 053.
const DIFFICULTY_ALGORITHM: MazeAlgorithm = "growing-tree";

export function computeMazeFormFieldVisibility(
	input: MazeFormFieldVisibilityInput,
): MazeFormFieldVisibility {
	const effectiveAlgorithm: MazeAlgorithm =
		input.type === "rectangle-crossing"
			? FORCED_ALGORITHM_FOR_RECTANGLE_CROSSING
			: input.algorithm;

	return {
		showAlgorithm: input.type !== "rectangle-crossing",
		showDifficulty: effectiveAlgorithm === DIFFICULTY_ALGORITHM,
		showPathLengthCandidates: input.pathLength !== undefined,
		effectiveAlgorithm,
	};
}
