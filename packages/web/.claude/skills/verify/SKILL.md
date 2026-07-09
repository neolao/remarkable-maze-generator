---
name: verify
description: Runtime verification recipe for packages/web — how to drive the real Fastify server end-to-end, including reMarkable Cloud flows, without a live reMarkable account.
---

# Verifying packages/web at runtime

## Basic server smoke

```bash
npm run --workspace=packages/web dev
curl -s http://127.0.0.1:3000/api/version
curl -s -X POST http://127.0.0.1:3000/api/mazes/preview -H "content-type: application/json" -d '{"width":5,"height":5,"difficulty":1}'
```

Never point at the real `DEFAULT_CREDENTIALS_PATH`
(`~/.config/remarkable-maze-generator/credentials.json`) during verification —
it holds the maintainer's real paired device. Always pass a temp
`credentialsPath` when testing send/pairing flows.

## Driving /api/remarkable/* and /api/mazes/send without a real reMarkable account

There is no live reMarkable account in this environment. `core`'s
`authenticate`/`uploadPdf` (packages/core/src/remarkable-auth.ts,
remarkable-upload.ts) make real network calls to reMarkable Cloud, so hitting
`/api/mazes/send` against the unmodified server always fails with
"Failed to authenticate with reMarkable Cloud" (502) — that is not a bug, it's
just no fake credentials being accepted for real.

To exercise the route logic for real over HTTP (not a unit test), start the
server through a custom Node ESM loader that swaps `core`'s
`remarkable-auth.js`/`remarkable-upload.js` for fakes, keeping every other
`core` export (maze generation, PDF/SVG rendering) real:

1. Write a loader (`mock-remarkable-loader.mjs`) with `resolve`/`load` hooks
   that intercept any specifier ending in `remarkable-auth.js`/`.ts` or
   `remarkable-upload.js`/`.ts` and return fake module source (fake
   `authenticate()` resolving to a stub session; fake `uploadPdf()` that
   records calls on `globalThis.__UPLOAD_CALLS__` and throws the same
   `Folder "X" was not found...` message as the real implementation when
   `options.folder === "Missing"`, to exercise the error path too).
   - Match on both `.js` and `.ts` suffixes — tsx's own resolve hook rewrites
     the specifier's extension before extension-exact string matches see it,
     so `specifier === "./remarkable-auth.js"` silently never matches.
2. Write a tiny bootstrap script that imports `packages/web/src/server.ts`'s
   `buildServer()` with an explicit temp `credentialsPath` (pre-seeded with
   `{"deviceToken":"fake-device-token"}`) and calls `app.listen()` on a
   scratch port (e.g. 3177) — import it with `NODE_ENV=test` set so the
   module's own top-level `app.listen({port:3000})` side effect doesn't also
   fire against the real default credentials path.
3. Run it: `NODE_ENV=test node --import tsx --experimental-loader="file://<abs path to loader>" <abs path to bootstrap script>` (background it; `run_in_background: true` on the Bash tool works better here than manual `&`/`disown`, which tends to hang the tool call until timeout).
4. Drive it with `curl` against `http://127.0.0.1:3177/...` — real HTTP, real
   Fastify route handlers, real maze generation, only the reMarkable Cloud
   edge mocked.
5. Kill the server by PID (`ss -ltnp | grep 3177`) when done — avoid
   `pkill -f <script name>`, it can match the invoking shell's own command
   line and hang.

This recipe was built to verify backlog item 017 (web folder selection on
send) end-to-end: folder forwarded to `uploadPdf`, empty folder still goes to
the account root, and a nonexistent folder surfaces the real wrapped 502
error message on the page.
