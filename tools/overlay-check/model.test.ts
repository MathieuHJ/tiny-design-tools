import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, adjustedRegion } from './model'

describe('editable text box bounds', () => {
  it('keeps a usable box inside the image for hostile numeric edits', () => {
    const collapsed = adjustedRegion(DEFAULT_SETTINGS, { x: 1, y: 1, width: 0, height: -10 }).region
    expect(collapsed.width).toBeCloseTo(.08, 12)
    expect(collapsed.height).toBeCloseTo(.08, 12)
    expect(collapsed.x + collapsed.width).toBeLessThanOrEqual(1)
    expect(collapsed.y + collapsed.height).toBeLessThanOrEqual(1)
  })

  it('supports full-image sizing while retaining a valid source region', () => {
    expect(adjustedRegion(DEFAULT_SETTINGS, { width: 2, height: 2 }).region).toEqual({ x: 0, y: 0, width: 1, height: 1 })
  })
})
