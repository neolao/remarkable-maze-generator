---
date: 2026-07-08
status: accepted
---
# Combined generate-and-send command default visible name

**Context:** Adding a CLI command that generates a maze PDF and uploads it to reMarkable Cloud in one step. The upload needs a visible name to show on the tablet; the existing standalone `send` command defaults it to the local file's basename (typically "maze").

**Decision:** The combined command defaults the visible name to `rectangle-{width}x{height}-{seed}` (e.g. `rectangle-10x10-12345`) when not explicitly overridden via an option, instead of reusing the generic "maze" default from the standalone `send` command.

**Reason:** The maze generator currently only produces rectangular mazes, but other maze topologies are planned. Prefixing the default visible name with the maze type ("rectangle") keeps future uploads distinguishable on the tablet once more types exist, and including the dimensions and seed makes each upload self-descriptive without requiring the user to pass a name manually.

**Rejected alternatives:** Reusing the local file's basename (as the standalone `send` command does) — too generic once multiple maze types exist. Making the visible name always mandatory — adds friction for the common case where a sensible default is easy to derive.
