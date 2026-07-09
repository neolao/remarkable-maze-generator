# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Users can now generate a maze PDF through the web API by sending its parameters (size, seed, difficulty, and solution display mode) to `POST /api/mazes/generate`, receiving the PDF directly in response
- Users can now configure a maze (width, height, difficulty) through a form on the web page and see an image preview of the generated maze right after submitting, with invalid input rejected before any request is sent
- Users can now download the maze PDF generated through the web page with a dedicated download link, shown once a preview has been generated
- Users can now send the maze generated through the web page directly to their reMarkable Cloud account with a "Send to reMarkable" button; if the browser isn't paired yet, a guided one-time pairing form appears and the send retries automatically once pairing succeeds (the same pairing used by the command line also works on the web)
- Users can now include the maze's solution in the PDF produced by `remarkable-maze generate` and `remarkable-maze generate-and-send` with `--solution <none|extra-page|overlay>`; omitting it keeps the current behavior of no solution, and an unsupported value returns a clear error listing the valid choices
- The web maze configuration page now has a polished visual design — a styled form, error message, maze preview, and download/send buttons that stay readable on both desktop and mobile screens
- Users can now specify a target reMarkable Cloud folder before sending a maze from the web page; leaving it empty keeps the current behavior of uploading to the account root, and a folder that doesn't exist yet shows a clear error
- Users can now generate a "bridge crossing" maze type, alongside the existing classic type, drawn as thick, rounded curvy corridors where some real, walkable corridors tunnel underneath one another like a bridge — selectable with `--type <rectangle|rectangle-crossing>` on the command line, or from a new maze type dropdown on the web page; the maze keeps exactly one solution as before, and every corridor shown remains genuinely reachable

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

[Unreleased]: https://github.com/neolao/remarkable-maze-generator/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/neolao/remarkable-maze-generator/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/neolao/remarkable-maze-generator/releases/tag/v0.1.0
