import { downloadCanvas } from '../../src/download'
import { type Analysis, type Reading } from './overlayMath'
import { drawScene, layoutText, renderScene, type Scene, type SceneFrame } from './renderScene'

const INK = '#f2f2f0'
const MUTED = '#9a9a96'
const RAIL = '#343434'
const PAGE = '#070707'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SANS = 'Arial, Helvetica, sans-serif'
const NUMBER = new Intl.NumberFormat('en-US')

// Avoid displaying a below-target reading as though rounding made it pass.
function ratioLabel(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2)
}

function rule(context: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  context.strokeStyle = RAIL
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(x, y + 0.5)
  context.lineTo(x + width, y + 0.5)
  context.stroke()
}

function drawWorst(context: CanvasRenderingContext2D, frame: SceneFrame, reading: Reading): void {
  const x = frame.x + (reading.worst.x + 0.5) * frame.scale
  const y = frame.y + (reading.worst.y + 0.5) * frame.scale
  context.save()
  context.beginPath()
  context.rect(frame.x, frame.y, frame.width, frame.height)
  context.clip()
  context.strokeStyle = '#000'
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(x - 9, y)
  context.lineTo(x + 9, y)
  context.moveTo(x, y - 9)
  context.lineTo(x, y + 9)
  context.stroke()
  context.strokeStyle = '#fff'
  context.lineWidth = 1.5
  context.stroke()
  context.restore()
}

function drawPanel(
  context: CanvasRenderingContext2D,
  scene: Scene,
  reading: Reading,
  x: number,
  width: number,
  title: string,
  opacity: number,
): void {
  const fits = layoutText(scene).fits
  context.fillStyle = INK
  context.font = `500 14px ${MONO}`
  context.fillText(title, x, 153)
  context.textAlign = 'right'
  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText(fits ? reading.failedPixels === 0 ? 'TARGET MET' : 'BELOW TARGET' : 'TEXT CLIPPED', x + width, 153)
  context.textAlign = 'left'

  context.fillStyle = '#030303'
  context.fillRect(x, 170, width, 310)
  const frame = drawScene(context, scene, x, 170, width, 310, opacity)
  drawWorst(context, frame, reading)
  context.strokeStyle = RAIL
  context.lineWidth = 1
  context.strokeRect(x + 0.5, 170.5, width - 1, 309)

  context.fillStyle = INK
  context.font = `400 25px ${SANS}`
  context.fillText(`${ratioLabel(reading.minRatio)} :1`, x, 515)
  context.textAlign = 'right'
  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText(`${Math.round(opacity * 100)}% ${scene.settings.tone === 'light' ? 'BLACK' : 'WHITE'} SCRIM`, x + width, 513)
  context.textAlign = 'left'
  context.fillText(`${NUMBER.format(reading.failedPixels)} / ${NUMBER.format(reading.totalPixels)} PIXELS BELOW TARGET`, x, 540)
  context.fillText(`LOWEST PIXEL ${reading.worst.x}, ${reading.worst.y}`, x, 563)
  context.textAlign = 'right'
  context.fillText(fits ? 'TEXT FITS' : 'TEXT CLIPPED', x + width, 563)
  context.textAlign = 'left'
}

/** A 1280 × 640 before/after proof using the real photo, text, and current scrim. */
export function createProofFrame(scene: Scene, analysis: Analysis): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas export is unavailable in this browser.')
  const fits = layoutText(scene).fits

  context.fillStyle = PAGE
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = INK
  context.font = `400 30px ${SANS}`
  context.fillText('Overlay Check', 42, 67)
  context.fillStyle = MUTED
  context.font = `400 15px ${SANS}`
  context.fillText('Text over an image. Every pixel in the selected region.', 42, 96)
  context.textAlign = 'right'
  context.fillStyle = INK
  context.font = `400 25px ${SANS}`
  context.fillText(`${ratioLabel(analysis.original.minRatio)} → ${ratioLabel(analysis.current.minRatio)} :1`, 1238, 66)
  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText(`TARGET ${scene.settings.target} :1 / ${Math.round(scene.settings.opacity * 100)}% SCRIM${fits ? '' : ' / TEXT CLIPPED'}`, 1238, 95)
  context.textAlign = 'left'
  rule(context, 42, 120, 1196)

  drawPanel(context, scene, analysis.original, 42, 585, 'ORIGINAL / NO SCRIM', 0)
  drawPanel(context, scene, analysis.current, 653, 585, 'CURRENT', scene.settings.opacity)

  rule(context, 42, 583, 1196)
  context.fillStyle = MUTED
  context.font = `400 13px ${MONO}`
  context.fillText('tiny-design-tools / overlay-check', 42, 614)
  context.textAlign = 'right'
  context.fillText('WCAG 2.2 / REGION BACKGROUND CHECK / LOCAL', 1238, 614)
  context.textAlign = 'left'
  return canvas
}

export function downloadProofFrame(scene: Scene, analysis: Analysis): void {
  downloadCanvas(createProofFrame(scene, analysis), 'overlay-check-proof.png')
}

/** Full working-resolution image with the current text and scrim; no diagnostic marks. */
export function downloadScene(scene: Scene): void {
  downloadCanvas(renderScene(scene), 'overlay-check-image.png')
}
