---
status: done
---
# Synology NAS Docker Deployment

## Description
There is currently no packaged way to run the web app (`packages/web`) on a Synology NAS. This task adds a Docker-based deployment path: a `Dockerfile` that builds the monorepo (compiling `core` to `dist/` per ADR 044 and building the `web` package) and runs the Fastify server, plus a `docker-compose.yml` suitable for Synology's Container Manager, so the maze generator can be self-hosted on a NAS instead of run locally via `npm run dev`/`npm start`.

## Acceptance Criteria
- [ ] A `Dockerfile` at the repo root builds a production image (multi-stage: install + build all workspaces, then a slim runtime stage running `node packages/web/dist/server.js`) that starts successfully and serves the web UI on the configured port
- [ ] Persistent state that must survive container restarts (notably reMarkable Cloud credentials/token storage) is exposed via a Docker volume rather than baked into the image or lost on restart
- [ ] Configuration (`HOST`, port, credentials path, etc.) is settable via environment variables passed to the container, matching how `packages/web` already reads them
- [ ] A `docker-compose.yml` (or documented Synology Container Manager project) is provided so the image can be deployed on a Synology NAS with minimal manual steps
- [ ] Deployment steps (build/pull image, required env vars, volume mounts, exposing the port) are documented (README or `docs/`)

## Notes
Relevant context: `packages/web` already binds to `0.0.0.0` by default ([[project_web_server_binds_0000]]), which is a prerequisite for container/NAS deployment — no change needed there. `core` resolves to its compiled `dist/` output outside of dev mode (ADR 044), so the Docker build must run each workspace's `build` script before starting the server. Never hardcode reMarkable Cloud credentials into the image per project constraints — they must come from a mounted volume or environment configuration. Open question: whether to publish the image to a registry (e.g. GHCR) or document a local `docker build` only — left to implementation time given no CI/registry setup currently exists in this repo.
