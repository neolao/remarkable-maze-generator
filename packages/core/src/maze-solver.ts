import type { Maze } from "./maze.js";

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

function isCrossingCell(maze: Maze, x: number, y: number): boolean {
	return (maze.crossings ?? []).some(
		(crossing) => crossing.x === x && crossing.y === y,
	);
}

function getOpenMoves(maze: Maze, node: Node): Node[] {
	const cell = maze.cells[node.y][node.x];
	const cellIsCrossing = isCrossingCell(maze, node.x, node.y);
	const moves: Node[] = [];

	const tryMove = (open: boolean, dx: number, dy: number, axis: Axis) => {
		if (!open) return;
		if (cellIsCrossing && node.axis !== "" && axis !== node.axis) return;
		const x = node.x + dx;
		const y = node.y + dy;
		moves.push({
			x,
			y,
			axis: isCrossingCell(maze, x, y) ? axis : "",
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
): MazePosition[] {
	const path: MazePosition[] = [{ x: end.x, y: end.y }];
	let current = end;

	while (nodeKey(current) !== nodeKey(start)) {
		const previous = cameFrom.get(nodeKey(current));
		if (!previous) throw new Error("Failed to reconstruct the solution path");
		path.push({ x: previous.x, y: previous.y });
		current = previous;
	}

	return path.reverse();
}

export function solveMaze(maze: Maze): MazePosition[] {
	const exitX = maze.width - 1;
	const exitY = maze.height - 1;

	const start: Node = { x: 0, y: 0, axis: "" };
	const cameFrom = new Map<string, Node>();
	const visited = new Set<string>([nodeKey(start)]);
	const queue: Node[] = [start];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;

		if (current.x === exitX && current.y === exitY) {
			return reconstructPath(cameFrom, start, current);
		}

		for (const neighbor of getOpenMoves(maze, current)) {
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
