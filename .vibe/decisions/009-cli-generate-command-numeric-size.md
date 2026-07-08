---
date: 2026-07-08
status: accepted
---
# CLI generate command uses numeric width/height, not named presets

**Context:** The first user-facing CLI command needs to let the user choose the maze's size. Two natural options were possible: free numeric `--width`/`--height` flags, or named presets like `--size small|medium|large`.

**Decision:** Use numeric `--width` and `--height` options. Invalid values (non-numeric, zero, negative) produce a clear CLI error and a non-zero exit code — delegating the actual dimension validation to `generateMaze` in `core` rather than duplicating it in the CLI.

**Reason:** Confirmed with the user: free numeric control is more flexible than a fixed preset list, and avoids inventing a size-to-dimensions mapping that would live in the CLI without being backed by any domain concept in `core`.

**Rejected alternatives:** Named size presets (`small`/`medium`/`large`) — rejected per user preference; would also have required deciding preset dimensions with no clear source of truth.
