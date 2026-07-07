# Module: web
**Role:** Web server (Fastify) serving the static web UI and a JSON API; meant to carry maze generation from the browser and sending to reMarkable. Currently a skeleton with a single diagnostic endpoint.
**Files:** `packages/web/src/server.ts`, `packages/web/public/index.html`
**Exports:** `buildServer(): FastifyInstance` — `GET /api/version`, static files served from `public/`
**Depends on:** [`modules/core.md`](core.md)
