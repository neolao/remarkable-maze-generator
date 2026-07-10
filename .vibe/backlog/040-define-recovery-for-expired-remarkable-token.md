---
status: todo
---
# Define Recovery For Expired ReMarkable Token

## Description
`packages/cli/src/send.ts` and `packages/core/src/remarkable-auth.ts` always reuse the stored reMarkable device token with no detection or clearing of a dead one. If the token expires or is revoked, the user is stuck retrying indefinitely with a permanently dead token until they manually delete the credentials file. This needs a product decision on the desired recovery behavior (e.g. auto-clear the stored token and re-prompt pairing on an auth failure, vs. surfacing an explicit "your pairing has expired, re-pair" error message) before implementation.

## Acceptance Criteria
- [ ] A decision is made and documented on whether the app should auto-clear an invalid token or require manual re-pairing
- [ ] When the stored token is rejected by the reMarkable Cloud API, the user (CLI or web) sees a clear, actionable message instead of a generic failure
- [ ] The chosen recovery path is covered by a test that simulates an auth rejection from `rmapi-js`

## Notes
Found by `vibe:review-robustness` during `/vibe:review` on 2026-07-10, rated Medium severity. Requires a product/UX decision before implementation — not auto-fixed.
