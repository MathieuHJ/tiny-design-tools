import { describe, expect, it } from 'vitest'
import { PLATFORMS, PLATFORM_IDS, characterCount, limitStatus } from './platforms'
import { DEFAULT_CROP, containRect, cropForCenter, normalizeCrop, pickDrivers, windowFor } from './cropMath'
import { truncate, wrapText } from './textLayout'

const seven = (text: string) => [...text].length * 7

describe('Profile Kit crop window', () => {
  it('fills a frame with the largest window of its shape, and slides it across the slack', () => {
    const wide = windowFor(2000, 1000, 1, 1, { x: 0, y: 0, zoom: 1 })
    expect(wide).toEqual({ x: 0, y: 0, width: 1000, height: 1000 })
    expect(windowFor(2000, 1000, 1, 1, { x: 1, y: 0, zoom: 1 }).x).toBe(1000)
    expect(windowFor(2000, 1000, 1, 1, DEFAULT_CROP).x).toBe(500)
  })

  it('shrinks the window as it zooms in, keeping the frame shape', () => {
    const w = windowFor(1500, 500, 1500, 500, { x: 0.5, y: 0.5, zoom: 2 })
    expect(w.width).toBeCloseTo(750, 6)
    expect(w.height).toBeCloseTo(250, 6)
    expect(w.x).toBeCloseTo(375, 6)
    expect(w.width / w.height).toBeCloseTo(3, 6)
  })

  it('cuts a wider frame from the same image with a different window', () => {
    const header = windowFor(2000, 2000, 1500, 500, DEFAULT_CROP)
    const phone = windowFor(2000, 2000, 640, 360, DEFAULT_CROP)
    expect(header.width).toBe(2000)
    expect(header.height).toBeCloseTo(666.67, 1)
    expect(phone.height).toBeGreaterThan(header.height)
  })

  it('keeps the window inside the image for any crop, including hostile ones', () => {
    for (const crop of [{ x: -5, y: 9, zoom: 99 }, { x: Number.NaN, y: Number.NaN, zoom: Number.NaN }, { x: 1, y: 1, zoom: 4 }]) {
      const w = windowFor(1200, 800, 400, 400, crop)
      expect(w.x).toBeGreaterThanOrEqual(0)
      expect(w.y).toBeGreaterThanOrEqual(0)
      expect(w.x + w.width).toBeLessThanOrEqual(1200 + 1e-9)
      expect(w.y + w.height).toBeLessThanOrEqual(800 + 1e-9)
    }
    expect(normalizeCrop({ x: 2, y: -1, zoom: 0 })).toEqual({ x: 1, y: 0, zoom: 1 })
    expect(() => windowFor(0, 100, 1, 1, DEFAULT_CROP)).toThrow(RangeError)
  })

  it('moves the window to a pointer, and stops at the image edge', () => {
    const window = { x: 0, y: 0, width: 1000, height: 1000 }
    expect(cropForCenter({ x: 1500, y: 500 }, 2000, 1000, window).x).toBe(1)
    expect(cropForCenter({ x: 100, y: 500 }, 2000, 1000, window).x).toBe(0)
    expect(cropForCenter({ x: 1000, y: 500 }, 2000, 1000, window)).toEqual({ x: 0.5, y: 0.5 })
    // The window's centre lands on the pointer when there is room.
    const crop = cropForCenter({ x: 800, y: 500 }, 2000, 1000, window)
    expect(windowFor(2000, 1000, 1, 1, { ...crop, zoom: 1 }).x + 500).toBeCloseTo(800, 6)
  })

  it('contains a whole image in a frame without distortion', () => {
    expect(containRect(2000, 1000, 400, 400)).toEqual({ x: 0, y: 100, width: 400, height: 200 })
  })
})

describe('Profile Kit crop drivers', () => {
  const banner = [{ width: 1500, height: 500 }, { width: 820, height: 312 }, { width: 640, height: 360 }]

  it('falls through to a frame that can move when the primary frame already fills the image', () => {
    // A 3:1 banner leaves the 3:1 header no room, but the narrower Facebook frames can slide sideways.
    expect(pickDrivers(1500, 500, banner, DEFAULT_CROP)).toEqual({ x: 1, y: 0 })
  })

  it('prefers the primary frame on an axis where it can move', () => {
    // A 4:1 image gives the 3:1 header room sideways, so it drives x even though the square could also slide.
    expect(pickDrivers(4000, 1000, [{ width: 1500, height: 500 }, { width: 1, height: 1 }], DEFAULT_CROP)).toEqual({ x: 0, y: 0 })
  })

  it('has no room to move on an axis where every frame fills the image', () => {
    // A square image fills the width of every wide frame, so nothing can slide sideways.
    expect(pickDrivers(1500, 1500, banner, DEFAULT_CROP).x).toBe(0)
    expect(pickDrivers(1000, 1000, [{ width: 1, height: 1 }], DEFAULT_CROP)).toEqual({ x: 0, y: 0 })
  })
})

describe('Profile Kit text', () => {
  it('wraps at word boundaries, keeps line breaks, and splits a word that cannot fit', () => {
    expect(wrapText('one two three four', 7 * 8, seven)).toEqual(['one two', 'three', 'four'])
    expect(wrapText('a\n\nb', 100, seven)).toEqual(['a', '', 'b'])
    expect(wrapText('abcdefghijklmnop', 7 * 5, seven)).toEqual(['abcde', 'fghij', 'klmno', 'p'])
    expect(wrapText('', 100, seven)).toEqual([''])
  })

  it('ends the last line with an ellipsis when it has to stop', () => {
    const lines = wrapText('one two three four five six seven', 7 * 8, seven, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    expect(seven(lines[1])).toBeLessThanOrEqual(7 * 8)
    expect(truncate('short', 100, seven)).toBe('short')
    expect(truncate('a long line of text', 7 * 8, seven).endsWith('…')).toBe(true)
  })

  it('counts characters as people see them, not as UTF-16 units', () => {
    expect(characterCount('héllo')).toBe(5)
    expect(characterCount('a😀b')).toBe(3)
  })
})

describe('Profile Kit platform specs', () => {
  it('measures the bio against each platform, and flags only the ones it exceeds', () => {
    const bio = 'x'.repeat(120)
    const status = Object.fromEntries(PLATFORM_IDS.map((id) => [id, limitStatus(bio, PLATFORMS[id].bio)]))
    expect(status.instagram?.over).toBe(false)
    expect(status.x?.over).toBe(false)
    expect(status.tiktok?.over).toBe(true)
    expect(status.facebook?.over).toBe(true)
    expect(limitStatus('anything', null)).toBeNull()
  })

  it('has a banner and no grid for Facebook and X, and a grid and no banner for Instagram and TikTok', () => {
    expect(PLATFORMS.x.banner).toMatchObject({ width: 1500, height: 500 })
    expect(PLATFORMS.facebook.banner).not.toBeNull()
    expect(PLATFORMS.x.grid).toBeNull()
    expect(PLATFORMS.facebook.grid).toBeNull()
    for (const id of ['instagram', 'tiktok'] as const) {
      expect(PLATFORMS[id].banner).toBeNull()
      expect(PLATFORMS[id].grid).toMatchObject({ columns: 3, tileWidth: 3, tileHeight: 4 })
    }
  })

  it('labels every spec with a confidence, and marks the disputed ones as disputed', () => {
    for (const id of PLATFORM_IDS) {
      expect(PLATFORMS[id].specs.length).toBeGreaterThan(0)
      for (const row of PLATFORMS[id].specs) expect(['official', 'reported', 'disputed']).toContain(row.confidence)
    }
    expect(PLATFORMS.tiktok.bio.confidence).toBe('disputed')
    expect(PLATFORMS.x.bio.confidence).toBe('official')
  })
})
