# Module: web
**Role:** Web server (Fastify) serving the static web UI and a JSON/PDF API; carries maze generation from the browser (frontend UI still a skeleton, upload-to-reMarkable not yet exposed).
**Files:** `packages/web/src/server.ts`, `packages/web/src/maze-routes.ts`, `packages/web/public/index.html`
**Exports:** `buildServer(): FastifyInstance` — `GET /api/version`, `POST /api/mazes/generate` (accepts `width`/`height`/`seed`/`difficulty`/`solution` in the JSON body, returns the generated PDF directly with `Content-Type: application/pdf`, or a 400 JSON `{ error }` on invalid parameters or an invalid `solution` value — see ADR 017), static files served from `public/`
**Depends on:** [`modules/core.md`](core.md)
