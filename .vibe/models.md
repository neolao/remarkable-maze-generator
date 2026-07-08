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
Defined in: `packages/core/src/maze.ts`

## GenerateMazeBatchOptions
| Field | Type | Notes |
|---|---|---|
| width | number | must be a positive integer, shared by every maze in the batch |
| height | number | must be a positive integer, shared by every maze in the batch |
| seed | number | starting seed; maze at index i uses `seed + i` |
| count | number | must be a positive integer, number of mazes to generate |
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
