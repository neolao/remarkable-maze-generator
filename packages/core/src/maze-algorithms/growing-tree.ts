import type { Cell, CellWalls, MazeCrossing } from "../maze-domain.js";
import { createGrid, createSeededRandom } from "./shared.js";

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
// Once the growing tree jumps to a dormant active cell (a wrong turn), keep
// extending that same branch for at least this many cells before allowing
// another jump — otherwise it tends to get boxed in by already-visited
// neighbors after a single cell (see ADR 032).
const MIN_BRANCH_COMMIT_LENGTH = 5;

type Axis = "vertical" | "horizontal";

interface Direction {
	dx: number;
	dy: number;
	wall: keyof CellWalls;
	opposite: keyof CellWalls;
	axis: Axis;
}

const DIRECTIONS: Direction[] = [
	{ dx: 0, dy: -1, wall: "north", opposite: "south", axis: "vertical" },
	{ dx: 0, dy: 1, wall: "south", opposite: "north", axis: "vertical" },
	{ dx: 1, dy: 0, wall: "east", opposite: "west", axis: "horizontal" },
	{ dx: -1, dy: 0, wall: "west", opposite: "east", axis: "horizontal" },
];

// A cell is a valid tunnel-through candidate when it currently carries exactly
// one straight passage (both walls open on one axis, both closed on the
// other) — the shape a real bridge crossing needs to duck under (see ADR 024).
function straightPassageAxis(walls: CellWalls): Axis | undefined {
	if (!walls.north && !walls.south && walls.east && walls.west)
		return "vertical";
	if (!walls.east && !walls.west && walls.north && walls.south)
		return "horizontal";
	return undefined;
}

export interface GenerateGrowingTreeMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
	allowsCrossings: boolean;
}

export interface GrowingTreeMazeResult {
	cells: Cell[][];
	crossings: MazeCrossing[];
}

// Growing tree algorithm (see ADR 015): picking the most recently added
// active cell (probability 0) reduces to the recursive backtracker (long
// corridors, few branch points); picking a random active cell (probability 1)
// is structurally equivalent to Prim's algorithm (many branch points). The
// only algorithm supporting bridge crossings (see ADR 024, ADR 033): a
// crossing tunnels straight through an already-carved perpendicular passage
// as part of the very same carving process.
export function generateGrowingTreeMaze({
	width,
	height,
	seed,
	difficulty,
	allowsCrossings,
}: GenerateGrowingTreeMazeOptions): GrowingTreeMazeResult {
	const random = createSeededRandom(seed);
	const cells = createGrid(width, height);
	const visited = Array.from({ length: height }, () =>
		new Array<boolean>(width).fill(false),
	);

	const randomSelectionProbability =
		(difficulty - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY);

	const crossings: MazeCrossing[] = [];
	const crossingCells = new Set<string>();
	const isUsedAsCrossing = (x: number, y: number) =>
		(x === 0 && y === 0) ||
		(x === width - 1 && y === height - 1) ||
		crossingCells.has(`${x},${y}`);
	// Keeping crossings apart from one another avoids a "ladder" of several
	// crossings stacked back-to-back between the same two parallel corridors,
	// which reads as a repeating structural pattern rather than an occasional,
	// notable bridge (see ADR 024 follow-up).
	const isAdjacentToCrossing = (x: number, y: number) =>
		crossingCells.has(`${x - 1},${y}`) ||
		crossingCells.has(`${x + 1},${y}`) ||
		crossingCells.has(`${x},${y - 1}`) ||
		crossingCells.has(`${x},${y + 1}`);

	const active: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
	visited[0][0] = true;
	// Counts down while committed to extending the branch a random jump just
	// landed on, instead of re-rolling the random-vs-recent choice every step
	// (see ADR 032).
	let forcedCommitRemaining = 0;

	while (active.length > 0) {
		let index: number;
		if (forcedCommitRemaining > 0) {
			index = active.length - 1;
			forcedCommitRemaining--;
		} else if (
			randomSelectionProbability > 0 &&
			random() < randomSelectionProbability
		) {
			index = Math.floor(random() * active.length);
			if (index !== active.length - 1) {
				forcedCommitRemaining = MIN_BRANCH_COMMIT_LENGTH - 1;
			}
		} else {
			index = active.length - 1;
		}
		const current = active[index];

		const unvisitedNeighbors = DIRECTIONS.map((direction) => ({
			direction,
			x: current.x + direction.dx,
			y: current.y + direction.dy,
		})).filter(
			(neighbor) =>
				neighbor.x >= 0 &&
				neighbor.x < width &&
				neighbor.y >= 0 &&
				neighbor.y < height &&
				!visited[neighbor.y][neighbor.x],
		);

		// A tunnel candidate reaches a new, unvisited cell by ducking straight
		// through an already-visited neighbor's existing perpendicular passage,
		// creating a real bridge crossing (see ADR 024) instead of extending to
		// an adjacent unvisited cell directly.
		const tunnelCandidates = allowsCrossings
			? DIRECTIONS.map((direction) => {
					const tunnelX = current.x + direction.dx;
					const tunnelY = current.y + direction.dy;
					const targetX = tunnelX + direction.dx;
					const targetY = tunnelY + direction.dy;
					return { direction, tunnelX, tunnelY, targetX, targetY };
				}).filter(({ direction, tunnelX, tunnelY, targetX, targetY }) => {
					if (
						tunnelX < 0 ||
						tunnelX >= width ||
						tunnelY < 0 ||
						tunnelY >= height
					)
						return false;
					if (!visited[tunnelY][tunnelX]) return false;
					if (isUsedAsCrossing(tunnelX, tunnelY)) return false;
					if (isAdjacentToCrossing(tunnelX, tunnelY)) return false;
					if (
						targetX < 0 ||
						targetX >= width ||
						targetY < 0 ||
						targetY >= height
					)
						return false;
					if (visited[targetY][targetX]) return false;

					const existingAxis = straightPassageAxis(
						cells[tunnelY][tunnelX].walls,
					);
					return existingAxis !== undefined && existingAxis !== direction.axis;
				})
			: [];

		const totalCandidates = unvisitedNeighbors.length + tunnelCandidates.length;

		if (totalCandidates === 0) {
			active.splice(index, 1);
			forcedCommitRemaining = 0;
			continue;
		}

		const choice = Math.floor(random() * totalCandidates);

		if (choice < unvisitedNeighbors.length) {
			const chosen = unvisitedNeighbors[choice];

			cells[current.y][current.x].walls[chosen.direction.wall] = false;
			cells[chosen.y][chosen.x].walls[chosen.direction.opposite] = false;

			visited[chosen.y][chosen.x] = true;
			active.push({ x: chosen.x, y: chosen.y });
		} else {
			const { direction, tunnelX, tunnelY, targetX, targetY } =
				tunnelCandidates[choice - unvisitedNeighbors.length];
			const underAxis = straightPassageAxis(cells[tunnelY][tunnelX].walls);
			if (!underAxis)
				throw new Error(
					"Unreachable: tunnel candidate lost its straight passage",
				);

			cells[current.y][current.x].walls[direction.wall] = false;
			cells[tunnelY][tunnelX].walls[direction.opposite] = false;
			cells[tunnelY][tunnelX].walls[direction.wall] = false;
			cells[targetY][targetX].walls[direction.opposite] = false;

			crossings.push({ x: tunnelX, y: tunnelY, underAxis });
			crossingCells.add(`${tunnelX},${tunnelY}`);
			visited[targetY][targetX] = true;
			active.push({ x: targetX, y: targetY });
		}
	}

	return { cells, crossings };
}
