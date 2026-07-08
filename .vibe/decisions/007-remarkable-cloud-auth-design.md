---
date: 2026-07-08
status: accepted
---
# reMarkable Cloud authentication design

**Context:** `packages/core` needs to authenticate against the reMarkable Cloud API (an unofficial but well-documented API used by community tools like `rmapi`): exchange a one-time pairing code for a device token, then exchange the device token for a short-lived user token used on actual API calls. `core` must stay free of direct filesystem access and Node-specific runtime dependencies (per CLAUDE.md), and there is no real reMarkable account available in this environment to test against.

**Decision:**
- Credential persistence is exposed as a `CredentialStore` interface only (`load()` / `save()`), defined in `core`. No concrete implementation (env var, file, etc.) ships in this item — the CLI/web layers will provide one when they consume this capability. This was confirmed with the user.
- HTTP calls use the platform-native `fetch` (available in Node 22 and browsers alike, no new dependency), injectable via an options parameter so tests can point at a mock.
- The reMarkable Cloud endpoints used are the community-documented ones: `POST https://webapp.cloud.remarkable.com/token/json/2/device/new` (pairing code → device token) and `POST https://webapp.cloud.remarkable.com/token/json/2/user/new` (device token → user token). Both the base URL and `fetch` implementation are injectable for testing.
- `deviceDesc` is hardcoded to `"desktop-linux"`, matching the value used by established open-source reMarkable clients.
- Unit tests mock `fetch` directly. Runtime verification (Step 4b) uses a local HTTP server that mimics the two endpoints, since no real reMarkable account/pairing code is available — confirmed with the user.

**Reason:** Keeping credential storage as an interface respects the "no direct FS" constraint on `core` and defers a decision (env var vs file vs OS keychain) that belongs to the consuming app, not the shared core. Native `fetch` avoids adding an HTTP client dependency. A local fake server lets the full pairing flow be exercised end-to-end without a live account, while still being disposable test infrastructure (not shipped).

**Rejected alternatives:** Bundling a file-based or env-var-based `CredentialStore` implementation in `core` — rejected per user preference to keep that decision out of this item. Adding an HTTP client library (e.g. `axios`) — rejected since native `fetch` covers the need with zero dependencies.
