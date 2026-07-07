---
date: 2026-07-08
status: accepted
---
# PDF page sized for the reMarkable 2

**Context:** The maze PDF renderer needs a page size matching the target reMarkable tablet screen so the maze fills the page without clipping or distortion.

**Decision:** Target the reMarkable 2 screen: 1404×1872 px at 226 dpi, giving a PDF page of approximately 447×596 points (portrait).

**Reason:** The reMarkable 2 is the most widely deployed model and the one the user confirmed as the target device.

**Rejected alternatives:** reMarkable Paper Pro (1620×2160 px at 229 dpi, ~509×679 pt) — rejected for this iteration since the user targets the reMarkable 2; can be revisited as a configurable page size later if support for other devices is needed.
