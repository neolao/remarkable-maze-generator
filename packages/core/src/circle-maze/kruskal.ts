import type { CircleCell, CircleNode } from "./cells.js";
import {
	carveEdge,
	createCircleGrid,
	forEachNode,
	totalNodeCount,
} from "./cells.js";
import { createSeededRandom, shuffle } from "./random.js";
import { computeCircleSectorCounts, outwardChildren } from "./topology.js";

export interface GenerateCircleKruskalMazeOptions {
	width: number;
	height: number;
	seed: number;
}

export interface CircleKruskalMazeResult {
	sectorCounts: number[];
	cells: CircleCell[][];
}

interface Edge {
	a: CircleNode;
	b: CircleNode;
}

class DisjointSet {
	private readonly parent: number[];

	constructor(size: number) {
		this.parent = Array.from({ length: size }, (_, index) => index);
	}

	find(index: number): number {
		if (this.parent[index] !== index) {
			this.parent[index] = this.find(this.parent[index]);
		}
		return this.parent[index];
	}

	union(a: number, b: number): boolean {
		const rootA = this.find(a);
		const rootB = this.find(b);
		if (rootA === rootB) return false;
		this.parent[rootA] = rootB;
		return true;
	}
}

// Randomized Kruskal's algorithm (see ADR 033 for the rectangular original),
// ported to the growing-sector graph (see ADR 037): list every candidate
// edge once (a cell's clockwise neighbor, and each of its outward children —
// the counter-clockwise and inward directions are each some other cell's own
// clockwise/outward edge, so listing those two per cell already covers every
// edge exactly once), shuffle, then carve each edge unless it would connect
// two nodes already reachable from one another.
export function generateCircleKruskalMaze({
	width,
	height,
	seed,
}: GenerateCircleKruskalMazeOptions): CircleKruskalMazeResult {
	const sectorCounts = computeCircleSectorCounts(width, height);
	const cells = createCircleGrid(sectorCounts);
	const random = createSeededRandom(seed);

	const ringOffsets: number[] = [0];
	for (const count of sectorCounts) {
		ringOffsets.push(ringOffsets[ringOffsets.length - 1] + count);
	}
	const nodeIndex = (node: CircleNode) => ringOffsets[node.ring] + node.sector;

	const edges: Edge[] = [];
	forEachNode(sectorCounts, (node) => {
		const cwNode: CircleNode = {
			ring: node.ring,
			sector: (node.sector + 1) % sectorCounts[node.ring],
		};
		if (nodeIndex(cwNode) !== nodeIndex(node)) {
			edges.push({ a: node, b: cwNode });
		}
		for (const child of outwardChildren(sectorCounts, node.ring, node.sector)) {
			edges.push({ a: node, b: { ring: node.ring + 1, sector: child } });
		}
	});

	const disjointSet = new DisjointSet(totalNodeCount(sectorCounts));

	for (const edge of shuffle(edges, random)) {
		const connected = disjointSet.union(nodeIndex(edge.a), nodeIndex(edge.b));
		if (!connected) continue;

		carveEdge(cells, sectorCounts, edge.a, edge.b);
	}

	return { sectorCounts, cells };
}
