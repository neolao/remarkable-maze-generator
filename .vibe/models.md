# Data models

## Maze
| Field | Type | Notes |
|---|---|---|
| width | number | grid width in cells — for `type: "circle"`, the number of angular sectors in the innermost ring |
| height | number | grid height in cells — for `type: "circle"`, the number of concentric rings |
| cells | Cell[][] | rows (`cells[y][x]`), one entry per grid cell; empty (`[]`) for `type: "circle"`, which carries its cell data in `circleCells` instead (see below and ADR 037) |
| type | MazeType | optional; `"rectangle"` (default), `"rectangle-crossing"`, or `"circle"`, set by `generateMaze()`, absent on hand-built mazes, see ADR 016, ADR 022, and ADR 037 |
| seed | number | optional; the resolved seed used to generate this maze, see ADR 016 |
| difficulty | number | optional; the resolved difficulty (1–5) used to generate this maze, see ADR 016 |
| algorithm | MazeAlgorithm | optional; the resolved generation algorithm used for this maze, defaults to `"growing-tree"`, see ADR 033 |
| crossings | MazeCrossing[] | optional; cells where a corridor tunnels through another's straight passage, only populated for `type: "rectangle-crossing"` — both axes are real, walkable connections, see ADR 024 |
| circleSectorCounts | number[] | optional; only set for `type: "circle"` — the number of sectors in each ring, ring 0 (innermost) first, see ADR 037 |
| circleCells | CircleCell[][] | optional; only set for `type: "circle"` — `circleCells[ring][sector]`, a variable number of sectors per ring so it doesn't fit the rectangular `cells` grid above, see ADR 037 |
Defined in: `packages/core/src/maze.ts`

## MazeType
String literal union: `"rectangle" | "rectangle-crossing" | "circle"`. `"circle"` is a real growing-sector topology entirely separate from the rectangular grid (ADR 037, superseding ADR 034's polar transposition of the rectangular grid). See `MAZE_TYPES`, `isValidMazeType()`, `invalidMazeTypeMessage()` (ADR 022, ADR 037).
Defined in: `packages/core/src/maze.ts`

## MazeAlgorithm
String literal union: `"growing-tree" | "kruskal" | "wilson" | "aldous-broder"`. `"growing-tree"` is the default and the only one supporting `type: "rectangle-crossing"` (bridge crossings are carved as part of its own traversal); all 4 algorithms support `type: "circle"` too, reimplemented against its growing-sector graph (see ADR 037). See `MAZE_ALGORITHMS`, `isValidMazeAlgorithm()`, `invalidMazeAlgorithmMessage()` (ADR 033).
Defined in: `packages/core/src/maze.ts`

## CircleCell
| Field | Type | Notes |
|---|---|---|
| cwOpen | boolean | whether the wall to this cell's clockwise neighbor (same ring) is open — the counter-clockwise neighbor's wall is read from *that* neighbor's own `cwOpen`, never duplicated |
| outwardOpen | boolean[] | one entry per outward child (in the next ring out), parallel to `outwardChildren(...)`'s order; there is no separate `inwardOpen` — a cell's inward wall is its parent's own matching `outwardOpen` entry |
Defined in: `packages/core/src/circle-maze/cells.ts` (see ADR 037)

## MazeCrossing
| Field | Type | Notes |
|---|---|---|
| x | number | column index of the crossing cell |
| y | number | row index of the crossing cell |
| underAxis | `"vertical" \| "horizontal"` | which axis was the pre-existing passage that got tunneled under — a rendering hint only; both axes are equally real and walkable, see ADR 024 |
Defined in: `packages/core/src/maze.ts` — never the entrance or exit cell, see ADR 024 (supersedes the decorative-only design of ADR 022)

## Cell
| Field | Type | Notes |
|---|---|---|
| walls | CellWalls | which of the 4 sides are walled off |
Defined in: `packages/core/src/maze.ts`

## CellWalls
| Field | Type | Notes |
|---|---|---|
| north | boolean | wall present on the north side |
| south | boolean | wall present on the south side |
| east | boolean | wall present on the east side |
| west | boolean | wall present on the west side |
Defined in: `packages/core/src/maze.ts`

## GenerateMazeOptions
| Field | Type | Notes |
|---|---|---|
| width | number | must be a positive integer |
| height | number | must be a positive integer |
| seed | number | same seed reproduces the same maze |
| difficulty | number | optional integer 1–5, defaults to 1 (easiest); controls branch-point density, see ADR 015 |
| type | MazeType | optional, defaults to `"rectangle"`, see ADR 022 |
| algorithm | MazeAlgorithm | optional, defaults to `"growing-tree"`; rejected if combined with `type: "rectangle-crossing"` and anything other than `"growing-tree"`, see ADR 033 |
Defined in: `packages/core/src/maze.ts`

## GenerateMazeBatchOptions
| Field | Type | Notes |
|---|---|---|
| width | number | must be a positive integer, shared by every maze in the batch |
| height | number | must be a positive integer, shared by every maze in the batch |
| seed | number | starting seed; maze at index i uses `seed + i` |
| count | number | must be a positive integer, number of mazes to generate |
| difficulty | number | optional integer 1–5, defaults to 1; applied to every maze in the batch, see ADR 015 |
| type | MazeType | optional, defaults to `"rectangle"`; applied to every maze in the batch, see ADR 022 |
| algorithm | MazeAlgorithm | optional, defaults to `"growing-tree"`; applied to every maze in the batch, see ADR 033 |
Defined in: `packages/core/src/maze.ts`

## MazePosition
| Field | Type | Notes |
|---|---|---|
| x | number | column index |
| y | number | row index |
Defined in: `packages/core/src/maze-solver.ts`

## RenderMazeToPdfOptions
| Field | Type | Notes |
|---|---|---|
| solution | SolutionDisplayMode | optional, defaults to `"none"` |
Defined in: `packages/core/src/maze-pdf.ts`

## LineSegment
| Field | Type | Notes |
|---|---|---|
| x1 | number | unit cell coordinates (cellSize=1), top-left origin, Y-down |
| y1 | number | |
| x2 | number | |
| y2 | number | |
Defined in: `packages/core/src/maze-layout.ts` — shared wall geometry consumed by both the PDF and SVG renderers, see ADR 019

## ArcSegment
| Field | Type | Notes |
|---|---|---|
| x1 | number | start point, same unit cell coordinates as `LineSegment` |
| y1 | number | |
| x2 | number | end point |
| y2 | number | |
| radius | number | unit cell coordinates |
| sweep | `0 \| 1` | SVG arc sweep-flag; `TubeSegment = LineSegment \| ArcSegment`, narrowed via the exported `isArcSegment()` type guard |
Defined in: `packages/core/src/maze-layout.ts` — used only for a `rectangle-crossing` tube's two rounded turn corners per cell, see ADR 030

## RenderMazeToSvgOptions
| Field | Type | Notes |
|---|---|---|
| cellSizePx | number | optional, defaults to 20 |
| showSolution | boolean | optional, defaults to false; traces the solution path in red with a red circle per branch point (from `findSolutionBranchPoints`), kept separate from `RenderMazeToPdfOptions.solution`, see ADR 028 |
Defined in: `packages/core/src/maze-svg.ts`

## RemarkableCredentials
| Field | Type | Notes |
|---|---|---|
| deviceToken | string | long-lived token obtained by pairing; never logged |
Defined in: `packages/core/src/remarkable-credential-store.ts`

## CredentialStore (interface)
| Method | Notes |
|---|---|
| `load(): Promise<RemarkableCredentials \| null>` | returns stored credentials, or null if never paired |
| `save(credentials): Promise<void>` | persists credentials; no built-in implementation ships in `core` (see ADR 007) |
Defined in: `packages/core/src/remarkable-credential-store.ts`

## RemarkableSession
Opaque type alias for `rmapi-js`'s `RemarkableApi` client instance (not a plain data object — callers should not introspect it, only pass it to `uploadPdf()`). Exposes `.uploadPdf(visibleName, buffer)` internally, among other `rmapi-js` methods.
Defined in: `packages/core/src/remarkable-auth.ts` (see ADR 012)

## RemarkableAuthOptions
Alias for `rmapi-js`'s `RemarkableOptions`.
| Field | Type | Notes |
|---|---|---|
| authHost | string | optional, injectable for testing; defaults to the real reMarkable auth host |
| uploadHost | string | optional, injectable for testing |
| rawHost | string | optional, injectable for testing |
Defined in: `packages/core/src/remarkable-auth.ts`

## UploadPdfOptions
| Field | Type | Notes |
|---|---|---|
| readFile | (path: string) => Promise\<Uint8Array\> | required, no default — caller supplies file access (e.g. `node:fs/promises.readFile`) |
| folder | string | optional; target reMarkable Cloud folder by name — must already exist, throws a clear error otherwise; resolved with throttled concurrency (15 at a time) to avoid connection exhaustion on accounts with many items, see ADR 013 |
Defined in: `packages/core/src/remarkable-upload.ts`

## GenerateOptions (CLI)
| Field | Type | Notes |
|---|---|---|
| width | number | maze width in cells |
| height | number | maze height in cells |
| seed | number | optional, defaults to a random value |
| difficulty | number | optional integer 1–5, defaults to 1 (see ADR 015) |
| type | string | optional, `"rectangle"` or `"rectangle-crossing"`, defaults to `"rectangle"` (see ADR 022) |
| output | string | optional, defaults to `./maze.pdf` (resolved against `cwd`) |
| cwd | string | optional, injectable for testing; defaults to `process.cwd()` |
Defined in: `packages/cli/src/generate.ts`

## SendOptions (CLI)
| Field | Type | Notes |
|---|---|---|
| filePath | string | local PDF file to upload; checked to exist before any prompt or network call |
| visibleName | string | optional, defaults to the file name without extension |
| folder | string | optional; forwarded to `core`'s `uploadPdf` — target folder must already exist |
| credentialsPath | string | optional, injectable for testing; defaults to `~/.config/remarkable-maze-generator/credentials.json` |
| promptPairingCode | () => Promise\<string\> | optional, injectable for testing; defaults to an interactive terminal prompt |
Defined in: `packages/cli/src/send.ts`

## MazeFormInput (web)
| Field | Type | Notes |
|---|---|---|
| width | string | raw form field value, parsed as a positive integer |
| height | string | raw form field value, parsed as a positive integer |
| difficulty | string | raw form field value, parsed as an integer 1–5 |
| type | string | optional raw form field value, defaults to `"rectangle"` when blank, validated via `core`'s `isValidMazeType` (see ADR 022) |
| solution | string | optional raw form field value, defaults to `"none"` when blank, validated via `core`'s `isValidSolutionMode` (see ADR 021; backlog item 019) |
Defined in: `packages/web/src/maze-form-validation.ts`

## MazeFormValidationResult (web)
Discriminated union: `{ valid: true; value: MazeFormValue }` or `{ valid: false; error: string }` (a human-readable message naming the invalid field).
Defined in: `packages/web/src/maze-form-validation.ts`

## MazeFormPreferences (web)
| Field | Type | Notes |
|---|---|---|
| width | string | raw form field value, as typed by the user |
| height | string | raw form field value |
| difficulty | string | raw form field value |
| type | string | raw form field value |
| algorithm | string | raw form field value |
| solution | string | raw form field value |
| showSolution | boolean | "Show solution on preview" checkbox state |
Round-tripped through a single cookie (`serializeFormPreferences`/`parseFormPreferences`); parsing rejects any value with a missing or wrong-typed field, returning `null` rather than a partial object (see ADR 042).
Defined in: `packages/web/src/form-preferences.ts`

## BuildServerOptions (web)
| Field | Type | Notes |
|---|---|---|
| credentialsPath | string | optional, injectable for testing; defaults to the same path as the CLI's credentials file (`~/.config/remarkable-maze-generator/credentials.json`), so pairing done via either surface is shared |
Defined in: `packages/web/src/server.ts`

## GenerateAndSendOptions (CLI)
| Field | Type | Notes |
|---|---|---|
| width | number | maze width in cells |
| height | number | maze height in cells |
| seed | number | optional, defaults to a random value |
| difficulty | number | optional integer 1–5, defaults to 1 (see ADR 015) |
| type | string | optional, `"rectangle"` or `"rectangle-crossing"`, defaults to `"rectangle"` (see ADR 022) |
| output | string | optional, defaults to `./maze.pdf` (resolved against `cwd`) |
| cwd | string | optional, injectable for testing; defaults to `process.cwd()` |
| visibleName | string | optional, defaults to `rectangle-<width>x<height>-<seed>` (see ADR 014) |
| folder | string | optional; forwarded to `core`'s `uploadPdf` — target folder must already exist |
| credentialsPath | string | optional, injectable for testing; defaults to `~/.config/remarkable-maze-generator/credentials.json` |
| promptPairingCode | () => Promise\<string\> | optional, injectable for testing; defaults to an interactive terminal prompt |
Defined in: `packages/cli/src/generate-and-send.ts`
