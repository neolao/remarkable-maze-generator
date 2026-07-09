---
date: 2026-07-09
status: accepted
---
# Decouple dead-end branch length from difficulty via a minimum branch-commit length

**Context:** The growing-tree algorithm (see ADR 015) picks, at each step, either the most-recently-added active cell or a uniformly random active cell, with the random-pick probability driven by `difficulty`. At higher difficulty, frequent random jumps between active cells cause many branches to grow concurrently; each branch's free neighbors get claimed by competing branches before it gets another turn, so dead-end branches end up characteristically short (often 1-2 cells) even though the intent of `difficulty` was only to control branch-point density, not branch length. Backlog item 025 asked to lengthen dead-end branches without flattening the difficulty scale.

**Decision:** Introduce a minimum branch-commit length: whenever a random jump lands on an active cell that is not already the most-recently-added one (i.e. a genuine jump to a different, possibly dormant branch), force the algorithm to keep extending that same branch's growing tip for a fixed minimum number of additional steps before it is allowed to re-roll the random-vs-recent choice again. The branch can still end earlier if it runs out of unvisited neighbors (a true dead end). The commit length is a fixed constant, independent of `difficulty` — `difficulty` still solely controls how often a jump (and thus a branch point) occurs.

**Reason:** This directly targets the mechanism causing short dead ends (branches getting starved of turns by concurrent competing branches) without touching the difficulty-to-branch-point-density relationship established in ADR 015. At difficulty 1 (no random jumps ever occur), the change is a no-op and consumes no extra random draws, preserving that guarantee from ADR 015.

**Rejected alternatives:** A continuous recency-weighted selection (e.g. exponential decay favoring recently-added cells over uniformly random ones) was considered — it smooths the binary recent-vs-random choice but does not guarantee any minimum branch length, so short dead ends would still occur probabilistically. Post-processing generated mazes to lengthen short dead ends after the fact was also rejected, for the same reason ADR 015 rejected braiding: it risks reintroducing loops or breaking the single-solution guarantee.
