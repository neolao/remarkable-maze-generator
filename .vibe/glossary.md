# Ubiquitous Language

## Maze
**Definition:** A single generated puzzle: a grid or ring/sector structure of cells connected so that exactly one path exists between its Entrance and Exit, plus the metadata needed to reproduce and describe it (seed, difficulty, maze type, generation algorithm, and any bridge crossings).
**Code:** `Maze` in `packages/core/src/maze-domain.ts`, `generateMaze()` in `packages/core/src/maze.ts` (see ADR 050)
**Do not confuse with:** —

## Cell
**Definition:** The smallest unit of a Maze — for a `rectangle`/`rectangle-crossing` maze, one square in the width×height grid, described by which of its four sides (north/south/east/west) are open or walled; for a `circle` maze, one ring/sector position with its own set of open/closed sides instead.
**Code:** `Cell`, `CellWalls` in `packages/core/src/maze-domain.ts` (see ADR 050)
**Do not confuse with:** —

## Entrance
**Definition:** The fixed starting cell of the Maze that the Solution path begins from — cell `(0, 0)` for `rectangle`/`rectangle-crossing` mazes, and the center hub for a `circle` maze. Always drawn with a visible opening on the printed page.
**Code:** fixed at cell `(0, 0)`, used in `solveMaze()` in `packages/core/src/maze-solver.ts`
**Do not confuse with:** Exit

## Exit
**Definition:** The fixed target cell of the Maze that the Solution path ends at — cell `(width - 1, height - 1)` for `rectangle`/`rectangle-crossing` mazes, and sector 0 of the outermost ring for a `circle` maze. Always drawn with a visible opening on the printed page.
**Code:** fixed at cell `(width - 1, height - 1)`, used in `solveMaze()` in `packages/core/src/maze-solver.ts`
**Do not confuse with:** Entrance

## Solution path
**Definition:** The unique sequence of cells connecting the Entrance to the Exit, found by walking the maze's open walls. At a Bridge crossing cell, the path may only continue along the axis it entered on — it can never turn onto the other passage, even though both are real, walkable connections.
**Code:** `solveMaze()`, `MazePosition[]` in `packages/core/src/maze-solver.ts`
**Do not confuse with:** —

## Difficulty
**Definition:** An integer knob from 1 (easiest) to 5 (hardest) that biases the growing-tree generation algorithm's cell-selection strategy to produce more or fewer Branch points along the way — it tunes branch-point density, not the maze's width/height. Only the `growing-tree` Generation algorithm currently reads this value; the other three algorithms ignore it.
**Code:** `difficulty` field of `GenerateMazeOptions`, integer 1–5, in `packages/core/src/maze-domain.ts` (see ADR 015, ADR 050)
**Do not confuse with:** —

## Maze type
**Definition:** The shape and rendering family of a Maze's cell topology: `rectangle` (a classic square grid with thin single-line walls), `rectangle-crossing` (the same square grid, but drawn as hollow tube-shaped corridors and able to carry Bridge crossings), or `circle` (a growing-sector ring topology with no rectangular grid underneath at all, solved and rendered by its own dedicated code).
**Code:** `MazeType`, `MAZE_TYPES`, `type` field of `Maze` / `GenerateMazeOptions`, in `packages/core/src/maze-domain.ts` (see ADR 022, ADR 037, ADR 050)
**Do not confuse with:** Difficulty

## Branch point
**Definition:** A cell on the Solution path where more than the two directions used to enter and leave were actually open — i.e. the solver had a real alternative direction available, even though it didn't take it. The Entrance and Exit are never counted, since they are endpoints rather than something the path "passes through". For a `rectangle`/`rectangle-crossing` maze this means a path cell with 3+ open walls; for a `circle` maze, a ring/sector cell with more than one available inward/outward/lateral move. A Bridge crossing cell is never flagged as a branch point even with all four sides open, since the solver's axis lock (see "Solution path") already rules out the other passage as a real choice.
**Code:** `findSolutionBranchPoints()` in `packages/core/src/maze-solver.ts`
**Do not confuse with:** Bridge crossing (a bridge-crossing cell is never itself a branch point, since the solver's axis lock removes the alternative direction — see ADR 024 and ADR 028)

## Bridge crossing
**Definition:** A cell in a `rectangle-crossing` maze where two independent, real, walkable passages tunnel through each other without connecting — one axis is the pre-existing straight passage being tunneled under (recorded as the crossing's `underAxis`, purely a rendering hint), the other is the new passage carved through it. Both axes stay genuine spanning-tree edges, so the maze keeps its single-solution guarantee; only the `growing-tree` algorithm can produce them.
**Code:** `MazeCrossing` in `packages/core/src/maze-domain.ts`, `crossings` field of `Maze`, `computeCrossingBridgeSegments()` / `computePathSegments()` in `packages/core/src/rendering/maze-layout.ts` (see ADR 022, ADR 023, ADR 050, ADR 051)
**Do not confuse with:** —

## Generation algorithm
**Definition:** The strategy used to carve a Maze's spanning tree of connected cells: `growing-tree` (the original algorithm — difficulty-tunable via selection bias, and the only one able to produce Bridge crossings), `kruskal` (randomized Kruskal's over shuffled edges via union-find), `wilson` (loop-erased random walk, a true uniform spanning tree), or `aldous-broder` (plain random walk until every cell is visited, also a true uniform spanning tree but slower to converge). Each maze type re-implements every algorithm against its own cell/graph model rather than sharing code between `rectangle`/`rectangle-crossing` and `circle`.
**Code:** `MazeAlgorithm`, `MAZE_ALGORITHMS`, `algorithm` field of `Maze` / `GenerateMazeOptions`, in `packages/core/src/maze-domain.ts` (see ADR 033, ADR 050); each algorithm implemented in its own module under `packages/core/src/maze-algorithms/`
**Do not confuse with:** Maze type, Difficulty

## Path length target
**Definition:** An optional `short`/`medium`/`long` request that, instead of accepting whatever Solution path length a single generation happens to produce, generates several full candidate mazes from incrementing seeds and keeps whichever one's solution length best matches the target (shortest for `short`, longest for `long`, closest to the lower median for `medium`) — across any maze type/algorithm combination. Unset, generation is unchanged: a single seed, no filtering.
**Code:** `PathLengthTarget`, `PATH_LENGTH_TARGETS`, `pathLength` field of `Maze` / `GenerateMazeOptions`, in `packages/core/src/maze-domain.ts` (see ADR 046, ADR 050)
**Do not confuse with:** Difficulty (difficulty tunes branch-point density during generation; path length target instead selects, after the fact, among several full generations, whichever one's solution length best matches)

## Ring
**Definition:** A concentric band of cells in a `circle` maze, at a fixed radial distance from the center hub — ring 0 is innermost, adjacent to the Entrance hub, and the outermost ring is adjacent to the Exit boundary. Every ring has a fixed 1-unit radial thickness, but its own Sector count grows the further out it sits, so a ring is not directly comparable to a row in a rectangular grid.
**Code:** `ring` index, `CircleNode`, `sectorCounts` in `packages/core/src/circle-maze/` (see ADR 037)
**Do not confuse with:** Sector

## Sector
**Definition:** One angular slot within a Ring of a `circle` maze — the circle-maze equivalent of a column, except the number of sectors is not constant across rings. Ring 0 always has exactly `width` sectors; every ring further out multiplies that count by a rounded integer ratio chosen to keep each cell's arc length close to the ring's own radial thickness, and is always an exact multiple of the ring just inside it so cell boundaries line up cleanly from one ring to the next.
**Code:** `sector` index, `CircleNode` in `packages/core/src/circle-maze/` (see ADR 037)
**Do not confuse with:** Ring

## Pairing code
**Definition:** A short, one-time code the user generates from `my.remarkable.com/device/browser/connect` and supplies to this app to link it to their reMarkable account. It is only consumed once, to register a new Device token — it is never stored, and an invalid or expired code surfaces a clear error pointing back to that pairing page.
**Code:** `pairingCode` parameter of `authenticate()` in `packages/core/src/infrastructure/remarkable/remarkable-auth.ts` (see ADR 052)
**Do not confuse with:** Device token

## Device token
**Definition:** The long-lived credential obtained once by exchanging a Pairing code with reMarkable Cloud, persisted locally via a `CredentialStore` so the app never has to ask the user to re-pair. Every future session exchanges this same device token for a fresh, short-lived User token — the device token itself is never sent directly on API calls.
**Code:** `RemarkableCredentials.deviceToken` in `packages/core/src/infrastructure/remarkable/remarkable-credential-store.ts` (see ADR 052)
**Do not confuse with:** User token, Pairing code

## User token
**Definition:** A short-lived session credential obtained by exchanging the Device token at the start of each authenticated session, and used as the bearer token on every subsequent reMarkable Cloud API call (uploading a PDF, listing folders, etc.). Unlike the device token, it is never persisted — it is re-derived each time the app authenticates.
**Code:** exchanged internally from the device token by `rmapi-js`'s `remarkable()`/`auth()` when `authenticate()` builds a `RemarkableSession` in `packages/core/src/infrastructure/remarkable/remarkable-auth.ts` (see ADR 052); not a field this codebase names directly, since `RemarkableSession` is an opaque `rmapi-js` client instance
**Do not confuse with:** Device token
