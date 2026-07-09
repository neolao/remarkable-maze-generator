---
status: in_progress
depends_on: [007, 011]
---
# Web Direct reMarkable Send

## Description
Let the user send the maze PDF generated through the web UI directly to their reMarkable Cloud account, reusing the authentication and upload logic from `core` (items 006/007).

## Acceptance Criteria
- [ ] User can trigger a send-to-reMarkable action from the web UI after generating a maze
- [ ] The UI confirms success or reports a clear error if the upload fails
- [ ] If the user has not authenticated with reMarkable yet, the UI guides them through it before sending

## Notes
None.
