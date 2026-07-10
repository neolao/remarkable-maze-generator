import type { CircleCell } from "./cells.js";
import { isCcwOpen, isInwardOpen, openOutwardChildren } from "./cells.js";
import { ccwSector, cwSector, inwardParent } from "./topology.js";

export interface CircleMazePosition {
	ring: number;
	sector: number;
}

interface CircleMazeLike {
	sectorCounts: number[];
	cells: CircleCell[][];
}

function nodeKey(node: CircleMazePosition): string {
	return `${node.ring},${node.sector}`;
}

function openMoves(
	maze: CircleMazeLike,
	node: CircleMazePosition,
): CircleMazePosition[] {
	const { sectorCounts, cells } = maze;
	const moves: CircleMazePosition[] = [];

	if (cells[node.ring][node.sector].cwOpen) {
		moves.push({
			ring: node.ring,
			sector: cwSector(sectorCounts, node.ring, node.sector),
		});
	}
	if (isCcwOpen(cells, sectorCounts, node.ring, node.sector)) {
		moves.push({
			ring: node.ring,
			sector: ccwSector(sectorCounts, node.ring, node.sector),
		});
	}
	if (isInwardOpen(cells, sectorCounts, node.ring, node.sector)) {
		const parent = inwardParent(sectorCounts, node.ring, node.sector);
		if (parent !== null) moves.push({ ring: node.ring - 1, sector: parent });
	}
	for (const child of openOutwardChildren(
		cells,
		sectorCounts,
		node.ring,
		node.sector,
	)) {
		moves.push({ ring: node.ring + 1, sector: child });
	}

	return moves;
}

function reconstructPath(
	cameFrom: Map<string, CircleMazePosition>,
	start: CircleMazePosition,
	end: CircleMazePosition,
): CircleMazePosition[] {
	const path: CircleMazePosition[] = [end];
	let current = end;

	while (nodeKey(current) !== nodeKey(start)) {
		const previous = cameFrom.get(nodeKey(current));
		if (!previous) throw new Error("Failed to reconstruct the solution path");
		path.push(previous);
		current = previous;
	}

	return path.reverse();
}

// The entrance is the center (ring 0, sector 0); the exit is sector 0 of the
// outermost ring — a real circular maze has no natural "far corner" the way
// a rectangle does, so this is the closest equivalent: as far from the
// center as the maze goes.
function solvePathNodes(maze: CircleMazeLike): CircleMazePosition[] {
	const start: CircleMazePosition = { ring: 0, sector: 0 };
	const exit: CircleMazePosition = {
		ring: maze.sectorCounts.length - 1,
		sector: 0,
	};

	const cameFrom = new Map<string, CircleMazePosition>();
	const visited = new Set<string>([nodeKey(start)]);
	const queue: CircleMazePosition[] = [start];
	let head = 0;

	while (head < queue.length) {
		const current = queue[head];
		head++;

		if (current.ring === exit.ring && current.sector === exit.sector) {
			return reconstructPath(cameFrom, start, current);
		}

		for (const neighbor of openMoves(maze, current)) {
			const key = nodeKey(neighbor);
			if (visited.has(key)) continue;
			visited.add(key);
			cameFrom.set(key, current);
			queue.push(neighbor);
		}
	}

	throw new Error(
		`No path exists between the center and the outer ring (exit sector ${exit.sector})`,
	);
}

export function solveCircleMaze(maze: CircleMazeLike): CircleMazePosition[] {
	return solvePathNodes(maze);
}

/** Same idea as the rectangular `findSolutionBranchPoints`: path nodes with more than the 2 directions used to arrive and leave, excluding the start and end. */
export function findCircleSolutionBranchPoints(
	maze: CircleMazeLike,
): CircleMazePosition[] {
	const nodes = solvePathNodes(maze);
	const branchPoints: CircleMazePosition[] = [];

	for (let i = 1; i < nodes.length - 1; i++) {
		if (openMoves(maze, nodes[i]).length > 2) {
			branchPoints.push(nodes[i]);
		}
	}

	return branchPoints;
}
