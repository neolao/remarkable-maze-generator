---
date: 2026-07-08
status: accepted
---
# CLI send command: credential storage and pairing flow

**Context:** The CLI needs its first concrete `CredentialStore` implementation (`core` only defines the interface, per ADR 007) and a way to obtain a pairing code from the user when no credentials are stored yet.

**Decision:**
- Credentials are persisted as JSON in `~/.config/remarkable-maze-generator/credentials.json`, created on first successful pairing, with file permissions restricted to the owner (`0o600`) since it holds a sensitive device token.
- When no stored credentials are found, the `send` command prompts interactively in the terminal (via `node:readline/promises`) for a one-time pairing code, after first printing where to obtain one.
- The local file existence check happens before the pairing prompt and before any network call, so a typo'd file path fails fast without bothering the user for a pairing code first.

**Reason:** Confirmed with the user: a local config file avoids re-pairing on every run without requiring the user to manage an environment variable themselves; an interactive prompt is more natural for a first-run CLI experience than a command-line flag. Checking the file first avoids wasted user effort when the actual problem is an invalid path.

**Rejected alternatives:** An environment-variable-only credential store — rejected per user preference (less convenient across sessions). A `--pairing-code` flag instead of an interactive prompt — rejected per user preference for a guided interactive flow.
