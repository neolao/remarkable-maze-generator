# remarkable-maze-generator

See [docs/architecture.md](docs/architecture.md) for an overview of how the project is organized.

<!-- vibe:begin:features -->
- Generate mazes with a custom width, height, and a reproducible random seed
- Automatically compute a maze's solution path
- Export any maze as a PDF sized for the reMarkable 2 tablet, with an optional solution page or overlay
- Generate a batch of several mazes at once, as one combined PDF or as separate files
- Generate a maze PDF directly from the command line
- Authenticate with reMarkable Cloud using a one-time pairing code, remembered for later uploads
- Upload a local PDF file to your reMarkable Cloud account from the command line, optionally into a specific folder
- Generate a maze PDF and upload it to your reMarkable Cloud account in a single command
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
Prerequisite: Node.js 25+ (required by the reMarkable Cloud integration; see `.nvmrc`).

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

Upload a local PDF file to your reMarkable Cloud account:

```bash
npm run start --workspace packages/cli -- send maze.pdf
```

Or, using the `send.sh` shortcut at the repository root:

```bash
./send.sh maze.pdf
```

The first time, you'll be prompted for a one-time pairing code (get one at https://my.remarkable.com/device/browser/connect); it's remembered afterwards, so later uploads don't ask again. Use `--visible-name <name>` to control how the file is named on the tablet (defaults to the file name). Use `--folder <name>` to send it into a specific reMarkable Cloud folder (the folder must already exist).

Generate a maze PDF and upload it to your reMarkable Cloud account in a single command:

```bash
npm run start --workspace packages/cli -- generate-and-send --width 20 --height 15
```

Or, using the `generate-and-send.sh` shortcut at the repository root:

```bash
./generate-and-send.sh --width 20 --height 15
```

Accepts the same `--width`, `--height`, `--seed` and `--output` options as `generate`, plus the same `--visible-name` and `--folder` options as `send` (the visible name defaults to `rectangle-<width>x<height>-<seed>` if not given). If generation succeeds but the upload fails, the local PDF is kept and the error is reported clearly.

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
