import {
	ccwSector,
	cwSector,
	inwardParent,
	outwardChildren,
} from "./topology.js";

export interface CircleNode {
	ring: number;
	sector: number;
}

// One entry per real edge: `cwOpen` is this cell's own clockwise wall (its
// counter-clockwise neighbor's wall is read from *that* neighbor's own
// `cwOpen`, never duplicated); `outwardOpen[i]` is the wall to
// `outwardChildren(...)[i]`, the cell's i-th outward child. There is no
// separate `inwardOpen` — a cell's inward wall is its parent's own matching
// `outwardOpen` entry (see `isInwardOpen`).
export interface CircleCell {
	cwOpen: boolean;
	outwardOpen: boolean[];
}

export function createCircleGrid(sectorCounts: number[]): CircleCell[][] {
	return sectorCounts.map((count, ring) =>
		Array.from({ length: count }, (_, sector) => ({
			cwOpen: false,
			outwardOpen: new Array(
				outwardChildren(sectorCounts, ring, sector).length,
			).fill(false),
		})),
	);
}

export function isCwOpen(
	cells: CircleCell[][],
	ring: number,
	sector: number,
): boolean {
	return cells[ring][sector].cwOpen;
}

export function isCcwOpen(
	cells: CircleCell[][],
	sectorCounts: number[],
	ring: number,
	sector: number,
): boolean {
	const previousSector = ccwSector(sectorCounts, ring, sector);
	return cells[ring][previousSector].cwOpen;
}

export function isInwardOpen(
	cells: CircleCell[][],
	sectorCounts: number[],
	ring: number,
	sector: number,
): boolean {
	if (ring === 0) return false;
	const parent = inwardParent(sectorCounts, ring, sector);
	if (parent === null) return false;
	const children = outwardChildren(sectorCounts, ring - 1, parent);
	const childIndex = children.indexOf(sector);
	return cells[ring - 1][parent].outwardOpen[childIndex];
}

/** The subset of `sector`'s outward children (in ring `ring + 1`) whose wall is open. */
export function openOutwardChildren(
	cells: CircleCell[][],
	sectorCounts: number[],
	ring: number,
	sector: number,
): number[] {
	const children = outwardChildren(sectorCounts, ring, sector);
	return children.filter((_, index) => cells[ring][sector].outwardOpen[index]);
}

/**
 * Opens the wall between two neighboring cells — same-ring cw/ccw, or
 * adjacent-ring parent/child. `a` and `b` must already be real neighbors (see
 * `neighborsOf`); this only figures out which one of them owns the edge.
 */
export function carveEdge(
	cells: CircleCell[][],
	sectorCounts: number[],
	a: CircleNode,
	b: CircleNode,
): void {
	if (a.ring === b.ring) {
		const ring = a.ring;
		if (cwSector(sectorCounts, ring, a.sector) === b.sector) {
			cells[ring][a.sector].cwOpen = true;
		} else {
			cells[ring][b.sector].cwOpen = true;
		}
		return;
	}

	const inner = a.ring < b.ring ? a : b;
	const outer = a.ring < b.ring ? b : a;
	const children = outwardChildren(sectorCounts, inner.ring, inner.sector);
	const childIndex = children.indexOf(outer.sector);
	cells[inner.ring][inner.sector].outwardOpen[childIndex] = true;
}

/** Every neighbor of `(ring, sector)`: same-ring cw/ccw, its inward parent (if any), and its outward children (if any). */
export function neighborsOf(
	sectorCounts: number[],
	ring: number,
	sector: number,
): CircleNode[] {
	const neighbors: CircleNode[] = [
		{ ring, sector: cwSector(sectorCounts, ring, sector) },
		{ ring, sector: ccwSector(sectorCounts, ring, sector) },
	];

	const parent = inwardParent(sectorCounts, ring, sector);
	if (parent !== null) neighbors.push({ ring: ring - 1, sector: parent });

	for (const child of outwardChildren(sectorCounts, ring, sector)) {
		neighbors.push({ ring: ring + 1, sector: child });
	}

	return neighbors;
}

export function forEachNode(
	sectorCounts: number[],
	callback: (node: CircleNode) => void,
): void {
	for (let ring = 0; ring < sectorCounts.length; ring++) {
		for (let sector = 0; sector < sectorCounts[ring]; sector++) {
			callback({ ring, sector });
		}
	}
}

export function totalNodeCount(sectorCounts: number[]): number {
	return sectorCounts.reduce((sum, count) => sum + count, 0);
}
