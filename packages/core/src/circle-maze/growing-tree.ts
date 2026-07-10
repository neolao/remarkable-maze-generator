import type { CircleCell, CircleNode } from "./cells.js";
import { carveEdge, createCircleGrid, neighborsOf } from "./cells.js";
import { createSeededRandom } from "./random.js";
import { computeCircleSectorCounts } from "./topology.js";

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
// See ADR 032 (the rectangular growing-tree's own equivalent constant) — same
// reasoning, ported to this graph: once a random jump lands on a dormant
// branch, keep extending it for a minimum number of cells before allowing
// another jump.
const MIN_BRANCH_COMMIT_LENGTH = 5;

export interface GenerateCircleGrowingTreeMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
}

export interface CircleGrowingTreeMazeResult {
	sectorCounts: number[];
	cells: CircleCell[][];
}

// Growing tree algorithm (see ADR 015 for the rectangular original), ported
// to the growing-sector graph (see ADR 037): picking the most recently added
// active node (probability 0) reduces to a recursive backtracker; picking a
// random active node (probability 1) is structurally equivalent to Prim's
// algorithm.
export function generateCircleGrowingTreeMaze({
	width,
	height,
	seed,
	difficulty,
}: GenerateCircleGrowingTreeMazeOptions): CircleGrowingTreeMazeResult {
	const sectorCounts = computeCircleSectorCounts(width, height);
	const cells = createCircleGrid(sectorCounts);
	const random = createSeededRandom(seed);
	const visited = sectorCounts.map((count) =>
		new Array<boolean>(count).fill(false),
	);

	const randomSelectionProbability =
		(difficulty - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY);

	const active: CircleNode[] = [{ ring: 0, sector: 0 }];
	visited[0][0] = true;
	let forcedCommitRemaining = 0;

	while (active.length > 0) {
		let index: number;
		if (forcedCommitRemaining > 0) {
			index = active.length - 1;
			forcedCommitRemaining--;
		} else if (
			randomSelectionProbability > 0 &&
			random() < randomSelectionProbability
		) {
			index = Math.floor(random() * active.length);
			if (index !== active.length - 1) {
				forcedCommitRemaining = MIN_BRANCH_COMMIT_LENGTH - 1;
			}
		} else {
			index = active.length - 1;
		}
		const current = active[index];

		const unvisitedNeighbors = neighborsOf(
			sectorCounts,
			current.ring,
			current.sector,
		).filter((neighbor) => !visited[neighbor.ring][neighbor.sector]);

		if (unvisitedNeighbors.length === 0) {
			active.splice(index, 1);
			forcedCommitRemaining = 0;
			continue;
		}

		const chosen =
			unvisitedNeighbors[Math.floor(random() * unvisitedNeighbors.length)];
		carveEdge(cells, sectorCounts, current, chosen);
		visited[chosen.ring][chosen.sector] = true;
		active.push(chosen);
	}

	return { sectorCounts, cells };
}
