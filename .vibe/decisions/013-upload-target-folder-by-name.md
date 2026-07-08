---
date: 2026-07-08
status: accepted
---
# Upload target folder identified by name, must already exist, resolved with throttled concurrency

**Context:** Users want to send a PDF into a specific reMarkable Cloud folder instead of always landing at the root. `rmapi-js`'s low-level `putPdf(visibleName, buffer, opts)` supports a `parent` option (a folder's id), and `putFolder(visibleName)` creates a folder, but there is no simple-api equivalent with folder support (`uploadPdf` only uploads to the root) — folder support inherently requires the low-level API, which talks to a different host (`rawHost`, default `eu.tectonic.remarkable.com`) than the simple upload API already in use.

The first implementation attempt (auto-create when missing, folder lookup via `rmapi-js`'s `listItems()`) failed end-to-end with a raw `fetch failed` / `ETIMEDOUT` error, reproduced identically in the sandbox and on the user's real machine, which at first looked like a `rawHost`-specific connectivity problem outside this project's control.

**Root cause, found by isolating the failure:** it was never about the host. Plain `fetch()` calls to `rawHost` (including the exact request `listItems()` makes, replicated by hand with a real session token) succeeded reliably and quickly. The user's account has **766 items**. `rmapi-js`'s `listItems()` fetches every item's metadata *and* content to build its typed `Entry[]`, issuing up to 3 requests per item, all via a single unthrottled `Promise.all` — up to ~2300 concurrent requests to the same host. Reproducing that exact concurrent load by hand reliably produced partial `ETIMEDOUT` failures (274/766 in one run); throttling the same work to 15 concurrent requests at a time completed all 766 with zero errors. The timeouts were a symptom of connection-count exhaustion (client-side sockets/fds or server-side throttling — the precise limiting resource wasn't pinned down), not a dead or unreachable host.

**Decision:**
- The target folder is identified by its **visible name**, not its id — the caller never needs to know reMarkable's internal folder ids.
- Folders are **single-level** (root-only) for this iteration — no nested folder paths.
- The named folder **must already exist**: folder resolution throws a clear error ("Folder ... was not found ... Create it first, then try again") instead of creating it, rather than adding a `putFolder()` round-trip for a case most callers won't hit.
- Folder resolution does **not** use `rmapi-js`'s `listItems()`. It uses the cheaper, public building blocks instead: `session.listIds()` (one request, returns `{id, hash}` pairs only) followed by `session.getMetadata(id, hash)` per entry (one call each; `Metadata` already includes `type`, `visibleName`, and `parent`, so `getContent()` is never needed for this). These per-entry lookups run through a small fixed-size worker pool (`FOLDER_LOOKUP_CONCURRENCY = 15`, empirically verified error-free at full account scale) instead of one unbounded `Promise.all`, and stop early as soon as a match is found.
- `uploadPdf(session, filePath, visibleName, options)` gains an optional `folder` option; when set, `core` resolves the folder id this way, then uploads via `session.putPdf(visibleName, buffer, { parent: folderId })` instead of the simple `session.uploadPdf()`.
- The CLI's `send` command exposes this as `--folder <name>`.
- Verified end-to-end against the user's real reMarkable account (766-item account, folder "Labyrinthes"): upload succeeded and the file appeared in the target folder.

**Reason:** Bypassing `rmapi-js`'s high-level `listItems()` in favor of its lower-level public methods, with our own bounded concurrency, fixes the root cause directly instead of working around a misdiagnosed "host" problem. Fetching only `getMetadata()` (skipping `getContent()`) roughly halves the request volume compared to full entry conversion, on top of the throttling. A create-if-missing flow was the original preference, but was dropped since it doesn't reduce network calls (folder resolution is unavoidable either way) and adds complexity for an uncommon case.

**Rejected alternatives:** Using `rmapi-js`'s `listItems()` as originally implemented — rejected once the unbounded-concurrency root cause was confirmed; it fails unpredictably on any account with enough items, regardless of host reachability. Auto-creating the folder when missing — rejected as unneeded complexity once it was clear it wouldn't sidestep the concurrency issue either. Supporting nested folder paths (e.g. `"Maze/2026"`) — out of scope for this request; can be layered on later by resolving each path segment in turn.
