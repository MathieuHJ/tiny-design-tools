import { downloadCanvas } from '../../src/download'
import cardUrl from './fixtures/card.jpg?url'
import { VIEW, buildScene, type Scene, type Settings } from './concentricMath'

const COLORS = {
  background: '#050505',
  panel: '#030303',
  rail: '#343434',
  text: '#f2f2f0',
  muted: '#8a8a86',
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SANS = 'Inter, ui-sans-serif, system-ui, sans-serif'

/** Fill and edge for each nesting level, outermost first. Shared with the on-screen preview. */
export const LEVEL_STYLE = [
  { fill: '#161616', stroke: 'rgba(242,242,240,.95)' },
  { fill: '#232323', stroke: 'rgba(242,242,240,.75)' },
  { fill: '#303030', stroke: 'rgba(242,242,240,.55)' },
] as const

/** The photograph that fills the innermost box. Loaded once. */
let photo: Promise<HTMLImageElement> | null = null
export function loadPhoto(): Promise<HTMLImageElement> {
  photo ??= (async () => {
    const image = new Image()
    image.src = cardUrl
    await image.decode()
    return image
  })()
  return photo
}

function drawScene(context: CanvasRenderingContext2D, scene: Scene, x: number, y: number, width: number, height: number, picture: HTMLImageElement | null) {
  const scale = Math.min(width / VIEW.width, height / VIEW.height)
  const originX = x + (width - VIEW.width * scale) / 2
  const originY = y + (height - VIEW.height * scale) / 2
  context.save()
  context.translate(originX, originY)
  context.scale(scale, scale)
  context.lineWidth = 1 / scale

  scene.boxes.forEach((box, index) => {
    const style = LEVEL_STYLE[index]
    context.beginPath()
    context.roundRect(box.x, box.y, box.width, box.height, box.radius)
    context.fillStyle = style.fill
    context.fill()
    context.strokeStyle = style.stroke
    context.stroke()
  })

  const inner = scene.boxes[scene.boxes.length - 1]
  if (picture && inner) {
    // Fill the box the way CSS object-fit: cover would.
    const fit = Math.max(inner.width / picture.naturalWidth, inner.height / picture.naturalHeight)
    const sw = inner.width / fit
    const sh = inner.height / fit
    context.save()
    context.beginPath()
    context.roundRect(inner.x, inner.y, inner.width, inner.height, inner.radius)
    context.clip()
    context.drawImage(picture, (picture.naturalWidth - sw) / 2, (picture.naturalHeight - sh) / 2, sw, sh, inner.x, inner.y, inner.width, inner.height)
    context.restore()
    context.beginPath()
    context.roundRect(inner.x, inner.y, inner.width, inner.height, inner.radius)
    context.strokeStyle = LEVEL_STYLE[scene.boxes.length - 1].stroke
    context.stroke()
  }

  // A dark halo first, so the guides stay readable over a photograph.
  context.setLineDash([3 / scale * 1.4, 3 / scale * 1.4])
  for (const [stroke, lineWidth] of [['rgba(0, 0, 0, .5)', 3 / scale], ['rgba(242, 242, 240, .4)', 1 / scale]] as const) {
    context.strokeStyle = stroke
    context.lineWidth = lineWidth
    scene.guides.forEach((guide) => {
      context.beginPath()
      context.arc(guide.cx, guide.cy, guide.r, 0, Math.PI * 2)
      context.stroke()
    })
  }
  context.setLineDash([])
  context.lineWidth = 3.5 / scale
  context.strokeStyle = 'rgba(0, 0, 0, .6)'
  scene.guides.forEach((guide) => {
    context.beginPath()
    context.moveTo(guide.cx - 3, guide.cy)
    context.lineTo(guide.cx + 3, guide.cy)
    context.moveTo(guide.cx, guide.cy - 3)
    context.lineTo(guide.cx, guide.cy + 3)
    context.stroke()
  })
  context.lineWidth = 1 / scale
  context.strokeStyle = '#ffffff'
  scene.guides.forEach((guide) => {
    context.beginPath()
    context.moveTo(guide.cx - 3, guide.cy)
    context.lineTo(guide.cx + 3, guide.cy)
    context.moveTo(guide.cx, guide.cy - 3)
    context.lineTo(guide.cx, guide.cy + 3)
    context.stroke()
  })

  context.lineWidth = 2 / scale
  for (const probe of [scene.cornerProbe, scene.sideProbe]) {
    if (!probe) continue
    context.beginPath()
    context.moveTo(probe.x1, probe.y1)
    context.lineTo(probe.x2, probe.y2)
    context.stroke()
  }
  context.restore()
}

export function createProofFrame(settings: Settings, picture: HTMLImageElement | null = null): HTMLCanvasElement {
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

  const same = buildScene(settings, 'same')
  const concentric = buildScene(settings, 'concentric')
  const inner = concentric.boxes[1]?.radius ?? 0

  context.fillStyle = COLORS.text
  context.font = `560 32px ${SANS}`
  context.fillText('Concentric', 42, 72)
  context.fillStyle = COLORS.muted
  context.font = `400 19px ${SANS}`
  context.fillText('Nested corners that actually line up.', 42, 100)

  context.fillStyle = COLORS.text
  context.font = `600 15px ${MONO}`
  context.fillText(`INNER RADIUS ${inner} PX`, 904, 70)
  context.fillStyle = COLORS.muted
  context.font = `400 15px ${SANS}`
  context.fillText(`${settings.radius} outer minus ${settings.padding} padding`, 904, 96)

  const gap = 26
  const panelWidth = (1196 - gap) / 2
  const panelTop = 140
  const panelHeight = 424
  const panels = [
    { scene: same, title: 'SAME RADIUS' },
    { scene: concentric, title: 'CONCENTRIC' },
  ]
  panels.forEach(({ scene, title }, index) => {
    const x = 42 + index * (panelWidth + gap)
    context.fillStyle = COLORS.muted
    context.font = `500 15px ${MONO}`
    context.fillText(title, x, panelTop + 14)
    if (scene.ratio !== null) {
      context.textAlign = 'right'
      context.fillStyle = COLORS.text
      context.fillText(`CORNER GAP x${scene.ratio.toFixed(2)}`, x + panelWidth, panelTop + 14)
      context.textAlign = 'left'
    }
    context.fillStyle = COLORS.panel
    context.fillRect(x, panelTop + 28, panelWidth, panelHeight - 28)
    context.strokeStyle = COLORS.rail
    context.lineWidth = 1
    context.strokeRect(x + 0.5, panelTop + 28.5, panelWidth - 1, panelHeight - 29)
    drawScene(context, scene, x, panelTop + 28, panelWidth, panelHeight - 28, picture)
  })

  context.fillStyle = COLORS.muted
  context.font = `500 15px ${MONO}`
  context.fillText('tiny-design-tools / 04', 42, 612)
  context.textAlign = 'right'
  context.fillStyle = COLORS.text
  context.fillText(`border-radius: calc(${settings.radius}px - ${settings.padding}px)  =  ${inner}px`, 1238, 612)
  context.textAlign = 'left'

  return canvas
}

export async function downloadProofFrame(settings: Settings) {
  const picture = await loadPhoto().catch(() => null)
  downloadCanvas(createProofFrame(settings, picture), 'concentric-proof.png')
}
