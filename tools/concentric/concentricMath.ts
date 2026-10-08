export const MAX_RADIUS = 100
export const MAX_PADDING = 40
export const LEVEL_OPTIONS = [2, 3] as const

export type Levels = (typeof LEVEL_OPTIONS)[number]
export type Mode = 'same' | 'concentric'

export type Settings = {
  /** Radius of the outermost box, in px. */
  radius: number
  /** Gap between each box and the one inside it, in px. */
  padding: number
  /** How many boxes are nested, outermost included. */
  levels: Levels
}

export const DEFAULTS: Settings = { radius: 28, padding: 12, levels: 2 }

/** The preview box the geometry is drawn in, and the view that frames it. */
export const BOX = { x: 20, y: 20, width: 320, height: 200 } as const
export const VIEW = { width: 360, height: 240 } as const

export type NestedBox = {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

export type Guide = { cx: number; cy: number; r: number }
export type Segment = { x1: number; y1: number; x2: number; y2: number }

export type Scene = {
  mode: Mode
  boxes: NestedBox[]
  /** The circle each top-left arc belongs to. When their centres meet, the corners are concentric. */
  guides: Guide[]
  /** Gap measured along the corner diagonal, between the first two boxes. Null when there is nothing to measure. */
  cornerProbe: Segment | null
  /** Gap measured straight across the middle of the left side, between the first two boxes. */
  sideProbe: Segment | null
  /** Corner gap divided by side gap. 1 means the gap is even all the way round. */
  ratio: number | null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function whole(value: number, fallback: number, min: number, max: number) {
  return Number.isFinite(value) ? clamp(Math.round(value), min, max) : fallback
}

export function clampSettings(input: Partial<Record<keyof Settings, number>>): Settings {
  const levels = input.levels === 3 ? 3 : 2
  return {
    radius: whole(input.radius ?? DEFAULTS.radius, DEFAULTS.radius, 0, MAX_RADIUS),
    padding: whole(input.padding ?? DEFAULTS.padding, DEFAULTS.padding, 0, MAX_PADDING),
    levels,
  }
}

/** The radius that keeps a nested corner concentric with the outer one. Never negative. */
export function concentricRadius(radius: number, padding: number, level: number): number {
  return Math.max(0, radius - padding * level)
}

/** The boxes for one mode, outermost first. A box that would collapse is dropped. */
export function nestedBoxes(settings: Settings, mode: Mode, box: { x: number; y: number; width: number; height: number } = BOX): NestedBox[] {
  const boxes: NestedBox[] = []
  for (let level = 0; level < settings.levels; level += 1) {
    const inset = settings.padding * level
    const width = box.width - inset * 2
    const height = box.height - inset * 2
    if (width <= 0 || height <= 0) break
    const wanted = mode === 'same' ? settings.radius : concentricRadius(settings.radius, settings.padding, level)
    boxes.push({
      x: box.x + inset,
      y: box.y + inset,
      width,
      height,
      radius: Math.min(wanted, Math.min(width, height) / 2),
    })
  }
  return boxes
}

/**
 * How much wider the gap is at the corner than along the sides, for an inner box of `innerRadius` inside an
 * outer box of `outerRadius` with `padding` between them. Measured along the corner diagonal, so a square
 * corner against a square corner is not counted as uneven. Null when either radius or the padding is zero.
 */
export function cornerGapRatio(outerRadius: number, padding: number, innerRadius: number): number | null {
  if (padding <= 0 || outerRadius <= 0) return null
  return (Math.SQRT2 * padding - (Math.SQRT2 - 1) * (outerRadius - innerRadius)) / padding
}

function diagonalPoint(box: NestedBox) {
  const offset = box.radius * (1 - Math.SQRT1_2)
  return { x: box.x + offset, y: box.y + offset }
}

export function buildScene(settings: Settings, mode: Mode): Scene {
  const boxes = nestedBoxes(settings, mode)
  const guides = boxes.filter((box) => box.radius > 0).map((box) => ({ cx: box.x + box.radius, cy: box.y + box.radius, r: box.radius }))
  const [outer, inner] = boxes
  if (!outer || !inner || settings.padding <= 0 || outer.radius <= 0) {
    return { mode, boxes, guides, cornerProbe: null, sideProbe: null, ratio: null }
  }
  const from = diagonalPoint(outer)
  const to = diagonalPoint(inner)
  const middle = outer.y + outer.height / 2
  return {
    mode,
    boxes,
    guides,
    cornerProbe: { x1: from.x, y1: from.y, x2: to.x, y2: to.y },
    sideProbe: { x1: outer.x, y1: middle, x2: inner.x, y2: middle },
    ratio: cornerGapRatio(outer.radius, settings.padding, inner.radius),
  }
}

export function segmentLength(segment: Segment): number {
  return Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1)
}

/** CSS using custom properties, so the relationship survives when either value changes. */
export function cssFor(settings: Settings): string {
  const { radius, padding, levels } = settings
  const lines = [
    '.card {',
    `  --radius: ${radius}px;`,
    `  --pad: ${padding}px;`,
    '  border-radius: var(--radius);',
    '  padding: var(--pad);',
    '}',
  ]
  for (let level = 1; level < levels; level += 1) {
    const selector = `.card${' > .inner'.repeat(level)}`
    const expression = level === 1 ? 'var(--radius) - var(--pad)' : `var(--radius) - ${level} * var(--pad)`
    const result = concentricRadius(radius, padding, level)
    const note = radius - padding * level < 0 ? `${result}px: padding exceeds the radius` : `${result}px`
    lines.push(`${selector} {`, `  border-radius: calc(${expression}); /* ${note} */`, '}')
  }
  return lines.join('\n')
}

export function toHash(settings: Settings): string {
  return `#r=${settings.radius}&p=${settings.padding}&l=${settings.levels}`
}

/** Read settings from a URL hash. Anything missing or invalid falls back to the defaults. */
export function fromHash(hash: string): Settings {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const read = (key: string) => (params.has(key) ? Number(params.get(key)) : undefined)
  return clampSettings({ radius: read('r'), padding: read('p'), levels: read('l') })
}
