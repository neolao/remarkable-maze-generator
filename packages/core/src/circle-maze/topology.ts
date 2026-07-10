// A real circular ("theta") maze topology (see ADR 037): unlike the
// rectangular grid, this is not a uniform 2D array — the number of sectors
// grows ring by ring, so a cell's neighbor count varies (an inner cell may
// have several outward children; every outer cell has exactly one inward
// parent). Kept entirely separate from the rectangular grid and its
// north/south/east/west model — the two topologies don't share code.

// Ring boundaries sit at radius `ring` (inner) / `ring + 1` (outer), a
// constant 1-unit radial thickness throughout — ring 0's inner edge is the
// exact center point (radius 0), so its cells are plain pie slices, same as
// every real circular maze diagram.
const RADIAL_THICKNESS = 1;

/**
 * The number of sectors in each ring, ring 0 (innermost) first. Ring 0 always
 * has exactly `width` sectors. Each further ring's sector count is multiplied
 * by whatever small integer keeps a cell's arc length (the ring's
 * circumference divided by its sector count) close to the radial thickness —
 * otherwise cells would grow wider and wider (tangentially) than they are
 * tall (radially) as the radius increases, for a fixed sector count.
 */
export function computeCircleSectorCounts(
	width: number,
	height: number,
): number[] {
	const counts = [width];

	for (let ring = 1; ring < height; ring++) {
		const radius = ring;
		const circumference = 2 * Math.PI * radius;
		const previousCount = counts[ring - 1];
		const estimatedCellWidth = circumference / previousCount;
		const growthRatio = Math.max(
			1,
			Math.round(estimatedCellWidth / RADIAL_THICKNESS),
		);
		counts.push(previousCount * growthRatio);
	}

	return counts;
}

/**
 * The single cell in ring `ring - 1` that sector `sector` (in ring `ring`)
 * sits above — `null` for ring 0, which has no ring further in. A
 * proportional index mapping, so it stays correct no matter what integer
 * ratio `computeCircleSectorCounts` grew by between the two rings.
 */
export function inwardParent(
	sectorCounts: number[],
	ring: number,
	sector: number,
): number | null {
	if (ring === 0) return null;

	const innerCount = sectorCounts[ring - 1];
	const count = sectorCounts[ring];
	return Math.floor((sector * innerCount) / count);
}

/**
 * Every cell in ring `ring + 1` that sits below sector `sector` (in ring
 * `ring`) — the exact inverse of `inwardParent`: every sector this returns
 * reports `sector` as its own inward parent, and every outer-ring sector
 * appears in exactly one inner cell's list. Empty for the outermost ring,
 * which has no ring further out.
 */
export function outwardChildren(
	sectorCounts: number[],
	ring: number,
	sector: number,
): number[] {
	if (ring >= sectorCounts.length - 1) return [];

	const count = sectorCounts[ring];
	const outerCount = sectorCounts[ring + 1];
	const children: number[] = [];

	for (let outerSector = 0; outerSector < outerCount; outerSector++) {
		if (Math.floor((outerSector * count) / outerCount) === sector) {
			children.push(outerSector);
		}
	}

	return children;
}

/** The next sector clockwise, in the same ring, wrapping past the last one. */
export function cwSector(
	sectorCounts: number[],
	ring: number,
	sector: number,
): number {
	const count = sectorCounts[ring];
	return (sector + 1) % count;
}

/** The next sector counter-clockwise, in the same ring, wrapping past the first one. */
export function ccwSector(
	sectorCounts: number[],
	ring: number,
	sector: number,
): number {
	const count = sectorCounts[ring];
	return (sector - 1 + count) % count;
}
