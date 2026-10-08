export type Crop = {
  /** Horizontal position of the window across the slack, 0 (left) to 1 (right). */
  x: number
  /** Vertical position, 0 (top) to 1 (bottom). */
  y: number
  /** 1 fills the frame as far as the image allows. Higher values zoom in. */
  zoom: number
}

export type Rect = { x: number; y: number; width: number; height: number }

export const DEFAULT_CROP: Crop = { x: 0.5, y: 0.5, zoom: 1 }
export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeCrop(crop: Crop): Crop {
  const safe = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)
  return {
    x: clamp(safe(crop.x, 0.5), 0, 1),
    y: clamp(safe(crop.y, 0.5), 0, 1),
    zoom: clamp(safe(crop.zoom, 1), MIN_ZOOM, MAX_ZOOM),
  }
}

/**
 * The part of the image, in image pixels, that fills a frame of the given shape. At zoom 1 it is the largest
 * window of that shape the image holds; zooming shrinks it. The window slides across whatever slack is left.
 */
export function windowFor(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number, crop: Crop): Rect {
  const values = [imageWidth, imageHeight, frameWidth, frameHeight]
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError('Image and frame dimensions must be positive finite numbers.')
  }
  const safe = normalizeCrop(crop)
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * safe.zoom
  const width = frameWidth / scale
  const height = frameHeight / scale
  return { x: (imageWidth - width) * safe.x, y: (imageHeight - height) * safe.y, width, height }
}

/**
 * The crop position that puts the window's centre as near a point as the image allows. This is what makes
 * dragging the window feel direct: the window follows the pointer, and stops at the image edge.
 */
export function cropForCenter(center: { x: number; y: number }, imageWidth: number, imageHeight: number, window: Rect): { x: number; y: number } {
  const along = (point: number, size: number, windowSize: number) => {
    const slack = size - windowSize
    return slack <= 0 ? 0.5 : clamp((point - windowSize / 2) / slack, 0, 1)
  }
  return { x: along(center.x, imageWidth, window.width), y: along(center.y, imageHeight, window.height) }
}

/** Fit a source rectangle inside a frame without distortion, centred. For showing a whole image. */
export function containRect(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number): Rect {
  const scale = Math.min(frameWidth / imageWidth, frameHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return { x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height }
}

/**
 * Which frame should follow the pointer on each axis. The first frame in the list that has room to slide on
 * that axis wins, so a banner that already matches the primary frame's shape can still be repositioned
 * through the other frames. When nothing can move, the primary frame is returned and the crop stays centred.
 */
export function pickDrivers(
  imageWidth: number,
  imageHeight: number,
  frames: readonly { width: number; height: number }[],
  crop: Crop,
): { x: number; y: number } {
  const pick = (axis: 'width' | 'height') => {
    const index = frames.findIndex((frame) => {
      const view = windowFor(imageWidth, imageHeight, frame.width, frame.height, crop)
      return (axis === 'width' ? imageWidth - view.width : imageHeight - view.height) > 0.5
    })
    return index === -1 ? 0 : index
  }
  return { x: pick('width'), y: pick('height') }
}
