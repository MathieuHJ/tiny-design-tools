# Contributing to Tiny Design Tools

Useful contributions include reproducible bug reports, accessibility fixes, browser compatibility improvements, and clearer instructions. Keep each pull request focused on one problem.

## Before proposing a change

Read the [project overview](README.md), [interface system](DESIGN-SYSTEM.md), and the relevant tool's documentation:

- [Crop Proof](tools/crop-proof/README.md)
- [Copy Stress](tools/copy-stress/README.md)
- [Squint](tools/squint/README.md)
- [Concentric](tools/concentric/README.md)

Preserve the local-only model: no accounts, uploads, analytics, remote fonts, paid APIs, or backend. UI chrome stays monochrome; user input retains its original colour. Discuss a new tool or substantial redesign in an issue before implementing it.

## Local setup

Use Node.js 24 and pnpm 11.8.0 to match the checked-in Pages workflow and `packageManager` field.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. The tool routes are `/crop-proof/`, `/copy-stress/`, `/squint/`, and `/concentric/`.

## Validate a change

```sh
pnpm check
```

This runs ESLint, Vitest, TypeScript, and the production build. Add or update a regression test when changing behaviour that can be tested automatically.

For interface changes, also check:

- Desktop and narrow screens, including 390px width, without unintended page overflow.
- Keyboard navigation, visible focus, meaningful control labels, and touch interaction.
- The actual export, not just its preview. Proof images should remain 1280 × 640.
- Invalid input and reset behaviour where relevant.
- No new upload or telemetry requests when manipulating user input.

To regenerate the proof frames used by the gallery and READMEs, and confirm each is exactly 1280 × 640:

```sh
pnpm capture:proofs
```

Optional release captures with video:

```sh
pnpm capture
pnpm capture:copy-stress
```

These scripts build and exercise the tools in a browser and write release artifacts. If Playwright reports a missing Chromium binary, install it with `pnpm exec playwright install chromium` and retry. Review generated files before including them in a PR.

## Adding a tool

After the idea is agreed in an issue:

1. Create `tools/<id>/` with its own `main.tsx`, component, styles, tests, and `README.md`. Import `src/tokens.css` first and keep tool-specific rules in the tool's own stylesheet.
2. Add one entry to `TOOLS` and the id to `ToolId` in `src/tools.ts`. The gallery, header, and footer read from it.
3. Add `<id>/index.html` (copy an existing one and change the title, description, canonical URL, and script path) and register it in the `input` list in `vite.config.ts`.
4. Use `ToolHeader` and `ToolFooter` from `src/ToolChrome.tsx`, and the shared helpers in `src/` for copying, downloading, and image intake.
5. Add the tool to `scripts/capture-proofs.mjs` so its proof frame is generated through the real export button, and add it to the gallery's `PREVIEWS` map.

## Report a bug safely

Include the tool, browser and version, viewport size, reproduction steps, expected result, and actual result. A synthetic or redacted fixture is preferable to a client file.

Copy Stress JSON reports can contain page URLs, selectors, and transformed text. Review and redact those before attaching a report. Never include tokens, private page content, or confidential design assets in a public issue.

## Open a pull request

Describe the problem, the change, and the checks you ran. Include before-and-after screenshots for visible changes and disclose checks you could not perform. Avoid unrelated formatting or generated release media.

The existing Pages workflow validates and deploys pushes to `main`; it does not currently run on pull requests. Run the checks locally and record the result rather than assuming an open PR has been tested by CI. Deployment remains a maintainer decision.
