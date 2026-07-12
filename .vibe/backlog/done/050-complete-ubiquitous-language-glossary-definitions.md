---
status: done
---
# Complete Ubiquitous Language Glossary Definitions

## Description
`.vibe/glossary.md` lists the project's core domain terms (Maze, Cell, Entrance, Exit, Solution path, Difficulty, Maze type, Branch point, Bridge crossing, Generation algorithm, Path length target, Ring, Sector, Pairing code, Device token, User token) but every single one still has its `**Definition:**` line as the unfilled placeholder `[what this concept means in the domain — fill in]`. A shared, precisely-worded vocabulary is a prerequisite of DDD — this item writes an actual one- or two-sentence definition for each term, cross-checked against how the term is actually used in the code and PDF/SVG output, so the glossary becomes a real reference instead of a scaffold.

## Acceptance Criteria
- [ ] Every term currently listed in `.vibe/glossary.md` has a concrete, non-placeholder `Definition` line.
- [ ] Each definition is consistent with the term's actual behavior in the code (e.g. "Difficulty" reflects that it tunes branch-point density via generation bias, not maze size).
- [ ] Terms whose meaning differs subtly between maze types (e.g. "Branch point" for rectangular vs. circle mazes) note that distinction in their definition rather than describing only one case.
- [ ] No code changes are required for this item — it is documentation-only.

## Notes
Part of the "apply DDD" request split on 2026-07-12 — see backlog item 047 for full context. Unlike items 047-049, this item has no dependency on the others and can be done independently at any time, since it only touches `.vibe/glossary.md`.
