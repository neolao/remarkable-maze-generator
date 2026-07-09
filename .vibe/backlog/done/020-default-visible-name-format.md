---
status: done
---
# Default Visible Name Format

## Description
The web send-to-reMarkable endpoint already computes a default visible name via `defaultVisibleName` (`packages/web/src/remarkable-routes.ts`), currently formatted as `${type}-${width}x${height}-${seed}`. Update this default so it reads `"{type} {width}✕{height}"` (space-separated, using the multiplication sign ✕ between width and height, and no seed), while still letting the user override it by supplying their own visible name.

## Acceptance Criteria
- [ ] When no visible name is provided in the send request, the uploaded PDF's default name follows the exact pattern `{type} {width}✕{height}` (e.g. `classic 20✕15`)
- [ ] The seed is no longer included in the generated default name
- [ ] A caller-supplied visible name still takes precedence over the computed default
- [ ] Existing tests covering `defaultVisibleName` / the send route are updated to match the new format, and new tests cover the nominal case plus at least one edge case (e.g. missing/unknown maze type)

## Notes
Function to update: `defaultVisibleName` in `packages/web/src/remarkable-routes.ts:25-27`. The ✕ character (U+2715) must be used literally, not a plain "x". Confirm whether the CLI's own default-name logic (`packages/cli/src/send.ts`, `packages/cli/src/generate-and-send.ts`) should also change — the user's request only mentioned "l'envoi au reMarkable" via the web page, so scope this to the web package unless review reveals shared logic.
