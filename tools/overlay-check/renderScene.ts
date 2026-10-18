import { normalizeRegion, scrimStops, type Settings } from './overlayMath'

export type Scene = {
  /** Decoded, white-flattened source at its working resolution. */
  image: HTMLCanvasElement
  settings: Settings
  text: string
  /** Type size as a fraction of the source image width. */
  fontSize: number
}

export type TextLayout = {
  lines: string[]
  fits: boolean
  fontSize: number
  lineHeight: number
  ascent: number
  height: number
  region: { x: number; y: number; width: number; height: number }
}

export type SceneFrame = { x: number; y: number; width: number; height: number; scale: number }

const FONT = 'Arial, Helvetica, sans-serif'

function leadingSpaces(text: string): string {
  return text.match(/^ +/)?.[0] ?? ''
}

function canvasFor(width: number, height: number): HTMLCanvasElement {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new RangeError('The image must have positive pixel dimensions.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas export is unavailable in this browser.')
  return context
}

/** CSS pre-wrap uses eight-space tab stops measured from the start of the line. */
function textWidth(context: CanvasRenderingContext2D, text: string): number {
  const parts = text.split('\t')
  const tabWidth = context.measureText(' ').width * 8
  let width = 0
  parts.forEach((part, index) => {
    // CSS keeps a leading preserved-space run separate from glyph shaping;
    // allowing Canvas to kern its final space against “A” shifts indentation.
    const leading = leadingSpaces(part)
    width += context.measureText(leading).width + context.measureText(part.slice(leading.length)).width
    if (index < parts.length - 1) width = (Math.floor(width / tabWidth) + 1) * tabWidth
  })
  return width
}

/** Preserve pre-wrap spaces, including hanging separators at a soft line break. */
function wrapParagraph(context: CanvasRenderingContext2D, paragraph: string, width: number): string[] {
  const tokens = paragraph.match(/[ \t]+|[^ \t]+/g) ?? []
  if (tokens.length === 0) return ['']
  const lines: string[] = []
  let line = ''
  for (const token of tokens) {
    // Like pre-wrap, trailing whitespace hangs rather than disappearing or
    // forcing an extra whitespace-only line. Leading spaces remain intact.
    if (/^[ \t]+$/.test(token)) {
      line += token
      continue
    }
    const candidate = line + token
    if (textWidth(context, candidate) <= width) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = ''
    // A single wide glyph remains visible only inside the selected region, and
    // the caller reports that horizontal overflow through `fits`.
    for (const glyph of Array.from(token)) {
      if (line && textWidth(context, line + glyph) > width) {
        lines.push(line)
        line = glyph
      } else {
        line += glyph
      }
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Source-pixel text geometry shared by the on-screen canvas and both PNG exports. */
export function layoutText(scene: Scene): TextLayout {
  if (!Number.isFinite(scene.fontSize) || scene.fontSize <= 0) {
    throw new RangeError('The text size must be a positive fraction of the image width.')
  }
  const context = contextFor(canvasFor(1, 1))
  const normalized = normalizeRegion(scene.settings.region)
  const region = {
    x: normalized.x * scene.image.width,
    y: normalized.y * scene.image.height,
    width: normalized.width * scene.image.width,
    height: normalized.height * scene.image.height,
  }
  const fontSize = scene.fontSize * scene.image.width
  const lineHeight = fontSize * 1.08
  context.font = `700 ${fontSize}px ${FONT}`
  context.fontKerning = 'normal'
  const lines = scene.text.length === 0
    ? []
    : scene.text.replace(/\r\n?/g, '\n').split('\n').flatMap((paragraph) => wrapParagraph(context, paragraph, region.width))
  const metrics = context.measureText(`Mg${scene.text}`)
  // Fixed font metrics + half-leading reproduce the exported CSS line box.
  // The baseline must not move when the user's copy changes from “A” to “gy”.
  const fontAscent = metrics.fontBoundingBoxAscent || fontSize * 0.9
  const fontDescent = metrics.fontBoundingBoxDescent || fontSize * 0.22
  const ascent = Math.floor(fontAscent + (lineHeight - fontAscent - fontDescent) / 2)
  const inkTop = ascent - metrics.actualBoundingBoxAscent
  const height = lines.length === 0 ? 0 : Math.max(
    lines.length * lineHeight,
    ascent + metrics.actualBoundingBoxDescent + (lines.length - 1) * lineHeight,
  )
  return {
    lines,
    fits: inkTop >= 0 && height <= region.height && lines.every((line) => textWidth(context, line.replace(/[ \t]+$/, '')) <= region.width),
    fontSize,
    lineHeight,
    ascent,
    height,
    region,
  }
}

/** Flatten the exact source image, shared scrim gradient, and actual user text. */
export function renderScene(scene: Scene, options: { opacity?: number; showText?: boolean } = {}): HTMLCanvasElement {
  const canvas = canvasFor(scene.image.width, scene.image.height)
  const context = contextFor(canvas)
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(scene.image, 0, 0)

  const settings = options.opacity === undefined ? scene.settings : { ...scene.settings, opacity: options.opacity }
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  const channel = settings.tone === 'light' ? 0 : 255
  for (const { offset, alpha } of scrimStops(settings, canvas.height)) {
    gradient.addColorStop(offset, `rgba(${channel}, ${channel}, ${channel}, ${alpha})`)
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  if (options.showText !== false) {
    const layout = layoutText(scene)
    context.save()
    context.beginPath()
    context.rect(layout.region.x, layout.region.y, layout.region.width, layout.region.height)
    context.clip()
    context.fillStyle = settings.tone === 'light' ? '#fff' : '#000'
    context.font = `700 ${layout.fontSize}px ${FONT}`
    context.fontKerning = 'normal'
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
    layout.lines.forEach((line, index) => {
      // Canvas normalizes a tab to a space; draw tab-separated runs explicitly
      // using the same tab-stop calculation as measuring and wrapping.
      const parts = line.split('\t')
      let prefix = ''
      parts.forEach((part, partIndex) => {
        const leading = leadingSpaces(part)
        context.fillText(part.slice(leading.length), layout.region.x + textWidth(context, prefix) + context.measureText(leading).width, layout.region.y + layout.ascent + index * layout.lineHeight)
        prefix += part
        if (partIndex < parts.length - 1) prefix += '\t'
      })
    })
    context.restore()
  }
  return canvas
}

/** Draw the full scene inside a frame, preserving its aspect ratio without cropping. */
export function drawScene(
  context: CanvasRenderingContext2D,
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity?: number,
): SceneFrame {
  const scale = Math.min(width / scene.image.width, height / scene.image.height)
  const frame = {
    x: x + (width - scene.image.width * scale) / 2,
    y: y + (height - scene.image.height * scale) / 2,
    width: scene.image.width * scale,
    height: scene.image.height * scale,
    scale,
  }
  context.drawImage(renderScene(scene, { opacity }), frame.x, frame.y, frame.width, frame.height)
  return frame
}
