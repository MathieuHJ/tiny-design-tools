import type { Crop } from './cropMath'

export type Theme = 'dark' | 'light'

export type Asset = {
  id: string
  name: string
  /** An object URL for the blob. Revoked when the asset is released. */
  url: string
  /** The original file, kept so the asset can be saved in the browser. */
  blob: Blob
  image: HTMLImageElement
  width: number
  height: number
  crop: Crop
}

export type ProfileData = {
  displayName: string
  handle: string
  bio: string
  link: string
  avatar: Asset | null
  banner: Asset | null
  feed: Asset[]
  theme: Theme
}

export const EMPTY_PROFILE: ProfileData = {
  displayName: '',
  handle: '',
  bio: '',
  link: '',
  avatar: null,
  banner: null,
  feed: [],
  theme: 'dark',
}
