import type { Crop } from './cropMath'

export type Theme = 'dark' | 'light'

export type Asset = {
  id: string
  name: string
  url: string
  /** True when the URL must be revoked once the asset is replaced. */
  isObjectUrl: boolean
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
