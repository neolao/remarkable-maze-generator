# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Changed

- The web server's default port is now `4367` instead of `3001` (used when the `PORT` environment variable is not set; also updated in the provided `docker-compose.yml`)

## [0.10.0] - 2026-07-11

### Added

- The web app can now be built and run as a Docker container, with a ready-to-use `docker-compose.yml`, so it can be self-hosted (e.g. on a Synology NAS) instead of run locally; paired reMarkable Cloud credentials persist across container restarts via a mounted volume

## [0.9.0] - 2026-07-11

### Added

- Users can now request a shorter or longer maze solution path via a new "Path length" option (none, short, medium, or long), available both on the web configuration form and as a new `--path-length` option on the command line's `generate` and `generate-and-send` commands; the generator tries several random seeds and keeps the maze that best matches the requested length
- Users can now control how many candidate mazes are tried and compared when a "Path length" target is set, trading generation time for a closer match, via a new "Candidate mazes to compare" field on the web configuration form and a new `--path-length-candidates` option on the command line (defaults to 10 when left unset, capped at 50)

### Changed

- The web server now binds to `0.0.0.0` by default again instead of `127.0.0.1`, so it can be reached from other devices on the local network without setting the `HOST` environment variable

### Fixed

- Fixed the web server instructing browsers to upgrade insecure HTTP subresource requests to HTTPS, which broke the page's styling when the server was accessed on a non-localhost host with no TLS listener configured

## [0.8.0] - 2026-07-10

### Changed

- The web server now binds to `127.0.0.1` (loopback only) by default instead of `0.0.0.0`, since it has no authentication layer of its own; set the `HOST` environment variable to allow connections from other machines
- Solving and rendering large mazes, and mazes with many bridge crossings, is now noticeably faster

### Removed

- Removed the unused batch maze/PDF generation API, which had no consumer in the CLI or the web app

### Fixed

- Fixed a denial-of-service issue where a single maze generation, preview, or send request with very large width/height values could exhaust the server's memory and crash it; maze dimensions are now capped at 200×200
- Fixed the web page's "Send to reMarkable" and pairing forms sometimes failing silently on a network error, with no visible feedback to the user

### Security

- Added standard HTTP security headers (Content-Security-Policy, X-Frame-Options, and others) to all web server responses
- Updated the static file-serving dependency to fix two known moderate-severity vulnerabilities

## [0.7.0] - 2026-07-10

### Added

- The web configuration form now remembers your last-used width, height, difficulty, maze type, generation algorithm, solution display mode, and "show solution on preview" choice, and pre-fills them automatically the next time you visit — a first-time visit, or one with no stored preferences, still shows the previous default values

### Fixed

- The reMarkable target folder entered on the web configuration form is now remembered across visits, just like the other form fields, instead of being cleared every time
- The web server now logs an explicit message before shutting down (on Ctrl+C, a stop signal, or an unexpected internal error), instead of sometimes disappearing silently with just a bare "Terminated" in the terminal
- The maze sent to reMarkable now always matches the one shown in the web preview and available for PDF download, instead of sometimes being a different maze generated with a different random seed; the preview now also displays its seed so it can be confirmed at a glance
- Running the web server or the command-line tool from a real production build (instead of the day-to-day development mode) no longer crashes on startup; short commands are now available to build once and then start each one instantly, with the reMarkable Cloud upload feature working correctly in that mode too

## [0.6.0] - 2026-07-10

### Added

- Users can now choose the maze generation algorithm — growing tree (the previous default, unchanged), Kruskal, Wilson, or Aldous-Broder — via a new "Generation algorithm" option on the web configuration form and a new `--algorithm` option on the command line; the "bridge crossing" maze type still requires the growing tree algorithm and is rejected with a clear message for the other three
- Users can now generate a "circle" maze type, laid out as concentric rings with more sectors added ring by ring — always an exact multiple of the ring inside it, so every ring's cells line up cleanly with the ring inside it instead of drifting out of alignment — selectable from the web configuration form and the command line's `--type` option alongside the existing rectangle types; the entrance is marked with a visible opening at the center, sized as a real starting circle rather than a barely-visible dot (mirroring the exit's opening on the outer edge), and both openings point toward the top of the circle; the solution path follows the radius when crossing from one ring to the next instead of cutting across at an angle

## [0.5.0] - 2026-07-09

### Added

- Users can now choose whether the maze PDF generated from the web page includes its solution, and how (none, extra page, or overlay), with a new "Solution in PDF" option on the configuration form — applied consistently to both the downloaded PDF and the one sent to reMarkable Cloud; the same choice already available on the command line
- Users can now show the maze's solution directly on the web page preview with a "Show solution on preview" option, tracing the path in red and marking every branch point (where the path had another possible direction) with a circle, along with the total number of branch points found; leaving the option unchecked keeps the current preview unchanged
- When sending a maze from the web page without specifying a name, the file uploaded to reMarkable Cloud is now named after its type and dimensions (e.g. "rectangle 20x15") instead of including a seed number

### Changed

- The "bridge crossing" maze type's tube corridors are now noticeably wider, taking up more visual space than the walls between them, in both the PDF and the web preview
- The "bridge crossing" maze type's tube now has smoothly rounded corners everywhere a corridor turns, dead-ends, or branches, instead of sharp right angles, in both the PDF and the web preview; straight passages and bridge crossings are unchanged
- Generated mazes now have noticeably longer dead-end branches on average, at every difficulty level, instead of many short 1-2 cell dead ends — the maze stays just as connected and just as hard to solve at each difficulty setting

## [0.4.0] - 2026-07-09

### Added

- Users can now generate a maze PDF through the web API by sending its parameters (size, seed, difficulty, and solution display mode) to `POST /api/mazes/generate`, receiving the PDF directly in response
- Users can now configure a maze (width, height, difficulty) through a form on the web page and see an image preview of the generated maze right after submitting, with invalid input rejected before any request is sent
- Users can now download the maze PDF generated through the web page with a dedicated download link, shown once a preview has been generated
- Users can now send the maze generated through the web page directly to their reMarkable Cloud account with a "Send to reMarkable" button; if the browser isn't paired yet, a guided one-time pairing form appears and the send retries automatically once pairing succeeds (the same pairing used by the command line also works on the web)
- Users can now include the maze's solution in the PDF produced by `remarkable-maze generate` and `remarkable-maze generate-and-send` with `--solution <none|extra-page|overlay>`; omitting it keeps the current behavior of no solution, and an unsupported value returns a clear error listing the valid choices
- The web maze configuration page now has a polished visual design — a styled form, error message, maze preview, and download/send buttons that stay readable on both desktop and mobile screens
- Users can now specify a target reMarkable Cloud folder before sending a maze from the web page; leaving it empty keeps the current behavior of uploading to the account root, and a folder that doesn't exist yet shows a clear error
- Users can now generate a "bridge crossing" maze type, alongside the existing classic type, drawn as a real hollow tube where some real, walkable corridors visibly duck underneath one another like a bridge — selectable with `--type <rectangle|rectangle-crossing>` on the command line, or from a new maze type dropdown on the web page; the maze keeps exactly one solution as before, and every corridor shown remains genuinely reachable

## [0.3.0] - 2026-07-09

### Added

- Users can now generate a maze PDF and upload it to their reMarkable Cloud account in a single command with `remarkable-maze generate-and-send --width <n> --height <n>`, keeping the local PDF and reporting a clear error if the upload fails after generation succeeds
- Users can now control how hard a maze is to solve with a `--difficulty` option (1 to 5, defaults to 1) on the maze generation command — higher values produce more branch points and decision points
- Generated maze PDFs now display the parameters used to create them (maze type, dimensions, seed, and difficulty) in a small footer, so the exact same maze can be regenerated later

## [0.2.0] - 2026-07-08

### Added

- Users can now upload a local PDF file to their reMarkable Cloud account directly from the command line with `remarkable-maze send <file>`, with a guided one-time pairing prompt on first use
- Users can now send a PDF into a specific reMarkable Cloud folder with `remarkable-maze send <file> --folder <name>` (the folder must already exist)

### Changed

- Raised the minimum required Node.js version to 25+, needed by the updated reMarkable Cloud integration

### Fixed

- Fixed reMarkable Cloud uploads failing outright because the cloud service they relied on had been retired; uploads now go through reMarkable's current protocol and have been verified against a real account
- Fixed unclear error messages when reMarkable Cloud cannot be reached during authentication or upload

## [0.1.0] - 2026-07-08

### Added

- Users can now generate a maze by specifying its width, height, and a random seed, with the same seed always reproducing the same maze
- The system can now compute the solution path from a maze's entrance to its exit
- Users can now render a generated maze as a PDF sized for the reMarkable 2 tablet
- Users can now include the maze's solution in the PDF, either on a separate page or overlaid on the maze
- Users can now generate a batch of several mazes at once, as either one combined PDF (one maze per page) or several separate PDF files
- The system can now authenticate with reMarkable Cloud using a one-time pairing code, and reuses that pairing on later calls without asking for a new code
- Users can now upload a generated maze PDF directly to their reMarkable Cloud account
- Users can now generate a maze PDF from the command line with `remarkable-maze generate --width <n> --height <n>`, with an optional seed and output path

### Fixed

- Fixed the maze PDF being drawn as a fully closed rectangle, with no visible entrance or exit opening

[Unreleased]: https://github.com/neolao/remarkable-maze-generator/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/neolao/remarkable-maze-generator/releases/tag/v0.1.0
