export type Region = { x: number; y: number; width: number; height: number }
export type Direction = 'bottom' | 'top' | 'uniform'
/** Light means white text with a black scrim; dark means black text with a white scrim. */
export type Tone = 'light' | 'dark'
export type Settings = {
  region: Region
  direction: Direction
  tone: Tone
  target: number
  opacity: number
}
export type Pixels = { data: Uint8ClampedArray; width: number; height: number }
export type Reading = {
  minRatio: number
  failedPixels: number
  totalPixels: number
  /** Integer coordinates in the decoded source image, before any preview scaling. */
  worst: { x: number; y: number }
}
export type Analysis = {
  original: Reading
  current: Reading
  suggestedOpacity: number
  suggested: Reading
}
export type ScrimStop = { offset: number; alpha: number }

const LINEAR = Float64Array.from({ length: 256 }, (_, byte) => {
  const channel = byte / 255
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
})

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

/** Clip to the image while retaining a non-empty rectangle, including at its edges. */
export function normalizeRegion(region: Region): Region {
  if (![region.x, region.y, region.width, region.height].every(Number.isFinite)) {
    throw new RangeError('The text region must contain finite numbers.')
  }
  const x = clamp(region.x, 0, 1 - Number.EPSILON)
  const y = clamp(region.y, 0, 1 - Number.EPSILON)
  return {
    x,
    y,
    width: clamp(region.width, Number.EPSILON, 1 - x),
    height: clamp(region.height, Number.EPSILON, 1 - y),
  }
}

function checkedSettings(settings: Settings): Settings {
  if (!Number.isFinite(settings.target) || settings.target < 1 || settings.target > 21) {
    throw new RangeError('The contrast target must be between 1 and 21.')
  }
  if (!Number.isFinite(settings.opacity)) throw new RangeError('The opacity must be a finite number.')
  if (!['top', 'bottom', 'uniform'].includes(settings.direction)) throw new RangeError('Choose a top, bottom, or uniform scrim.')
  if (!['light', 'dark'].includes(settings.tone)) throw new RangeError('Choose light or dark text.')
  return { ...settings, region: normalizeRegion(settings.region), opacity: clamp(settings.opacity, 0, 1) }
}

function checkDimension(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('Image dimensions must be positive integers.')
}

/**
 * The selected region is protected by a flat scrim. Its fade is outside the text
 * region. Padding to pixel boundaries protects every intersected source cell,
 * including a cell whose centre falls outside the exact fractional rectangle.
 */
export function scrimStops(settings: Settings, imageHeight: number): ScrimStop[] {
  checkDimension(imageHeight)
  const { region, direction, opacity } = checkedSettings(settings)
  if (direction === 'uniform') return [{ offset: 0, alpha: opacity }, { offset: 1, alpha: opacity }]
  if (direction === 'bottom') {
    const start = Math.floor(region.y * imageHeight) / imageHeight
    return start === 0
      ? [{ offset: 0, alpha: opacity }, { offset: 1, alpha: opacity }]
      : [{ offset: 0, alpha: 0 }, { offset: start, alpha: opacity }, { offset: 1, alpha: opacity }]
  }
  const end = Math.min(imageHeight, Math.ceil((region.y + region.height) * imageHeight)) / imageHeight
  return end === 1
    ? [{ offset: 0, alpha: opacity }, { offset: 1, alpha: opacity }]
    : [{ offset: 0, alpha: opacity }, { offset: end, alpha: opacity }, { offset: 1, alpha: 0 }]
}

/** The same sRGB gradient is used by the preview, CSS export, and PNG renderer. */
export function gradientCss(settings: Settings, imageHeight: number): string {
  const channel = settings.tone === 'light' ? 0 : 255
  const stops = scrimStops(settings, imageHeight)
    .map(({ offset, alpha }) => `rgb(${channel} ${channel} ${channel} / ${alpha}) ${offset * 100}%`)
    .join(', ')
  return `linear-gradient(to bottom in srgb, ${stops})`
}

/**
 * Inspect every source pixel cell intersecting the text rectangle. Source alpha
 * is composited on white, matching the tool's fixed image surface. A scrim is
 * composited in sRGB before WCAG 2.2 luminance. Rounding is conservative: up
 * under white text and down under black text. This bounds normal 8-bit browser
 * rounding without claiming a passing result from a one-byte advantage.
 * Ratios remain unrounded for every pass/fail and opacity-search decision.
 */
export function analyzePixels(pixels: Pixels, input: Settings): Analysis {
  checkDimension(pixels.width)
  checkDimension(pixels.height)
  const { width, height, data } = pixels
  if (data.length !== width * height * 4) throw new RangeError('The decoded pixel buffer does not match its image dimensions.')
  const settings = checkedSettings(input)
  const { region, tone, target, opacity } = settings
  const left = clamp(Math.floor(region.x * width), 0, width - 1)
  const top = clamp(Math.floor(region.y * height), 0, height - 1)
  const right = clamp(Math.ceil((region.x + region.width) * width), left + 1, width)
  const bottom = clamp(Math.ceil((region.y + region.height) * height), top + 1, height)
  const totalPixels = (right - left) * (bottom - top)
  const scrim = tone === 'light' ? 0 : 255

  const scan = (alpha: number, stopAtFailure = false): Reading => {
    const composite = Float64Array.from({ length: 256 }, (_, channel) => {
      const blended = channel * (1 - alpha) + scrim * alpha
      return LINEAR[tone === 'light' ? Math.ceil(blended) : Math.floor(blended)]
    })
    let minRatio = Infinity
    let failedPixels = 0
    let worstX = left
    let worstY = top
    for (let y = top; y < bottom; y += 1) {
      for (let x = left, index = (y * width + left) * 4; x < right; x += 1, index += 4) {
        let red = data[index]
        let green = data[index + 1]
        let blue = data[index + 2]
        if (data[index + 3] !== 255) {
          const sourceAlpha = data[index + 3] / 255
          red = Math.round(red * sourceAlpha + 255 * (1 - sourceAlpha))
          green = Math.round(green * sourceAlpha + 255 * (1 - sourceAlpha))
          blue = Math.round(blue * sourceAlpha + 255 * (1 - sourceAlpha))
        }
        const luminance = 0.2126 * composite[red] + 0.7152 * composite[green] + 0.0722 * composite[blue]
        const ratio = tone === 'light' ? 1.05 / (luminance + 0.05) : (luminance + 0.05) / 0.05
        if (ratio < minRatio) {
          minRatio = ratio
          worstX = x
          worstY = y
        }
        if (ratio < target) {
          failedPixels += 1
          if (stopAtFailure) return { minRatio, failedPixels, totalPixels, worst: { x: worstX, y: worstY } }
        }
      }
    }
    return { minRatio, failedPixels, totalPixels, worst: { x: worstX, y: worstY } }
  }

  const original = scan(0)
  const current = opacity === 0 ? original : scan(opacity)
  if (original.failedPixels === 0) return { original, current, suggestedOpacity: 0, suggested: original }

  // Each channel moves monotonically toward the opposite scrim colour. Binary
  // search therefore finds the first passing WHOLE percentage, even after the
  // individual channel plateaus introduced by conservative 8-bit rounding.
  let failingPercent = 0
  let passingPercent = 100
  while (passingPercent - failingPercent > 1) {
    const candidate = Math.floor((failingPercent + passingPercent) / 2)
    if (scan(candidate / 100, true).failedPixels === 0) passingPercent = candidate
    else failingPercent = candidate
  }
  const suggestedOpacity = passingPercent / 100
  const suggested = opacity === suggestedOpacity ? current : scan(suggestedOpacity)
  return { original, current, suggestedOpacity, suggested }
}

/** Markup: <div class="overlay-check"><img …><div class="overlay-check__text">…</div></div>. */
export function cssFor(input: Settings, imageWidth: number, imageHeight: number): string {
  checkDimension(imageWidth)
  checkDimension(imageHeight)
  const settings = checkedSettings(input)
  const { region, tone } = settings
  return `.overlay-check {
  position: relative;
  width: 100%;
  aspect-ratio: ${imageWidth} / ${imageHeight};
  isolation: isolate;
  overflow: hidden;
  background: #fff;
}

.overlay-check > img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.overlay-check::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: ${gradientCss(settings, imageHeight)};
}

.overlay-check__text {
  position: absolute;
  z-index: 2;
  left: ${region.x * 100}%;
  top: ${region.y * 100}%;
  width: ${region.width * 100}%;
  height: ${region.height * 100}%;
  color: ${tone === 'light' ? '#fff' : '#000'};
}`
}
