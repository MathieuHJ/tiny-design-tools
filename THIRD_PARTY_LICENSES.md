# Third-party license summary

Checked locally against the installed package metadata on 31 August 2026.
APCA and its transitive package were added and checked on 17 October 2026.

## Runtime

| Package | Version | License |
|---|---:|---|
| React | 19.1.1 | MIT |
| React DOM | 19.1.1 | MIT |
| Phosphor Icons for React | 2.1.10 | MIT |
| apca-w3 | 0.1.9 | [Limited W3 License](./public/licenses/apca-w3-LICENSE.txt), © Andrew Somers / Myndex; web-content use restrictions apply |
| colorparsley (transitive dependency) | 0.1.8 | [AGPL v3](./public/licenses/colorparsley-LICENSE.txt); the parser is unused and tree-shaken from the production application |

Contrast Pair imports the upstream `APCAcontrast` and `sRGBtoY` functions without changing the algorithm or constants. APCA is used for web-content contrast and is not covered by this repository's MIT licence. The full APCA notice is distributed at `public/licenses/apca-w3-LICENSE.txt` and linked from the tool. Its [upstream source](https://github.com/Myndex/apca-w3) and [integration requirements](https://git.apcacontrast.com/documentation/minimum_compliance.html) remain authoritative. The transitive parser's source is [colorparsley](https://github.com/Myndex/colorparsley).

## Development and release tooling

| Package group | License |
|---|---|
| Vite, Vitest, ESLint, TypeScript ESLint, React lint plugins, globals | MIT |
| TypeScript, Playwright | Apache-2.0 |
| Type definitions for Node, React, and React DOM | MIT |

The hostile panoramic fixture and the Squint demo page (its layout and text) were created for this repository and are covered by the repository MIT license.

## Photographs

The demo photographs are from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). They are **not** covered by the MIT license, and the copyright in each belongs to its photographer. Each is credited in [CREDITS.md](./CREDITS.md). The Squint demo page embeds one of them.

No client assets, private screenshots, or remote fonts are included.
