import { describe, expect, it } from 'vitest'
import {
  TONE_LEVELS,
  blurImage,
  blurSigma,
  boxSizes,
  findHotspots,
  gaussianBlur,
  renderTone,
  tertileThresholds,
  workingSize,
} from './squintMath'

function field(width: number, height: number, fill: (x: number, y: number) => number) {
  const values = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) values[y * width + x] = fill(x, y)
  return values
}

function rgba(width: number, height: number, color: (x: number, y: number) => [number, number, number]) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = color(x, y)
      pixels.set([r, g, b, 255], (y * width + x) * 4)
    }
  }
  return pixels
}

describe('Squint blur', () => {
  it('scales strength to the image, so one setting looks the same at any resolution', () => {
    expect(blurSigma(0, 1200)).toBe(0)
    expect(blurSigma(100, 1200)).toBeCloseTo(30, 5)
    expect(blurSigma(30, 1200)).toBeCloseTo(9, 5)
    expect(blurSigma(30, 600)).toBeCloseTo(4.5, 5)
    expect(blurSigma(Number.NaN, 1200)).toBe(0)
    expect(blurSigma(500, 1200)).toBeCloseTo(30, 5)
  })

  it('chooses odd box widths whose combined blur matches the requested Gaussian', () => {
    // Odd integer widths are coarse below a few pixels, so the tolerance tightens as sigma grows.
    const effectiveRatio = (sigma: number) => {
      const variance = boxSizes(sigma).reduce((total, size) => total + (size * size - 1) / 12, 0)
      return Math.sqrt(variance) / sigma
    }
    for (const sigma of [1.5, 2, 3, 5, 9, 18, 30]) {
      expect(boxSizes(sigma).every((size) => size % 2 === 1)).toBe(true)
      expect(effectiveRatio(sigma)).toBeGreaterThan(0.9)
      expect(effectiveRatio(sigma)).toBeLessThanOrEqual(1.01)
    }
    for (const sigma of [7, 9, 18, 30]) expect(effectiveRatio(sigma)).toBeGreaterThan(0.97)
  })

  it('leaves a flat field flat and does not change the input', () => {
    const flat = field(40, 30, () => 120)
    const copy = Float32Array.from(flat)
    const blurred = gaussianBlur(flat, 40, 30, 6)
    expect(Math.max(...blurred)).toBeCloseTo(120, 3)
    expect(Math.min(...blurred)).toBeCloseTo(120, 3)
    expect(flat).toEqual(copy)
  })

  it('spreads a single bright pixel without creating or losing light', () => {
    const size = 61
    const impulse = field(size, size, (x, y) => (x === 30 && y === 30 ? 1000 : 0))
    const blurred = gaussianBlur(impulse, size, size, 4)
    const total = blurred.reduce((sum, value) => sum + value, 0)
    expect(total).toBeCloseTo(1000, 1)
    expect(blurred[30 * size + 30]).toBeLessThan(40)
    expect(blurred[30 * size + 30]).toBe(Math.max(...blurred))
    expect(blurred[30 * size + 36]).toBeGreaterThan(0)
  })

  it('returns the original values when the radius is below half a pixel', () => {
    const values = field(8, 8, (x, y) => x * 10 + y)
    expect(gaussianBlur(values, 8, 8, 0.2)).toEqual(values)
  })

  it('rejects mismatched buffers', () => {
    expect(() => gaussianBlur(new Float32Array(10), 4, 4, 2)).toThrow(RangeError)
    expect(() => blurImage(new Uint8ClampedArray(10), 4, 4, 2)).toThrow(RangeError)
  })
})

describe('Squint working copy', () => {
  it('scales down to the working edge, preserves ratio, and never upscales', () => {
    expect(workingSize(2400, 1200)).toEqual({ width: 1200, height: 600 })
    expect(workingSize(800, 3200)).toEqual({ width: 300, height: 1200 })
    expect(workingSize(640, 400)).toEqual({ width: 640, height: 400 })
    expect(() => workingSize(0, 400)).toThrow(RangeError)
  })
})

describe('Squint tones', () => {
  it('removes colour that shares a luminance with its background once squinted to grey', () => {
    // Two flat halves with different hue and the same luminance (about 128).
    const width = 60
    const pixels = rgba(width, 20, (x) => (x < 30 ? [90, 138, 146] : [207, 112, 54]))
    const blurred = blurImage(pixels, width, 20, 4)
    const grey = renderTone(blurred, 'grey')
    const left = grey[(10 * width + 5) * 4]
    const right = grey[(10 * width + 55) * 4]
    expect(Math.abs(left - right)).toBeLessThanOrEqual(2)
    const colour = renderTone(blurred, 'colour')
    expect(Math.abs(colour[(10 * width + 5) * 4] - colour[(10 * width + 55) * 4])).toBeGreaterThan(80)
  })

  it('splits an image into three equally sized tone bands', () => {
    const ramp = field(256, 1, (x) => x)
    const [low, high] = tertileThresholds(ramp)
    expect(low).toBeGreaterThanOrEqual(83)
    expect(low).toBeLessThanOrEqual(86)
    expect(high).toBeGreaterThanOrEqual(169)
    expect(high).toBeLessThanOrEqual(172)

    const pixels = rgba(256, 1, (x) => [x, x, x])
    const tones = renderTone(blurImage(pixels, 256, 1, 0), 'tones')
    const levels = new Set<number>()
    for (let x = 0; x < 256; x += 1) levels.add(tones[x * 4])
    expect([...levels].sort((a, b) => a - b)).toEqual([...TONE_LEVELS])
  })
})

describe('Squint contrast points', () => {
  it('lands the strongest point on a bright shape against a dark field, and nothing on a flat one', () => {
    const width = 200
    const height = 120
    const lumaField = field(width, height, (x, y) => (x >= 140 && x < 170 && y >= 30 && y < 60 ? 230 : 40))
    const sigma = 5
    const blurred = gaussianBlur(lumaField, width, height, sigma)
    const [first] = findHotspots(blurred, width, height, sigma)
    expect(first.x).toBeGreaterThan(0.6)
    expect(first.x).toBeLessThan(0.9)
    expect(first.y).toBeGreaterThan(0.1)
    expect(first.y).toBeLessThan(0.6)
    expect(first.strength).toBeGreaterThan(0.1)

    expect(findHotspots(field(width, height, () => 90), width, height, sigma)).toEqual([])
  })

  it('reports separate points for separate shapes and keeps them apart', () => {
    const width = 300
    const height = 100
    const lumaField = field(width, height, (x, y) => {
      const inFirst = x >= 30 && x < 60 && y >= 35 && y < 65
      const inSecond = x >= 240 && x < 270 && y >= 35 && y < 65
      return inFirst || inSecond ? 240 : 30
    })
    const blurred = gaussianBlur(lumaField, width, height, 4)
    const points = findHotspots(blurred, width, height, 4, 3)
    expect(points.length).toBeGreaterThanOrEqual(2)
    expect(points[0].strength).toBeGreaterThanOrEqual(points[1].strength)
    expect(Math.abs(points[0].x - points[1].x)).toBeGreaterThan(0.3)
  })
})
