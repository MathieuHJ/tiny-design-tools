# Copy Stress feedback fixes

The feedback proposed eight concrete examples (despite calling them twelve) and predicted that the outline would catch about half. That prediction was not a measured result.

The useful distinction is between test input and a failure. Emoji-only names, a four-word button, a URL and a large price are valid content. They need a finding only when the layout cannot contain them. Tiny text and missing labels need their own checks because neither must overflow.

This update adds an original-content inspection mode, broadens overflow checks, and flags missing visible required-field labels and text below 10px for review. The 10px threshold is a readability heuristic, not a WCAG rule. It also repairs restore/reset and outline lifecycle behavior, keeps joined emoji intact in RTL stress transforms, and makes the simulation export's scope explicit.

The regression suite uses synthetic versions of all eight examples plus passing controls and interrupted/repeated bookmarklet flows. No customer page data is included.

## Verification

- Initial `pnpm check`: lint, all 90 unit tests, TypeScript and production build passed.
- The real-browser runtime suite covers the synthetic feedback cases and compares the old and new expansion findings. The UI suite covers all six modes at desktop and 390px, resizing, and real 1280 × 640 PNG exports.
- Browser checks run on the Copy Stress browser regression pull-request workflow. Its logs and artifacts provide the verification record; a test definition alone is not evidence of a pass.
- No measured detection percentage is claimed. A long string or emoji-only name can be valid when the layout fits it.
- Production deployment follows passing checks and explicit maintainer approval.
