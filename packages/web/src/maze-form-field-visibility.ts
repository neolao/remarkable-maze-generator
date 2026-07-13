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
	showTubeBackgroundFill: boolean;
	effectiveAlgorithm: MazeAlgorithm;
}

// Only growing-tree can produce a bridge-crossing maze, rectangle or circle
// (core rejects any other combination) — see ADR 022/033/053/055.
const FORCED_ALGORITHM_FOR_CROSSING_TYPES: MazeAlgorithm = "growing-tree";
const CROSSING_MAZE_TYPES: MazeType[] = [
	"rectangle-crossing",
	"circle-crossing",
];

// Only growing-tree reads the difficulty knob — see maze-algorithms/growing-tree.ts and ADR 053.
const DIFFICULTY_ALGORITHM: MazeAlgorithm = "growing-tree";

export function computeMazeFormFieldVisibility(
	input: MazeFormFieldVisibilityInput,
): MazeFormFieldVisibility {
	const isCrossingType = CROSSING_MAZE_TYPES.includes(input.type);
	const effectiveAlgorithm: MazeAlgorithm = isCrossingType
		? FORCED_ALGORITHM_FOR_CROSSING_TYPES
		: input.algorithm;

	return {
		showAlgorithm: !isCrossingType,
		showDifficulty: effectiveAlgorithm === DIFFICULTY_ALGORITHM,
		showPathLengthCandidates: input.pathLength !== undefined,
		showTubeBackgroundFill: isCrossingType,
		effectiveAlgorithm,
	};
}
