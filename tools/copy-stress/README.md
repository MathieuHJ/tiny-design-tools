# Copy Stress

Find the copy that turns a finished interface into a broken one.

| ① Input | ② Stress | ③ Proof |
|---|---|---|
| Open a real page | Apply hostile copy locally | Export the visible failures |

Copy Stress is a bookmarklet plus a local simulation surface. Drag **STRESS PAGE** to the browser bookmarks bar, open the page you want to review, then run it. The injected panel applies one mode at a time and outlines regular DOM text elements that overflow or become empty.

## V0.1 modes

- 2× copy
- Empty strings
- Accented copy
- Right-to-left text
- Unbroken strings

The web surface exports a 1280 × 640 PNG proof frame. The bookmarklet's **DOWNLOAD JSON** action exports a local selector report with the current URL, mode, finding type, selector, transformed text, and viewport coordinates.

## Privacy

The bookmarklet reads and changes page text in the current browser tab only. It has no account, upload, analytics, or backend. Nothing leaves the device.

## Limitation

Strict Content Security Policies can block the bookmarklet. V0.1 reads regular DOM text only; it does not inspect iframes, canvas, Shadow DOM, or translation systems.
