# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/neolao/remarkable-maze-generator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/neolao/remarkable-maze-generator/releases/tag/v0.1.0
