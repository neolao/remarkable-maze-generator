---
status: todo
depends_on: [006]
---
# reMarkable Cloud PDF Upload

## Description
Implement uploading a PDF file to a reMarkable Cloud folder via the authenticated API client, so any generated maze document can be sent directly to the tablet.

## Acceptance Criteria
- [ ] System uploads a given PDF file and it appears in the target reMarkable folder
- [ ] Uploading without a valid authenticated session fails with a clear error instead of a silent no-op
- [ ] Uploading a non-existent local file fails with a clear error before attempting any network call

## Notes
None.
