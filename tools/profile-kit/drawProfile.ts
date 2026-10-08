import { windowFor } from './cropMath'
import type { Asset, ProfileData, Theme } from './model'
import { CHECKED_ON, PLATFORMS, PLATFORM_IDS, characterCount, limitStatus, type PlatformId } from './platforms'
import { truncate, wrapText } from './textLayout'

/** A phone screenshot, in logical px. Every mock is drawn at this size and scaled to fit. */
export const SCREEN = { width: 390, height: 844 } as const

const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

type Palette = { bg: string; text: string; muted: string; line: string; fill: string }

const PALETTE: Record<Theme, Palette> = {
  dark: { bg: '#0a0a0a', text: '#f2f2f0', muted: '#8f8f8b', line: '#272727', fill: '#171717' },
  light: { bg: '#fbfbf9', text: '#0f0f0f', muted: '#6c6c68', line: '#dcdcd8', fill: '#ececE8' },
}

type Ctx = CanvasRenderingContext2D

const font = (size: number, weight: number | string = 400, family = SANS) => `${weight} ${size}px ${family}`

function measureWith(ctx: Ctx, fontString: string) {
  ctx.font = fontString
  return (text: string) => ctx.measureText(text).width
}

function drawAsset(ctx: Ctx, asset: Asset, x: number, y: number, width: number, height: number, radius = 0) {
  const view = windowFor(asset.width, asset.height, width, height, asset.crop)
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.clip()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(asset.image, view.x, view.y, view.width, view.height, x, y, width, height)
  ctx.restore()
}

function placeholderAvatar(ctx: Ctx, p: Palette, cx: number, cy: number, r: number, initial: string) {
  ctx.fillStyle = p.fill
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = p.line
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = p.muted
  ctx.font = font(r * 0.9, 500)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initial, cx, cy + r * 0.04)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
}

function avatar(ctx: Ctx, p: Palette, data: ProfileData, cx: number, cy: number, r: number, ring = 0) {
  if (ring > 0) {
    ctx.fillStyle = p.bg
    ctx.beginPath()
    ctx.arc(cx, cy, r + ring, 0, Math.PI * 2)
    ctx.fill()
  }
  if (data.avatar) drawAsset(ctx, data.avatar, cx - r, cy - r, r * 2, r * 2, r)
  else placeholderAvatar(ctx, p, cx, cy, r, ([...data.displayName.trim()][0] ?? '·').toUpperCase())
}

function banner(ctx: Ctx, p: Palette, data: ProfileData, x: number, y: number, width: number, height: number) {
  if (data.banner) {
    drawAsset(ctx, data.banner, x, y, width, height)
    return
  }
  ctx.fillStyle = p.fill
  ctx.fillRect(x, y, width, height)
  ctx.strokeStyle = p.line
  ctx.setLineDash([4, 4])
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
  ctx.setLineDash([])
  ctx.fillStyle = p.muted
  ctx.font = font(10, 600, MONO)
  ctx.textAlign = 'center'
  ctx.fillText('BANNER', x + width / 2, y + height / 2 + 4)
  ctx.textAlign = 'left'
}

function filledButton(ctx: Ctx, p: Palette, x: number, y: number, width: number, height: number, radius: number, label: string) {
  ctx.fillStyle = p.text
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fill()
  ctx.fillStyle = p.bg
  ctx.font = font(14, 600)
  ctx.textAlign = 'center'
  ctx.fillText(label, x + width / 2, y + height / 2 + 5)
  ctx.textAlign = 'left'
}

function outlineButton(ctx: Ctx, p: Palette, x: number, y: number, width: number, height: number, radius: number, label: string) {
  ctx.strokeStyle = p.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x + 0.5, y + 0.5, width - 1, height - 1, radius)
  ctx.stroke()
  if (!label) return
  ctx.fillStyle = p.text
  ctx.font = font(14, 600)
  ctx.textAlign = 'center'
  ctx.fillText(label, x + width / 2, y + height / 2 + 5)
  ctx.textAlign = 'left'
}

function stat(ctx: Ctx, p: Palette, cx: number, y: number, label: string, numberSize = 17) {
  ctx.textAlign = 'center'
  ctx.fillStyle = p.text
  ctx.font = font(numberSize, 700)
  ctx.fillText('—', cx, y)
  ctx.fillStyle = p.muted
  ctx.font = font(13)
  ctx.fillText(label, cx, y + 19)
  ctx.textAlign = 'left'
}

/** Wrapped lines of text. Returns the baseline below the last line. */
function paragraph(ctx: Ctx, color: string, text: string, x: number, y: number, width: number, size: number, lineHeight: number, maxLines: number, align: 'left' | 'center' = 'left') {
  if (!text.trim()) return y
  const fontString = font(size)
  const lines = wrapText(text, width, measureWith(ctx, fontString), maxLines)
  ctx.fillStyle = color
  ctx.font = fontString
  ctx.textAlign = align
  lines.forEach((line, index) => ctx.fillText(line, align === 'center' ? x + width / 2 : x, y + index * lineHeight))
  ctx.textAlign = 'left'
  return y + lines.length * lineHeight
}

function linkLine(ctx: Ctx, color: string, text: string, x: number, y: number, width: number, size: number, align: 'left' | 'center' = 'left') {
  if (!text.trim()) return y
  const fontString = font(size, 600)
  const shown = truncate(text.trim(), width, measureWith(ctx, fontString))
  const textWidth = ctx.measureText(shown).width
  const left = align === 'center' ? x + (width - textWidth) / 2 : x
  ctx.fillStyle = color
  ctx.fillText(shown, left, y)
  ctx.fillRect(left, y + 3, textWidth, 1)
  return y + size + 8
}

function tabs(ctx: Ctx, p: Palette, y: number, underline: number): number {
  ctx.fillStyle = p.line
  ctx.fillRect(0, y, SCREEN.width, 1)
  ctx.fillRect(0, y + 44, SCREEN.width, 1)
  const cx = SCREEN.width / 6
  ctx.fillStyle = p.text
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) ctx.fillRect(cx - 8 + col * 6, y + 14 + row * 6, 4, 4)
  ctx.fillRect(cx - underline / 2, y + 42, underline, 2)
  return y + 45
}

function grid(ctx: Ctx, p: Palette, data: ProfileData, id: PlatformId, top: number, gap: number) {
  const spec = PLATFORMS[id].grid
  if (!spec) return
  const tileW = (SCREEN.width - gap * (spec.columns - 1)) / spec.columns
  const tileH = (tileW * spec.tileHeight) / spec.tileWidth
  let index = 0
  for (let y = top; y < SCREEN.height; y += tileH + gap) {
    for (let col = 0; col < spec.columns; col += 1) {
      const x = col * (tileW + gap)
      const asset = data.feed[index]
      if (asset) drawAsset(ctx, asset, x, y, tileW, tileH)
      else {
        ctx.fillStyle = p.fill
        ctx.fillRect(x, y, tileW, tileH)
      }
      index += 1
    }
  }
}

function names(data: ProfileData) {
  const displayName = data.displayName.trim()
  const handle = data.handle.trim().replace(/^@/, '')
  return { displayName: displayName || 'Your name', handle: handle || 'yourhandle', hasName: Boolean(displayName), hasHandle: Boolean(handle) }
}

function instagram(ctx: Ctx, p: Palette, data: ProfileData) {
  const n = names(data)
  ctx.fillStyle = n.hasHandle ? p.text : p.muted
  ctx.font = font(18, 700)
  ctx.fillText(truncate(n.handle, 250, measureWith(ctx, font(18, 700))), 16, 38)

  avatar(ctx, p, data, 16 + 44, 70 + 44, 44)
  ;['posts', 'followers', 'following'].forEach((label, i) => stat(ctx, p, 170 + i * 81, 108, label))

  ctx.fillStyle = n.hasName ? p.text : p.muted
  ctx.font = font(14, 700)
  ctx.fillText(truncate(n.displayName, 358, measureWith(ctx, font(14, 700))), 16, 186)
  let y = paragraph(ctx, p.text, data.bio, 16, 208, 358, 14, 19, 6)
  y = y === 208 ? 186 + 4 : y
  y = linkLine(ctx, p.text, data.link, 16, y + 1, 358, 14)

  y += 6
  const half = (SCREEN.width - 32 - 8) / 2
  filledButton(ctx, p, 16, y, half, 34, 8, 'Follow')
  outlineButton(ctx, p, 16 + half + 8, y, half, 34, 8, 'Message')
  y = tabs(ctx, p, y + 34 + 18, 130)
  grid(ctx, p, data, 'instagram', y + 1, 1.5)
}

function tiktok(ctx: Ctx, p: Palette, data: ProfileData) {
  const n = names(data)
  ctx.textAlign = 'center'
  ctx.fillStyle = n.hasName ? p.text : p.muted
  ctx.font = font(17, 700)
  ctx.fillText(truncate(n.displayName, 280, measureWith(ctx, font(17, 700))), SCREEN.width / 2, 38)
  ctx.textAlign = 'left'

  avatar(ctx, p, data, SCREEN.width / 2, 60 + 48, 48)
  ctx.textAlign = 'center'
  ctx.fillStyle = n.hasHandle ? p.text : p.muted
  ctx.font = font(16, 700)
  ctx.fillText(`@${truncate(n.handle, 280, measureWith(ctx, font(16, 700)))}`, SCREEN.width / 2, 186)
  ctx.textAlign = 'left'
  ;['Following', 'Followers', 'Likes'].forEach((label, i) => stat(ctx, p, 95 + i * 100, 224, label))

  const rowY = 268
  const left = (SCREEN.width - (176 + 8 + 44)) / 2
  filledButton(ctx, p, left, rowY, 176, 44, 4, 'Follow')
  outlineButton(ctx, p, left + 184, rowY, 44, 44, 4, '')
  ctx.fillStyle = p.muted
  for (let i = 0; i < 3; i += 1) ctx.fillRect(left + 184 + 13 + i * 7, rowY + 21, 3, 3)

  let y = paragraph(ctx, p.text, data.bio, 35, 346, 320, 14, 19, 4, 'center')
  y = y === 346 ? 346 - 8 : y
  y = linkLine(ctx, p.text, data.link, 35, y + 2, 320, 14, 'center')
  y = tabs(ctx, p, Math.max(y + 12, 400), 44)
  grid(ctx, p, data, 'tiktok', y + 1, 1)
}

function x(ctx: Ctx, p: Palette, data: ProfileData) {
  const n = names(data)
  const bannerH = SCREEN.width / 3
  banner(ctx, p, data, 0, 0, SCREEN.width, bannerH)
  avatar(ctx, p, data, 16 + 40, bannerH + 4, 40, 4)
  outlineButton(ctx, p, SCREEN.width - 16 - 92, bannerH + 14, 92, 34, 17, 'Follow')

  const avatarBottom = bannerH + 4 + 40
  ctx.fillStyle = n.hasName ? p.text : p.muted
  ctx.font = font(20, 800)
  ctx.fillText(truncate(n.displayName, 358, measureWith(ctx, font(20, 800))), 16, avatarBottom + 30)
  ctx.fillStyle = p.muted
  ctx.font = font(15)
  ctx.fillText(`@${truncate(n.handle, 340, measureWith(ctx, font(15)))}`, 16, avatarBottom + 52)

  let y = paragraph(ctx, p.text, data.bio, 16, avatarBottom + 82, 358, 15, 20, 6)
  if (y === avatarBottom + 82) y = avatarBottom + 66
  y = linkLine(ctx, p.muted, data.link, 16, y + 4, 358, 14)
  y += 4
  ctx.font = font(14, 700)
  ctx.fillStyle = p.text
  ctx.fillText('—', 16, y)
  ctx.font = font(14)
  ctx.fillStyle = p.muted
  ctx.fillText('Following', 32, y)
  const gap = 32 + ctx.measureText('Following').width + 16
  ctx.font = font(14, 700)
  ctx.fillStyle = p.text
  ctx.fillText('—', gap, y)
  ctx.font = font(14)
  ctx.fillStyle = p.muted
  ctx.fillText('Followers', gap + 16, y)

  const tabY = y + 18
  ctx.fillStyle = p.line
  ctx.fillRect(0, tabY + 44, SCREEN.width, 1)
  ;['Posts', 'Replies', 'Media'].forEach((label, i) => {
    const cx = (SCREEN.width / 3) * (i + 0.5)
    ctx.fillStyle = i === 0 ? p.text : p.muted
    ctx.font = font(15, i === 0 ? 700 : 500)
    ctx.textAlign = 'center'
    ctx.fillText(label, cx, tabY + 28)
    if (i === 0) ctx.fillRect(cx - 24, tabY + 41, 48, 3)
  })
  ctx.textAlign = 'left'
}

function facebook(ctx: Ctx, p: Palette, data: ProfileData) {
  const n = names(data)
  const coverH = Math.round((SCREEN.width * 9) / 16)
  banner(ctx, p, data, 0, 0, SCREEN.width, coverH)
  const cy = coverH - 44 + 48
  avatar(ctx, p, data, 16 + 48, cy, 48, 4)

  ctx.fillStyle = n.hasName ? p.text : p.muted
  ctx.font = font(24, 800)
  ctx.fillText(truncate(n.displayName, 358, measureWith(ctx, font(24, 800))), 16, cy + 48 + 34)
  let y = paragraph(ctx, p.text, data.bio, 16, cy + 48 + 62, 358, 15, 20, 4)
  if (y === cy + 48 + 62) y = cy + 48 + 46
  y = linkLine(ctx, p.text, data.link, 16, y + 4, 358, 14)

  y += 8
  filledButton(ctx, p, 16, y, 250, 38, 8, 'Follow')
  outlineButton(ctx, p, 274, y, 38, 38, 8, '')
  outlineButton(ctx, p, 320, y, 38 + 16, 38, 8, '')
  ctx.fillStyle = p.muted
  for (let i = 0; i < 3; i += 1) {
    ctx.fillRect(274 + 12 + i * 5, y + 18, 3, 3)
    ctx.fillRect(320 + 16 + i * 5, y + 18, 3, 3)
  }
}

const MOCKS: Record<PlatformId, (ctx: Ctx, p: Palette, data: ProfileData) => void> = { instagram, tiktok, facebook, x }

/** Draw one platform's profile as a phone screenshot at SCREEN size, with its top-left at the origin. */
export function drawProfile(ctx: Ctx, id: PlatformId, data: ProfileData) {
  const p = PALETTE[data.theme]
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, SCREEN.width, SCREEN.height)
  ctx.clip()
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height)
  ctx.textBaseline = 'alphabetic'
  MOCKS[id](ctx, p, data)
  ctx.restore()
}

export const BOARD = { width: 1280, height: 640 } as const

/** How many of the four platforms the bio fits, and which ones it does not. */
export function bioFit(data: ProfileData) {
  const over = PLATFORM_IDS.filter((id) => limitStatus(data.bio, PLATFORMS[id].bio)?.over)
  return { fits: PLATFORM_IDS.length - over.length, over }
}

/** The board: all four profiles side by side, in the same 1280 × 640 frame as every other proof. */
export function drawBoard(ctx: Ctx, data: ProfileData) {
  const ink = { background: '#050505', rail: '#343434', text: '#f2f2f0', muted: '#8a8a86' }
  ctx.fillStyle = ink.background
  ctx.fillRect(0, 0, BOARD.width, BOARD.height)
  ctx.strokeStyle = ink.rail
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(42, 120.5)
  ctx.lineTo(1238, 120.5)
  ctx.moveTo(42, 576.5)
  ctx.lineTo(1238, 576.5)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = ink.text
  ctx.font = font(32, 560)
  ctx.fillText('Profile Kit', 42, 72)
  ctx.fillStyle = ink.muted
  ctx.font = font(19)
  ctx.fillText('Avatar, banner, bio and feed on four platforms.', 42, 100)

  const { fits, over } = bioFit(data)
  const hasBio = characterCount(data.bio) > 0
  ctx.fillStyle = ink.text
  ctx.font = font(15, 600, MONO)
  ctx.fillText(hasBio ? `BIO FITS ${fits} OF ${PLATFORM_IDS.length}` : 'NO BIO YET', 904, 70)
  ctx.fillStyle = ink.muted
  ctx.font = font(15)
  ctx.fillText(over.length ? `Over the limit on ${over.map((id) => PLATFORMS[id].name).join(' and ')}` : hasBio ? 'Within every platform limit' : `${characterCount(data.bio)} characters`, 904, 96)

  const gap = 20
  const panelW = (1196 - gap * 3) / 4
  const panelH = 420
  const scale = panelW / SCREEN.width
  PLATFORM_IDS.forEach((id, index) => {
    const px = 42 + index * (panelW + gap)
    const py = 140
    ctx.fillStyle = ink.muted
    ctx.font = font(15, 500, MONO)
    ctx.textAlign = 'left'
    ctx.fillText(PLATFORMS[id].name.toUpperCase(), px, py - 2)
    ctx.save()
    ctx.beginPath()
    ctx.rect(px, py + 10, panelW, panelH - 10)
    ctx.clip()
    ctx.translate(px, py + 10)
    ctx.scale(scale, scale)
    drawProfile(ctx, id, data)
    ctx.restore()
    ctx.strokeStyle = ink.rail
    ctx.lineWidth = 1
    ctx.strokeRect(px + 0.5, py + 10.5, panelW - 1, panelH - 11)
  })

  ctx.fillStyle = ink.muted
  ctx.font = font(15, 500, MONO)
  ctx.textAlign = 'left'
  ctx.fillText('tiny-design-tools / 05', 42, 612)
  ctx.textAlign = 'right'
  ctx.fillStyle = ink.text
  ctx.fillText(`${data.theme.toUpperCase()}  /  SPECS CHECKED ${CHECKED_ON.toUpperCase()}`, 1238, 612)
  ctx.textAlign = 'left'
}
