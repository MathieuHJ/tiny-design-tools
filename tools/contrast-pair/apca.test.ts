import { describe, expect, it } from 'vitest'
import { apcaValue, referenceFor } from './apca'

describe('upstream APCA integration', () => {
  it('passes foreground first and preserves light-on-dark polarity', () => {
    expect(apcaValue('#000000', '#FFFFFF')).toBeCloseTo(106.0407, 3)
    expect(apcaValue('#FFFFFF', '#000000')).toBeCloseTo(-107.8847, 3)
    expect(apcaValue('#8991A5', '#8991A5')).toBe(0)
  })

  it('uses conservative reference sizes and flags low-contrast specimens', () => {
    expect(referenceFor(-75).size).toBe(16)
    expect(referenceFor(74.99).size).toBe(24)
    expect(referenceFor(45).size).toBe(42)
    expect(referenceFor(30).label).toBe('NON-CONTENT TEXT ONLY')
  })
})
