# Interface system

This direction applies to every Tiny Design Tools release.

## Principles

1. **Black-and-white chrome.** Interface surfaces use black, white, and neutral greys only. No fluorescent accents, decorative gradients, or colour-coded status UI.
2. **The input remains the subject.** Do not desaturate or recolour a user's image, page, asset, or recording unless colour manipulation is the tool's explicit function.
3. **Small, precise type.** Use compact sans-serif text for names and values, with monospaced uppercase labels for metadata and controls. Avoid oversized marketing typography. Nothing the interface itself sets is smaller than 10 px.
4. **Show text when needed.** Keep persistent copy to tool name, current input, active manipulation, proof, and essential privacy or export information. Reveal help and errors in context.
5. **Hairline structure.** Prefer one-pixel dividers, open grids, thin measurement marks, restrained two-pixel radii, and generous empty space.
6. **Monochrome states.** Use solid versus dashed rules, weight, opacity, and explicit labels to distinguish pass, warning, failure, focus, and disabled states.
7. **Quiet controls, practical targets.** Buttons look compact but retain keyboard focus, clear labels, and at least 44-pixel touch targets on narrow screens and on any touch device.
8. **One foundation.** Tokens, controls, and page chrome live in `src/tokens.css` and `src/ToolChrome.tsx`. A tool adds only what is specific to it.

## Core tokens

| Role | Value |
|---|---|
| Page | `#070707` |
| Surface | `#0b0b0b` |
| Raised surface | `#121212` |
| Inset (behind user images) | `#030303` |
| Hairline | `#292929` |
| Strong line | `#565656` |
| Primary text | `#f2f2f0` |
| Secondary text | `#9a9a96` |

Secondary text is about 7:1 against the page, which is what lets 10 to 11 px mono labels stay readable.

## Type and spacing

- Interface labels: 10 to 11 px, uppercase, monospaced, 0.06 to 0.08 em tracking.
- Names and supporting copy: 11 to 14 px.
- Tool title: 26 to 30 px. Collection title: up to 40 px.
- Primary numeric manipulation: up to 36 px.
- Default desktop content width: 1280 px maximum.
- Default section spacing: 36 to 64 px.
- Focus: a 2 px white outline with a 3 px offset.

### A deliberate change from 0.2

Earlier releases set labels at 8 to 9 px. That was the system's most distinctive choice and also its least usable one: the type was hard to read on a normal screen and failed any reasonable accessibility review. The floor is now 10 px and the secondary text colour is lighter. The hairlines, monochrome palette, mono labels, and restrained radii are unchanged, so the character holds. The three sizes are tokens (`--fs-label`, `--fs-meta`, `--fs-body`) in `src/tokens.css`.

## Proof frames

Every 1280 × 640 export uses the same monochrome chrome. It includes the tool name, one concrete finding, the real transformed input, and a small repository mark. Diagnostic marks remain white; warnings use dashed marks and explicit wording. Text in a proof frame is at least 13 px, because a frame is usually seen shrunk in a feed.

## Reference qualities

The visual direction is grounded in the user-provided reference set: technical instrument panels, small typographic specifications, high-contrast monochrome mobile surfaces, hairline grids, and restrained rounded geometry. The references are used as local visual guidance only and are not redistributed with the repository.
