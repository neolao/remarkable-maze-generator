export const CORE_VERSION = "0.1.0";

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
	renderMazeBatchToPdf,
	renderMazeBatchToPdfs,
	renderMazeToPdf,
} from "./maze-pdf.js";
export type {
	CredentialStore,
	RemarkableCredentials,
} from "./remarkable-credential-store.js";
export type {
	RemarkableAuthOptions,
	RemarkableSession,
} from "./remarkable-auth.js";
export {
	authenticate,
	refreshUserToken,
	registerDevice,
} from "./remarkable-auth.js";
