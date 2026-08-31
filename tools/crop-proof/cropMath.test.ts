import { describe, expect, it } from 'vitest'
import { focalCss, getContainedRect, getCoverCrop, normalizeFocal, validateLocalImage } from './cropMath'

describe('Crop Proof transformation', () => {
  it('maps a normal editorial image into a mobile crop without losing the focal point', () => {
    const crop = getCoverCrop(1600, 1000, 900, 1600, { x: 81, y: 38 })

    expect(crop.sourceX).toBeCloseTo(840.375, 2)
    expect(crop.sourceY).toBe(0)
    expect(crop.sourceWidth).toBeCloseTo(562.5, 2)
    expect(crop.sourceHeight).toBe(1000)
    expect(focalCss({ x: 81, y: 38 })).toBe('object-position: 81% 38%;')
  })

  it('keeps an edge-biased subject inside a tall crop from a hostile panorama fixture', () => {
    const crop = getCoverCrop(4096, 192, 9, 16, { x: 96, y: 50 })
    const rendered = getContainedRect(4096, 192, 900, 500)

    expect(crop.sourceX).toBeGreaterThan(3800)
    expect(crop.sourceX + crop.sourceWidth).toBeLessThanOrEqual(4096)
    expect(crop.sourceY).toBe(0)
    expect(crop.sourceWidth).toBeCloseTo(108, 5)
    expect(rendered).toEqual({ x: 0, y: 228.90625, width: 900, height: 42.1875 })
  })

  it('fails safely for corrupted dimensions and invalid local files', () => {
    expect(() => getCoverCrop(0, 1000, 1, 1, { x: 50, y: 50 })).toThrow(RangeError)
    expect(normalizeFocal({ x: Number.NaN, y: 240 })).toEqual({ x: 50, y: 100 })
    expect(validateLocalImage({ name: 'brief.pdf', size: 1000, type: 'application/pdf' })).toBe(
      'Use a local PNG, JPEG, or WebP image.',
    )
    expect(validateLocalImage({ name: 'empty.png', size: 0, type: 'image/png' })).toBe('That image file is empty.')
  })
})
