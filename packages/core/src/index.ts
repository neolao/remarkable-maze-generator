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
} from "./maze.js";
export {
	MAX_PATH_LENGTH_CANDIDATE_COUNT,
	MAZE_ALGORITHMS,
	MAZE_TYPES,
	PATH_LENGTH_MAX_ATTEMPTS,
	PATH_LENGTH_TARGETS,
	generateMaze,
	invalidMazeAlgorithmMessage,
	invalidMazeTypeMessage,
	invalidPathLengthTargetMessage,
	isValidMazeAlgorithm,
	isValidMazeType,
	isValidPathLengthTarget,
} from "./maze.js";
export type { MazePosition } from "./maze-solver.js";
export { findSolutionBranchPoints, solveMaze } from "./maze-solver.js";
export type {
	RenderMazeToPdfOptions,
	SolutionDisplayMode,
} from "./maze-pdf.js";
export {
	REMARKABLE_2_PAGE_HEIGHT_PT,
	REMARKABLE_2_PAGE_WIDTH_PT,
	SOLUTION_MODES,
	invalidSolutionModeMessage,
	isValidSolutionMode,
	renderMazeToPdf,
} from "./maze-pdf.js";
export type { RenderMazeToSvgOptions } from "./maze-svg.js";
export { renderMazeToSvg } from "./maze-svg.js";
export type {
	CredentialStore,
	RemarkableCredentials,
} from "./remarkable-credential-store.js";
export type {
	RemarkableAuthOptions,
	RemarkableSession,
} from "./remarkable-auth.js";
export { authenticate } from "./remarkable-auth.js";
export type { UploadPdfOptions } from "./remarkable-upload.js";
export { uploadPdf } from "./remarkable-upload.js";
