---
status: todo
depends_on: [004]
---
# CLI Solution Display Option

## Description
Add a `--solution` option to the `generate` and `generate-and-send` CLI commands, exposing the PDF solution display modes (`none`, `extra-page`, `overlay`) already supported by the core renderer. Today these commands always render the PDF without a solution because the option is never forwarded from the CLI to `renderMazeToPdf`.

## Acceptance Criteria
- [ ] User can pass `--solution extra-page` or `--solution overlay` to `generate` and get a PDF including the solution in the chosen mode
- [ ] Omitting `--solution` keeps the current default behavior (no solution in the PDF)
- [ ] Passing an invalid value to `--solution` returns a clear error message instead of silently ignoring it

## Notes
The underlying capability already exists in `core` (see backlog item 004, done) — this item is purely about wiring it up on the CLI side.
