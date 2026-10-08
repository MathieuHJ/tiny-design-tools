export type Tone = 'colour' | 'grey' | 'tones'

export const TONES: readonly Tone[] = ['colour', 'grey', 'tones']
export const toneLabels: Record<Tone, string> = { colour: 'COLOUR', grey: 'GREY', tones: '3 TONES' }

/** Longest edge, in pixels, of the working copy every blur runs on. Larger inputs are scaled down. */
export const WORK_EDGE = 1200
export const DEFAULT_STRENGTH = 30
/** Grey levels used by the 3 TONES view: shadow, midtone, light. */
export const TONE_LEVELS = [22, 128, 234] as const

export type Hotspot = {
  /** Horizontal position as a share of the image width, 0 to 1. */
  x: number
  /** Vertical position as a share of the image height, 0 to 1. */
  y: number
  /** Mean centre-surround contrast in that area, 0 to 1. */
  strength: number
}

export type BlurredImage = {
  width: number
  height: number
  sigma: number
  r: Float32Array
  g: Float32Array
  b: Float32Array
  luma: Float32Array
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Scale to fit the working edge. Never upscales. */
export function workingSize(width: number, height: number, maxEdge = WORK_EDGE) {
  if (!(width > 0) || !(height > 0)) throw new RangeError('Image dimensions must be positive.')
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * Blur radius for a 0 to 100 strength, scaled to the image so the same setting looks the same at any
 * resolution. 100 blurs by 2.5% of the longest edge.
 */
export function blurSigma(strength: number, longEdge: number): number {
  return (clamp(Number.isFinite(strength) ? strength : 0, 0, 100) / 100) * 0.025 * longEdge
}

/** Odd box widths whose repeated passes approximate a Gaussian of the given sigma. */
export function boxSizes(sigma: number, passes = 3): number[] {
  const ideal = Math.sqrt((12 * sigma * sigma) / passes + 1)
  let lower = Math.floor(ideal)
  if (lower % 2 === 0) lower -= 1
  lower = Math.max(1, lower)
  const upper = lower + 2
  const lowerPasses = Math.round((12 * sigma * sigma - passes * lower * lower - 4 * passes * lower - 3 * passes) / (-4 * lower - 4))
  return Array.from({ length: passes }, (_, index) => (index < lowerPasses ? lower : upper))
}

function boxPassHorizontal(source: Float32Array, target: Float32Array, width: number, height: number, radius: number) {
  const size = 2 * radius + 1
  for (let y = 0; y < height; y += 1) {
    const row = y * width
    let sum = source[row] * radius
    for (let i = 0; i <= radius; i += 1) sum += source[row + Math.min(i, width - 1)]
    for (let x = 0; x < width; x += 1) {
      target[row + x] = sum / size
      sum += source[row + Math.min(x + radius + 1, width - 1)] - source[row + Math.max(x - radius, 0)]
    }
  }
}

function boxPassVertical(source: Float32Array, target: Float32Array, width: number, height: number, radius: number) {
  const size = 2 * radius + 1
  for (let x = 0; x < width; x += 1) {
    let sum = source[x] * radius
    for (let i = 0; i <= radius; i += 1) sum += source[Math.min(i, height - 1) * width + x]
    for (let y = 0; y < height; y += 1) {
      target[y * width + x] = sum / size
      sum += source[Math.min(y + radius + 1, height - 1) * width + x] - source[Math.max(y - radius, 0) * width + x]
    }
  }
}

/** Gaussian blur of one channel, edge pixels extended. Returns a new array and leaves the input alone. */
export function gaussianBlur(channel: Float32Array, width: number, height: number, sigma: number): Float32Array {
  if (channel.length !== width * height) throw new RangeError('Channel length must equal width × height.')
  if (sigma < 0.5) return Float32Array.from(channel)
  const current = Float32Array.from(channel)
  const scratch = new Float32Array(channel.length)
  for (const size of boxSizes(sigma)) {
    const radius = (size - 1) / 2
    boxPassHorizontal(current, scratch, width, height, radius)
    boxPassVertical(scratch, current, width, height, radius)
  }
  return current
}

export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Blur an RGBA image. Alpha is ignored, so flatten transparency before calling. */
export function blurImage(pixels: Uint8ClampedArray, width: number, height: number, sigma: number): BlurredImage {
  const count = width * height
  if (pixels.length !== count * 4) throw new RangeError('Pixel data must be RGBA at width × height.')
  const r = new Float32Array(count)
  const g = new Float32Array(count)
  const b = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    r[i] = pixels[i * 4]
    g[i] = pixels[i * 4 + 1]
    b[i] = pixels[i * 4 + 2]
  }
  const blurred = {
    width,
    height,
    sigma,
    r: gaussianBlur(r, width, height, sigma),
    g: gaussianBlur(g, width, height, sigma),
    b: gaussianBlur(b, width, height, sigma),
    luma: new Float32Array(count),
  }
  for (let i = 0; i < count; i += 1) blurred.luma[i] = luma(blurred.r[i], blurred.g[i], blurred.b[i])
  return blurred
}

/** Luminance values that split the image into three equally populated bands. */
export function tertileThresholds(values: Float32Array): [number, number] {
  const histogram = new Uint32Array(256)
  for (const value of values) histogram[clamp(Math.round(value), 0, 255)] += 1
  const lowTarget = values.length / 3
  const highTarget = (values.length * 2) / 3
  let seen = 0
  let low = 0
  let high = 255
  let foundLow = false
  for (let level = 0; level < 256; level += 1) {
    seen += histogram[level]
    if (!foundLow && seen >= lowTarget) {
      low = level
      foundLow = true
    }
    if (seen >= highTarget) {
      high = level
      break
    }
  }
  return [low, high]
}

/** Paint a blurred image as RGBA for the chosen tone. */
export function renderTone(blurred: BlurredImage, tone: Tone): Uint8ClampedArray<ArrayBuffer> {
  const count = blurred.width * blurred.height
  const out = new Uint8ClampedArray(count * 4)
  const [low, high] = tone === 'tones' ? tertileThresholds(blurred.luma) : [0, 0]
  for (let i = 0; i < count; i += 1) {
    let r = blurred.r[i]
    let g = blurred.g[i]
    let b = blurred.b[i]
    if (tone === 'grey') {
      r = g = b = blurred.luma[i]
    } else if (tone === 'tones') {
      const value = blurred.luma[i]
      const level = value <= low ? TONE_LEVELS[0] : value <= high ? TONE_LEVELS[1] : TONE_LEVELS[2]
      r = g = b = level
    }
    out[i * 4] = r
    out[i * 4 + 1] = g
    out[i * 4 + 2] = b
    out[i * 4 + 3] = 255
  }
  return out
}

/**
 * The strongest areas of light-against-dark contrast that survive the blur, strongest first. Contrast is
 * the difference between the blurred image and a much softer copy of itself, averaged over a coarse grid.
 * Areas closer together than about a fifth of the image width count once.
 */
export function findHotspots(blurredLuma: Float32Array, width: number, height: number, sigma: number, count = 3): Hotspot[] {
  const longEdge = Math.max(width, height)
  const surround = gaussianBlur(blurredLuma, width, height, Math.max(sigma * 3, longEdge * 0.04))
  const cell = Math.max(4, Math.round(longEdge / 40))
  const columns = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  const score = new Float32Array(columns * rows)
  const sizes = new Uint32Array(columns * rows)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = Math.floor(y / cell) * columns + Math.floor(x / cell)
      score[index] += Math.abs(blurredLuma[y * width + x] - surround[y * width + x])
      sizes[index] += 1
    }
  }
  for (let i = 0; i < score.length; i += 1) score[i] /= Math.max(1, sizes[i])

  const floor = 6
  const reach = Math.max(2, Math.round(columns * 0.2))
  const hotspots: Hotspot[] = []
  for (let pick = 0; pick < count; pick += 1) {
    let best = -1
    for (let i = 0; i < score.length; i += 1) if (best < 0 || score[i] > score[best]) best = i
    if (best < 0 || score[best] < floor) break
    const column = best % columns
    const row = Math.floor(best / columns)
    hotspots.push({
      x: Math.min(1, ((column + 0.5) * cell) / width),
      y: Math.min(1, ((row + 0.5) * cell) / height),
      strength: score[best] / 255,
    })
    for (let r = Math.max(0, row - reach); r <= Math.min(rows - 1, row + reach); r += 1) {
      for (let c = Math.max(0, column - reach); c <= Math.min(columns - 1, column + reach); c += 1) score[r * columns + c] = 0
    }
  }
  return hotspots
}

export function squintLabel(strength: number, tone: Tone): string {
  return `SQUINT ${Math.round(strength)} / ${toneLabels[tone]}`
}
