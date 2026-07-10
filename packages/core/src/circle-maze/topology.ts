// A real circular ("theta") maze topology (see ADR 037): unlike the
// rectangular grid, this is not a uniform 2D array — the number of sectors
// grows ring by ring, so a cell's neighbor count varies (an inner cell may
// have several outward children; every outer cell has exactly one inward
// parent). Kept entirely separate from the rectangular grid and its
// north/south/east/west model — the two topologies don't share code.

// Ring boundaries sit at radius `ring + hubRadius` (inner) / `ring + 1 +
// hubRadius` (outer), a constant 1-unit radial thickness throughout — see
// `computeHubRadius` for why ring 0's inner edge is not the exact center
// point.
export const RADIAL_THICKNESS = 1;

// The hub is never smaller than one ring's own radial thickness — otherwise
// a small starting `width` (few sectors, but each one still needs real
// circumference to sit in) would cramp the entrance into a barely-visible
// dot. See `computeHubRadius`.
const MIN_HUB_RADIUS = RADIAL_THICKNESS;

/**
 * The radius of the entrance "hub" boundary around the center — and, by
 * extension, how far outward the whole ring stack is pushed to make room for
 * it (every ring's actual radius is `ring index + this value`). Ring 0 always
 * has exactly `width` sectors (the maze's own starting sector count is a
 * parameter, not derived), so its own cell arc length only matches the
 * radial thickness if its radius is chosen to fit that width's circumference
 * — solving `2 * PI * radius / width = RADIAL_THICKNESS` for `radius` gives
 * this formula. Clamped to `MIN_HUB_RADIUS` for small widths, where that
 * radius would otherwise be smaller than a single ring's own thickness.
 */
export function computeHubRadius(width: number): number {
	return Math.max(MIN_HUB_RADIUS, (width * RADIAL_THICKNESS) / (2 * Math.PI));
}

/**
 * The number of sectors in each ring, ring 0 (innermost) first. Ring 0 always
 * has exactly `width` sectors. Every further ring's sector count is the
 * previous ring's count multiplied by a rounded integer ratio, chosen to keep
 * that ring's own cell arc length (circumference / sector count, evaluated at
 * `ring index + computeHubRadius(width)`) close to the radial thickness. This
 * is deliberately an exact multiple rather than an independently-computed
 * count (see ADR 040, which supersedes ADR 038's independent-per-ring
 * formula): it guarantees every child cell's boundary lines up exactly with
 * its parent's — either the parent's own start angle, or an exact fraction of
 * its span — instead of landing at an arbitrary rounded position inside it.
 * Matches the reference algorithm at github.com/codebox/maze.js.
 */
export function computeCircleSectorCounts(
	width: number,
	height: number,
): number[] {
	const counts = [width];
	const hubRadius = computeHubRadius(width);

	for (let ring = 1; ring < height; ring++) {
		const radius = ring + hubRadius;
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
