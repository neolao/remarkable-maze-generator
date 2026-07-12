import type { Cell } from "../maze-domain.js";

export function countReachableCells(cells: Cell[][]): number {
	const visited = new Set<string>();
	const stack = [{ x: 0, y: 0 }];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) break;
		const key = `${current.x},${current.y}`;
		if (visited.has(key)) continue;
		visited.add(key);

		const cell = cells[current.y]?.[current.x];
		if (!cell) continue;

		if (!cell.walls.north) stack.push({ x: current.x, y: current.y - 1 });
		if (!cell.walls.south) stack.push({ x: current.x, y: current.y + 1 });
		if (!cell.walls.east) stack.push({ x: current.x + 1, y: current.y });
		if (!cell.walls.west) stack.push({ x: current.x - 1, y: current.y });
	}

	return visited.size;
}

// Counts each open passage exactly once (only looking east/south, since a
// neighbor's west/north wall mirrors the same passage). A perfect maze (a
// spanning tree over width*height cells) has exactly width*height-1 of these.
export function countOpenPassages(cells: Cell[][]): number {
	let count = 0;
	for (const row of cells) {
		for (const cell of row) {
			if (!cell.walls.east) count++;
			if (!cell.walls.south) count++;
		}
	}
	return count;
}
