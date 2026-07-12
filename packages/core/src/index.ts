import pkg from "../package.json" with { type: "json" };

export const CORE_VERSION = pkg.version;

export type {
	Cell,
	CellWalls,
	GenerateMazeOptions,
	Maze,
	MazeAlgorithm,
	MazeCrossing,
	MazeType,
	PathLengthTarget,
} from "./maze-domain.js";
export {
	MAX_PATH_LENGTH_CANDIDATE_COUNT,
	MAZE_ALGORITHMS,
	MAZE_TYPES,
	PATH_LENGTH_MAX_ATTEMPTS,
	PATH_LENGTH_TARGETS,
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidPathLengthTargetMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidPathLengthTarget,
} from "./maze-domain.js";
export { generateMaze } from "./maze.js";
export type { MazePosition } from "./maze-solver.js";
export { findSolutionBranchPoints, solveMaze } from "./maze-solver.js";
export type {
	RenderMazeToPdfOptions,
	SolutionDisplayMode,
} from "./rendering/maze-pdf.js";
export {
	REMARKABLE_2_PAGE_HEIGHT_PT,
	REMARKABLE_2_PAGE_WIDTH_PT,
	SOLUTION_MODES,
	invalidSolutionModeMessage,
	isValidSolutionMode,
	renderMazeToPdf,
} from "./rendering/maze-pdf.js";
export type { RenderMazeToSvgOptions } from "./rendering/maze-svg.js";
export { renderMazeToSvg } from "./rendering/maze-svg.js";
export type {
	CredentialStore,
	RemarkableCredentials,
} from "./infrastructure/remarkable/remarkable-credential-store.js";
export type {
	RemarkableAuthOptions,
	RemarkableSession,
} from "./infrastructure/remarkable/remarkable-auth.js";
export { authenticate } from "./infrastructure/remarkable/remarkable-auth.js";
export type { UploadPdfOptions } from "./infrastructure/remarkable/remarkable-upload.js";
export { uploadPdf } from "./infrastructure/remarkable/remarkable-upload.js";
