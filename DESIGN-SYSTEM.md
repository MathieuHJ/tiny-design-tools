# Interface system

This direction applies to every Tiny Design Tools release.

## Principles

1. **Black-and-white chrome.** Interface surfaces use black, white, and neutral greys only. No fluorescent accents, decorative gradients, or colour-coded status UI.
2. **The input remains the subject.** Do not desaturate or recolour a user's image, page, asset, or recording unless colour manipulation is the tool's explicit function.
3. **Small, precise type.** Use compact sans-serif text for names and values, with monospaced uppercase labels for metadata and controls. Avoid oversized marketing typography.
4. **Show text when needed.** Keep persistent copy to tool name, current input, active manipulation, proof, and essential privacy or export information. Reveal help and errors in context.
5. **Hairline structure.** Prefer one-pixel dividers, open grids, thin measurement marks, restrained two-pixel radii, and generous empty space.
6. **Monochrome states.** Use solid versus dashed rules, weight, opacity, and explicit labels to distinguish pass, warning, failure, focus, and disabled states.
7. **Quiet controls, practical targets.** Buttons look compact but retain keyboard focus, clear labels, and at least 44-pixel touch targets on narrow screens.

## Core tokens

| Role | Value |
|---|---|
| Page | `#070707` |
| Surface | `#0b0b0b` |
| Raised surface | `#111111` |
| Hairline | `#292929` |
| Strong line | `#565656` |
| Primary text | `#f2f2f0` |
| Secondary text | `#8c8c88` |

## Type and spacing

- Interface labels: 8 to 9 px, uppercase, monospaced, 0.06 to 0.08 em tracking.
- Names and supporting copy: 9 to 12 px.
- Tool title: 20 to 28 px.
- Primary numeric manipulation: up to 32 px.
- Default desktop content width: 1280 px maximum.
- Default section spacing: 36 to 56 px.

## Proof frames

Every 1280 × 640 export uses the same monochrome chrome. It includes the tool name, one concrete finding, the real transformed input, and a small repository mark. Diagnostic marks remain white; warnings use dashed marks and explicit wording.

## Reference qualities

The visual direction is grounded in the user-provided reference set: technical instrument panels, small typographic specifications, high-contrast monochrome mobile surfaces, hairline grids, and restrained rounded geometry. The references are used as local visual guidance only and are not redistributed with the repository.
