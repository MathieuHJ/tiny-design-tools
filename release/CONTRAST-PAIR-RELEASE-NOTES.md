# Contrast Pair · v0.8.0

The sixth Tiny Design Tool checks text against a solid background and finds the nearest passing foreground by HSL lightness.

- Paste hex, use native colour pickers, or sample a local screenshot or photograph.
- Preview the original and passing pair in real text.
- Check WCAG 2.2 AA normal, AA large, and AAA normal text targets using exact ratios.
- Read signed APCA Lc as separate beta advisory information.
- Apply the correction, copy CSS, share a pair link, or export a 1280 × 640 proof.

All processing remains local. Interface chrome follows the collection's monochrome design system. Tool code is MIT; APCA retains its Limited W3 licence and attribution.

Limits: opaque sRGB pairs only; image samples downscale to 1200 px, compositing transparency onto white. A pair ratio does not certify a whole page. Some backgrounds cannot meet 7:1 and are reported explicitly.

Verified with 75 unit tests, lint, typecheck, production build, and real Chrome interactions at desktop and 390 px. Browser checks cover exact threshold boundaries, saturated colours, lightness endpoints, image pixels, keyboard, invalid input, reset, clipboard, shared state, and the actual 1280 × 640 export. No external requests occur during manipulation.
