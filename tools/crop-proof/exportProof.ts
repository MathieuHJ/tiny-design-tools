import { downloadCanvas } from '../../src/download'
import { CROP_PRESETS, getCoverCrop, isEdgeBiased, keptShare, normalizeFocal, type CropPreset, type FocalPoint } from './cropMath'

const COLORS = {
  background: '#050505',
  surface: '#0d0d0d',
  rail: '#343434',
  text: '#f2f2f0',
  muted: '#8a8a86',
  pass: '#f2f2f0',
  warning: '#f2f2f0',
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.closePath()
}

function fitPreset(preset: CropPreset, areaWidth: number, areaHeight: number) {
  const scale = Math.min(areaWidth / preset.width, areaHeight / preset.height)
  return { width: preset.width * scale, height: preset.height * scale }
}

function drawCrop(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  focal: FocalPoint,
  preset: CropPreset,
  x: number,
  y: number,
  areaWidth: number,
  areaHeight: number,
) {
  const frame = fitPreset(preset, areaWidth, areaHeight - 28)
  const frameX = x + (areaWidth - frame.width) / 2
  const frameY = y + 28 + (areaHeight - 28 - frame.height) / 2
  const crop = getCoverCrop(image.naturalWidth, image.naturalHeight, frame.width, frame.height, focal)

  const kept = Math.round(keptShare(image.naturalWidth, image.naturalHeight, preset) * 100)
  context.fillStyle = COLORS.muted
  context.font = '500 15px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.fillText(`${preset.label.toUpperCase()}  ${preset.context}  ${kept}% KEPT`, x, y + 14)

  context.save()
  roundedRect(context, frameX, frameY, frame.width, frame.height, 6)
  context.clip()
  context.drawImage(
    image,
    crop.sourceX,
    crop.sourceY,
    crop.sourceWidth,
    crop.sourceHeight,
    frameX,
    frameY,
    frame.width,
    frame.height,
  )
  context.restore()

  context.strokeStyle = COLORS.rail
  context.lineWidth = 1
  roundedRect(context, frameX + 0.5, frameY + 0.5, frame.width - 1, frame.height - 1, 6)
  context.stroke()

  const safeFocal = normalizeFocal(focal)
  const targetX = frameX + frame.width * (safeFocal.x / 100)
  const targetY = frameY + frame.height * (safeFocal.y / 100)
  context.strokeStyle = isEdgeBiased(focal) ? COLORS.warning : COLORS.pass
  context.lineWidth = 1.5
  context.setLineDash(isEdgeBiased(focal) ? [3, 3] : [])
  context.beginPath()
  context.moveTo(targetX - 8, targetY)
  context.lineTo(targetX + 8, targetY)
  context.moveTo(targetX, targetY - 8)
  context.lineTo(targetX, targetY + 8)
  context.stroke()
  context.setLineDash([])
}

export function createProofFrame(image: HTMLImageElement, focal: FocalPoint): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas export is unavailable in this browser.')

  const safeFocal = normalizeFocal(focal)
  const diagnostic = isEdgeBiased(safeFocal)
  const signal = diagnostic ? COLORS.warning : COLORS.pass

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
  context.font = '560 32px Inter, ui-sans-serif, system-ui, sans-serif'
  context.fillText('Crop Proof', 42, 72)
  context.fillStyle = COLORS.muted
  context.font = '400 19px Inter, ui-sans-serif, system-ui, sans-serif'
  context.fillText('One focal point. Six production crops.', 42, 100)

  context.fillStyle = signal
  context.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace'
  const finding = diagnostic
    ? `EDGE CHECK  ${Math.round(safeFocal.x)}% / ${Math.round(safeFocal.y)}%`
    : `SUBJECT HELD  ${Math.round(safeFocal.x)}% / ${Math.round(safeFocal.y)}%`
  context.fillText(finding, 904, 70)
  context.fillStyle = COLORS.muted
  context.font = '400 15px Inter, ui-sans-serif, system-ui, sans-serif'
  context.fillText('object-position across every format', 904, 96)

  const startX = 42
  const startY = 140
  const gapX = 26
  const gapY = 20
  const cellWidth = (1196 - gapX * 2) / 3
  const cellHeight = (416 - gapY) / 2
  CROP_PRESETS.forEach((preset, index) => {
    const column = index % 3
    const row = Math.floor(index / 3)
    drawCrop(
      context,
      image,
      safeFocal,
      preset,
      startX + column * (cellWidth + gapX),
      startY + row * (cellHeight + gapY),
      cellWidth,
      cellHeight,
    )
  })

  context.fillStyle = COLORS.muted
  context.font = '500 15px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.fillText('tiny-design-tools / 01', 42, 612)
  context.textAlign = 'right'
  context.fillStyle = signal
  context.fillText(`${Math.round(safeFocal.x)}% X  ·  ${Math.round(safeFocal.y)}% Y`, 1238, 612)
  context.textAlign = 'left'

  return canvas
}

export function downloadProofFrame(image: HTMLImageElement, focal: FocalPoint) {
  downloadCanvas(createProofFrame(image, focal), 'crop-proof-sheet.png')
}
