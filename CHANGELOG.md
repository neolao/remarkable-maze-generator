# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Users can now generate a maze by specifying its width, height, and a random seed, with the same seed always reproducing the same maze
- The system can now compute the solution path from a maze's entrance to its exit
- Users can now render a generated maze as a PDF sized for the reMarkable 2 tablet
- Users can now include the maze's solution in the PDF, either on a separate page or overlaid on the maze
- Users can now generate a batch of several mazes at once, as either one combined PDF (one maze per page) or several separate PDF files
- The system can now authenticate with reMarkable Cloud using a one-time pairing code, and reuses that pairing on later calls without asking for a new code
