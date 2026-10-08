# Tiny Design Tools

Small, public, open-source instruments for visual work.

Each tool accepts real design input, performs one visible manipulation, and exports useful proof. Everything runs locally in the browser without accounts, uploads, analytics, paid APIs, or a backend.

The root gallery is the collection index. Every tool also has a permanent direct URL and an independent application entry point, so opening one tool loads that tool rather than the rest of the collection.

The collection follows a permanent [black-and-white interface system](./DESIGN-SYSTEM.md): small type, hairline structure, minimal persistent copy, and the user's work kept visually dominant.

## Use it

- [Open the collection](https://mathieuhj.github.io/tiny-design-tools/)
- [Open Crop Proof directly](https://mathieuhj.github.io/tiny-design-tools/crop-proof/)
- [Open Copy Stress directly](https://mathieuhj.github.io/tiny-design-tools/copy-stress/)
- [Open Squint directly](https://mathieuhj.github.io/tiny-design-tools/squint/)

## Released

| Tool | Input | Manipulation | Export |
|---|---|---|---|
| [Crop Proof](./tools/crop-proof/README.md) | PNG, JPEG, or WebP | One linked focal point across six fixed crops | 1280 × 640 PNG crop sheet and CSS `object-position` |
| [Copy Stress](./tools/copy-stress/README.md) | A live page via bookmarklet | Apply hostile copy modes | 1280 × 640 PNG diagnostic proof |
| [Squint](./tools/squint/README.md) | A screenshot (PNG, JPEG, or WebP) | Blur strength, tone, and contrast points | 1280 × 640 PNG, original beside squinted |

## Run it

```sh
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173/crop-proof/`, `/copy-stress/`, or `/squint/`. The root URL contains the gallery. The public build is deployed automatically from `main` by GitHub Actions.

## Validate it

```sh
pnpm check
pnpm capture
```

`pnpm check` runs lint, the test suite, TypeScript, and the production build. `pnpm capture:proofs` drives each tool in a real browser, uses its own export button, and checks that every proof frame is exactly 1280 × 640. `pnpm capture` and `pnpm capture:copy-stress` also prepare a release video.

## Repository shape

- `src/`: the gallery, plus the code every tool shares: design tokens and page chrome (`tokens.css`, `ToolChrome.tsx`), the tool registry (`tools.ts`), and small helpers for copying, downloading, and image intake
- `tools/`: one isolated folder and application entry point per released tool
- `crop-proof/`, `copy-stress/`, `squint/`: static deep-link entries for GitHub Pages
- `release/`: reviewed release media and draft copy
- `DESIGN-SYSTEM.md`: visual rules shared by every tool

A tool's name, number, and summary live once in `src/tools.ts`. The gallery, headers, and footers all read from it, so adding a tool does not mean editing each of them.

GitHub Pages builds use the repository name supplied by GitHub as the Vite base path. This lets the collection remain deployable if the repository is forked or renamed.

## Privacy

User files are decoded with browser APIs and remain on the device. The project contains no telemetry, upload endpoint, account system, cookies, or remote font requests.

## Contributing

See the [contributor guide](./CONTRIBUTING.md) for local setup, validation, browser checks, and safe bug reports.

## License

Project code and original synthetic fixtures are available under the [MIT License](./LICENSE). Direct runtime dependencies are MIT-licensed. The local development toolchain uses MIT and Apache-2.0 packages; details are in [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).
