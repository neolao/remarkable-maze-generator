# remarkable-maze-generator

See [docs/architecture.md](docs/architecture.md) for an overview of how the project is organized.

<!-- vibe:begin:features -->
- Generate mazes with a custom width, height, and a reproducible random seed
- Choose a difficulty level to control how many branch points and decision points the maze has
- Automatically compute a maze's solution path
- Export any maze as a PDF sized for the reMarkable 2 tablet, with an optional solution page or overlay
- See the parameters used to generate a maze (type, dimensions, seed, difficulty) printed on the PDF itself, so it can be regenerated exactly later
- Generate a batch of several mazes at once, as one combined PDF or as separate files
- Generate a maze PDF directly from the command line
- Choose whether the maze PDF includes its solution (on a separate page or overlaid on the maze) directly from the command line
- Authenticate with reMarkable Cloud using a one-time pairing code, remembered for later uploads
- Upload a local PDF file to your reMarkable Cloud account from the command line, optionally into a specific folder
- Generate a maze PDF and upload it to your reMarkable Cloud account in a single command
- Generate a maze PDF through a web API by sending its parameters (size, seed, difficulty, solution display mode)
- Configure a maze (width, height, difficulty) through a web page form and see an image preview right after submitting, with invalid input caught before any request is sent
- Choose whether the maze PDF generated through the web page includes its solution (none, extra page, or overlay), applied consistently to both the downloaded PDF and the one sent to reMarkable Cloud
- Show the maze's solution directly on the web page preview, with a circle marking every branch point along the path and the total branch point count displayed
- Download the maze PDF generated through the web page with a dedicated download link
- Send the maze generated through the web page directly to your reMarkable Cloud account, with a guided one-time pairing step if the browser isn't paired yet (the same pairing already used by the CLI also works here); when no name is given, the uploaded file is named after its type and dimensions (e.g. "rectangle 20x15") instead of a seed number
- Choose a target reMarkable Cloud folder for a maze sent from the web page, or leave it blank to upload to the account root
- Enjoy a polished, responsive design on the web maze configuration page that adapts smoothly from mobile through tablet to wide desktop screens, including a side-by-side layout on wide screens and comfortable tap targets on mobile
- Generate a "bridge crossing" maze type, drawn as a real hollow tube where some real, walkable corridors visibly duck underneath one another like a bridge, alongside the classic (thin-wall) maze type — selectable from the command line or the web page, with exactly one solution guaranteed either way
- Choose the maze generation algorithm — growing tree (the original default), Kruskal, Wilson, or Aldous-Broder — from the command line or the web page; the "bridge crossing" maze type still requires the growing tree algorithm
- Generate a "circle" maze type, laid out as concentric rings and angular sectors instead of a rectangular grid, selectable from the command line or the web page alongside the rectangle types
- Generate a "circle crossing" maze type, combining the circular layout with "bridge crossing" tube corridors, selectable from the command line or the web page; like "bridge crossing", it requires the growing tree algorithm
- The web configuration form remembers your last-used settings (width, height, difficulty, maze type, algorithm, solution mode, the solution preview checkbox, path length, and the reMarkable target folder) and pre-fills them automatically on your next visit
- Request a shorter or longer maze solution path (short, medium, or long) from the command line or the web page; the generator tries several random seeds and keeps the maze that best matches the request
- Control how many candidate mazes are generated and compared when requesting a shorter or longer solution path, trading generation time for a closer match, from the command line or the web page
- The web configuration form only shows fields that are actually relevant to your current choices — e.g. the difficulty field is hidden for generation algorithms that ignore it, the generation algorithm field is hidden for maze types that only support one algorithm, and the candidate-count field only appears once a path length is chosen — each updating instantly as you change related options
- Build and run the web app as a Docker container, with a ready-to-use `docker-compose.yml`, so it can be self-hosted (e.g. on a Synology NAS) instead of run locally, with paired reMarkable Cloud credentials persisting across container restarts
- Fill the tube passages of a "bridge crossing" or "circle crossing" maze with a light gray background, making the tube shape stand out more clearly against the page — available from the command line or the web page (shown only for those two maze types), applied consistently to the PDF, the web preview, and mazes sent to reMarkable
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
Prerequisite: Node.js 25+ (required by the reMarkable Cloud integration; see `.nvmrc`).

```bash
npm install
```

The project is an npm workspaces monorepo: `npm install` installs dependencies for every package (`packages/core`, `packages/cli`, `packages/web`).
<!-- vibe:end:install -->

<!-- vibe:begin:usage -->
### Command line

Generate a maze PDF from the command line:

```bash
npm run dev:cli -- generate --width 20 --height 15
```

Or, using the `generate.sh` shortcut at the repository root:

```bash
./generate.sh --width 20 --height 15
```

Options: `--width` and `--height` (required, number of cells — for the `circle` type, the number of angular sectors and concentric rings), `--seed` (optional, reused to reproduce the same maze), `--difficulty` (optional, 1 to 5, defaults to 1 — higher values produce more branch points and make the maze harder to solve), `--type` (optional, `rectangle`, `rectangle-crossing`, `circle`, or `circle-crossing`; defaults to `rectangle`), `--algorithm` (optional, `growing-tree`, `kruskal`, `wilson`, or `aldous-broder`; defaults to `growing-tree`; `rectangle-crossing` and `circle-crossing` require `growing-tree`), `--solution` (optional, `none`, `extra-page`, or `overlay`; defaults to `none`), `--path-length` (optional, `short`, `medium`, or `long`; defaults to unset, no path-length filtering — the generator tries several random seeds and keeps the one whose solution best matches the request), `--path-length-candidates` (optional, a positive integer up to 50; only usable together with `--path-length`; defaults to 10 candidate seeds), `--tube-fill` (optional flag; fills the tube passages with a light background on the `rectangle-crossing` and `circle-crossing` types, no effect on the other types), `--output` (optional, defaults to `./maze.pdf`).

Upload a local PDF file to your reMarkable Cloud account:

```bash
npm run dev:cli -- send maze.pdf
```

Or, using the `send.sh` shortcut at the repository root:

```bash
./send.sh maze.pdf
```

The first time, you'll be prompted for a one-time pairing code (get one at https://my.remarkable.com/device/browser/connect); it's remembered afterwards, so later uploads don't ask again. Use `--visible-name <name>` to control how the file is named on the tablet (defaults to the file name). Use `--folder <name>` to send it into a specific reMarkable Cloud folder (the folder must already exist).

Generate a maze PDF and upload it to your reMarkable Cloud account in a single command:

```bash
npm run dev:cli -- generate-and-send --width 20 --height 15
```

Or, using the `generate-and-send.sh` shortcut at the repository root:

```bash
./generate-and-send.sh --width 20 --height 15
```

Accepts the same `--width`, `--height`, `--seed`, `--difficulty`, `--type`, `--algorithm`, `--solution`, `--path-length`, `--path-length-candidates`, `--tube-fill` and `--output` options as `generate`, plus the same `--visible-name` and `--folder` options as `send` (the visible name defaults to `rectangle-<width>x<height>-<seed>` if not given). If generation succeeds but the upload fails, the local PDF is kept and the error is reported clearly.

See the CLI's built-in help:

```bash
npm run dev:cli -- --help
```

### Web server

Run the web server (development mode, auto-reload):

```bash
npm run dev:web
```

The server listens on `0.0.0.0` (every network interface) by default (see [docs/configuration.md](docs/configuration.md) to change the host or port). Then open http://localhost:4367 in a browser to configure a maze (width, height, difficulty, maze type — Rectangle, Rectangle crossing, Circle, or Circle crossing — and generation algorithm — Growing tree, Kruskal, Wilson, or Aldous-Broder) through the form, see an image preview, download the generated PDF, or send it straight to your reMarkable Cloud account with the "Send to reMarkable" button. The form only shows fields relevant to your current choices: "Difficulty" is hidden unless the "Growing tree" algorithm is selected (the only one that reads it), "Generation algorithm" is hidden for the "Rectangle crossing" and "Circle crossing" maze types (which only support "Growing tree"), and "Candidate mazes to compare" stays hidden until a "Path length" target is chosen — each appearing or disappearing instantly as you change related options, without a page reload. The form remembers your last-used settings — including the "reMarkable folder" field — in a cookie and pre-fills them automatically the next time you visit. Choose a "Solution in PDF" mode (none, extra page, or overlay) to control whether the downloaded/sent PDF includes the solution, the same choice available on the command line. Choose a "Path length" (none, short, medium, or long) to request a shorter or longer solution path — the generator tries several random seeds behind the scenes and keeps the maze that best matches the request; the "Candidate mazes to compare" field controls how many of those seeds are tried (1 to 50, defaults to 10), trading generation time for a closer match. Check "Show solution on preview" to trace the solution path on the preview image itself, with a circle on every branch point and the total branch point count shown below it — a separate option from the PDF solution mode. When the "Rectangle crossing" or "Circle crossing" maze type is selected, a "Fill tube background" checkbox appears — enabling it fills the tube passages with a light gray background in the preview, the downloaded PDF, and a maze sent to reMarkable, so the tube shape stands out more clearly against the page. Optionally fill in the "reMarkable folder" field first to upload into a specific, already-existing folder instead of the account root. The first time, a one-time pairing code is requested (get one at https://my.remarkable.com/device/browser/connect); it's remembered afterwards, the same way as the CLI's `send` command.

### Production

Build once (or again after changing the code):

```bash
npm run build
```

Then start the web server or the CLI as many times as you want, instantly, without rebuilding:

```bash
npm run start:web
npm run start:cli -- generate --width 20 --height 15
```

### Tests and code style

Run the tests:

```bash
npm test
```

Check code style:

```bash
npm run lint
```

### Docker

Build and run the web app in a container:

```bash
docker compose up -d --build
```

See [docs/deployment.md](docs/deployment.md) for environment variables, the credentials volume, and Synology NAS-specific steps.
<!-- vibe:end:usage -->

<!-- vibe:begin:docs-index -->
- [docs/architecture.md](docs/architecture.md) — overview of how the project is organized
- [docs/configuration.md](docs/configuration.md) — environment variables the web server reads (host, port)
- [docs/deployment.md](docs/deployment.md) — running the web app in Docker, including on a Synology NAS
<!-- vibe:end:docs-index -->
