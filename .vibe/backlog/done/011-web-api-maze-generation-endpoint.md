---
status: done
depends_on: [003]
---
# Web API Maze Generation Endpoint

## Description
Add an HTTP endpoint to `packages/web` that generates a maze PDF using the `core` package, accepting generation parameters (size/difficulty) via the request and returning the resulting PDF or a reference to it.

## Acceptance Criteria
- [ ] A request with valid parameters returns a generated maze PDF
- [ ] A request with invalid parameters returns a 4xx response with a clear error message
- [ ] The endpoint contains no maze/PDF generation logic itself — it only calls into `core`

## Notes
None.
