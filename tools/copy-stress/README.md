# Copy Stress

Find copy that makes an interface fragile.

| ① Input | ② Stress | ③ Review |
|---|---|---|
| Open a real page | Inspect existing copy or apply hostile copy locally | Review outlined findings and export a report |

Copy Stress is a bookmarklet plus a small simulation surface. Drag **STRESS PAGE** to the browser bookmarks bar, open the page you want to review, then run it. If dragging is awkward, **COPY LAUNCHER** copies the same script to paste as a new bookmark's URL.

Use **ORIGINAL** to inspect existing content without rewriting it. Then compare the five stress modes:

- 2× copy
- Empty strings
- Accented copy
- Right-to-left text
- Unbroken strings

RTL reverses grapheme clusters and changes page direction as a visual stress test. It does not translate content or reproduce every behavior of natural right-to-left languages. Emoji sequences and combining marks stay together in browsers with `Intl.Segmenter`.

## What the outlines mean

- **OVERFLOW** identifies content exceeding its available box, including inline text inside constrained ancestors. Intentional truncation or scrolling may be acceptable; review the context.
- **EMPTY** identifies text removed by the empty-string stress mode. This is an induced state to review, not proof that the original page was broken.
- Missing visible labels on required fields are flagged even when the original label was already empty. An accessible name such as `aria-label` does not itself provide a visible label.
- Text smaller than 10px is a readability **review heuristic**. This is not a WCAG minimum-font-size rule or a compliance verdict.

A long name, URL, emoji-only name, four-word button or large price is not automatically an error. Wrapping and flexible layouts can handle them correctly. Copy Stress should flag geometry or a specific review concern, not reject the content itself.

Reset and Close restore text and the page's original `dir` attribute. Outlines track scrolling and resizing. Reports are cleared when the page is reset.

## Exports and privacy

The web simulation exports a 1280 × 640 PNG summary of its **demo fixture**, not an inspection of a user's page. For a real page, the bookmarklet's **DOWNLOAD JSON** exports a local report with its current URL, mode, findings, selectors, text and viewport coordinates.

Text changes and analysis run locally in the current browser tab. Launching the bookmarklet downloads its script from the tool's host; page content is not uploaded. There is no account, analytics or backend. Review and redact reports before sharing because URLs, selectors and text can contain private information.

## Regression cases

The browser regression suite covers the eight cases in the reported feedback (the message says twelve but lists eight):

1. `Donaudampfschifffahrtsgesellschaftskapitän` without breaks.
2. A 70-character URL.
3. An emoji-only display name, including joined emoji.
4. An empty label beside a required field.
5. Repeated wide `m` characters.
6. A four-word button.
7. Legal copy rendered at 6px.
8. A price with nine digits before the decimal.

Tests distinguish constrained, broken layouts from safe wrapping and fitting controls. They also cover Reset, Close, repeated mode changes, original page direction and moving outlines.

## Validation

`pnpm check` runs lint, unit tests, TypeScript and the production build. Run `pnpm test:copy-stress-runtime` separately for real Chromium regressions against synthetic DOM fixtures. Install the Playwright Chromium build with `pnpm exec playwright install chromium`, or set `CHROMIUM_PATH` to an existing Chromium executable. `COMPARE_BASELINE=1` also prints a comparison with the pre-fix runtime. Run `node scripts/test-copy-stress-ui.mjs` after `pnpm build` to check all six simulation modes at desktop and 390px, resize behavior, and real PNG exports. Both browser suites run in the pull-request workflow. The runtime remains ASCII-safe for pages with no declared encoding.

## Limits

This is a targeted layout and copy-review tool, not a complete accessibility or localization audit. It does not inspect iframes, canvas, Shadow DOM, generated CSS content, full accessible-name computation or translation systems. Strict Content Security Policies may block the launcher. Site scripts can replace content while testing; review the page and reload if a framework rewrites it. No finding is not proof that an interface is safe for every real-world string.
