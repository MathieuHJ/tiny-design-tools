/**
 * What each platform shows and accepts, last checked on CHECKED_ON.
 *
 * Only X's header, photo and bio numbers come from the platform's own help pages. The rest are the figures that
 * independent guides agree on, and TikTok's bio limit and grid crop are reported inconsistently. Every value
 * carries its confidence so the tool can say so, and platforms change these without notice.
 */

export type PlatformId = 'instagram' | 'tiktok' | 'facebook' | 'x'
export type Confidence = 'official' | 'reported' | 'disputed'

export const CHECKED_ON = '8 Oct 2026'
export const PLATFORM_IDS: readonly PlatformId[] = ['instagram', 'tiktok', 'facebook', 'x']

export type Limit = { max: number; confidence: Confidence; note?: string }

export type SpecRow = { label: string; value: string; confidence: Confidence; note?: string }

export type Platform = {
  id: PlatformId
  name: string
  /** Side, in px, of the square avatar file the kit exports. */
  avatarExport: number
  /** The banner file the kit exports, or null when the platform has none. */
  banner: { width: number; height: number; label: string } | null
  bio: Limit
  displayName: Limit | null
  handle: Limit | null
  /** Profile grid, for platforms that show posts under the profile. */
  grid: { columns: number; tileWidth: number; tileHeight: number; confidence: Confidence; note?: string } | null
  specs: SpecRow[]
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    avatarExport: 640,
    banner: null,
    bio: { max: 150, confidence: 'reported' },
    displayName: { max: 30, confidence: 'reported' },
    handle: { max: 30, confidence: 'reported' },
    grid: { columns: 3, tileWidth: 3, tileHeight: 4, confidence: 'reported', note: 'Tiles are 3:4 since January 2025; wider photos lose their sides.' },
    specs: [
      { label: 'Profile photo', value: '320 × 320 px minimum, shown as a circle', confidence: 'reported' },
      { label: 'Grid tile', value: '3:4 (1080 × 1440 px)', confidence: 'reported', note: 'Changed from square in January 2025.' },
      { label: 'Bio', value: '150 characters', confidence: 'reported' },
      { label: 'Name / username', value: '30 / 30 characters', confidence: 'reported' },
    ],
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    avatarExport: 400,
    banner: null,
    bio: { max: 80, confidence: 'disputed', note: 'Guides give 80; some report 160 on newer accounts. Check the field in the app.' },
    displayName: { max: 30, confidence: 'reported' },
    handle: { max: 24, confidence: 'reported' },
    grid: { columns: 3, tileWidth: 3, tileHeight: 4, confidence: 'disputed', note: 'Guides disagree: a 3:4 crop, or a centred square. Keep the subject in the middle square to be safe under both.' },
    specs: [
      { label: 'Profile photo', value: '200 × 200 px shown, as a circle', confidence: 'reported', note: 'The kit exports 400 px for headroom.' },
      { label: 'Grid tile', value: '3:4, or a centred square', confidence: 'disputed' },
      { label: 'Bio', value: '80 characters (160 reported on newer accounts)', confidence: 'disputed' },
      { label: 'Name / username', value: '30 / 24 characters', confidence: 'reported' },
    ],
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    avatarExport: 640,
    banner: { width: 1702, height: 630, label: 'cover' },
    bio: { max: 101, confidence: 'reported', note: 'Personal profile bio. Pages allow more.' },
    displayName: null,
    handle: null,
    grid: null,
    specs: [
      { label: 'Cover photo', value: '820 × 312 px on desktop, 640 × 360 px on phones', confidence: 'reported', note: 'The kit exports 1702 × 630, twice the 851 × 315 upload size guides recommend.' },
      { label: 'Profile photo', value: '320 × 320 px upload, shown at 176 px (desktop) or 196 px (phone)', confidence: 'reported' },
      { label: 'Bio', value: '101 characters on a personal profile', confidence: 'reported' },
      { label: 'Cover safe zone', value: 'Phones crop about 90 px from each side of the desktop cover', confidence: 'reported' },
    ],
  },
  x: {
    id: 'x',
    name: 'X',
    avatarExport: 400,
    banner: { width: 1500, height: 500, label: 'header' },
    bio: { max: 160, confidence: 'official' },
    displayName: { max: 50, confidence: 'reported' },
    handle: { max: 15, confidence: 'reported' },
    grid: null,
    specs: [
      { label: 'Header', value: '1500 × 500 px', confidence: 'official' },
      { label: 'Header trim', value: 'About 60 px can be cut from the top and bottom', confidence: 'official' },
      { label: 'Profile photo', value: '400 × 400 px, up to 2 MB', confidence: 'official' },
      { label: 'Bio', value: '160 characters', confidence: 'official' },
      { label: 'Name / handle', value: '50 / 15 characters', confidence: 'reported' },
    ],
  },
}

/** The windows a banner is cut to, for the safe-zone overlay. Sizes are the displayed ones, in px. */
export const BANNER_FRAMES = [
  { id: 'x', label: 'X HEADER', width: 1500, height: 500, primary: true },
  { id: 'facebook-desktop', label: 'FACEBOOK DESKTOP', width: 820, height: 312, primary: false },
  { id: 'facebook-phone', label: 'FACEBOOK PHONE', width: 640, height: 360, primary: false },
] as const

export type LimitStatus = { used: number; max: number; over: boolean }

export function characterCount(text: string): number {
  return [...text].length
}

export function limitStatus(text: string, limit: Limit | null): LimitStatus | null {
  if (!limit) return null
  const used = characterCount(text)
  return { used, max: limit.max, over: used > limit.max }
}
