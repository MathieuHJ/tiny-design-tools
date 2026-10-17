export type Rgb = { r: number; g: number; b: number }

/** Hue is in degrees; saturation and lightness are fractions from 0 to 1. */
export type Hsl = { h: number; s: number; l: number }

/** Accept opaque CSS hex colours only. Alpha requires a known compositing surface. */
export function normalizeHex(value: string): string | null {
  const hex = value.trim()
  if (/^#[\da-f]{6}$/i.test(hex)) return hex.toUpperCase()
  if (/^#[\da-f]{3}$/i.test(hex)) {
    return `#${[...hex.slice(1)].map((channel) => channel + channel).join('').toUpperCase()}`
  }
  return null
}

export function hexToRgb(value: string): Rgb {
  const hex = normalizeHex(value)
  if (!hex) throw new RangeError('Use an opaque #RGB or #RRGGBB colour.')
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

/** WCAG 2.2 sRGB relative luminance, before display rounding. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const linear = (channel: number) => {
    const srgb = channel / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

function ratioForLuminances(first: number, second: number): number {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/** The returned value is deliberately unrounded: 4.499 does not pass 4.5. */
export function contrastRatio(foreground: string, background: string): number {
  return ratioForLuminances(relativeLuminance(foreground), relativeLuminance(background))
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  if ([r, g, b].some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    throw new RangeError('RGB channels must be finite numbers between 0 and 255.')
  }
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  const lightness = (maximum + minimum) / 2
  if (delta === 0) return { h: 0, s: 0, l: lightness }

  const saturation = Math.min(1, Math.max(0, delta / (1 - Math.abs(2 * lightness - 1))))
  let hue: number
  if (maximum === red) hue = ((green - blue) / delta) % 6
  else if (maximum === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4

  return { h: ((hue * 60) + 360) % 360, s: saturation, l: lightness }
}

export function hslToHex({ h, s, l }: Hsl): string {
  if (![h, s, l].every(Number.isFinite) || s < 0 || s > 1 || l < 0 || l > 1) {
    throw new RangeError('HSL needs a finite hue and saturation/lightness between 0 and 1.')
  }
  const hue = (((h % 360) + 360) % 360) / 60
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const second = chroma * (1 - Math.abs((hue % 2) - 1))
  const offset = l - chroma / 2
  const channels = hue < 1 ? [chroma, second, 0]
    : hue < 2 ? [second, chroma, 0]
      : hue < 3 ? [0, chroma, second]
        : hue < 4 ? [0, second, chroma]
          : hue < 5 ? [second, 0, chroma]
            : [chroma, 0, second]
  return `#${channels.map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/**
 * Find the closest passing 8-bit foreground along the original HSL lightness axis.
 * Both darker and lighter paths are searched, with hue and saturation fixed before
 * RGB quantisation. A returned hex is checked against the exact requested ratio.
 * null means even black and white cannot reach that ratio on this background.
 */
export function findPassingForeground(foreground: string, background: string, target: number): string | null {
  if (!Number.isFinite(target) || target < 1 || target > 21) {
    throw new RangeError('The contrast target must be between 1 and 21.')
  }
  const initial = normalizeHex(foreground)
  if (!initial) throw new RangeError('Use an opaque #RGB or #RRGGBB colour.')
  const backgroundLuminance = relativeLuminance(background)
  const passes = (hex: string) => ratioForLuminances(relativeLuminance(hex), backgroundLuminance) >= target
  if (passes(initial)) return initial

  const hsl = rgbToHsl(hexToRgb(initial))
  const candidates: string[] = []
  for (const endpoint of [0, 1]) {
    let passingLightness = endpoint
    let passingHex = hslToHex({ ...hsl, l: endpoint })
    if (!passes(passingHex)) continue
    let failingLightness = hsl.l

    // On either side of a failing starting point, passing colours form one
    // interval ending at black/white. Evaluate quantised RGB at every step so a
    // mathematically passing HSL value can never produce a failing copied hex.
    for (let step = 0; step < 56; step += 1) {
      const midpoint = (passingLightness + failingLightness) / 2
      const hex = hslToHex({ ...hsl, l: midpoint })
      if (passes(hex)) {
        passingLightness = midpoint
        passingHex = hex
      } else {
        failingLightness = midpoint
      }
    }
    candidates.push(passingHex)
  }

  candidates.sort((first, second) => {
    const firstChange = Math.abs(rgbToHsl(hexToRgb(first)).l - hsl.l)
    const secondChange = Math.abs(rgbToHsl(hexToRgb(second)).l - hsl.l)
    return firstChange - secondChange
  })
  return candidates[0] ?? null
}
