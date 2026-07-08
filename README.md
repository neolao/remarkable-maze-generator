# remarkable-maze-generator

See [docs/architecture.md](docs/architecture.md) for an overview of how the project is organized.

<!-- vibe:begin:features -->
- Generate mazes with a custom width, height, and a reproducible random seed
- Automatically compute a maze's solution path
- Export any maze as a PDF sized for the reMarkable 2 tablet, with an optional solution page or overlay
- Generate a batch of several mazes at once, as one combined PDF or as separate files
- Authenticate with reMarkable Cloud using a one-time pairing code, and upload maze PDFs straight to your tablet
- Generate a maze PDF directly from the command line
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
Prerequisite: Node.js 20+ (recommended: 22).

```bash
npm install
```

The project is an npm workspaces monorepo: `npm install` installs dependencies for every package (`packages/core`, `packages/cli`, `packages/web`).
<!-- vibe:end:install -->

<!-- vibe:begin:usage -->
Generate a maze PDF from the command line:

```bash
npm run start --workspace packages/cli -- generate --width 20 --height 15
```

Or, using the `generate.sh` shortcut at the repository root:

```bash
./generate.sh --width 20 --height 15
```

Options: `--width` and `--height` (required, number of cells), `--seed` (optional, reused to reproduce the same maze), `--output` (optional, defaults to `./maze.pdf`).

See the CLI's built-in help:

```bash
npm run start --workspace packages/cli -- --help
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

<!-- vibe:begin:docs-index -->
- [docs/architecture.md](docs/architecture.md) — overview of how the project is organized
<!-- vibe:end:docs-index -->
