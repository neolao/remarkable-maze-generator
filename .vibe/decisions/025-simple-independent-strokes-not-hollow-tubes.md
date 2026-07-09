---
date: 2026-07-09
status: superseded by 026
---
# Rectangle-crossing rendering: independent solid strokes, not a hollow-tube border trick

**Context:** ADR 023 rendered `rectangle-crossing` corridors as "hollow tubes" — each segment drawn twice, a thick black stroke then a thinner white stroke on top, to fake an outlined pipe. This kept causing visual defects that needed successively more complex patches to fix:
1. The under-axis tube, drawn full-length to its real neighbors, could be accidentally cut by an unrelated corridor elsewhere that happened to paint over it later (fixed by confining the special "paint on top" treatment to a small area).
2. That confined patch could still bite into a neighboring cell's own tube shape if the neighbor didn't continue collinearly (a visible interruption in the tube, reported by the user from a rendered maze).
3. Independently of crossings, the hollow-tube technique itself left thin gaps in the black border at the inside corner of *any* turn, since each segment's white interior is a separate round-capped stroke that doesn't perfectly account for the missing wedge at a concave joint ("le problème vient des bordures").

Each fix added another layer of special-cased geometry (erasers, patches, joint-filling disks) on top of the last. The user called this out directly: "j'ai l'impression que tu essaies de trop tricher. Tu devrais dessiner les traits indépendamment et ne pas utiliser de bordures."

**Decision:** Drop the hollow-tube (double-stroke border) technique entirely. `rectangle-crossing` corridors are drawn as simple, independent, single-color solid strokes (`PATH_THICKNESS_RATIO = 0.15` of the cell size, round caps) — the same technique already used everywhere else in this codebase (walls, the solution overlay), just applied to corridor centerlines instead of wall boundaries.

The bridge-crossing illusion no longer depends on paint order at all: `computePathSegments` includes a crossing's *over*-axis connections as perfectly ordinary, uninterrupted segments, and excludes its *under*-axis connections; `computeCrossingUnderSegments` draws the under-axis instead, as two segments that reach all the way to their real neighbors but stop just short of the crossing's own center — a real, geometric gap baked into the line's own path, not a later erase-and-redraw. Because nothing is painted "on top of" anything else, there is no possible interaction with unrelated corridors, no need to special-case neighboring cells, and no border to develop a gap in.

**Reason:** The user's framing was correct: every prior fix was a workaround for a problem the *border* technique itself introduced. Removing the technique removes the whole class of bugs at once, and produces a simpler, smaller implementation (no `TUBE_OUTER/INNER_WIDTH_RATIO`, no gap/patch/joint-point functions) that's easier to reason about and verify. This also matches how `computeWallSegments` (the classic `rectangle` type, never touched by any of these bugs) already renders — independent solid strokes have no border to interrupt.

**Rejected alternatives:**
- Keep the hollow-tube look and fix the remaining border-gap issue with per-joint filled disks (`computeJointPoints`) — technically implemented and working, but rejected once articulated as "tricherie": it's a third layer of compensating geometry for a problem created by the previous two layers, not a fix to the actual approach.
- Reproduce the reference image's literal outlined-tube appearance some other way (e.g. a proper single continuous stroked path per corridor chain, using real path construction with correct line joins) — a continuous-path approach would avoid the corner-gap issue by construction, but requires grouping segments into connected chains first, a materially bigger change than warranted here; simple independent strokes already read clearly as a maze and match the rest of the codebase's existing rendering style.
