---
date: 2026-07-12
status: accepted
---
# Maze type/algorithm dispatch centralized into strategy maps

**Context:** Rendering (`maze-pdf.ts`, `maze-svg.ts`), solving (`maze-solver.ts`), and generation (`maze.ts`, `circle-maze/generate.ts`) each independently branched on `maze.type` (`rectangle` / `rectangle-crossing` / `circle`) or on `MazeAlgorithm`, duplicating the same conditions across roughly six call sites. Adding a new maze type or algorithm required synchronized edits across all of them, with no compiler-enforced guarantee that every site was updated.

**Decision:** Introduce `Record<MazeType, Strategy>` lookup maps for rendering (`maze-render-strategy.ts`) and solving (kept local to `maze-solver.ts`), and a single `Record<MazeAlgorithm, { generateRectangular, generateCircle }>` registry (`maze-algorithm-registry.ts`) combining the rectangular and circle generator dispatch that previously lived in two separate switch statements (`maze.ts` and `circle-maze/generate.ts`). `circle-maze/generate.ts`'s `generateCircleMaze` becomes a thin wrapper delegating to the registry.

**Reason:** A `Record<Union, X>` requires TypeScript to see every union member as a key, so extending `MazeType` or `MazeAlgorithm` without registering it in every relevant map is a compile error rather than a silent runtime gap — the strongest available guarantee that "add a type/algorithm in one place" actually holds. Concentrating the rectangular+circle algorithm dispatch in one file removes the "two parallel switches" duplication called out as the most concrete instance of the drift risk.

**Rejected alternatives:** Keeping per-file `switch` statements but adding a lint rule or code comment linking them together — rejected because it only documents the coupling instead of enforcing it; a missed site would still compile and fail silently (e.g. a new maze type rendering with no walls). Merging rendering and solving into one combined strategy per type — rejected because they are unrelated concerns exercised independently (SVG preview without solving, PDF solution overlay always solving) and combining them would force every renderer-only change to also touch the solver's shape.
