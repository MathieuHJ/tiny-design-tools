import { downloadCanvas } from '../../src/download'
import { squintLabel, type Hotspot, type Tone } from './squintMath'

const COLORS = {
  background: '#050505',
  rail: '#343434',
  text: '#f2f2f0',
  muted: '#8a8a86',
  inset: '#030303',
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SANS = 'Inter, ui-sans-serif, system-ui, sans-serif'

export type ProofInput = {
  /** The working copy of the original, at the same size as the squinted canvas. */
  original: CanvasImageSource
  squinted: CanvasImageSource
  width: number
  height: number
  strength: number
  tone: Tone
  hotspots: Hotspot[]
}

function fit(width: number, height: number, areaWidth: number, areaHeight: number) {
  const scale = Math.min(areaWidth / width, areaHeight / height)
  return { width: width * scale, height: height * scale }
}

function drawMarker(context: CanvasRenderingContext2D, x: number, y: number, label: string) {
  context.save()
  context.lineWidth = 4
  context.strokeStyle = 'rgba(0, 0, 0, .75)'
  context.beginPath()
  context.arc(x, y, 11, 0, Math.PI * 2)
  context.stroke()
  context.lineWidth = 1.5
  context.strokeStyle = '#ffffff'
  context.beginPath()
  context.arc(x, y, 11, 0, Math.PI * 2)
  context.stroke()
  context.font = `600 12px ${MONO}`
  context.textBaseline = 'middle'
  context.fillStyle = 'rgba(0, 0, 0, .8)'
  context.fillRect(x + 14, y - 18, 24, 16)
  context.fillStyle = '#ffffff'
  context.fillText(label, x + 18, y - 10)
  context.restore()
}

function drawPanel(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  input: ProofInput,
  x: number,
  y: number,
  areaWidth: number,
  areaHeight: number,
  title: string,
  showMarks: boolean,
) {
  context.fillStyle = COLORS.muted
  context.font = `500 15px ${MONO}`
  context.fillText(title, x, y + 14)

  const labelHeight = 28
  const frame = fit(input.width, input.height, areaWidth, areaHeight - labelHeight)
  const frameX = x + (areaWidth - frame.width) / 2
  const frameY = y + labelHeight + (areaHeight - labelHeight - frame.height) / 2

  context.fillStyle = COLORS.inset
  context.fillRect(frameX, frameY, frame.width, frame.height)
  context.drawImage(source, frameX, frameY, frame.width, frame.height)
  context.strokeStyle = COLORS.rail
  context.lineWidth = 1
  context.strokeRect(frameX + 0.5, frameY + 0.5, frame.width - 1, frame.height - 1)

  if (showMarks) {
    input.hotspots.forEach((hotspot, index) => {
      drawMarker(context, frameX + frame.width * hotspot.x, frameY + frame.height * hotspot.y, String(index + 1).padStart(2, '0'))
    })
  }
}

export function createProofFrame(input: ProofInput, showMarks: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas export is unavailable in this browser.')

  context.fillStyle = COLORS.background
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = COLORS.rail
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(42, 120.5)
  context.lineTo(1238, 120.5)
  context.moveTo(42, 576.5)
  context.lineTo(1238, 576.5)
  context.stroke()

  context.fillStyle = COLORS.text
  context.font = `560 32px ${SANS}`
  context.fillText('Squint', 42, 72)
  context.fillStyle = COLORS.muted
  context.font = `400 19px ${SANS}`
  context.fillText('Blur the design. See what still reads.', 42, 100)

  const held = input.hotspots.length
  context.fillStyle = COLORS.text
  context.font = `600 15px ${MONO}`
  context.fillText(squintLabel(input.strength, input.tone), 904, 70)
  context.fillStyle = COLORS.muted
  context.font = `400 15px ${SANS}`
  context.fillText(held === 0 ? 'No contrast point survives this blur' : `${held} strongest contrast ${held === 1 ? 'point' : 'points'} marked`, 904, 96)

  const gap = 26
  const panelWidth = (1196 - gap) / 2
  const panelHeight = 424
  drawPanel(context, input.original, input, 42, 140, panelWidth, panelHeight, 'ORIGINAL', showMarks)
  drawPanel(context, input.squinted, input, 42 + panelWidth + gap, 140, panelWidth, panelHeight, squintLabel(input.strength, input.tone), showMarks)

  context.fillStyle = COLORS.muted
  context.font = `500 15px ${MONO}`
  context.fillText('tiny-design-tools / 03', 42, 612)
  context.textAlign = 'right'
  context.fillStyle = COLORS.text
  const marks = input.hotspots.map((hotspot, index) => `${String(index + 1).padStart(2, '0')} ${Math.round(hotspot.x * 100)}/${Math.round(hotspot.y * 100)}`).join('   ')
  context.fillText(showMarks && marks ? marks : 'LOCAL / NO UPLOAD', 1238, 612)
  context.textAlign = 'left'

  return canvas
}

export function downloadProofFrame(input: ProofInput, showMarks: boolean) {
  downloadCanvas(createProofFrame(input, showMarks), 'squint-proof.png')
}
