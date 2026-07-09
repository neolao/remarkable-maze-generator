---
status: todo
---
# Explore Alternative Maze Generation Algorithms

## Description
Spike/exploration task: prototype and compare a few alternative maze generation algorithms beyond the growing-tree approach currently used in `core` (see ADR 015), to give the project a documented set of options to choose from in the future instead of a single fixed technique. This is exploratory — it does not require replacing or shipping a new default algorithm, only producing enough hands-on experimentation to make an informed choice later.

## Acceptance Criteria
- [ ] At least 2-3 alternative generation algorithms (e.g. Kruskal's, Wilson's, Eller's, Aldous-Broder, recursive division) are prototyped well enough to generate a valid perfect maze (fully connected, exactly one solution)
- [ ] Each explored algorithm is documented with its trade-offs: generation performance, characteristic dead-end branch length/shape, how tunable it is for a difficulty-like knob, and implementation complexity
- [ ] A recommendation is produced on whether any alternative algorithm is worth exposing as a selectable option (similar to the existing maze `type` choice) or should instead just inform further tuning of the current growing-tree implementation
- [ ] This item does not change any production-facing behavior by itself — prototypes can live outside the shipped `core` API until a follow-up decision is made

## Notes
Directly motivated by the discussion around [[025-lengthen-dead-end-branches]] — dead-end branch length is currently coupled to the growing-tree selection bias, and comparing against other well-known algorithms may reveal simpler or more naturally tunable alternatives. Should reference the current algorithm's baseline behavior (ADR 015) for a fair comparison.
