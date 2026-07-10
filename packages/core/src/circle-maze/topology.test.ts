import { describe, expect, it } from "vitest";
import {
	RADIAL_THICKNESS,
	ccwSector,
	computeCircleSectorCounts,
	computeHubRadius,
	cwSector,
	inwardParent,
	outwardChildren,
} from "./topology.js";

describe("computeCircleSectorCounts", () => {
	it("starts the innermost ring at the given width", () => {
		expect(computeCircleSectorCounts(8, 5)[0]).toBe(8);
	});

	it("returns exactly one entry per ring", () => {
		expect(computeCircleSectorCounts(8, 5)).toHaveLength(5);
	});

	it("returns a single entry for a 1-ring maze, unchanged", () => {
		expect(computeCircleSectorCounts(8, 1)).toEqual([8]);
	});

	it("never decreases the sector count from one ring to the next", () => {
		const counts = computeCircleSectorCounts(8, 20);

		for (let ring = 1; ring < counts.length; ring++) {
			expect(counts[ring]).toBeGreaterThanOrEqual(counts[ring - 1]);
		}
	});

	it("grows the sector count even starting from a single sector", () => {
		const counts = computeCircleSectorCounts(1, 10);

		expect(counts[counts.length - 1]).toBeGreaterThan(1);
	});

	// The actual point of growing the sector count at all: keep each cell's
	// arc length (circumference / sector count) from drifting too far from
	// the radial thickness (1 unit) as the radius increases.
	it("keeps each ring's cell arc length within a bounded ratio of the radial thickness (1 unit)", () => {
		for (const width of [1, 4, 8, 16]) {
			const counts = computeCircleSectorCounts(width, 40);
			const hubRadius = computeHubRadius(width);

			for (let ring = 1; ring < counts.length; ring++) {
				const radius = ring + hubRadius;
				const circumference = 2 * Math.PI * radius;
				const arcLength = circumference / counts[ring];

				expect(arcLength).toBeGreaterThan(0.35);
				expect(arcLength).toBeLessThan(2.1);
			}
		}
	});

	// The actual requirement this reference-inspired algorithm (see ADR 040)
	// guarantees, and the previous per-ring-independent formula did not: every
	// ring's sector count must be an exact integer multiple of the ring
	// inside it. Without this, a ring's cells don't line up with the cells of
	// the ring inside it — a child cell's boundary can land anywhere inside
	// its parent's angular span, including its middle, instead of always
	// starting exactly where a parent (or a whole number of parents) does.
	it("keeps every ring's sector count an exact integer multiple of the previous ring's", () => {
		for (const width of [1, 3, 4, 7, 8, 16]) {
			const counts = computeCircleSectorCounts(width, 20);

			for (let ring = 1; ring < counts.length; ring++) {
				expect(counts[ring] % counts[ring - 1]).toBe(0);
			}
		}
	});
});

describe("computeHubRadius", () => {
	it("imposes a minimum radius so the starting circle is never cramped", () => {
		expect(computeHubRadius(1)).toBe(RADIAL_THICKNESS);
		expect(computeHubRadius(3)).toBe(RADIAL_THICKNESS);
	});

	it("grows past the minimum once the width needs more circumference than it provides", () => {
		const width = 20;

		expect(computeHubRadius(width)).toBeCloseTo(
			(width * RADIAL_THICKNESS) / (2 * Math.PI),
			9,
		);
	});

	it("never returns less than the minimum, across a range of widths", () => {
		for (const width of [1, 2, 3, 4, 5, 6]) {
			expect(computeHubRadius(width)).toBeGreaterThanOrEqual(RADIAL_THICKNESS);
		}
	});
});

describe("inwardParent / outwardChildren", () => {
	it("returns null for the innermost ring (no ring further in)", () => {
		const counts = computeCircleSectorCounts(8, 5);

		expect(inwardParent(counts, 0, 3)).toBeNull();
	});

	it("returns an empty array for the outermost ring (no ring further out)", () => {
		const counts = computeCircleSectorCounts(8, 5);
		const lastRing = counts.length - 1;

		expect(outwardChildren(counts, lastRing, 0)).toEqual([]);
	});

	// The key correctness property: outward and inward are true inverses of
	// each other — every sector's inward parent must list that very sector
	// back among its own outward children.
	it("keeps inwardParent and outwardChildren as exact inverses of each other, at every ring boundary", () => {
		const counts = computeCircleSectorCounts(8, 15);

		for (let ring = 1; ring < counts.length; ring++) {
			for (let sector = 0; sector < counts[ring]; sector++) {
				const parent = inwardParent(counts, ring, sector);
				expect(parent).not.toBeNull();
				const children = outwardChildren(counts, ring - 1, parent as number);
				expect(children).toContain(sector);
			}
		}
	});

	it("partitions every outer sector across the inner ring's cells exactly once, with no gaps or overlaps", () => {
		const counts = computeCircleSectorCounts(8, 15);

		for (let ring = 0; ring < counts.length - 1; ring++) {
			const allChildren: number[] = [];
			for (let sector = 0; sector < counts[ring]; sector++) {
				allChildren.push(...outwardChildren(counts, ring, sector));
			}

			expect(allChildren.slice().sort((a, b) => a - b)).toEqual(
				Array.from({ length: counts[ring + 1] }, (_, index) => index),
			);
		}
	});
});

describe("cwSector / ccwSector", () => {
	it("wraps clockwise from the last sector back to sector 0", () => {
		const counts = computeCircleSectorCounts(6, 1);

		expect(cwSector(counts, 0, 5)).toBe(0);
	});

	it("wraps counter-clockwise from sector 0 back to the last sector", () => {
		const counts = computeCircleSectorCounts(6, 1);

		expect(ccwSector(counts, 0, 0)).toBe(5);
	});

	it("is the exact inverse of cwSector, for every sector in a ring", () => {
		const counts = computeCircleSectorCounts(8, 5);

		for (let ring = 0; ring < counts.length; ring++) {
			for (let sector = 0; sector < counts[ring]; sector++) {
				const next = cwSector(counts, ring, sector);
				expect(ccwSector(counts, ring, next)).toBe(sector);
			}
		}
	});

	it("wraps a lone sector (ring of size 1) back onto itself", () => {
		const counts = computeCircleSectorCounts(1, 1);

		expect(cwSector(counts, 0, 0)).toBe(0);
		expect(ccwSector(counts, 0, 0)).toBe(0);
	});
});
