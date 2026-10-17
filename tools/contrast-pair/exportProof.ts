import { downloadCanvas } from '../../src/download'
import { apcaValue } from './apca'
import { contrastRatio } from './contrastMath'

export type ProofData = {
  foreground: string
  background: string
  corrected: string | null
  target: number
  specimen: string
}

const INK = '#f2f2f0'
const MUTED = '#9a9a96'
const RAIL = '#343434'
const PAGE = '#070707'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SANS = 'Arial, Helvetica, sans-serif'
const SAMPLE = 'The small details make the whole thing work.'

type Reference = { size: number | null; note: string }

function referenceFor(lc: number): Reference {
  const magnitude = Math.abs(lc)
  if (magnitude >= 90) return { size: 14, note: 'ARIAL 400 / 14 PX REFERENCE' }
  if (magnitude >= 75) return { size: 16, note: 'ARIAL 400 / 16 PX REFERENCE' }
  if (magnitude >= 60) return { size: 24, note: 'ARIAL 400 / 24 PX REFERENCE' }
  if (magnitude >= 45) return { size: 42, note: 'ARIAL 400 / 42 PX REFERENCE' }
  if (magnitude >= 30) return { size: null, note: 'NON-CONTENT TEXT ONLY' }
  if (magnitude >= 15) return { size: null, note: 'CERTAIN NON-TEXT ONLY' }
  return { size: null, note: 'INSUFFICIENT TEXT CONTRAST' }
}

function targetName(target: number): string {
  if (target === 7) return 'AAA TEXT'
  if (target === 4.5) return 'AA TEXT'
  if (target === 3) return 'AA LARGE TEXT'
  return `${target.toFixed(2)} :1 TARGET`
}

function signedLc(lc: number): string {
  return `${lc > 0 ? '+' : ''}${lc.toFixed(1)}`
}

// A below-target reading must not round up to a passing-looking ratio.
function ratioLabel(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2)
}

/** Wrap using measured glyph widths, including long words and user-entered copy. */
function linesFor(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.trim().replace(/\s+/g, ' ').split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= width) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = ''
    for (const character of word) {
      if (line && context.measureText(line + character).width > width) {
        lines.push(line)
        line = character
      } else {
        line += character
      }
    }
  }
  if (line) lines.push(line)
  return lines
}

function wrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines: number) {
  const lines = linesFor(context, text, width)
  lines.slice(0, maxLines).forEach((line, index) => {
    let visible = line
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (visible && context.measureText(`${visible}…`).width > width) visible = visible.slice(0, -1)
      visible += '…'
    }
    context.fillText(visible, x, y + index * lineHeight)
  })
}

function rule(context: CanvasRenderingContext2D, x: number, y: number, width: number) {
  context.strokeStyle = RAIL
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(x, y + 0.5)
  context.lineTo(x + width, y + 0.5)
  context.stroke()
}

function drawPair(context: CanvasRenderingContext2D, data: ProofData, foreground: string, title: string, x: number, width: number) {
  const ratio = contrastRatio(foreground, data.background)
  const lc = apcaValue(foreground, data.background)
  const reference = referenceFor(lc)
  const passes = ratio >= data.target

  context.fillStyle = INK
  context.font = `500 14px ${MONO}`
  context.fillText(title, x, 153)
  context.textAlign = 'right'
  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText(passes ? 'TARGET MET' : 'BELOW TARGET', x + width, 153)
  context.textAlign = 'left'

  // These two colours are the actual tested pair, without opacity or tonal adjustment.
  context.fillStyle = data.background
  context.fillRect(x, 170, width, 262)
  context.save()
  context.beginPath()
  context.rect(x + 24, 190, width - 48, 222)
  context.clip()
  context.fillStyle = foreground
  context.font = `400 44px ${SANS}`
  wrappedText(context, data.specimen.trim() || 'A considered pair.', x + 24, 238, width - 48, 50, 2)
  if (reference.size !== null) {
    context.font = `400 ${reference.size}px ${SANS}`
    wrappedText(context, SAMPLE, x + 24, 355, width - 48, reference.size * 1.2, 2)
  }
  context.restore()
  context.strokeStyle = RAIL
  context.lineWidth = 1
  context.strokeRect(x + 0.5, 170.5, width - 1, 261)

  context.fillStyle = INK
  context.font = `400 29px ${SANS}`
  context.fillText(`${ratioLabel(ratio)} :1`, x, 474)
  context.textAlign = 'right'
  context.font = `400 23px ${SANS}`
  context.fillText(`Lc ${signedLc(lc)}`, x + width, 474)
  context.textAlign = 'left'

  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText(`WCAG 2.2 / ${targetName(data.target)} / ${passes ? 'PASS' : 'FAIL'}`, x, 499)
  context.textAlign = 'right'
  context.fillText('APCA BETA / ADVISORY', x + width, 499)
  context.textAlign = 'left'

  rule(context, x, 516, width)
  context.fillText(reference.note, x, 540)
  context.textAlign = 'right'
  context.fillText(`FG ${foreground.toUpperCase()} / BG ${data.background.toUpperCase()}`, x + width, 562)
  context.textAlign = 'left'
}

function drawNoSolution(context: CanvasRenderingContext2D, data: ProofData, x: number, width: number) {
  context.fillStyle = INK
  context.font = `500 14px ${MONO}`
  context.fillText('NO PASSING LIGHTNESS', x, 153)
  context.strokeStyle = RAIL
  context.lineWidth = 1
  context.setLineDash([5, 5])
  context.strokeRect(x + 0.5, 170.5, width - 1, 261)
  context.setLineDash([])
  context.font = `400 28px ${SANS}`
  context.fillText('No solution at this target.', x + 24, 268)
  context.fillStyle = MUTED
  context.font = `400 16px ${SANS}`
  wrappedText(context, 'Changing foreground lightness alone cannot reach the requested ratio on this background.', x + 24, 304, width - 48, 24, 3)
  context.font = `400 13px ${MONO}`
  context.fillText(`TARGET ${data.target.toFixed(2)} :1 / BACKGROUND FIXED`, x, 474)
  rule(context, x, 516, width)
  context.fillText('TRY A DIFFERENT BACKGROUND OR TARGET.', x, 540)
  context.textAlign = 'right'
  context.fillText(`BG ${data.background.toUpperCase()}`, x + width, 562)
  context.textAlign = 'left'
}

/** A feed-readable comparison of the tested pair and its nearest passing lightness. */
export function createProofFrame(data: ProofData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas export is unavailable in this browser.')

  const originalRatio = contrastRatio(data.foreground, data.background)
  const correctedRatio = data.corrected === null ? null : contrastRatio(data.corrected, data.background)
  const unchanged = data.corrected?.toLowerCase() === data.foreground.toLowerCase()
  const finding = data.corrected === null
    ? `${ratioLabel(originalRatio)} :1 / NO SOLUTION`
    : unchanged
      ? `${ratioLabel(originalRatio)} :1 / ALREADY ${targetName(data.target)}`
      : `${ratioLabel(originalRatio)} → ${ratioLabel(correctedRatio ?? originalRatio)} :1 / ${targetName(data.target)}`

  context.fillStyle = PAGE
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = INK
  context.font = `400 30px ${SANS}`
  context.fillText('Contrast Pair', 42, 67)
  context.fillStyle = MUTED
  context.font = `400 15px ${SANS}`
  context.fillText('One pair. Two readings. A practical correction.', 42, 96)

  context.textAlign = 'right'
  context.fillStyle = INK
  context.font = `400 23px ${SANS}`
  context.fillText(finding, 1238, 66)
  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText('HSL LIGHTNESS ONLY / BACKGROUND FIXED', 1238, 95)
  context.textAlign = 'left'
  rule(context, 42, 120, 1196)

  const panelWidth = 585
  drawPair(context, data, data.foreground, 'ORIGINAL', 42, panelWidth)
  if (data.corrected === null) {
    drawNoSolution(context, data, 653, panelWidth)
  } else {
    drawPair(context, data, data.corrected, unchanged ? 'UNCHANGED' : correctedRatio !== null && correctedRatio >= data.target ? 'NEAREST PASSING' : 'ADJUSTED / BELOW TARGET', 653, panelWidth)
  }

  rule(context, 42, 583, 1196)
  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText('tiny-design-tools / 06', 42, 614)
  context.textAlign = 'right'
  context.fillText('WCAG 2.2 CONTRAST / APCA BETA IS ADVISORY', 1238, 614)
  context.textAlign = 'left'
  return canvas
}

export function downloadProofFrame(data: ProofData): void {
  downloadCanvas(createProofFrame(data), 'contrast-pair-proof.png')
}
