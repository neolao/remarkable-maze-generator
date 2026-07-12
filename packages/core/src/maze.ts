import { generateCircleMaze } from "./circle-maze/generate.js";
import { generateRectangularCells } from "./maze-algorithm-registry.js";
import {
	DEFAULT_MAZE_ALGORITHM,
	DEFAULT_MAZE_TYPE,
	type GenerateMazeOptions,
	MIN_DIFFICULTY,
	type Maze,
	type MazeAlgorithm,
	type MazeType,
	PATH_LENGTH_MAX_ATTEMPTS,
	type PathLengthTarget,
	validateAlgorithm,
	validateDifficulty,
	validateDimensions,
	validatePathLengthCandidateCount,
	validatePathLengthTarget,
	validateType,
	validateTypeAlgorithmCompatibility,
} from "./maze-domain.js";
import { solveMaze } from "./maze-solver.js";

interface GenerateCandidateOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
	type: MazeType;
	algorithm: MazeAlgorithm;
}

function generateMazeCandidate({
	width,
	height,
	seed,
	difficulty,
	type,
	algorithm,
}: GenerateCandidateOptions): Maze {
	if (type === "circle" || type === "circle-crossing") {
		const allowsCircleCrossings = type === "circle-crossing";
		const {
			sectorCounts,
			cells: circleCells,
			crossings: circleCrossings,
		} = generateCircleMaze({
			width,
			height,
			seed,
			difficulty,
			algorithm,
			allowsCrossings: allowsCircleCrossings,
		});

		return {
			width,
			height,
			cells: [],
			type,
			seed,
			difficulty,
			algorithm,
			circleSectorCounts: sectorCounts,
			circleCells,
			circleCrossings: allowsCircleCrossings ? circleCrossings : undefined,
		};
	}

	const allowsCrossings = type === "rectangle-crossing";
	const { cells, crossings } = generateRectangularCells(algorithm, {
		width,
		height,
		seed,
		difficulty,
		allowsCrossings,
	});

	return {
		width,
		height,
		cells,
		type,
		seed,
		difficulty,
		algorithm,
		crossings: allowsCrossings ? crossings : undefined,
	};
}

// Ranks candidates by their solution path length (see ADR 046): "short" and
// "long" pick the extremes, "medium" picks whichever candidate lands closest
// to the (lower) median — ties keep the earliest-generated candidate, so
// selection stays deterministic for a given base seed.
function selectCandidateByPathLength(
	candidates: Maze[],
	pathLength: PathLengthTarget,
): Maze {
	const lengths = candidates.map((candidate) => solveMaze(candidate).length);

	if (pathLength === "short") {
		return candidates[lengths.indexOf(Math.min(...lengths))];
	}

	if (pathLength === "long") {
		return candidates[lengths.indexOf(Math.max(...lengths))];
	}

	const sortedLengths = [...lengths].sort((a, b) => a - b);
	const median = sortedLengths[Math.floor((sortedLengths.length - 1) / 2)];
	const winnerIndex = lengths.reduce(
		(bestIndex, length, index) =>
			Math.abs(length - median) < Math.abs(lengths[bestIndex] - median)
				? index
				: bestIndex,
		0,
	);

	return candidates[winnerIndex];
}

export function generateMaze({
	width,
	height,
	seed,
	difficulty = MIN_DIFFICULTY,
	type = DEFAULT_MAZE_TYPE,
	algorithm = DEFAULT_MAZE_ALGORITHM,
	pathLength,
	pathLengthCandidateCount,
}: GenerateMazeOptions): Maze {
	validateDimensions(width, height);
	validateDifficulty(difficulty);
	validateType(type);
	validateAlgorithm(algorithm);
	validateTypeAlgorithmCompatibility(type, algorithm);
	validatePathLengthCandidateCount(pathLength, pathLengthCandidateCount);

	if (pathLength === undefined) {
		return generateMazeCandidate({
			width,
			height,
			seed,
			difficulty,
			type,
			algorithm,
		});
	}

	validatePathLengthTarget(pathLength);

	const candidates = Array.from(
		{ length: pathLengthCandidateCount ?? PATH_LENGTH_MAX_ATTEMPTS },
		(_, attempt) =>
			generateMazeCandidate({
				width,
				height,
				seed: seed + attempt,
				difficulty,
				type,
				algorithm,
			}),
	);

	return { ...selectCandidateByPathLength(candidates, pathLength), pathLength };
}
