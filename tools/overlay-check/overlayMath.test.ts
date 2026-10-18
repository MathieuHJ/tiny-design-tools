import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../contrast-pair/contrastMath'
import {
  analyzePixels,
  cssFor,
  gradientCss,
  normalizeRegion,
  scrimStops,
  type Pixels,
  type Settings,
  type Tone,
} from './overlayMath'

const FULL = { x: 0, y: 0, width: 1, height: 1 }
const settings = (overrides: Partial<Settings> = {}): Settings => ({
  region: FULL,
  direction: 'bottom',
  tone: 'light',
  target: 4.5,
  opacity: 0,
  ...overrides,
})

function image(width: number, height: number, colour: [number, number, number, number] = [255, 255, 255, 255]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < data.length; index += 4) data.set(colour, index)
  return { data, width, height }
}

function oracleRatio(rgb: number[], tone: Tone, opacity: number, conservative: boolean): number {
  const transformed = rgb.map((channel) => {
    const value = tone === 'light' ? channel * (1 - opacity) : channel * (1 - opacity) + 255 * opacity
    return conservative ? (tone === 'light' ? Math.ceil(value) : Math.floor(value)) : Math.round(value)
  })
  const hex = `#${transformed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
  return contrastRatio(tone === 'light' ? '#fff' : '#000', hex)
}

describe('complete source-pixel analysis', () => {
  it('detects a single bright source pixel that a preview sampling pass could miss', () => {
    const pixels = image(401, 307, [0, 0, 0, 255])
    const x = 397
    const y = 301
    pixels.data.set([255, 255, 255, 255], (y * pixels.width + x) * 4)
    const result = analyzePixels(pixels, settings())
    expect(result.original).toEqual({
      minRatio: 1,
      failedPixels: 1,
      totalPixels: 401 * 307,
      worst: { x, y },
    })
    expect(result.suggested.failedPixels).toBe(0)
    expect(result.suggested.minRatio).toBeGreaterThanOrEqual(4.5)
  })

  it('counts every cell intersected by a fractional rectangle, including four at a corner', () => {
    const pixels = image(4, 4, [0, 0, 0, 255])
    pixels.data.set([255, 255, 255, 255], 0)
    const result = analyzePixels(pixels, settings({ region: { x: 0.249, y: 0.249, width: 0.002, height: 0.002 } }))
    expect(result.original.totalPixels).toBe(4)
    expect(result.original.failedPixels).toBe(1)
    expect(result.original.worst).toEqual({ x: 0, y: 0 })
    const excluded = analyzePixels(pixels, settings({ region: { x: 0.25, y: 0.25, width: 0.25, height: 0.25 } }))
    expect(excluded.original.totalPixels).toBe(1)
    expect(excluded.original.failedPixels).toBe(0)
    expect(excluded.suggestedOpacity).toBe(0)
  })

  it('matches exact WCAG primary references, full-region extremes, and source alpha on white', () => {
    expect(analyzePixels(image(1, 1, [0, 0, 0, 255]), settings()).original.minRatio).toBe(21)
    expect(analyzePixels(image(1, 1), settings({ tone: 'dark' })).original.minRatio).toBe(21)
    expect(analyzePixels(image(1, 1, [255, 0, 0, 255]), settings()).original.minRatio)
      .toBeCloseTo(3.9984767707539985, 12)
    expect(analyzePixels(image(1, 1, [0, 0, 0, 0]), settings()).original.minRatio).toBe(1)
    expect(analyzePixels(image(1, 1, [0, 0, 0, 0]), settings({ tone: 'dark' })).original.minRatio).toBe(21)
    expect(analyzePixels(image(1, 1, [0, 0, 0, 128]), settings()).original.minRatio)
      .toBe(contrastRatio('#fff', '#7f7f7f'))
  })

  it('does not convert a displayed 4.50 into an exact AA pass', () => {
    const pixels = image(1, 1, [110, 121, 120, 255])
    const result = analyzePixels(pixels, settings())
    expect(result.original.minRatio.toFixed(2)).toBe('4.50')
    expect(result.original.minRatio).toBeLessThan(4.5)
    expect(result.original.failedPixels).toBe(1)
    expect(result.suggestedOpacity).toBeGreaterThan(0)
    expect(result.suggested.failedPixels).toBe(0)
  })
})

describe('minimum verified whole-percentage opacity', () => {
  it('finds the first passing conservative percentage for both tones and every target', () => {
    const colours = [[255, 255, 255], [0, 0, 0], [110, 121, 120], [12, 238, 53], [239, 31, 213], [31, 45, 212]]
    const pixels = image(colours.length, 1)
    colours.forEach((colour, index) => pixels.data.set([...colour, 255], index * 4))
    for (const tone of ['light', 'dark'] as const) {
      for (const target of [3, 4.5, 7, 21]) {
        const result = analyzePixels(pixels, settings({ tone, target, opacity: 0.37 }))
        const firstPassingPercent = Array.from({ length: 101 }, (_, percent) => percent)
          .find((percent) => colours.every((rgb) => oracleRatio(rgb, tone, percent / 100, true) >= target))!
        expect(result.suggestedOpacity).toBe(firstPassingPercent / 100)
        expect(result.suggested.failedPixels).toBe(0)
        expect(result.suggested.minRatio).toBeGreaterThanOrEqual(target)
        expect(result.current.minRatio).toBeCloseTo(Math.min(...colours.map((rgb) => oracleRatio(rgb, tone, 0.37, true))), 12)
        expect(colours.every((rgb) => oracleRatio(rgb, tone, result.suggestedOpacity, false) >= target)).toBe(true)
        if (firstPassingPercent > 0) {
          expect(colours.some((rgb) => oracleRatio(rgb, tone, (firstPassingPercent - 1) / 100, true) < target)).toBe(true)
        }
      }
    }
  })

  it('uses zero for an already passing region and includes all failing pixels at the chosen setting', () => {
    const passing = analyzePixels(image(3, 2, [0, 0, 0, 255]), settings({ opacity: 0.5, target: 7 }))
    expect(passing.suggestedOpacity).toBe(0)
    expect(passing.suggested).toEqual(passing.original)
    const failing = analyzePixels(image(3, 2), settings({ opacity: 0.1, target: 7 }))
    expect(failing.current.failedPixels).toBe(6)
    expect(failing.current.totalPixels).toBe(6)
    expect(failing.suggestedOpacity * 100).toBe(Math.round(failing.suggestedOpacity * 100))
  })

  it('is independent of direction because each shared gradient protects the complete selected region', () => {
    const pixels = image(7, 11, [160, 190, 241, 255])
    const input = settings({ region: { x: 0.1, y: 0.241, width: 0.8, height: 0.302 }, opacity: 0.41 })
    expect(analyzePixels(pixels, { ...input, direction: 'top' })).toEqual(analyzePixels(pixels, { ...input, direction: 'bottom' }))
    expect(analyzePixels(pixels, { ...input, direction: 'uniform' })).toEqual(analyzePixels(pixels, { ...input, direction: 'bottom' }))
  })
})

describe('shared gradient and usable CSS output', () => {
  it('pads gradient stops outward to full source-pixel boundaries', () => {
    const input = settings({ region: { x: 0.1, y: 0.241, width: 0.8, height: 0.302 }, opacity: 0.6 })
    expect(scrimStops(input, 11)).toEqual([
      { offset: 0, alpha: 0 },
      { offset: 2 / 11, alpha: 0.6 },
      { offset: 1, alpha: 0.6 },
    ])
    expect(scrimStops({ ...input, direction: 'top' }, 11)).toEqual([
      { offset: 0, alpha: 0.6 },
      { offset: 6 / 11, alpha: 0.6 },
      { offset: 1, alpha: 0 },
    ])
    expect(scrimStops({ ...input, direction: 'uniform' }, 11)).toEqual([{ offset: 0, alpha: 0.6 }, { offset: 1, alpha: 0.6 }])
  })

  it('protects top and bottom edge cells without a zero-length transparent edge', () => {
    expect(scrimStops(settings({ opacity: 0.6 }), 100)).toEqual([{ offset: 0, alpha: 0.6 }, { offset: 1, alpha: 0.6 }])
    expect(scrimStops(settings({ opacity: 0.6, direction: 'top' }), 100)).toEqual([{ offset: 0, alpha: 0.6 }, { offset: 1, alpha: 0.6 }])
    expect(scrimStops(settings({ opacity: 0.6, region: { x: 0, y: 0.001, width: 1, height: 0.998 } }), 100))
      .toEqual([{ offset: 0, alpha: 0.6 }, { offset: 1, alpha: 0.6 }])
  })

  it('exports aspect-preserving source geometry and exactly the shared sRGB gradient', () => {
    const input = settings({ region: { x: 0.1, y: 0.2, width: 0.8, height: 0.5 }, tone: 'dark', opacity: 0.57 })
    const css = cssFor(input, 1920, 1080)
    expect(css).toContain('aspect-ratio: 1920 / 1080')
    expect(css).toContain('isolation: isolate')
    expect(css).toContain('object-fit: fill')
    expect(css).toContain('left: 10%')
    expect(css).toContain('top: 20%')
    expect(css).toContain('color: #000')
    expect(css).toContain(`background: ${gradientCss(input, 1080)}`)
    expect(gradientCss(input, 1080)).toContain('to bottom in srgb, rgb(255 255 255 / 0) 0%')
    expect(gradientCss(settings({ opacity: 1 }), 1)).toContain('rgb(0 0 0 / 1)')
  })
})

describe('input bounds', () => {
  it('clips rectangles and retains one intersected pixel at the image edge', () => {
    expect(normalizeRegion({ x: -0.2, y: 0.7, width: 2, height: 0.9 })).toEqual({ x: 0, y: 0.7, width: 1, height: 1 - 0.7 })
    const result = analyzePixels(image(5, 3), settings({ region: { x: 1, y: 1, width: 0, height: 0 } }))
    expect(result.original.totalPixels).toBe(1)
    expect(result.original.worst).toEqual({ x: 4, y: 2 })
    expect(analyzePixels(image(1, 1), settings({ opacity: -4 })).current.minRatio).toBe(1)
    expect(analyzePixels(image(1, 1), settings({ opacity: 4 })).current.minRatio).toBe(21)
  })

  it('rejects malformed geometry, targets, and source buffers', () => {
    expect(() => normalizeRegion({ ...FULL, x: Number.NaN })).toThrow(RangeError)
    expect(() => analyzePixels(image(1, 1), settings({ target: Number.NaN }))).toThrow(RangeError)
    expect(() => analyzePixels(image(1, 1), settings({ target: 22 }))).toThrow(RangeError)
    expect(() => analyzePixels(image(1, 1), settings({ opacity: Infinity }))).toThrow(RangeError)
    expect(() => analyzePixels({ width: 2, height: 2, data: new Uint8ClampedArray(4) }, settings())).toThrow(RangeError)
    expect(() => analyzePixels({ width: 1.2, height: 1, data: new Uint8ClampedArray(4) }, settings())).toThrow(RangeError)
    expect(() => cssFor(settings(), 0, 100)).toThrow(RangeError)
  })
})
