---
status: done
---
# reMarkable Cloud Authentication

## Description
Implement authentication against the reMarkable Cloud API in `packages/core`: device registration (one-time pairing code) and token exchange, with the resulting credentials stored securely (never hardcoded, never logged).

## Acceptance Criteria
- [ ] System can register a new device using a one-time pairing code and obtain a valid session
- [ ] System persists the resulting credentials securely (e.g. outside version control, via environment variable or local secret store) and reuses them on subsequent calls without re-pairing
- [ ] An invalid or expired pairing code produces a clear, actionable error

## Notes
Credentials must never be hardcoded per CLAUDE.md constraints — use environment variables or a local, gitignored secret store.
