import type { StressMode } from './stressMath'
import { modeLabels } from './stressMath'

type ProofFinding = {
  label: string
  selector: string
  kind: 'EMPTY' | 'OVERFLOW'
}

function text(context: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, muted = false) {
  context.fillStyle = muted ? '#989894' : '#f3f3f0'
  context.font = `500 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`
  context.fillText(value, x, y)
}

export function downloadCopyStressProof(mode: StressMode, findings: ProofFinding[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) return

  context.fillStyle = '#070707'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#343434'
  context.lineWidth = 1
  context.strokeRect(40.5, 40.5, 1199, 559)
  context.beginPath()
  context.moveTo(40, 108.5)
  context.lineTo(1240, 108.5)
  context.moveTo(764.5, 109)
  context.lineTo(764.5, 600)
  context.stroke()

  text(context, 'TDT / 02', 66, 82, 12)
  text(context, 'COPY STRESS / PROOF', 66, 156, 13, true)
  text(context, modeLabels[mode], 66, 196, 34)
  text(context, `${findings.length} VISIBLE FAILURES`, 66, 226, 12, true)

  context.strokeStyle = '#555555'
  context.strokeRect(66.5, 272.5, 652, 248)
  const slots = [
    { x: 100, y: 310, width: 214, height: 38 },
    { x: 100, y: 382, width: 330, height: 58 },
    { x: 100, y: 472, width: 184, height: 28 },
  ]
  slots.forEach((slot, index) => {
    context.strokeStyle = index < findings.length ? '#f3f3f0' : '#444444'
    context.setLineDash(index < findings.length ? [5, 4] : [])
    context.strokeRect(slot.x + .5, slot.y + .5, slot.width, slot.height)
    context.setLineDash([])
  })

  text(context, 'FINDINGS', 798, 156, 13, true)
  findings.slice(0, 5).forEach((finding, index) => {
    const y = 202 + index * 70
    context.strokeStyle = '#353535'
    context.beginPath()
    context.moveTo(798, y + 28.5)
    context.lineTo(1198, y + 28.5)
    context.stroke()
    text(context, `${String(index + 1).padStart(2, '0')} / ${finding.kind}`, 798, y, 11)
    text(context, finding.label.toUpperCase(), 798, y + 20, 12)
    text(context, finding.selector, 1005, y + 20, 10, true)
  })

  text(context, 'LOCAL / NO UPLOAD', 66, 574, 11, true)
  text(context, 'tiny-design-tools', 1056, 574, 11, true)

  const link = document.createElement('a')
  link.download = `copy-stress-${mode}-proof.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
