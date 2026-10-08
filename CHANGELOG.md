# Changelog

## 0.2.1

### Added

- A collection header and footer on every tool: back to the collection, link to the source of that tool, the author, and the next tool.
- Crop Proof: click or drag anywhere on the image to place the focal point, drop or paste an image, and see the share of the source each crop keeps.
- Author, source, and portfolio links on the gallery; a favicon; and social preview metadata for every page.
- `CHANGELOG.md` and `pnpm capture:proofs`, which regenerates the proof frames through each tool's own export button and checks they are exactly 1280 × 640.

### Fixed

- **Copy Stress: the STRESS PAGE link was broken.** React 19 replaced its `javascript:` address with an error stub, so dragging it to the bookmarks bar saved a bookmark that failed. Fixed in #2.
- Copy Stress: the bookmarklet's text was garbled on pages that declare no character encoding.
- Copy Stress: COPY LAUNCHER now confirms, and reports a failure instead of staying silent.
- Crop Proof: a corrupt image now shows a message and returns to the start, instead of a broken preview.
- PNG downloads release their object URL after the download starts, which some browsers need.
- Touch targets are at least 44 px on every touch device, not only below 560 px wide. Copy Stress had 28 to 34 px controls, and the back link was 9 px tall.
- The `theme-color` meta tag now matches the page background.

### Changed

- Interface type is at least 10 px (it was 8 px), and secondary text is lighter. See [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md#a-deliberate-change-from-02).
- Tokens, controls, and page chrome are shared from `src/tokens.css` and `src/ToolChrome.tsx`. They were previously copied three times with small differences.
- The gallery is a responsive grid built from one tool registry, so adding a tool is one entry.
- Proof frames use larger text so they stay readable when shrunk.
- Focus rings are 2 px.

## 0.2.0

- Copy Stress.

## 0.1.0

- Crop Proof and the collection gallery.
