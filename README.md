# Tiny Design Tools

Small, public, open-source instruments for visual work.

Each tool accepts real design input, performs one visible manipulation, and exports useful proof. Everything runs locally in the browser without accounts, uploads, analytics, paid APIs, or a backend.

The root gallery is the collection index. Every tool also has a permanent direct URL and an independent application entry point, so opening one tool loads that tool rather than the rest of the collection.

The collection follows a permanent [black-and-white interface system](./DESIGN-SYSTEM.md): small type, hairline structure, minimal persistent copy, and the user's work kept visually dominant.

## Use it

- [Open the collection](https://mathieuhj.github.io/tiny-design-tools/)
- [Open Crop Proof directly](https://mathieuhj.github.io/tiny-design-tools/crop-proof/)
- [Open Copy Stress directly](https://mathieuhj.github.io/tiny-design-tools/copy-stress/)

## Released

| Tool | Input | Manipulation | Export |
|---|---|---|---|
| [Crop Proof](./tools/crop-proof/README.md) | PNG, JPEG, or WebP | One linked focal point across six fixed crops | 1280 × 640 PNG crop sheet and CSS `object-position` |
| [Copy Stress](./tools/copy-stress/README.md) | A live page via bookmarklet | Apply hostile copy modes | 1280 × 640 PNG diagnostic proof |

## Run it

```sh
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173/crop-proof/` or `http://127.0.0.1:5173/copy-stress/`. The root URL contains the gallery. The public build is deployed automatically from `main` by GitHub Actions.

## Validate it

```sh
pnpm check
pnpm capture
```

`pnpm check` runs lint, three representative tests, TypeScript, and the production build. `pnpm capture` rebuilds the site, runs the real browser interaction, exports the proof frame, and prepares a 9-second release capture in `release/`.

## Repository shape

- `src/`: independent gallery entry point and site styling
- `tools/`: one isolated folder and application entry point per released tool
- `crop-proof/`: static deep-link entry for GitHub Pages
- `release/`: reviewed release media and draft copy
- `DESIGN-SYSTEM.md`: visual rules shared by every tool

Shared abstractions will be added only after a second tool demonstrates a real repeated need.

GitHub Pages builds use the repository name supplied by GitHub as the Vite base path. This lets the collection remain deployable if the repository is forked or renamed.

## Privacy

User files are decoded with browser APIs and remain on the device. The project contains no telemetry, upload endpoint, account system, cookies, or remote font requests.

## License

Project code and original synthetic fixtures are available under the [MIT License](./LICENSE). Direct runtime dependencies are MIT-licensed. The local development toolchain uses MIT and Apache-2.0 packages; details are in [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).
