import type { CircleMazeCrossing } from "../maze-domain.js";
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
	crossings?: CircleMazeCrossing[];
}

// A crossing node hosts two independent, non-intersecting passages (see ADR
// 055, the circle-maze equivalent of the rectangular ADR 024): "axis"
// identifies which one a search node sits on, so the solver never lets a path
// turn from one into the other. "" means "not currently constrained" (a
// regular node, or the entrance/exit — which are never crossings).
type Axis = "" | "radial" | "tangential";

interface Node {
	ring: number;
	sector: number;
	axis: Axis;
}

function nodeKey(node: Node): string {
	return `${node.ring},${node.sector},${node.axis}`;
}

function crossingNodeKey(ring: number, sector: number): string {
	return `${ring},${sector}`;
}

function buildCrossingNodeSet(maze: CircleMazeLike): Set<string> {
	return new Set(
		(maze.crossings ?? []).map((crossing) =>
			crossingNodeKey(crossing.ring, crossing.sector),
		),
	);
}

function getOpenMoves(
	maze: CircleMazeLike,
	node: Node,
	crossingNodes: Set<string>,
): Node[] {
	const { sectorCounts, cells } = maze;
	const nodeIsCrossing = crossingNodes.has(
		crossingNodeKey(node.ring, node.sector),
	);
	const moves: Node[] = [];

	const tryMove = (
		open: boolean,
		ring: number,
		sector: number,
		axis: "radial" | "tangential",
	) => {
		if (!open) return;
		if (nodeIsCrossing && node.axis !== "" && axis !== node.axis) return;
		moves.push({
			ring,
			sector,
			axis: crossingNodes.has(crossingNodeKey(ring, sector)) ? axis : "",
		});
	};

	tryMove(
		cells[node.ring][node.sector].cwOpen,
		node.ring,
		cwSector(sectorCounts, node.ring, node.sector),
		"tangential",
	);
	tryMove(
		isCcwOpen(cells, sectorCounts, node.ring, node.sector),
		node.ring,
		ccwSector(sectorCounts, node.ring, node.sector),
		"tangential",
	);

	const parent = inwardParent(sectorCounts, node.ring, node.sector);
	if (parent !== null) {
		tryMove(
			isInwardOpen(cells, sectorCounts, node.ring, node.sector),
			node.ring - 1,
			parent,
			"radial",
		);
	}
	for (const child of openOutwardChildren(
		cells,
		sectorCounts,
		node.ring,
		node.sector,
	)) {
		tryMove(true, node.ring + 1, child, "radial");
	}

	return moves;
}

function reconstructPath(
	cameFrom: Map<string, Node>,
	start: Node,
	end: Node,
): Node[] {
	const path: Node[] = [end];
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
function solvePathNodes(maze: CircleMazeLike): Node[] {
	const start: Node = { ring: 0, sector: 0, axis: "" };
	const exit = { ring: maze.sectorCounts.length - 1, sector: 0 };

	const cameFrom = new Map<string, Node>();
	const visited = new Set<string>([nodeKey(start)]);
	const queue: Node[] = [start];
	let head = 0;
	const crossingNodes = buildCrossingNodeSet(maze);

	while (head < queue.length) {
		const current = queue[head];
		head++;

		if (current.ring === exit.ring && current.sector === exit.sector) {
			return reconstructPath(cameFrom, start, current);
		}

		for (const neighbor of getOpenMoves(maze, current, crossingNodes)) {
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
	return solvePathNodes(maze).map(({ ring, sector }) => ({ ring, sector }));
}

/**
 * Same idea as the rectangular `findSolutionBranchPoints`: path nodes with
 * more than the 2 directions used to arrive and leave, excluding the start
 * and end. A bridge-crossing node is never flagged even with 4 open
 * directions, since the solver's own axis lock already limits it to the
 * entered axis (see ADR 055 and ADR 028's rectangular equivalent).
 */
export function findCircleSolutionBranchPoints(
	maze: CircleMazeLike,
): CircleMazePosition[] {
	const nodes = solvePathNodes(maze);
	const crossingNodes = buildCrossingNodeSet(maze);
	const branchPoints: CircleMazePosition[] = [];

	for (let i = 1; i < nodes.length - 1; i++) {
		if (getOpenMoves(maze, nodes[i], crossingNodes).length > 2) {
			branchPoints.push({ ring: nodes[i].ring, sector: nodes[i].sector });
		}
	}

	return branchPoints;
}
