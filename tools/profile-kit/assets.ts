import { createZip, type ZipEntry } from '../../src/zip'
import { DEFAULT_CROP, windowFor, type Crop } from './cropMath'
import { BOARD, SCREEN, drawBoard, drawProfile } from './drawProfile'
import type { Asset, ProfileData } from './model'
import { PLATFORMS, PLATFORM_IDS, type PlatformId } from './platforms'

let counter = 0

/** Decode an image into an asset with a centred, unzoomed crop. */
export async function loadAsset(blob: Blob, name: string, crop: Crop = DEFAULT_CROP): Promise<Asset> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('That image has no size.')
    counter += 1
    return { id: `asset-${counter}`, name, url, blob, image, width: image.naturalWidth, height: image.naturalHeight, crop: { ...crop } }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/** Read a data or object URL into a blob, for bundled artwork. */
export async function blobFromUrl(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}

export function releaseAsset(asset: Asset | null) {
  if (asset) URL.revokeObjectURL(asset.url)
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable in this browser.')
  return { canvas, context }
}

export type ImageFormat = 'png' | 'jpeg'
export const FORMAT_TYPES: Record<ImageFormat, { mime: string; extension: string }> = {
  png: { mime: 'image/png', extension: 'png' },
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
}

/** An asset cut to a frame, at an exact pixel size. A white ground keeps JPEG from turning transparency black. */
export function renderCrop(asset: Asset, width: number, height: number, crop: Crop = asset.crop): HTMLCanvasElement {
  const { canvas, context } = canvasOf(width, height)
  const view = windowFor(asset.width, asset.height, width, height, crop)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(asset.image, view.x, view.y, view.width, view.height, 0, 0, width, height)
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode the image.'))), mime, quality)
  })
}

async function bytesOf(canvas: HTMLCanvasElement, format: ImageFormat): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas, FORMAT_TYPES[format].mime, format === 'jpeg' ? 0.92 : undefined)
  return new Uint8Array(await blob.arrayBuffer())
}

export function renderMock(id: PlatformId, data: ProfileData, scale = 2): HTMLCanvasElement {
  const { canvas, context } = canvasOf(SCREEN.width * scale, SCREEN.height * scale)
  context.scale(scale, scale)
  drawProfile(context, id, data)
  return canvas
}

export function renderBoard(data: ProfileData): HTMLCanvasElement {
  const { canvas, context } = canvasOf(BOARD.width, BOARD.height)
  drawBoard(context, data)
  return canvas
}

export function mockFilename(id: PlatformId) {
  return `${id}-profile.png`
}

/** Everything the kit exports as separate files: the board, one mock per platform, and each avatar and banner at its size. */
export async function buildExport(data: ProfileData, format: ImageFormat): Promise<ZipEntry[]> {
  const extension = FORMAT_TYPES[format].extension
  const entries: ZipEntry[] = [{ name: 'profile-kit-board.png', data: await bytesOf(renderBoard(data), 'png') }]
  for (const id of PLATFORM_IDS) {
    const platform = PLATFORMS[id]
    entries.push({ name: mockFilename(id), data: await bytesOf(renderMock(id, data), 'png') })
    if (data.avatar) {
      const size = platform.avatarExport
      entries.push({ name: `${id}-avatar-${size}x${size}.${extension}`, data: await bytesOf(renderCrop(data.avatar, size, size), format) })
    }
    if (data.banner && platform.banner) {
      const { width, height, label } = platform.banner
      entries.push({ name: `${id}-${label}-${width}x${height}.${extension}`, data: await bytesOf(renderCrop(data.banner, width, height), format) })
    }
  }
  return entries
}

export async function buildZip(data: ProfileData, format: ImageFormat) {
  return new Blob([createZip(await buildExport(data, format))], { type: 'application/zip' })
}
