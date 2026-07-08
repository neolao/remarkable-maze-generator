---
date: 2026-07-09
status: accepted
---
# Web maze generation endpoint returns the PDF directly

**Context:** Adding a web API endpoint (backlog item 011) that generates a maze PDF from request parameters (size, difficulty, seed, solution display mode).

**Decision:** The endpoint generates the maze and streams the resulting PDF bytes directly in the HTTP response (`Content-Type: application/pdf`), rather than persisting the file server-side and returning a reference (id/URL) to it.

**Reason:** The generator is stateless and fast enough to run per-request; there is no other requirement yet to keep generated PDFs around server-side (no history, no re-download later). Returning the bytes directly also gives backlog item 013 (web PDF download) a working feature for free: the browser can trigger a download straight from the API response.

**Rejected alternatives:** Storing the generated PDF (in memory or on disk) and returning a reference/URL to fetch it separately — rejected as unnecessary complexity (needs cleanup/expiry policy) with no current requirement driving it.
