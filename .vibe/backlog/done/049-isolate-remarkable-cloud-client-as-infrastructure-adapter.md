---
status: done
depends_on: [047]
---
# Isolate ReMarkable Cloud Client as Infrastructure Adapter

## Description
The reMarkable Cloud integration (`remarkable-auth.ts`, `remarkable-upload.ts`, `remarkable-credential-store.ts`) currently sits in `core` alongside domain and rendering code, with no explicit boundary marking it as an external-system adapter. Once the domain entities are extracted (item 047), this item re-organizes the reMarkable Cloud client as a clearly separated infrastructure/adapter layer, so the domain stays free of any knowledge of the `rmapi-js` protocol, credential storage, or upload mechanics — completing the other half of the "domain has no outward dependency" rule DDD calls for.

## Acceptance Criteria
- [ ] `authenticate`, `uploadPdf`, `CredentialStore`, and related reMarkable Cloud types live under a distinct module boundary (e.g. an `infrastructure/remarkable/` grouping) separate from the domain module.
- [ ] The domain module has no import from the reMarkable Cloud adapter; the adapter may depend on domain types (e.g. to name an uploaded file after a maze's parameters) but never the reverse.
- [ ] `authenticate` and `uploadPdf` keep their existing public signatures and behavior — full test suite green, including the tests verified against a real reMarkable account per the project's existing conventions.
- [ ] The public exports of `@remarkable-maze-generator/core` consumed by `cli` and `web` keep their existing signatures, so no changes are required in `cli` or `web`.

## Notes
Depends on backlog item 047 (Extract Core Domain Entities) since this item's boundary is defined relative to the domain module it introduces. Part of the "apply DDD" request split on 2026-07-12 — see item 047 for full context. When verifying this item's implementation, never exercise the send flow against default/real reMarkable credentials — use a temporary credentials path so a real paired device is never touched.
