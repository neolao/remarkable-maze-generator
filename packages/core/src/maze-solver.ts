import {
	findCircleSolutionBranchPoints,
	solveCircleMaze,
} from "./circle-maze/solve.js";
import type { Maze, MazeType } from "./maze-domain.js";

export interface MazePosition {
	x: number;
	y: number;
}

// A crossing cell hosts two independent, non-intersecting passages (see ADR
// 024): "axis" identifies which one a node sits on, so the solver never lets
// a path turn from one into the other. "" means "not currently constrained"
// (a regular cell, or the entrance/exit — which are never crossings).
type Axis = "" | "vertical" | "horizontal";

interface Node {
	x: number;
	y: number;
	axis: Axis;
}

function nodeKey(node: Node): string {
	return `${node.x},${node.y},${node.axis}`;
}

function crossingCellKey(x: number, y: number): string {
	return `${x},${y}`;
}

function buildCrossingCellSet(maze: Maze): Set<string> {
	return new Set(
		(maze.crossings ?? []).map((crossing) =>
			crossingCellKey(crossing.x, crossing.y),
		),
	);
}

function getOpenMoves(
	maze: Maze,
	node: Node,
	crossingCells: Set<string>,
): Node[] {
	const cell = maze.cells[node.y][node.x];
	const cellIsCrossing = crossingCells.has(crossingCellKey(node.x, node.y));
	const moves: Node[] = [];

	const tryMove = (open: boolean, dx: number, dy: number, axis: Axis) => {
		if (!open) return;
		if (cellIsCrossing && node.axis !== "" && axis !== node.axis) return;
		const x = node.x + dx;
		const y = node.y + dy;
		moves.push({
			x,
			y,
			axis: crossingCells.has(crossingCellKey(x, y)) ? axis : "",
		});
	};

	tryMove(!cell.walls.north, 0, -1, "vertical");
	tryMove(!cell.walls.south, 0, 1, "vertical");
	tryMove(!cell.walls.east, 1, 0, "horizontal");
	tryMove(!cell.walls.west, -1, 0, "horizontal");

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

function solvePathNodes(maze: Maze): Node[] {
	const exitX = maze.width - 1;
	const exitY = maze.height - 1;

	const start: Node = { x: 0, y: 0, axis: "" };
	const cameFrom = new Map<string, Node>();
	const visited = new Set<string>([nodeKey(start)]);
	const queue: Node[] = [start];
	let head = 0;
	const crossingCells = buildCrossingCellSet(maze);

	while (head < queue.length) {
		const current = queue[head];
		head++;

		if (current.x === exitX && current.y === exitY) {
			return reconstructPath(cameFrom, start, current);
		}

		for (const neighbor of getOpenMoves(maze, current, crossingCells)) {
			const key = nodeKey(neighbor);
			if (visited.has(key)) continue;
			visited.add(key);
			cameFrom.set(key, current);
			queue.push(neighbor);
		}
	}

	throw new Error(
		`No path exists between entrance (0,0) and exit (${exitX},${exitY})`,
	);
}

function circleLike(maze: Maze) {
	return {
		sectorCounts: maze.circleSectorCounts ?? [],
		cells: maze.circleCells ?? [],
	};
}

function solveRectangleFamily(maze: Maze): MazePosition[] {
	return solvePathNodes(maze).map(({ x, y }) => ({ x, y }));
}

function solveCircleFamily(maze: Maze): MazePosition[] {
	return solveCircleMaze(circleLike(maze)).map(({ ring, sector }) => ({
		x: sector,
		y: ring,
	}));
}

/**
 * Path cells where the solver had more than the two directions used to
 * arrive and leave — i.e. a real alternative was available. Entrance and
 * exit are excluded (they are endpoints, not something the path "passes
 * through"). A bridge-crossing cell is never flagged even though all four of
 * its walls are open: the solver's own axis lock (see ADR 024) already
 * limits it to the entered axis, so the other axis is never a real choice.
 */
function findRectangleFamilyBranchPoints(maze: Maze): MazePosition[] {
	const nodes = solvePathNodes(maze);
	const crossingCells = buildCrossingCellSet(maze);
	const branchPoints: MazePosition[] = [];

	for (let i = 1; i < nodes.length - 1; i++) {
		if (getOpenMoves(maze, nodes[i], crossingCells).length > 2) {
			branchPoints.push({ x: nodes[i].x, y: nodes[i].y });
		}
	}

	return branchPoints;
}

function findCircleFamilyBranchPoints(maze: Maze): MazePosition[] {
	return findCircleSolutionBranchPoints(circleLike(maze)).map(
		({ ring, sector }) => ({ x: sector, y: ring }),
	);
}

interface MazeSolverStrategy {
	solve(maze: Maze): MazePosition[];
	branchPoints(maze: Maze): MazePosition[];
}

// The single registration point for how each maze type is solved —
// replacing the duplicated `maze.type === "circle"` checks that used to
// live independently in solveMaze and findSolutionBranchPoints (see ADR
// 049).
const MAZE_SOLVER_STRATEGIES: Record<MazeType, MazeSolverStrategy> = {
	rectangle: {
		solve: solveRectangleFamily,
		branchPoints: findRectangleFamilyBranchPoints,
	},
	"rectangle-crossing": {
		solve: solveRectangleFamily,
		branchPoints: findRectangleFamilyBranchPoints,
	},
	circle: {
		solve: solveCircleFamily,
		branchPoints: findCircleFamilyBranchPoints,
	},
};

export function solveMaze(maze: Maze): MazePosition[] {
	return MAZE_SOLVER_STRATEGIES[maze.type ?? "rectangle"].solve(maze);
}

export function findSolutionBranchPoints(maze: Maze): MazePosition[] {
	return MAZE_SOLVER_STRATEGIES[maze.type ?? "rectangle"].branchPoints(maze);
}
