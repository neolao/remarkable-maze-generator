import type { CircleCell, CircleNode } from "./cells.js";
import {
	carveEdge,
	createCircleGrid,
	forEachNode,
	neighborsOf,
	totalNodeCount,
} from "./cells.js";
import { createSeededRandom } from "./random.js";
import { computeCircleSectorCounts } from "./topology.js";

export interface GenerateCircleWilsonMazeOptions {
	width: number;
	height: number;
	seed: number;
}

export interface CircleWilsonMazeResult {
	sectorCounts: number[];
	cells: CircleCell[][];
}

function nodeKey(node: CircleNode): string {
	return `${node.ring},${node.sector}`;
}

// Wilson's algorithm (see ADR 033 for the rectangular original), ported to
// the growing-sector graph (see ADR 037): repeatedly loop-erased-random-walk
// from a node outside the maze until the walk reaches a node already in the
// maze, then carve that walk's final (loop-free) path in. Carving directly
// from two node references (rather than a coordinate delta) sidesteps the
// wraparound-direction-inference issue the rectangular `circle` type's first
// attempt at this ran into (see ADR 034's superseded approach) — there's no
// delta to infer a direction from here in the first place.
export function generateCircleWilsonMaze({
	width,
	height,
	seed,
}: GenerateCircleWilsonMazeOptions): CircleWilsonMazeResult {
	const sectorCounts = computeCircleSectorCounts(width, height);
	const cells = createCircleGrid(sectorCounts);
	const random = createSeededRandom(seed);

	const inMaze = sectorCounts.map((count) =>
		new Array<boolean>(count).fill(false),
	);
	inMaze[0][0] = true;

	const allNodes: CircleNode[] = [];
	forEachNode(sectorCounts, (node) => allNodes.push(node));

	let remaining = totalNodeCount(sectorCounts) - 1;

	while (remaining > 0) {
		let start: CircleNode;
		do {
			start = allNodes[Math.floor(random() * allNodes.length)];
		} while (inMaze[start.ring][start.sector]);

		const path: CircleNode[] = [start];
		const positionInPath = new Map<string, number>([[nodeKey(start), 0]]);

		let current = start;
		while (!inMaze[current.ring][current.sector]) {
			const candidates = neighborsOf(
				sectorCounts,
				current.ring,
				current.sector,
			);
			const next = candidates[Math.floor(random() * candidates.length)];
			const key = nodeKey(next);

			const loopStart = positionInPath.get(key);
			if (loopStart !== undefined) {
				while (path.length > loopStart + 1) {
					const removed = path.pop();
					if (removed) positionInPath.delete(nodeKey(removed));
				}
			} else {
				path.push(next);
				positionInPath.set(key, path.length - 1);
			}
			current = next;
		}

		for (let i = 0; i < path.length - 1; i++) {
			const a = path[i];
			const b = path[i + 1];
			carveEdge(cells, sectorCounts, a, b);

			if (!inMaze[a.ring][a.sector]) {
				inMaze[a.ring][a.sector] = true;
				remaining--;
			}
		}
	}

	return { sectorCounts, cells };
}
