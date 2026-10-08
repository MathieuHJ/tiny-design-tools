export type FocalPoint = {
  x: number
  y: number
}

export type CropPreset = {
  id: string
  label: string
  width: number
  height: number
  context: string
}

export type CoverCrop = {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  scale: number
}

export type ContainedRect = {
  x: number
  y: number
  width: number
  height: number
}

export const CROP_PRESETS: readonly CropPreset[] = [
  { id: 'avatar', label: 'Avatar', width: 1, height: 1, context: '1:1' },
  { id: 'card', label: 'Card', width: 4, height: 3, context: '4:3' },
  { id: 'square', label: 'Square', width: 1, height: 1, context: '1:1' },
  { id: 'mobile-hero', label: 'Mobile hero', width: 9, height: 16, context: '9:16' },
  { id: 'desktop-hero', label: 'Desktop hero', width: 16, height: 9, context: '16:9' },
  { id: 'open-graph', label: 'Open Graph', width: 2, height: 1, context: '2:1' },
] as const

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, value))
}

export function normalizeFocal(focal: FocalPoint): FocalPoint {
  return {
    x: clampPercent(focal.x),
    y: clampPercent(focal.y),
  }
}

export function getCoverCrop(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  focal: FocalPoint,
): CoverCrop {
  const values = [imageWidth, imageHeight, frameWidth, frameHeight]
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError('Image and frame dimensions must be positive finite numbers.')
  }

  const safeFocal = normalizeFocal(focal)
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
  const sourceWidth = frameWidth / scale
  const sourceHeight = frameHeight / scale
  const sourceX = (imageWidth - sourceWidth) * (safeFocal.x / 100)
  const sourceY = (imageHeight - sourceHeight) * (safeFocal.y / 100)

  return { sourceX, sourceY, sourceWidth, sourceHeight, scale }
}

export function getContainedRect(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
): ContainedRect {
  const values = [imageWidth, imageHeight, containerWidth, containerHeight]
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError('Image and container dimensions must be positive finite numbers.')
  }

  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  }
}

export function focalCss(focal: FocalPoint): string {
  const safeFocal = normalizeFocal(focal)
  return `object-position: ${Math.round(safeFocal.x)}% ${Math.round(safeFocal.y)}%;`
}

export function isEdgeBiased(focal: FocalPoint): boolean {
  const safeFocal = normalizeFocal(focal)
  return safeFocal.x < 8 || safeFocal.x > 92 || safeFocal.y < 8 || safeFocal.y > 92
}

/** Share of the source image's area that survives a cover crop to this preset (0 to 1). */
export function keptShare(imageWidth: number, imageHeight: number, preset: Pick<CropPreset, 'width' | 'height'>): number {
  const crop = getCoverCrop(imageWidth, imageHeight, preset.width, preset.height, { x: 50, y: 50 })
  return (crop.sourceWidth * crop.sourceHeight) / (imageWidth * imageHeight)
}

/** The preset that keeps the least of the source, which is where a subject is most likely to be lost. */
export function tightestPreset(imageWidth: number, imageHeight: number): { preset: CropPreset; share: number } {
  return CROP_PRESETS
    .map((preset) => ({ preset, share: keptShare(imageWidth, imageHeight, preset) }))
    .reduce((tightest, candidate) => (candidate.share < tightest.share ? candidate : tightest))
}
