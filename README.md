# remarkable-maze-generator

See [docs/architecture.md](docs/architecture.md) for an overview of how the project is organized.

<!-- vibe:begin:features -->
_To be filled in as features are shipped (see CHANGELOG.md once created)._
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
Prerequisite: Node.js 20+ (recommended: 22).

```bash
npm install
```

The project is an npm workspaces monorepo: `npm install` installs dependencies for every package (`packages/core`, `packages/cli`, `packages/web`).
<!-- vibe:end:install -->

<!-- vibe:begin:usage -->
Run the CLI:

```bash
npm run cli
```

Run the web server (development mode, auto-reload):

```bash
npm run web
```

Run the tests:

```bash
npm test
```

Check code style:

```bash
npm run lint
```
<!-- vibe:end:usage -->
