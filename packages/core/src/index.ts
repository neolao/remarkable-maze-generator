export const CORE_VERSION = "0.3.0";

export type {
	Cell,
	CellWalls,
	GenerateMazeBatchOptions,
	GenerateMazeOptions,
	Maze,
} from "./maze.js";
export { generateMaze, generateMazeBatch } from "./maze.js";
export type { MazePosition } from "./maze-solver.js";
export { solveMaze } from "./maze-solver.js";
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
	renderMazeBatchToPdf,
	renderMazeBatchToPdfs,
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
