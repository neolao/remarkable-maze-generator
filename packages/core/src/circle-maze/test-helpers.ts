import type { CircleCell } from "./cells.js";
import { isCcwOpen, isInwardOpen, openOutwardChildren } from "./cells.js";
import { ccwSector, cwSector, inwardParent } from "./topology.js";

export interface CircleMazeLike {
	sectorCounts: number[];
	cells: CircleCell[][];
}

export function countReachableNodes(maze: CircleMazeLike): number {
	const { sectorCounts, cells } = maze;
	const visited = sectorCounts.map((count) =>
		new Array<boolean>(count).fill(false),
	);
	const stack: Array<{ ring: number; sector: number }> = [
		{ ring: 0, sector: 0 },
	];
	let count = 0;

	while (stack.length > 0) {
		const node = stack.pop();
		if (!node) break;
		if (visited[node.ring][node.sector]) continue;
		visited[node.ring][node.sector] = true;
		count++;

		if (cells[node.ring][node.sector].cwOpen) {
			stack.push({
				ring: node.ring,
				sector: cwSector(sectorCounts, node.ring, node.sector),
			});
		}
		if (isCcwOpen(cells, sectorCounts, node.ring, node.sector)) {
			stack.push({
				ring: node.ring,
				sector: ccwSector(sectorCounts, node.ring, node.sector),
			});
		}
		if (isInwardOpen(cells, sectorCounts, node.ring, node.sector)) {
			const parent = inwardParent(sectorCounts, node.ring, node.sector);
			if (parent !== null) stack.push({ ring: node.ring - 1, sector: parent });
		}
		for (const child of openOutwardChildren(
			cells,
			sectorCounts,
			node.ring,
			node.sector,
		)) {
			stack.push({ ring: node.ring + 1, sector: child });
		}
	}

	return count;
}

// A perfect maze (a spanning tree over N nodes) has exactly N-1 open edges.
// Each edge is owned by exactly one cell (`cwOpen`, or `outwardOpen[i]`), so a
// straight sum over every cell counts every real edge exactly once.
export function countOpenEdges(maze: CircleMazeLike): number {
	let count = 0;
	for (const ring of maze.cells) {
		for (const cell of ring) {
			if (cell.cwOpen) count++;
			count += cell.outwardOpen.filter(Boolean).length;
		}
	}
	return count;
}
