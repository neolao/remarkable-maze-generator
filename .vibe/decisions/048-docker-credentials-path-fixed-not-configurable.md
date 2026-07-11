---
date: 2026-07-11
status: accepted
---
# Docker deployment: fixed credentials path, not configurable via env var

**Context:** Adding a Docker-based deployment path for `packages/web` (backlog item 045), targeted primarily at running the app on a Synology NAS. The reMarkable Cloud credentials file (`packages/web/src/remarkable-credential-store.ts`, `DEFAULT_CREDENTIALS_PATH`) must persist across container restarts, which requires mounting a Docker volume at whatever path the server writes it to.

**Decision:** Run the container as the non-root `node` user baked into the official Node.js image (`HOME=/home/node`), so `DEFAULT_CREDENTIALS_PATH` resolves deterministically inside the container to `/home/node/.config/remarkable-maze-generator/credentials.json`. The `docker-compose.yml` mounts a named volume at that fixed, documented path. No new environment variable or `buildServer()` option is introduced to make the credentials path configurable.

**Reason:** The backlog item's acceptance criteria originally called for the credentials path to be "settable via environment variables," matching `HOST`/`PORT`. The user (product owner) explicitly asked to simplify: since the Dockerfile controls the container's user and home directory, the path is already deterministic and stable — adding a `CREDENTIALS_PATH` env var and the code to read it would be complexity with no real benefit for the NAS use case, where the deployer only needs to know one fixed path to mount.

**Rejected alternatives:** Add a `CREDENTIALS_PATH` environment variable read at server startup (mirroring `resolvePort`/`resolveHost` in `packages/web/src/server.ts`), overriding `DEFAULT_CREDENTIALS_PATH` when set. Rejected as unnecessary configuration surface for this deployment target — can be revisited later if a real need for a relocatable path emerges.
