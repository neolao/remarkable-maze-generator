---
date: 2026-07-08
status: accepted
---
# reMarkable Cloud PDF upload design

**Context:** `packages/core` needs to upload a PDF file to a reMarkable Cloud account so it appears on the tablet, building on the authentication from ADR 007. There is no real reMarkable account available to validate the implementation against the live service, and the reMarkable Cloud API is unofficial and has changed over time.

**Decision:**
- Implement the "legacy" document-storage protocol documented by established open-source reMarkable clients (e.g. `rmapi`), since it is the most stable and widely documented variant:
  1. `POST /document-storage/json/2/upload/request` with the new document's UUID → returns a signed upload URL.
  2. `PUT` a ZIP archive (containing `<uuid>.pdf`, `<uuid>.content`, `<uuid>.pagedata`) to that signed URL.
  3. `POST /document-storage/json/2/upload/update-status` with the document's visible name and parent folder → finalizes it so it appears on the tablet.
  This is explicitly a best-effort implementation against an unofficial, undocumented-by-reMarkable API; it has not been validated against a live account (confirmed acceptable by the user) and should be verified against a real account as soon as one is available.
- The internal ZIP archive is built with `fflate` (`zipSync`), a small, pure-JS/TS zip library with no Node-specific APIs, keeping `core` runtime-agnostic like `pdf-lib` already does for PDF generation.
- The upload function takes a local file path and reads it through a **required** `readFile` function (no default) — unlike the injectable-with-default `fetch` in `remarkable-auth.ts` (ADR 007), `readFile` has no dependency-free universal default, so `core` never imports `node:fs` itself; the caller (e.g. the CLI, via `node:fs/promises.readFile`) always supplies it. This lets the acceptance criterion "a non-existent local file fails before any network call" be satisfied directly, while keeping `core` free of any Node-specific import.
- Uploading without a valid session (no user token) throws before any network call.

**Reason:** The legacy document-storage API is the best-documented, most stable option available without a live account to test against. `fflate` avoids pulling in a heavier zip dependency. The injectable file-reader mirrors the existing injectable-I/O pattern from authentication, keeping `core` testable and consistent.

**Rejected alternatives:** Requiring callers to pass raw PDF bytes only (no path, no existence check in `core`) — rejected because it would push the "non-existent file" acceptance criterion out of `core` and break from this item's explicit wording. A heavier zip library (`jszip`, `archiver`) — rejected in favor of the smaller, dependency-free `fflate`. Blocking this item until a real reMarkable account is available — rejected per user's choice to implement now and validate later.
