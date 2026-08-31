# Crop Proof v0.1 release review

Published on 31 August 2026 at [mathieuhj.github.io/tiny-design-tools](https://mathieuhj.github.io/tiny-design-tools/). Source is public at [github.com/MathieuHJ/tiny-design-tools](https://github.com/MathieuHJ/tiny-design-tools). The prepared X draft has not been posted.

## What works

- Black, white, and neutral-grey interface chrome with compact typography and contextual copy.
- Original input colour preserved so the user's work remains the subject.
- Local PNG, JPEG, and WebP loading with no network upload.
- One pointer-draggable and keyboard-movable focal point.
- Linked avatar, card, square, mobile hero, desktop hero, and Open Graph previews.
- Copyable CSS `object-position`.
- Real 1280 × 640 PNG crop-sheet export.
- Static root gallery and `/crop-proof/` production deep link.

## Automated evidence

Command: `pnpm check`

| Check | Result |
|---|---|
| ESLint | Pass |
| Vitest | 3 tests passed |
| TypeScript | Pass |
| Vite production build | Pass, 34 modules transformed |

The three tests cover the normal editorial crop, the hostile 4096 × 192 panorama, corrupted dimensions, clamped focal values, and rejected file inputs.

## Browser evidence

| Pass | Result |
|---|---|
| Desktop, 1440 × 1000 | Monochrome workbench and six crops rendered; no horizontal overflow |
| Narrow, 390 × 844 | Responsive single-column proof; no horizontal overflow; 44 px touch targets |
| Keyboard | Arrow changed 81% / 38% to 80% / 43%; Shift moved by 5% |
| Reduced motion | Browser preference detected; CSS removes transitions and animation |
| Focus | White 1 px focus ring with 4 px offset on the compact file control |
| Clipboard | Modern API plus local fallback; control confirms COPIED |
| Hostile panorama | Actual 1019 × 47.8 px contained image bounds used for crosshair math; no page overflow |
| Invalid file | PDF rejected with a visible, specific error |
| Export | 1280 × 640 PNG |
| Capture | H.264 MP4, 1280 × 720, 9.23 seconds |
| Browser console | No errors in a clean in-app-browser pass |

## Release media

- `crop-proof-proof.png`: the required standalone 1280 × 640 proof frame.
- `crop-proof-product.png`: 1440 × 1000 product screenshot after the real interaction.
- `crop-proof-capture.mp4`: 9.23-second input, manipulation, and proof capture.
- `crop-proof-capture.webm`: browser-native capture source.
- `X-DRAFT.md`: post copy prepared after the tool passed validation.

## License evidence

The code, original fixtures, React, and Phosphor icons are MIT-licensed. Installed development dependencies in direct use are MIT or Apache-2.0. No private, client, stock, or remotely hosted assets are included.

## Limitation

Crop Proof preserves a focal point rather than subject bounds. A large subject can remain partially clipped.

## v0.2 list

- Subject-safe radius.
- Zoomed source loupe for extreme aspect ratios.
- Saved custom preset packs.

## Review decision

Mathieu approved the public repository and GitHub Pages deployment. Posting to X remains a separate approval. The implementation produced no evidence requiring a roadmap score, V1 scope, or release-order change.
