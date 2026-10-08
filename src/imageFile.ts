export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024

export function validateLocalImage(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Use a local PNG, JPEG, or WebP image.'
  if (file.size > MAX_IMAGE_BYTES) return 'Keep the image under 25 MB for reliable local export.'
  if (file.size === 0) return 'That image file is empty.'
  return null
}

/** The first image file in a drop or paste, or null when the data carries none. */
export function firstImageFile(data: DataTransfer | null): File | null {
  if (!data) return null
  return [...data.files].find((file) => file.type.startsWith('image/')) ?? null
}

/** Every image file in a drop or paste, in order. */
export function allImageFiles(data: DataTransfer | null): File[] {
  if (!data) return []
  return [...data.files].filter((file) => file.type.startsWith('image/'))
}
