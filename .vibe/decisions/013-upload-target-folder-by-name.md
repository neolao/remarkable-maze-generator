---
date: 2026-07-08
status: accepted
---
# Upload target folder identified by name, must already exist

**Context:** Users want to send a PDF into a specific reMarkable Cloud folder instead of always landing at the root. `rmapi-js`'s low-level `putPdf(visibleName, buffer, opts)` supports a `parent` option (a folder's id), and `putFolder(visibleName)` creates a folder, but there is no simple-api equivalent with folder support (`uploadPdf` only uploads to the root) — folder support inherently requires the low-level API, which talks to a different host (`rawHost`, default `eu.tectonic.remarkable.com`) than the simple upload API already in use.

The first implementation attempt auto-created the folder when missing (`listItems()` to look it up, `putFolder()` to create it if absent). While verifying it end-to-end, connecting to `rawHost` from Node's `fetch` consistently failed with `ETIMEDOUT` — reproduced identically in the sandbox and on the user's own machine, while `curl` reached the exact same IP instantly and the other reMarkable hosts (auth, simple upload) worked fine from Node. This points to a `rawHost`-specific connectivity problem outside this project's control, not a bug in the implementation.

**Decision:**
- The target folder is identified by its **visible name**, not its id — the caller never needs to know reMarkable's internal folder ids.
- Folders are **single-level** (root-only) for this iteration — no nested folder paths.
- The named folder **must already exist**: if `session.listItems()` doesn't find a root-level `CollectionType` entry with that name, `uploadPdf` throws a clear error ("Folder ... was not found ... Create it first, then try again") instead of creating it. Confirmed with the user, given most callers will already have the folder created through the reMarkable app, and it removes the extra `putFolder()` round-trip.
- `uploadPdf(session, filePath, visibleName, options)` gains an optional `folder` option; when set, `core` resolves the folder id via `session.listItems()`, then uploads via the low-level `session.putPdf(visibleName, buffer, { parent: folderId })` instead of the simple `session.uploadPdf()`.
- The CLI's `send` command exposes this as `--folder <name>`.
- End-to-end verification of the folder-targeted path itself remains blocked by the `rawHost` connectivity issue described above (on both the sandbox and the user's machine); the code is covered by unit tests (mocked session), and the plain (no-folder) upload path was re-verified against the user's real account to confirm no regression.

**Reason:** A create-if-missing flow was the original preference, but it doesn't reduce network calls (folder resolution still requires `listItems()` on the same problematic host either way) and adds complexity for a case ("folder needs to be created") that most callers won't hit. Erroring clearly when the folder is missing is simpler and matches the user's revised preference once the underlying connectivity constraint was understood.

**Rejected alternatives:** Auto-creating the folder when missing (original decision) — rejected after discovering it doesn't avoid the `rawHost` dependency and adds unneeded complexity for a rare case. Supporting nested folder paths (e.g. `"Maze/2026"`) — rejected as unnecessary scope for this request; can be added later without breaking this design (a multi-segment path would just resolve each segment in turn).
