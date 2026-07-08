# Data models

## Maze
| Field | Type | Notes |
|---|---|---|
| width | number | grid width in cells |
| height | number | grid height in cells |
| cells | Cell[][] | rows (`cells[y][x]`), one entry per grid cell |
Defined in: `packages/core/src/maze.ts`

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
Defined in: `packages/core/src/maze.ts`

## GenerateMazeBatchOptions
| Field | Type | Notes |
|---|---|---|
| width | number | must be a positive integer, shared by every maze in the batch |
| height | number | must be a positive integer, shared by every maze in the batch |
| seed | number | starting seed; maze at index i uses `seed + i` |
| count | number | must be a positive integer, number of mazes to generate |
| difficulty | number | optional integer 1–5, defaults to 1; applied to every maze in the batch, see ADR 015 |
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

## GenerateAndSendOptions (CLI)
| Field | Type | Notes |
|---|---|---|
| width | number | maze width in cells |
| height | number | maze height in cells |
| seed | number | optional, defaults to a random value |
| difficulty | number | optional integer 1–5, defaults to 1 (see ADR 015) |
| output | string | optional, defaults to `./maze.pdf` (resolved against `cwd`) |
| cwd | string | optional, injectable for testing; defaults to `process.cwd()` |
| visibleName | string | optional, defaults to `rectangle-<width>x<height>-<seed>` (see ADR 014) |
| folder | string | optional; forwarded to `core`'s `uploadPdf` — target folder must already exist |
| credentialsPath | string | optional, injectable for testing; defaults to `~/.config/remarkable-maze-generator/credentials.json` |
| promptPairingCode | () => Promise\<string\> | optional, injectable for testing; defaults to an interactive terminal prompt |
Defined in: `packages/cli/src/generate-and-send.ts`
