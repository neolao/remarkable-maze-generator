---
status: todo
depends_on: [007]
---
# CLI reMarkable Upload Command

## Description
Add a CLI command that uploads an existing local PDF file to reMarkable Cloud, using the `core` upload client and authentication.

## Acceptance Criteria
- [ ] Running the command with a valid local PDF path uploads it and confirms success to the user
- [ ] Running the command with a missing file produces a clear error and non-zero exit code
- [ ] Running the command without prior authentication guides the user to authenticate first

## Notes
None.
