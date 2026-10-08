import { describe, expect, it } from 'vitest'
import { validateLocalImage } from '../../src/imageFile'
import { focalCss, getContainedRect, getCoverCrop, keptShare, normalizeFocal, tightestPreset } from './cropMath'

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

describe('Crop Proof retention', () => {
  it('reports how much of a 16:10 source each crop keeps', () => {
    expect(keptShare(1600, 1000, { width: 9, height: 16 })).toBeCloseTo(0.3516, 3)
    expect(keptShare(1600, 1000, { width: 16, height: 9 })).toBeCloseTo(0.9, 3)
    expect(keptShare(1600, 1000, { width: 16, height: 10 })).toBeCloseTo(1, 5)
  })

  it('finds the crop most likely to lose the subject', () => {
    const wide = tightestPreset(1600, 1000)
    expect(wide.preset.id).toBe('mobile-hero')
    expect(wide.share).toBeCloseTo(0.3516, 3)

    const tall = tightestPreset(1000, 1600)
    expect(tall.preset.id).toBe('open-graph')
    expect(tall.share).toBeCloseTo(0.3125, 4)
  })

  it('accepts supported files and rejects oversized ones', () => {
    expect(validateLocalImage({ name: 'a.webp', size: 2048, type: 'image/webp' })).toBeNull()
    expect(validateLocalImage({ name: 'big.png', size: 26 * 1024 * 1024, type: 'image/png' })).toBe(
      'Keep the image under 25 MB for reliable local export.',
    )
  })
})
