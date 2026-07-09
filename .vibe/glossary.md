# Ubiquitous Language

## Maze
**Definition:** [what this concept means in the domain — fill in]
**Code:** `Maze`, `generateMaze()` in `packages/core/src/maze.ts`
**Do not confuse with:** —

## Cell
**Definition:** [what this concept means in the domain — fill in]
**Code:** `Cell`, `CellWalls` in `packages/core/src/maze.ts`
**Do not confuse with:** —

## Entrance
**Definition:** [what this concept means in the domain — fill in]
**Code:** fixed at cell `(0, 0)`, used in `solveMaze()` in `packages/core/src/maze-solver.ts`
**Do not confuse with:** Exit

## Exit
**Definition:** [what this concept means in the domain — fill in]
**Code:** fixed at cell `(width - 1, height - 1)`, used in `solveMaze()` in `packages/core/src/maze-solver.ts`
**Do not confuse with:** Entrance

## Solution path
**Definition:** [what this concept means in the domain — fill in]
**Code:** `solveMaze()`, `MazePosition[]` in `packages/core/src/maze-solver.ts`
**Do not confuse with:** —

## Difficulty
**Definition:** [what this concept means in the domain — fill in]
**Code:** `difficulty` field of `GenerateMazeOptions` / `GenerateMazeBatchOptions`, integer 1–5, in `packages/core/src/maze.ts` (see ADR 015)
**Do not confuse with:** —

## Maze type
**Definition:** [what this concept means in the domain — fill in]
**Code:** `MazeType`, `MAZE_TYPES`, `type` field of `Maze` / `GenerateMazeOptions`, in `packages/core/src/maze.ts` (see ADR 022)
**Do not confuse with:** Difficulty

## Bridge crossing
**Definition:** [what this concept means in the domain — fill in]
**Code:** `MazeCrossing`, `crossings` field of `Maze`, `computeCrossingBridgeSegments()` / `computePathSegments()` in `packages/core/src/maze.ts` / `maze-layout.ts` (see ADR 022 and ADR 023)
**Do not confuse with:** —

## Pairing code
**Definition:** [what this concept means in the domain — fill in]
**Code:** `pairingCode` parameter of `registerDevice()` / `authenticate()` in `packages/core/src/remarkable-auth.ts`
**Do not confuse with:** Device token

## Device token
**Definition:** [what this concept means in the domain — fill in]
**Code:** `RemarkableCredentials.deviceToken` in `packages/core/src/remarkable-credential-store.ts`
**Do not confuse with:** User token, Pairing code

## User token
**Definition:** [what this concept means in the domain — fill in]
**Code:** `RemarkableSession.userToken` in `packages/core/src/remarkable-auth.ts`
**Do not confuse with:** Device token
