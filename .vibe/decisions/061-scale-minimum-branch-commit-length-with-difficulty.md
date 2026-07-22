---
date: 2026-07-22
status: accepted
---
# Scale the minimum branch-commit length with difficulty

**Context:** ADR 032 introduced a minimum branch-commit length in the growing-tree algorithm (rectangle/rectangle-crossing maze types) to stop dead-end branches from being starved to 1-2 cells by concurrent competing branches. That commit length was deliberately fixed, independent of `difficulty`, so `difficulty` would solely control branch-point density (ADR 015) and dead-end length would be a separate, flat improvement applying the same way at every difficulty level. Product direction now asks for `difficulty` to also make dead ends longer at harder settings — a harder maze should waste more of the solver's time on a wrong turn, not just offer more of them.

**Decision:** Make the minimum branch-commit length scale with `difficulty` instead of staying a fixed constant: at the lowest difficulty the value stays at (or below) its previous fixed baseline, and it grows as difficulty increases toward the hardest setting, so higher difficulty produces both more branch points (existing behavior, ADR 015) and longer dead ends per branch (new behavior). This only affects the growing-tree algorithm's rectangular implementation, shared by the `rectangle` and `rectangle-crossing` maze types; the circle maze types use a separate growing-tree implementation and are out of scope.

**Reason:** Coupling branch length to difficulty was explicitly requested as a way to make higher difficulty settings harder along a second, independent axis (time cost of a wrong turn), matching the intuitive meaning of "harder maze" better than branch-point count alone.

**Rejected alternatives:** Keeping the commit length fixed and instead reducing forced-commit frequency or reach at low difficulty was considered, but conflates two knobs (frequency of jumps, driven by `difficulty` since ADR 015, versus length committed after a jump) into one, making the resulting curve harder to reason about than a direct, independent scale on commit length.
