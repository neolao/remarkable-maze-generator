---
status: done
---
# Explore Alternative Maze Generation Algorithms

## Description
Spike/exploration task: prototype and compare a few alternative maze generation algorithms beyond the growing-tree approach currently used in `core` (see ADR 015), to give the project a documented set of options to choose from in the future instead of a single fixed technique. This is exploratory — it does not require replacing or shipping a new default algorithm, only producing enough hands-on experimentation to make an informed choice later.

## Acceptance Criteria
- [x] At least 2-3 alternative generation algorithms (e.g. Kruskal's, Wilson's, Eller's, Aldous-Broder, recursive division) are prototyped well enough to generate a valid perfect maze (fully connected, exactly one solution)
- [x] Each explored algorithm is documented with its trade-offs: generation performance, characteristic dead-end branch length/shape, how tunable it is for a difficulty-like knob, and implementation complexity
- [x] A recommendation is produced on whether any alternative algorithm is worth exposing as a selectable option (similar to the existing maze `type` choice) or should instead just inform further tuning of the current growing-tree implementation
- [x] ~~This item does not change any production-facing behavior by itself~~ — superseded mid-implementation (see Notes): the Product Owner asked to ship the algorithms as a real, user-selectable option instead of keeping them unshipped

## Notes
Directly motivated by the discussion around [[025-lengthen-dead-end-branches]] — dead-end branch length is currently coupled to the growing-tree selection bias, and comparing against other well-known algorithms may reveal simpler or more naturally tunable alternatives. Should reference the current algorithm's baseline behavior (ADR 015) for a fair comparison.

**Scope change during implementation:** rather than staying an unshipped spike, this was expanded on request into a full feature — the current algorithm was named `"growing-tree"`, and three alternatives (Kruskal, Wilson, Aldous-Broder) were implemented as real, selectable options exposed via both the CLI (`--algorithm`) and the web configuration form, each isolated in its own module so they can be iterated on independently. See [[033-selectable-maze-generation-algorithm]] (ADR) for the resulting design and its deliberate scope limits: the difficulty knob and bridge crossings remain exclusive to `growing-tree` for now, pending real usage feedback on which algorithm is worth investing in further.
