---
date: 2026-07-09
status: accepted
---
# Web direct reMarkable send: stateless resend, shared credential path, guided pairing

**Context:** Backlog item 014 lets a user send the maze generated through the web UI directly to their reMarkable Cloud account, reusing `core`'s `authenticate`/`uploadPdf` (ADR 007/008/012/013). The web server already generates PDFs statelessly per request (ADR 017); the CLI already owns a file-based `CredentialStore` implementation at `~/.config/remarkable-maze-generator/credentials.json` (ADR 011), since `core` only exposes the `CredentialStore` interface (ADR 007).

**Decision:**
- The web package gets its own file-based `CredentialStore` implementation (mirroring the CLI's), pointed at the **same default path** as the CLI. A user who already paired via the CLI is automatically considered paired on the web, and vice versa.
- `POST /api/mazes/send` takes the same maze parameters as `/api/mazes/generate` (plus an optional `visibleName`) and regenerates the PDF server-side at send time, then uploads it — it does not reuse bytes from an earlier `/generate` or `/preview` call. This keeps the endpoint stateless, consistent with ADR 017, and avoids adding a persisted-PDF/reference lifecycle for one extra action.
- Pairing is guided through two dedicated endpoints instead of one combined call: `POST /api/mazes/send` returns `409 { error: "not_authenticated" }` when no credentials are stored, and a separate `POST /api/remarkable/pair` accepts a one-time pairing code and persists the resulting credentials. The frontend shows a pairing form only when it receives `not_authenticated`, then automatically retries the send once pairing succeeds.
- The default visible name uploaded to reMarkable is `${maze.type}-${width}x${height}-${seed}`, generalizing the CLI's `generate-and-send` default (ADR 014, which hardcodes `"rectangle"`) by reading the maze's own resolved `type` (ADR 016) instead.

**Reason:** Sharing the default credentials path avoids asking the user to pair twice for the same machine. Keeping `/api/mazes/send` stateless matches the existing generate/preview endpoints and needs no cleanup/expiry policy. Splitting status detection (via the 409 on send) from pairing into two endpoints keeps each endpoint single-purpose and lets the frontend recover from "not paired yet" without a special combined request shape.

**Rejected alternatives:** A shared package/module for the file credential store used by both `cli` and `web` — rejected as unnecessary indirection for one ~20-line adapter; ADR 007 already anticipated each consuming layer providing its own. Uploading the exact PDF bytes returned by an earlier `/generate` call (client re-uploads them to `/send`) — rejected as it would require the browser to hold/forward binary PDF data instead of small JSON, for no behavioral benefit over regenerating server-side. A single endpoint that accepts a pairing code inline with the send request — rejected because it conflates two independent actions (pairing is a one-time setup step, sending is repeatable) and complicates the "already paired" fast path.

**Assumption:** The maze sent may differ (different random seed) from whatever was last previewed/downloaded in the same page session, since preview/generate/send are each independent stateless calls when no seed is explicitly provided — this mirrors the pre-existing relationship between preview and download and is not changed here.
