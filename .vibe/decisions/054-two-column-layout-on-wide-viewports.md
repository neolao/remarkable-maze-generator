---
date: 2026-07-12
status: accepted
---
# Two-column layout on wide viewports

**Context:** The web page (`packages/web/public/index.html` + `style.css`) centered a single fixed 640px column at every viewport width, with only one `@media (max-width: 600px)` breakpoint. Backlog item 034 asked for the layout to scale well across the full range from small mobile to wide desktop screens.

**Decision:** On wide viewports, the form card and the preview card are laid out side by side (form on the left, preview/actions on the right) instead of stacked in a single narrow column. An intermediate breakpoint is added so tablet-range widths transition progressively rather than jumping directly between the two-column desktop layout and the single-column mobile layout.

**Reason:** A single fixed-width centered column wastes most of the available width on large screens. Placing the form and the preview side by side lets both stay visible together without scrolling, and reads as a more deliberate, application-like layout. Confirmed with the Product Owner over a single wide column before implementing.

**Rejected alternatives:** Keeping a single column but widening its `max-width` — simpler and lower-risk, but still leaves the preview and form stacked vertically on desktop, forcing scrolling to see both at once on tall content; rejected because it doesn't meaningfully improve desktop usability, only desktop width usage.
