import type { Maze } from "./maze.js";

export interface MazePosition {
	x: number;
	y: number;
}

function positionKey(position: MazePosition): string {
	return `${position.x},${position.y}`;
}

function getOpenNeighbors(maze: Maze, position: MazePosition): MazePosition[] {
	const cell = maze.cells[position.y][position.x];
	const neighbors: MazePosition[] = [];

	if (!cell.walls.north) neighbors.push({ x: position.x, y: position.y - 1 });
	if (!cell.walls.south) neighbors.push({ x: position.x, y: position.y + 1 });
	if (!cell.walls.east) neighbors.push({ x: position.x + 1, y: position.y });
	if (!cell.walls.west) neighbors.push({ x: position.x - 1, y: position.y });

	return neighbors;
}

function reconstructPath(
	cameFrom: Map<string, MazePosition>,
	entrance: MazePosition,
	exit: MazePosition,
): MazePosition[] {
	const path: MazePosition[] = [exit];
	let current = exit;

	while (positionKey(current) !== positionKey(entrance)) {
		const previous = cameFrom.get(positionKey(current));
		if (!previous) throw new Error("Failed to reconstruct the solution path");
		path.push(previous);
		current = previous;
	}

	return path.reverse();
}

export function solveMaze(maze: Maze): MazePosition[] {
	const entrance: MazePosition = { x: 0, y: 0 };
	const exit: MazePosition = { x: maze.width - 1, y: maze.height - 1 };

	const cameFrom = new Map<string, MazePosition>();
	const visited = new Set<string>([positionKey(entrance)]);
	const queue: MazePosition[] = [entrance];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;

		if (current.x === exit.x && current.y === exit.y) {
			return reconstructPath(cameFrom, entrance, exit);
		}

		for (const neighbor of getOpenNeighbors(maze, current)) {
			const key = positionKey(neighbor);
			if (visited.has(key)) continue;
			visited.add(key);
			cameFrom.set(key, current);
			queue.push(neighbor);
		}
	}

	throw new Error(
		`No path exists between entrance (0,0) and exit (${exit.x},${exit.y})`,
	);
}
