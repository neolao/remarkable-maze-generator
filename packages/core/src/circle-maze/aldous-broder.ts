import type { CircleCell, CircleNode } from "./cells.js";
import {
	carveEdge,
	createCircleGrid,
	neighborsOf,
	totalNodeCount,
} from "./cells.js";
import { createSeededRandom } from "./random.js";
import { computeCircleSectorCounts } from "./topology.js";

export interface GenerateCircleAldousBroderMazeOptions {
	width: number;
	height: number;
	seed: number;
}

export interface CircleAldousBroderMazeResult {
	sectorCounts: number[];
	cells: CircleCell[][];
}

// Aldous-Broder algorithm (see ADR 033 for the rectangular original), ported
// to the growing-sector graph (see ADR 037): a plain random walk over the
// graph, carving the passage whenever it steps onto a node it has never
// visited before.
export function generateCircleAldousBroderMaze({
	width,
	height,
	seed,
}: GenerateCircleAldousBroderMazeOptions): CircleAldousBroderMazeResult {
	const sectorCounts = computeCircleSectorCounts(width, height);
	const cells = createCircleGrid(sectorCounts);
	const random = createSeededRandom(seed);

	const visited = sectorCounts.map((count) =>
		new Array<boolean>(count).fill(false),
	);
	visited[0][0] = true;
	let remaining = totalNodeCount(sectorCounts) - 1;

	let current: CircleNode = { ring: 0, sector: 0 };

	while (remaining > 0) {
		const candidates = neighborsOf(sectorCounts, current.ring, current.sector);
		const next = candidates[Math.floor(random() * candidates.length)];

		if (!visited[next.ring][next.sector]) {
			carveEdge(cells, sectorCounts, current, next);
			visited[next.ring][next.sector] = true;
			remaining--;
		}

		current = next;
	}

	return { sectorCounts, cells };
}
