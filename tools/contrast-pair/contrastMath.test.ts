import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  findPassingForeground,
  hexToRgb,
  hslToHex,
  normalizeHex,
  relativeLuminance,
  rgbToHsl,
} from './contrastMath'

describe('opaque hex colours', () => {
  it('normalises full and shorthand values without accepting alpha or partial CSS', () => {
    expect(normalizeHex('  #aBc  ')).toBe('#AABBCC')
    expect(normalizeHex('#09a1Ff')).toBe('#09A1FF')
    for (const invalid of ['abc', '#ab', '#abcd', '#abcdef00', '#12345g', '#1234567', 'rgb(0 0 0)', 'transparent', '']) {
      expect(normalizeHex(invalid)).toBeNull()
    }
    expect(hexToRgb('#f80')).toEqual({ r: 255, g: 136, b: 0 })
    expect(() => hexToRgb('#ffff')).toThrow(RangeError)
  })
})

describe('WCAG 2.2 sRGB contrast', () => {
  it('agrees with reference luminances and symmetric reference ratios', () => {
    expect(relativeLuminance('#000')).toBe(0)
    expect(relativeLuminance('#fff')).toBe(1)
    expect(relativeLuminance('#f00')).toBeCloseTo(0.2126, 12)
    expect(relativeLuminance('#0f0')).toBeCloseTo(0.7152, 12)
    expect(relativeLuminance('#00f')).toBeCloseTo(0.0722, 12)
    expect(relativeLuminance('#0a0a0a')).toBeCloseTo((10 / 255) / 12.92, 12)
    expect(relativeLuminance('#0b0b0b')).toBeCloseTo(((11 / 255 + 0.055) / 1.055) ** 2.4, 12)
    expect(contrastRatio('#000', '#fff')).toBe(21)
    expect(contrastRatio('#123456', '#123456')).toBe(1)
    expect(contrastRatio('#f00', '#fff')).toBeCloseTo(3.9984767707539985, 12)
    expect(contrastRatio('#f00', '#fff')).toBe(contrastRatio('#fff', '#f00'))
  })

  it('keeps a rounded-to-4.50 ratio below the AA threshold', () => {
    const near = contrastRatio('#6E7978', '#FFFFFF')
    expect(near.toFixed(2)).toBe('4.50')
    expect(near).toBeLessThan(4.5)
    const corrected = findPassingForeground('#6E7978', '#FFFFFF', 4.5)
    expect(corrected).not.toBe('#6E7978')
    expect(contrastRatio(corrected!, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('HSL conversion', () => {
  it('keeps saturated low-byte colours inside the HSL range despite float error', () => {
    for (const hex of ['#003300', '#000100', '#000033', '#330000']) {
      const hsl = rgbToHsl(hexToRgb(hex))
      expect(hsl.s).toBeLessThanOrEqual(1)
      expect(hslToHex(hsl)).toBe(hex)
      const corrected = findPassingForeground(hex, hex, 4.5)
      expect(corrected).not.toBeNull()
      expect(contrastRatio(corrected!, hex)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('round-trips greys, primaries, and mixed colours through 8-bit output', () => {
    for (const hex of ['#000000', '#FFFFFF', '#777777', '#FF0000', '#00FF00', '#0000FF', '#A54CB9', '#103F7A', '#FDFCFB']) {
      expect(hslToHex(rgbToHsl(hexToRgb(hex)))).toBe(hex)
    }
    expect(rgbToHsl(hexToRgb('#F00'))).toEqual({ h: 0, s: 1, l: 0.5 })
    expect(hslToHex({ h: -120, s: 1, l: 0.5 })).toBe('#0000FF')
    expect(hslToHex({ h: 480, s: 1, l: 0.5 })).toBe('#00FF00')
    expect(() => hslToHex({ h: 0, s: Number.NaN, l: 0.5 })).toThrow(RangeError)
    expect(() => rgbToHsl({ r: -1, g: 0, b: 0 })).toThrow(RangeError)
  })
})

describe('nearest passing foreground', () => {
  it('keeps a passing pair unchanged and never changes the background', () => {
    expect(findPassingForeground('#123', '#fff', 7)).toBe('#112233')
    expect(findPassingForeground('#fff', '#000', 21)).toBe('#FFFFFF')
  })

  it('finds the closest grey byte on either the dark or light path', () => {
    const dark = findPassingForeground('#808080', '#808080', 3)!
    const light = findPassingForeground('#BBBBBB', '#808080', 3)!
    expect(hexToRgb(dark).r).toBeLessThan(128)
    expect(hexToRgb(light).r).toBeGreaterThan(187)
    expect(contrastRatio(dark, '#808080')).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(light, '#808080')).toBeGreaterThanOrEqual(3)

    // Exhaust all 256 greys as an independent oracle for the lightness distance.
    for (const foreground of ['#808080', '#BBBBBB', '#747474']) {
      for (const target of [3, 4.5, 7]) {
        const start = hexToRgb(foreground).r
        const passing = Array.from({ length: 256 }, (_, channel) => `#${channel.toString(16).padStart(2, '0').repeat(3)}`)
          .filter((hex) => contrastRatio(hex, '#808080') >= target)
        const result = findPassingForeground(foreground, '#808080', target)
        if (!passing.length) expect(result).toBeNull()
        else {
          expect(result).not.toBeNull()
          const minimumDistance = Math.min(...passing.map((hex) => Math.abs(hexToRgb(hex).r - start)))
          expect(Math.abs(hexToRgb(result!).r - start)).toBe(minimumDistance)
        }
      }
    }
  })

  it('keeps hue and saturation on the path and verifies the final quantised colour', () => {
    const input = '#9966CC'
    const hsl = rgbToHsl(hexToRgb(input))
    const result = findPassingForeground(input, '#FFFFFF', 7)!
    expect(result).not.toBe(input)
    expect(contrastRatio(result, '#FFFFFF')).toBeGreaterThanOrEqual(7)
    const outputHsl = rgbToHsl(hexToRgb(result))
    expect(outputHsl.h).toBeCloseTo(hsl.h, 0)
    expect(outputHsl.s).toBeCloseTo(hsl.s, 2)
    const lighterByte = hslToHex({ ...hsl, l: outputHsl.l + 1 / 255 })
    expect(contrastRatio(lighterByte, '#FFFFFF')).toBeLessThan(7)
  })

  it('returns null for an impossible target and rejects invalid arguments', () => {
    expect(findPassingForeground('#777', '#777', 7)).toBeNull()
    expect(findPassingForeground('#777', '#777', 21)).toBeNull()
    expect(() => findPassingForeground('#777', '#777', Number.NaN)).toThrow(RangeError)
    expect(() => findPassingForeground('#777', '#777', 22)).toThrow(RangeError)
    expect(() => findPassingForeground('#ggg', '#fff', 4.5)).toThrow(RangeError)
    expect(() => findPassingForeground('#777', '#ffff', 4.5)).toThrow(RangeError)
  })

  it('meets every claimed target across varied colours after RGB quantisation', () => {
    const foregrounds = ['#EEEEEE', '#232455', '#F54512', '#11B8BB', '#5A5A5A', '#99CC33', '#CC33AA']
    const backgrounds = ['#FFFFFF', '#000000', '#777777', '#123456', '#F4EED2']
    for (const foreground of foregrounds) {
      for (const background of backgrounds) {
        for (const target of [3, 4.5, 7]) {
          const result = findPassingForeground(foreground, background, target)
          if (result) expect(contrastRatio(result, background)).toBeGreaterThanOrEqual(target)
          else expect(Math.max(contrastRatio('#000', background), contrastRatio('#fff', background))).toBeLessThan(target)
        }
      }
    }
  })
})
