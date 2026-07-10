---
status: done
---
# Remember Form Fields via Cookies

## Description
The web maze configuration form (`packages/web/public/index.html`) currently always resets to its default values (width 10, height 10, difficulty 1, rectangle type, growing-tree algorithm, no solution) on every page load, forcing the user to re-enter their preferred settings each visit. This task uses cookies to remember the user's last-used form values and pre-fill the form with them on the next visit.

## Acceptance Criteria
- [ ] After submitting the form once, reloading the page pre-fills every field (width, height, difficulty, maze type, algorithm, solution mode, show-solution checkbox) with the previously submitted values instead of the hardcoded defaults
- [ ] A first-time visitor with no cookie set sees the current default values, unchanged from today's behavior
- [ ] Values are persisted via a cookie (not `localStorage`/`sessionStorage`), so they survive a full browser restart
- [ ] Manually clearing the cookie (or its expiry) restores the default form values on the next visit

## Notes
Relevant file: `packages/web/public/app.js` (form handling logic) and `packages/web/public/index.html` (form fields: `width`, `height`, `difficulty`, `maze-type`, `maze-algorithm`, `solution-mode`, `show-solution`). This is purely client-side state (no server-side session needed) — writing/reading the cookie from `app.js` on submit/load should suffice. Consider a reasonable cookie expiry (e.g. one year) and keep the stored value scoped to form preferences only (no PII, no reMarkable credentials — those must stay out of cookies per the project's "never hardcode secrets" constraint).
