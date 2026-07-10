---
status: todo
---
# Resolve Credential Store Duplication

## Description
`packages/cli/src/credential-store.ts` and `packages/web/src/remarkable-credential-store.ts` are near-identical file-based `CredentialStore` implementations (load/save with 0600 file mode, mkdir + readFile/writeFile, ENOENT handling), copy-pasted between the two packages. This is currently justified by ADR 007, which deliberately keeps `packages/core` free of Node-specific filesystem access and ships `CredentialStore` there only as an interface. A decision is needed: keep the duplication as-is (formally re-confirm ADR 007's trade-off) or introduce a small shared non-core location (e.g. a shared internal package or a `node`-flavored export from `core`) that both `cli` and `web` import from, so the two copies can't silently diverge.

## Acceptance Criteria
- [ ] A decision is recorded (new/updated ADR) on whether the duplication is accepted long-term or should be consolidated
- [ ] If consolidation is chosen: a single implementation exists and both `cli` and `web` import it, with no behavior change (existing credential-store tests still pass)
- [ ] `DEFAULT_CREDENTIALS_PATH`, currently also duplicated between `packages/cli/src/send.ts` and `packages/web/src/remarkable-credential-store.ts`, is resolved the same way

## Notes
Found by `vibe:review-hygiene` and `vibe:review-architecture` during `/vibe:review` on 2026-07-10 (Medium/Low severity). Not auto-fixed because it conflicts with the existing ADR 007 decision — needs a user/architectural decision first.
