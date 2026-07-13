import {
	computeCircleCellCenter,
	computeCircleMazeDiameter,
	computeCircleMazeSegments,
	computeCircleSolutionPoints,
	computeCircleTubeFillShapes,
	computeCircleTubeSegments,
} from "../circle-maze/render.js";
import type { Maze, MazeType } from "../maze-domain.js";
import type { MazePosition } from "../maze-solver.js";
import type { TubeSegment } from "./maze-layout.js";
import {
	computeCellCenter,
	computeTubeFillRects,
	computeTubeSegments,
	computeWallSegments,
	fillRectToClosedShape,
} from "./maze-layout.js";

export interface MazeRenderStrategy {
	logicalSize(maze: Maze): { width: number; height: number };
	segments(maze: Maze): TubeSegment[];
	roundedCaps: boolean;
	cellCenter(maze: Maze, position: MazePosition): MazePosition;
	solutionPoints(maze: Maze, path: MazePosition[]): MazePosition[];
	// Only defined for the two tube types (see ADR 060) — each returned shape
	// is an independent closed loop meant to be filled with a single flat
	// color before `segments()`'s outline is drawn on top of it.
	fillShapes?(maze: Maze): TubeSegment[][];
}

function circleLike(maze: Maze) {
	return {
		sectorCounts: maze.circleSectorCounts ?? [],
		cells: maze.circleCells ?? [],
		crossings: maze.circleCrossings ?? [],
	};
}

const rectangleStrategy: MazeRenderStrategy = {
	logicalSize: (maze) => ({ width: maze.width, height: maze.height }),
	segments: (maze) => computeWallSegments(maze),
	roundedCaps: false,
	cellCenter: (_maze, position) => computeCellCenter(position),
	solutionPoints: (_maze, path) =>
		path.map((position) => computeCellCenter(position)),
};

const rectangleCrossingStrategy: MazeRenderStrategy = {
	...rectangleStrategy,
	segments: (maze) => computeTubeSegments(maze),
	roundedCaps: true,
	fillShapes: (maze) => computeTubeFillRects(maze).map(fillRectToClosedShape),
};

const circleStrategy: MazeRenderStrategy = {
	logicalSize: (maze) => {
		const diameter = computeCircleMazeDiameter(circleLike(maze));
		return { width: diameter, height: diameter };
	},
	segments: (maze) => computeCircleMazeSegments(circleLike(maze)),
	roundedCaps: false,
	cellCenter: (maze, position) =>
		computeCircleCellCenter(circleLike(maze), {
			ring: position.y,
			sector: position.x,
		}),
	solutionPoints: (maze, path) =>
		computeCircleSolutionPoints(
			circleLike(maze),
			path.map((position) => ({ ring: position.y, sector: position.x })),
		),
};

const circleCrossingStrategy: MazeRenderStrategy = {
	...circleStrategy,
	segments: (maze) => computeCircleTubeSegments(circleLike(maze)),
	roundedCaps: true,
	fillShapes: (maze) => computeCircleTubeFillShapes(circleLike(maze)),
};

// The single registration point for how each maze type is laid out and
// drawn — replacing the duplicated `maze.type === "circle"` /
// `"rectangle-crossing"` branches that used to live independently in
// maze-pdf.ts and maze-svg.ts (see ADR 049).
const MAZE_RENDER_STRATEGIES: Record<MazeType, MazeRenderStrategy> = {
	rectangle: rectangleStrategy,
	"rectangle-crossing": rectangleCrossingStrategy,
	circle: circleStrategy,
	"circle-crossing": circleCrossingStrategy,
};

export function getMazeRenderStrategy(maze: Maze): MazeRenderStrategy {
	return MAZE_RENDER_STRATEGIES[maze.type ?? "rectangle"];
}
