# Overlay Check · v0.9.0

The seventh Tiny Design Tool places real text on a local photograph and finds the scrim it needs.

- Open, drop, or paste a local photo; move/resize a text region with pointer or keyboard.
- Choose white/black text, AA normal/large or AAA normal contrast, and a bottom/top/uniform scrim.
- Check every source pixel in the full rectangle. See the worst contrast and exact failing count.
- Apply the minimum whole-percent scrim; copy its CSS gradient and responsive text region.
- Save the full-resolution flattened image or export a 1280 × 640 before/after proof.

All processing stays local. The exact scan runs in a Web Worker. Chrome follows the monochrome interface system. The demo improves from 1.66:1 to at least 4.51:1 with a 41% black scrim.

Limits: opaque white/black text over the checked photo/aspect ratio; up to 25 MB and 12 megapixels. Analysis covers the full text box and uses conservative 8-bit rounding. Recheck after cropping or responsive repositioning. Empty/clipped text cannot be exported.

Includes original/current proof, real interaction video, social card, documentation and original-photo credit.

Verified: 89 unit tests, lint, typecheck, both local and repository-base production builds, plus real Chrome checks at desktop and 390 px. Browser checks cover an isolated source-pixel failure, actual rendered CSS contrast, worker updates, pointer/keyboard placement, clipping, clipboard, image errors/reset, original-resolution PNG, 1280 × 640 proof, and zero external processing requests.
