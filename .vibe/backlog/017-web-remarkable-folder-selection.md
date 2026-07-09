---
status: in_progress
depends_on: [014]
---
# Web reMarkable Folder Selection

## Description
Let the user choose which reMarkable Cloud folder a maze is sent into from the web page, reusing the folder-targeting support already implemented in `core` (`uploadPdf`'s `folder` option, see backlog item 007 / ADR 013) and exposed by the CLI's `--folder` option. Today, sending from the web UI (item 014) always uploads to the root of the account.

## Acceptance Criteria
- [ ] User can specify a target reMarkable Cloud folder before clicking "Send to reMarkable" on the web page
- [ ] When a folder is specified, the maze is uploaded into that folder instead of the account root
- [ ] Leaving the folder unspecified keeps the current behavior (upload to the root)
- [ ] If the specified folder does not exist on the account, the web page shows a clear error instead of silently uploading elsewhere or creating it

## Notes
The underlying capability already exists in `core` and the CLI (folder must already exist, resolved by visible name — see ADR 013); this item is purely about exposing it on the web UI's send flow added in item 014.
