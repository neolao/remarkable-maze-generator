---
date: 2026-07-09
status: accepted
---
# Web form preview: rendered SVG image instead of native PDF viewer

**Context:** After shipping item 012 (ADR 018: preview via the browser's native PDF viewer embedded in an iframe), real-world testing showed the approach is fragile: browsers configured to download PDFs instead of viewing them inline (a common, non-default but not rare Chrome setting) show a dead placeholder instead of the maze, with no way to recover from the page itself. The user asked for a preview that always renders, plus a direct way to get the PDF (which also satisfies backlog item 013, "Web PDF Download").

**Decision:**
1. The server renders the maze as a self-contained SVG image (a new `core` capability, sharing the wall-segment geometry with the PDF renderer instead of duplicating it) and the web page displays that SVG directly after form submission — no dependency on the browser's PDF viewer or any plugin.
2. The page also exposes a "Download PDF" link next to the preview, generating the same maze as a PDF via the existing generation endpoint and triggering a browser download.

**Reason:** An SVG is plain markup natively supported for inline display by every browser, with no configurable "open vs. download" behavior to fight — it removes the failure mode observed in testing. Sharing the wall-segment geometry between the PDF and SVG renderers (rather than reimplementing wall/entrance/exit logic twice) keeps `core` the single place owning maze-drawing rules, per the project's no-duplicated-business-logic constraint. A PNG alternative was considered (per the user's initial phrasing) but rejected: rasterizing would require a native image/canvas dependency, which conflicts with `core`'s "no Node-specific runtime dependency" constraint (kept testable and portable between the CLI and web packages) — SVG achieves the same visual outcome as plain, dependency-free string output.

**Rejected alternatives:**
- Keep the PDF-in-iframe preview and just tell users to change a browser setting: rejected, the setting is outside the app's control and the failure was silent (a dead "Open" button, no error message).
- Render a PNG server-side via a canvas/image library: rejected, introduces a native runtime dependency into `core`, which the project deliberately keeps free of Node-specific/native dependencies for portability and testability.

**Supersedes:** [[018-web-form-pdf-preview-and-validation-split]] (its point 1 — native PDF viewer preview — is replaced; point 2, the client-validation split, still stands).
