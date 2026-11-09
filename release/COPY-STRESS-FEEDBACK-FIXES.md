# Copy Stress feedback fixes

The feedback proposed eight concrete examples (despite calling them twelve) and predicted that the outline would catch about half. That prediction was not a measured result.

The useful distinction is between test input and a failure. Emoji-only names, a four-word button, a URL and a large price are valid content. They need a finding only when the layout cannot contain them. Tiny text and missing labels need their own checks because neither must overflow.

This update adds an original-content inspection mode, broadens overflow checks, and flags missing visible required-field labels and text below 10px for review. The 10px threshold is a readability heuristic, not a WCAG rule. It also repairs restore/reset and outline lifecycle behavior, keeps joined emoji intact in RTL stress transforms, and makes the simulation export's scope explicit.

The regression suite uses synthetic versions of all eight examples plus passing controls and interrupted/repeated bookmarklet flows. No customer page data is included.

## Verification

- `pnpm check`: lint, all 90 unit tests, TypeScript and production build passed.
- `pnpm test:copy-stress-runtime`: browser regressions are implemented but could not execute in the editing environment because Chromium's required socket could not be created. The supported browser also could not reach the local test server. No browser pass rate or measured before/after detection percentage is claimed.
- Run the browser suite before merging. Use `COMPARE_BASELINE=1 pnpm test:copy-stress-runtime` to print the old and new expansion findings for the same synthetic fixture.
- No production merge or deployment is part of this change.
