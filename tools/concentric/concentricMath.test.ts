import { describe, expect, it } from 'vitest'
import {
  DEFAULTS,
  buildScene,
  clampSettings,
  concentricRadius,
  cornerGapRatio,
  cssFor,
  fromHash,
  nestedBoxes,
  segmentLength,
  toHash,
  type Settings,
} from './concentricMath'

const base: Settings = { radius: 28, padding: 12, levels: 3 }

describe('Concentric radii', () => {
  it('takes the padding off the radius at each level, and never goes negative', () => {
    expect(concentricRadius(28, 12, 0)).toBe(28)
    expect(concentricRadius(28, 12, 1)).toBe(16)
    expect(concentricRadius(28, 12, 2)).toBe(4)
    expect(concentricRadius(28, 12, 3)).toBe(0)
    expect(concentricRadius(10, 12, 1)).toBe(0)
  })

  it('nests boxes inward by the padding on every side', () => {
    const boxes = nestedBoxes(base, 'concentric')
    expect(boxes.map((box) => box.radius)).toEqual([28, 16, 4])
    expect(boxes[1]).toMatchObject({ x: 32, y: 32, width: 296, height: 176 })
    expect(boxes[2]).toMatchObject({ x: 44, y: 44, width: 272, height: 152 })
    expect(nestedBoxes(base, 'same').map((box) => box.radius)).toEqual([28, 28, 28])
  })

  it('clamps a radius to half the short side and drops a box that would collapse', () => {
    const pill = nestedBoxes({ radius: 100, padding: 40, levels: 3 }, 'same')
    expect(pill.map((box) => box.radius)).toEqual([100, 60, 20])
    const tight = nestedBoxes({ radius: 20, padding: 40, levels: 3 }, 'concentric', { x: 0, y: 0, width: 100, height: 100 })
    expect(tight).toHaveLength(2)
  })
})

describe('Concentric corner gap', () => {
  it('is uneven when the inner box keeps the outer radius, and even when it does not', () => {
    expect(cornerGapRatio(28, 12, 28)).toBeCloseTo(Math.SQRT2, 6)
    expect(cornerGapRatio(28, 12, 16)).toBeCloseTo(1, 6)
  })

  it('stays between even and uneven when the padding is larger than the radius', () => {
    const ratio = cornerGapRatio(10, 12, 0)
    expect(ratio).toBeCloseTo(Math.SQRT2 - ((Math.SQRT2 - 1) * 10) / 12, 6)
    expect(ratio).toBeGreaterThan(1)
    expect(ratio).toBeLessThan(Math.SQRT2)
  })

  it('has nothing to say about a square outer corner or no padding', () => {
    expect(cornerGapRatio(0, 12, 0)).toBeNull()
    expect(cornerGapRatio(28, 0, 28)).toBeNull()
  })

  it('draws probes whose lengths agree with the formula', () => {
    for (const mode of ['same', 'concentric'] as const) {
      const scene = buildScene(base, mode)
      expect(scene.cornerProbe && scene.sideProbe).toBeTruthy()
      const measured = segmentLength(scene.cornerProbe!) / segmentLength(scene.sideProbe!)
      expect(measured).toBeCloseTo(scene.ratio!, 6)
    }
    expect(buildScene(base, 'concentric').ratio).toBeCloseTo(1, 6)
    expect(buildScene(base, 'same').ratio).toBeCloseTo(Math.SQRT2, 6)
  })

  it('shows the arc centres meeting only when the corners are concentric', () => {
    const concentric = buildScene(base, 'concentric').guides
    expect(new Set(concentric.map((guide) => guide.cx)).size).toBe(1)
    expect(new Set(concentric.map((guide) => guide.cy)).size).toBe(1)

    const same = buildScene(base, 'same').guides
    expect(same[1].cx - same[0].cx).toBeCloseTo(12, 6)
    expect(same[2].cx - same[1].cx).toBeCloseTo(12, 6)
  })

  it('has no probes for a square outer corner', () => {
    const scene = buildScene({ radius: 0, padding: 12, levels: 2 }, 'concentric')
    expect(scene.ratio).toBeNull()
    expect(scene.cornerProbe).toBeNull()
    expect(scene.guides).toEqual([])
  })
})

describe('Concentric CSS and links', () => {
  it('writes custom properties and a calc() for each inner level', () => {
    const css = cssFor(base)
    expect(css).toContain('--radius: 28px;')
    expect(css).toContain('--pad: 12px;')
    expect(css).toContain('.card > .inner {\n  border-radius: calc(var(--radius) - var(--pad)); /* 16px */')
    expect(css).toContain('.card > .inner > .inner {\n  border-radius: calc(var(--radius) - 2 * var(--pad)); /* 4px */')
    expect(cssFor({ ...base, levels: 2 })).not.toContain('.inner > .inner')
  })

  it('says so when the padding is larger than the radius', () => {
    expect(cssFor({ radius: 10, padding: 12, levels: 2 })).toContain('/* 0px: padding exceeds the radius */')
  })

  it('round-trips settings through the URL hash', () => {
    expect(toHash(base)).toBe('#r=28&p=12&l=3')
    expect(fromHash(toHash(base))).toEqual(base)
  })

  it('clamps and repairs a hostile or empty hash', () => {
    expect(fromHash('#r=999&p=-5&l=7')).toEqual({ radius: 100, padding: 0, levels: 2 })
    expect(fromHash('#r=abc&p=&l=3')).toEqual({ radius: DEFAULTS.radius, padding: 0, levels: 3 })
    expect(fromHash('')).toEqual(DEFAULTS)
    expect(clampSettings({ radius: 12.6, padding: Number.NaN })).toEqual({ radius: 13, padding: DEFAULTS.padding, levels: 2 })
  })
})
