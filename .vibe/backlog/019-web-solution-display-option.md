---
status: todo
---
# Web Solution Display Option

## Description
Expose the maze solution display mode (`none`, `extra-page`, `overlay`) as a form control on the web configuration page. The web backend's generation, download, and send API endpoints already accept a `solution` parameter, but no part of the user-facing page currently lets a user set it — there is no way today to actually obtain a PDF with the solution included through the web UI. This mirrors the CLI's `--solution` option (see backlog item 015) so both interfaces offer the same capability.

## Acceptance Criteria
- [ ] User can select a solution display mode (none, extra page, or overlay) on the maze configuration form before generating
- [ ] The selected mode is applied consistently to the downloaded PDF and to the "send to reMarkable" upload
- [ ] Leaving the option at its default keeps the current behavior (no solution in the PDF)
- [ ] Selecting an unsupported value (if ever possible through direct API misuse bypassing the form) still returns the existing clear error from the backend

## Notes
The backend validation and rendering logic already exist (`packages/web/src/maze-routes.ts`, `packages/web/src/remarkable-routes.ts`, `packages/web/src/maze-request.ts`) — this item is purely about adding the missing form control and wiring it into the existing requests. Backlog item 018 (Web Preview Solution Overlay) assumes the downloaded/sent PDF already includes the solution when requested — this item is what actually makes that true end-to-end from the form; 018 remains a separate, additional capability about tracing the solution on the SVG preview image itself with branch-point markers.
