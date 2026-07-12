import type { CircleMazeCrossing } from "../maze-domain.js";
import type { CircleCell, CircleNode } from "./cells.js";
import {
	carveEdge,
	createCircleGrid,
	isCcwOpen,
	isInwardOpen,
	neighborsOf,
} from "./cells.js";
import { createSeededRandom } from "./random.js";
import {
	ccwSector,
	computeCircleSectorCounts,
	cwSector,
	inwardParent,
	outwardChildren,
} from "./topology.js";

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
// See ADR 032 (the rectangular growing-tree's own equivalent constant) — same
// reasoning, ported to this graph: once a random jump lands on a dormant
// branch, keep extending it for a minimum number of cells before allowing
// another jump.
const MIN_BRANCH_COMMIT_LENGTH = 5;

export interface GenerateCircleGrowingTreeMazeOptions {
	width: number;
	height: number;
	seed: number;
	difficulty: number;
	allowsCrossings: boolean;
}

export interface CircleGrowingTreeMazeResult {
	sectorCounts: number[];
	cells: CircleCell[][];
	crossings: CircleMazeCrossing[];
}

// A node currently carries a clean straight-through radial passage (its
// inward wall open, exactly one outward child, that child's wall open) with
// no tangential opening at all — the shape a tangential tunnel needs to duck
// under (see ADR 055, the circle-maze equivalent of the rectangular
// `straightPassageAxis`).
function isRadialStraightThrough(
	cells: CircleCell[][],
	sectorCounts: number[],
	ring: number,
	sector: number,
): boolean {
	if (ring === 0) return false;
	if (!isInwardOpen(cells, sectorCounts, ring, sector)) return false;

	const children = outwardChildren(sectorCounts, ring, sector);
	if (children.length !== 1) return false;
	if (!cells[ring][sector].outwardOpen[0]) return false;

	if (cells[ring][sector].cwOpen) return false;
	if (isCcwOpen(cells, sectorCounts, ring, sector)) return false;

	return true;
}

// Same idea, the tangential mirror: cw and ccw both open, no radial opening
// at all — the shape a radial tunnel needs to duck under.
function isTangentialStraightThrough(
	cells: CircleCell[][],
	sectorCounts: number[],
	ring: number,
	sector: number,
): boolean {
	if (!cells[ring][sector].cwOpen) return false;
	if (!isCcwOpen(cells, sectorCounts, ring, sector)) return false;

	if (isInwardOpen(cells, sectorCounts, ring, sector)) return false;
	if (cells[ring][sector].outwardOpen.some(Boolean)) return false;

	return true;
}

interface TunnelCandidate {
	tunnel: CircleNode;
	target: CircleNode;
	underAxis: "radial" | "tangential";
}

// Every 2-hop tunnel candidate reachable from `current` (see ADR 055): a
// tangential one along cw or ccw (always unambiguous — every node has exactly
// one cw and one ccw neighbor), and a radial one along each open outward
// child or the unique inward parent (each only considered when the middle hop
// itself has exactly one further neighbor in that same direction, so the
// target is unambiguous).
function findTunnelCandidates(
	cells: CircleCell[][],
	sectorCounts: number[],
	visited: boolean[][],
	current: CircleNode,
	isUsedAsCrossing: (node: CircleNode) => boolean,
	isAdjacentToCrossing: (node: CircleNode) => boolean,
): TunnelCandidate[] {
	const candidates: TunnelCandidate[] = [];
	const isValidTunnel = (tunnel: CircleNode, target: CircleNode) =>
		visited[tunnel.ring][tunnel.sector] &&
		!isUsedAsCrossing(tunnel) &&
		!isAdjacentToCrossing(tunnel) &&
		!visited[target.ring][target.sector];

	const tangentialTunnel = (
		step: (sectorCounts: number[], ring: number, sector: number) => number,
	) => {
		const tunnel: CircleNode = {
			ring: current.ring,
			sector: step(sectorCounts, current.ring, current.sector),
		};
		const target: CircleNode = {
			ring: current.ring,
			sector: step(sectorCounts, tunnel.ring, tunnel.sector),
		};
		if (
			isValidTunnel(tunnel, target) &&
			isRadialStraightThrough(cells, sectorCounts, tunnel.ring, tunnel.sector)
		) {
			candidates.push({ tunnel, target, underAxis: "radial" });
		}
	};
	tangentialTunnel(cwSector);
	tangentialTunnel(ccwSector);

	for (const child of outwardChildren(
		sectorCounts,
		current.ring,
		current.sector,
	)) {
		const tunnel: CircleNode = { ring: current.ring + 1, sector: child };
		const grandchildren = outwardChildren(
			sectorCounts,
			tunnel.ring,
			tunnel.sector,
		);
		if (grandchildren.length !== 1) continue;
		const target: CircleNode = {
			ring: tunnel.ring + 1,
			sector: grandchildren[0],
		};
		if (
			isValidTunnel(tunnel, target) &&
			isTangentialStraightThrough(
				cells,
				sectorCounts,
				tunnel.ring,
				tunnel.sector,
			)
		) {
			candidates.push({ tunnel, target, underAxis: "tangential" });
		}
	}

	if (current.ring > 0) {
		const parentSector = inwardParent(
			sectorCounts,
			current.ring,
			current.sector,
		);
		if (parentSector !== null) {
			const tunnel: CircleNode = {
				ring: current.ring - 1,
				sector: parentSector,
			};
			if (tunnel.ring > 0) {
				const grandparentSector = inwardParent(
					sectorCounts,
					tunnel.ring,
					tunnel.sector,
				);
				if (grandparentSector !== null) {
					const target: CircleNode = {
						ring: tunnel.ring - 1,
						sector: grandparentSector,
					};
					if (
						isValidTunnel(tunnel, target) &&
						isTangentialStraightThrough(
							cells,
							sectorCounts,
							tunnel.ring,
							tunnel.sector,
						)
					) {
						candidates.push({ tunnel, target, underAxis: "tangential" });
					}
				}
			}
		}
	}

	return candidates;
}

// Growing tree algorithm (see ADR 015 for the rectangular original), ported
// to the growing-sector graph (see ADR 037): picking the most recently added
// active node (probability 0) reduces to a recursive backtracker; picking a
// random active node (probability 1) is structurally equivalent to Prim's
// algorithm. When `allowsCrossings` is set, also considers tunneling a new
// passage through an already-carved perpendicular one, producing a real
// bridge crossing (see ADR 055).
export function generateCircleGrowingTreeMaze({
	width,
	height,
	seed,
	difficulty,
	allowsCrossings,
}: GenerateCircleGrowingTreeMazeOptions): CircleGrowingTreeMazeResult {
	const sectorCounts = computeCircleSectorCounts(width, height);
	const cells = createCircleGrid(sectorCounts);
	const random = createSeededRandom(seed);
	const visited = sectorCounts.map((count) =>
		new Array<boolean>(count).fill(false),
	);

	const randomSelectionProbability =
		(difficulty - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY);

	const crossings: CircleMazeCrossing[] = [];
	const crossingNodes = new Set<string>();
	const nodeKey = (node: CircleNode) => `${node.ring},${node.sector}`;
	const lastRing = sectorCounts.length - 1;
	const isUsedAsCrossing = (node: CircleNode) =>
		(node.ring === 0 && node.sector === 0) ||
		(node.ring === lastRing && node.sector === 0) ||
		crossingNodes.has(nodeKey(node));
	// Keeping crossings apart from one another avoids a "ladder" of several
	// crossings stacked back-to-back (see ADR 024 follow-up, ported here).
	const isAdjacentToCrossing = (node: CircleNode) =>
		neighborsOf(sectorCounts, node.ring, node.sector).some((neighbor) =>
			crossingNodes.has(nodeKey(neighbor)),
		);

	const active: CircleNode[] = [{ ring: 0, sector: 0 }];
	visited[0][0] = true;
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

		const unvisitedNeighbors = neighborsOf(
			sectorCounts,
			current.ring,
			current.sector,
		).filter((neighbor) => !visited[neighbor.ring][neighbor.sector]);

		const tunnelCandidates = allowsCrossings
			? findTunnelCandidates(
					cells,
					sectorCounts,
					visited,
					current,
					isUsedAsCrossing,
					isAdjacentToCrossing,
				)
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
			carveEdge(cells, sectorCounts, current, chosen);
			visited[chosen.ring][chosen.sector] = true;
			active.push(chosen);
		} else {
			const { tunnel, target, underAxis } =
				tunnelCandidates[choice - unvisitedNeighbors.length];

			carveEdge(cells, sectorCounts, current, tunnel);
			carveEdge(cells, sectorCounts, tunnel, target);

			crossings.push({ ring: tunnel.ring, sector: tunnel.sector, underAxis });
			crossingNodes.add(nodeKey(tunnel));
			visited[target.ring][target.sector] = true;
			active.push(target);
		}
	}

	return { sectorCounts, cells, crossings };
}
