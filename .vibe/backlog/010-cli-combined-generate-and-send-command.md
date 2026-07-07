---
status: todo
depends_on: [008, 009]
---
# CLI Combined Generate And Send Command

## Description
Add a CLI command that generates a maze PDF and immediately uploads it to reMarkable Cloud in a single call, combining the behavior of the generate (008) and upload (009) commands.

## Acceptance Criteria
- [ ] Running the command generates a maze PDF and uploads it to reMarkable in one step
- [ ] If generation succeeds but upload fails, the local PDF is kept and the user is informed the upload failed
- [ ] The command accepts the same size/difficulty options as the standalone generate command

## Notes
None.
