---
status: todo
depends_on: [003]
---
# CLI Local Maze Generation Command

## Description
Add a CLI command that generates a maze PDF locally using the `core` package, with options for size/difficulty and the output file path. This is the first user-facing CLI command beyond `--version`.

## Acceptance Criteria
- [ ] Running the command with size options produces a PDF file at the given output path
- [ ] Running the command without an output path writes to a sensible default location and reports it
- [ ] Invalid options (e.g. unsupported size) produce a clear CLI error and non-zero exit code

## Notes
The CLI must only call into `packages/core` — no maze/PDF logic duplicated here.
