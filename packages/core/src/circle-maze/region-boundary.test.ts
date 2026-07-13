import { describe, expect, it } from "vitest";
import {
	type PolarBoundaryEdge,
	type PolarRect,
	computePolarRegionBoundary,
} from "./region-boundary.js";

const EPSILON = 1e-9;

function rect(
	rStart: number,
	rEnd: number,
	aStart: number,
	aEnd: number,
): PolarRect {
	return { rStart, rEnd, aStart, aEnd };
}

function arc(radius: number, aStart: number, aEnd: number): PolarBoundaryEdge {
	return { kind: "arc", radius, aStart, aEnd };
}

function radial(
	angle: number,
	rStart: number,
	rEnd: number,
): PolarBoundaryEdge {
	return { kind: "radial", angle, rStart, rEnd };
}

function sameEdge(a: PolarBoundaryEdge, b: PolarBoundaryEdge): boolean {
	if (a.kind !== b.kind) return false;
	if (a.kind === "arc" && b.kind === "arc") {
		return (
			Math.abs(a.radius - b.radius) < EPSILON &&
			Math.abs(a.aStart - b.aStart) < EPSILON &&
			Math.abs(a.aEnd - b.aEnd) < EPSILON
		);
	}
	if (a.kind === "radial" && b.kind === "radial") {
		return (
			Math.abs(a.angle - b.angle) < EPSILON &&
			Math.abs(a.rStart - b.rStart) < EPSILON &&
			Math.abs(a.rEnd - b.rEnd) < EPSILON
		);
	}
	return false;
}

function expectEdgesToMatch(
	actual: PolarBoundaryEdge[],
	expected: PolarBoundaryEdge[],
): void {
	expect(actual).toHaveLength(expected.length);
	for (const edge of expected) {
		const found = actual.some((candidate) => sameEdge(candidate, edge));
		expect(
			found,
			`missing edge ${JSON.stringify(edge)} in ${JSON.stringify(actual)}`,
		).toBe(true);
	}
}

describe("computePolarRegionBoundary", () => {
	it("returns an empty list when given no rectangles", () => {
		expect(computePolarRegionBoundary([])).toEqual([]);
	});

	it("returns the four boundary edges of a single rectangle", () => {
		const edges = computePolarRegionBoundary([rect(1, 2, 0.5, 1.5)]);

		expectEdgesToMatch(edges, [
			arc(1, 0.5, 1.5),
			arc(2, 0.5, 1.5),
			radial(0.5, 1, 2),
			radial(1.5, 1, 2),
		]);
	});

	it("merges two rectangles sharing a full edge into one outline", () => {
		const edges = computePolarRegionBoundary([
			rect(1, 2, 0.5, 1.0),
			rect(1, 2, 1.0, 1.5),
		]);

		// No radial edge at the shared angle 1.0, and each pair of collinear
		// arc pieces is merged back into a single edge.
		expectEdgesToMatch(edges, [
			arc(1, 0.5, 1.5),
			arc(2, 0.5, 1.5),
			radial(0.5, 1, 2),
			radial(1.5, 1, 2),
		]);
	});

	it("merges radially stacked rectangles into one outline", () => {
		const edges = computePolarRegionBoundary([
			rect(1, 2, 0.5, 1.5),
			rect(2, 3, 0.5, 1.5),
		]);

		expectEdgesToMatch(edges, [
			arc(1, 0.5, 1.5),
			arc(3, 0.5, 1.5),
			radial(0.5, 1, 3),
			radial(1.5, 1, 3),
		]);
	});

	it("draws a forced wall through the interior of a merged region", () => {
		const edges = computePolarRegionBoundary(
			[rect(1, 2, 0, 2)],
			[],
			[{ kind: "radial", angle: 1, rStart: 1, rEnd: 2 }],
		);

		expectEdgesToMatch(edges, [
			arc(1, 0, 2),
			arc(2, 0, 2),
			radial(0, 1, 2),
			radial(1, 1, 2), // the forced wall, inside the region.
			radial(2, 1, 2),
		]);
	});

	it("merges a forced wall collinear with a natural boundary edge", () => {
		const edges = computePolarRegionBoundary(
			[rect(1, 2, 0, 1)],
			[],
			[{ kind: "radial", angle: 0, rStart: 2, rEnd: 3 }],
		);

		expectEdgesToMatch(edges, [
			arc(1, 0, 1),
			arc(2, 0, 1),
			radial(0, 1, 3), // natural [1,2] merged with forced [2,3].
			radial(1, 1, 2),
		]);
	});

	it("merges a forced arc bridging two natural arcs into one edge", () => {
		const edges = computePolarRegionBoundary(
			[rect(1, 2, 0, 1), rect(1, 2, 2, 3)],
			[],
			[{ kind: "arc", radius: 1, aStart: 1, aEnd: 2 }],
		);

		expectEdgesToMatch(edges, [
			arc(1, 0, 3), // natural [0,1] + forced [1,2] + natural [2,3].
			arc(2, 0, 1),
			arc(2, 2, 3),
			radial(0, 1, 2),
			radial(1, 1, 2),
			radial(2, 1, 2),
			radial(3, 1, 2),
		]);
	});

	it("suppresses the boundary cap covered by an opening", () => {
		const edges = computePolarRegionBoundary(
			[rect(1, 2, 0.5, 1.5)],
			[{ radius: 1, aStart: 0.5, aEnd: 1.5 }],
		);

		expectEdgesToMatch(edges, [
			arc(2, 0.5, 1.5),
			radial(0.5, 1, 2),
			radial(1.5, 1, 2),
		]);
	});

	it("suppresses only the covered span of a boundary cap, not the whole arc", () => {
		const edges = computePolarRegionBoundary(
			[rect(1, 2, 0, 3)],
			[{ radius: 1, aStart: 1, aEnd: 2 }],
		);

		expectEdgesToMatch(edges, [
			arc(1, 0, 1),
			arc(1, 2, 3),
			arc(2, 0, 3),
			radial(0, 1, 2),
			radial(3, 1, 2),
		]);
	});

	it("connects two rectangles meeting across the 0/2pi seam without a spurious wall", () => {
		const edges = computePolarRegionBoundary([
			rect(1, 2, 5.5, 2 * Math.PI),
			rect(1, 2, 0, 0.5),
		]);

		expectEdgesToMatch(edges, [
			arc(1, 5.5, 2 * Math.PI),
			arc(2, 5.5, 2 * Math.PI),
			arc(1, 0, 0.5),
			arc(2, 0, 0.5),
			radial(5.5, 1, 2),
			radial(0.5, 1, 2),
		]);
	});

	it("traces a hole in the region as an inner boundary", () => {
		const edges = computePolarRegionBoundary([
			rect(1, 2, 0, 3),
			rect(3, 4, 0, 3),
			rect(2, 3, 0, 1),
			rect(2, 3, 2, 3),
		]);

		// Outer outline plus the hole [2,3]x[1,2] traced on all four sides.
		expectEdgesToMatch(edges, [
			arc(1, 0, 3),
			arc(4, 0, 3),
			radial(0, 1, 4),
			radial(3, 1, 4),
			arc(2, 1, 2),
			arc(3, 1, 2),
			radial(1, 2, 3),
			radial(2, 2, 3),
		]);
	});

	it("covers the full circle with no radial edges when rectangles form a closed annulus", () => {
		const edges = computePolarRegionBoundary([
			rect(1, 2, 0, Math.PI),
			rect(1, 2, Math.PI, 2 * Math.PI),
		]);

		// Collinear merging turns each radius's pieces into one full-circle arc.
		expectEdgesToMatch(edges, [arc(1, 0, 2 * Math.PI), arc(2, 0, 2 * Math.PI)]);
	});

	it("merges overlapping rectangles without any interior edge", () => {
		const edges = computePolarRegionBoundary([
			rect(1, 2, 0, 2),
			rect(1, 2, 1, 3),
		]);

		expectEdgesToMatch(edges, [
			arc(1, 0, 3),
			arc(2, 0, 3),
			radial(0, 1, 2),
			radial(3, 1, 2),
		]);
	});

	it("throws when a rectangle has inverted radial bounds", () => {
		expect(() => computePolarRegionBoundary([rect(2, 1, 0, 1)])).toThrow(
			/inverted/i,
		);
	});

	it("throws when a rectangle has inverted angular bounds", () => {
		expect(() => computePolarRegionBoundary([rect(1, 2, 1, 0)])).toThrow(
			/inverted/i,
		);
	});
});
