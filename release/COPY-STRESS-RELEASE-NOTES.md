# Copy Stress v0.2.0

Copy Stress is a small local bookmarklet for making fragile interface copy visible.

## What it does

- Applies five real copy stress modes: 2× copy, empty strings, accented copy, RTL, and unbroken strings.
- Outlines regular DOM elements that overflow or become empty.
- Keeps the result local to the current tab.
- Exports a 1280 × 640 PNG proof from the companion surface and a selector-level JSON report from the bookmarklet.

## Included proof

- `copy-stress-proof.png` — representative unbroken-copy failure frame.
- `copy-stress-capture.mp4` — a short real interaction capture.

## V0.1 limits

It examines regular DOM text only. It does not inspect iframes, canvas, Shadow DOM, or translation systems. Sites with a strict Content Security Policy can block the bookmarklet.
