/** Synthetic artwork for the built-in demo. Original to this repository, like the other fixtures. */

const asUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2c9a0"/><stop offset="1" stop-color="#c8694f"/></linearGradient></defs>
  <rect width="640" height="640" fill="url(#g)"/>
  <path d="M96 640C96 500 200 440 320 440s224 60 224 200z" fill="#f4efe6"/>
  <rect x="280" y="380" width="80" height="80" rx="30" fill="#8a5640"/>
  <circle cx="320" cy="270" r="118" fill="#8a5640"/>
  <path d="M200 262c-6-96 56-150 126-148 74 2 128 58 114 150-26-50-58-72-118-74-52-2-96 20-122 72z" fill="#1d1411"/>
</svg>`

const BANNER = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2540"/><stop offset=".6" stop-color="#8a5a7a"/><stop offset="1" stop-color="#f0a77a"/></linearGradient>
  </defs>
  <rect width="1500" height="500" fill="url(#sky)"/>
  <g fill="#fff" opacity=".7"><circle cx="140" cy="70" r="2"/><circle cx="360" cy="40" r="1.5"/><circle cx="560" cy="96" r="2"/><circle cx="820" cy="52" r="1.5"/><circle cx="1280" cy="84" r="2"/><circle cx="1420" cy="36" r="1.5"/></g>
  <circle cx="1010" cy="250" r="118" fill="#f8dcae"/>
  <path d="M0 360 280 250 520 330 800 200 1090 340 1320 270 1500 340V500H0z" fill="#33375a"/>
  <path d="M0 420 220 340 470 410 760 310 1040 420 1300 350 1500 410V500H0z" fill="#232743"/>
  <path d="M0 470 300 420 600 460 900 410 1200 460 1500 430V500H0z" fill="#14172b"/>
</svg>`

type Tile = { width: number; height: number; svg: (w: number, h: number) => string }

const SKIES = [
  ['#1b2540', '#f0a77a'],
  ['#2a1f3d', '#e58a86'],
  ['#0f2b3a', '#7fc4b8'],
  ['#3a2230', '#f2c27b'],
] as const

/** Sunset scene: sky, a sun, and three ridges. */
const scene = (sky: readonly [string, string], sunX: number, ridge: string) => (w: number, h: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#s)"/>
  <circle cx="${w * sunX}" cy="${h * 0.46}" r="${w * 0.14}" fill="#f8dcae"/>
  <path d="M0 ${h * 0.7} ${w * 0.3} ${h * 0.55} ${w * 0.55} ${h * 0.68} ${w * 0.8} ${h * 0.5} ${w} ${h * 0.64}V${h}H0z" fill="${ridge}"/>
  <path d="M0 ${h * 0.84} ${w * 0.35} ${h * 0.72} ${w * 0.7} ${h * 0.84} ${w} ${h * 0.76}V${h}H0z" fill="#10132a" opacity=".92"/>
</svg>`

/** A solid ground with a large word or numeral, for rhythm between pictures. Kept inside the middle 3:4 so the grid crop does not cut it. */
const type = (ground: string, ink: string, word: string, size: number) => (w: number, h: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${ground}"/>
  <text x="${w * 0.17}" y="${h * 0.58}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${w * size}" font-weight="800" letter-spacing="-6" fill="${ink}">${word}</text>
  <rect x="${w * 0.17}" y="${h * 0.68}" width="${w * 0.16}" height="6" fill="${ink}"/>
</svg>`

/** Overlapping circles on a flat ground. */
const orbs = (ground: string, a: string, b: string, c: string) => (w: number, h: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${ground}"/>
  <circle cx="${w * 0.38}" cy="${h * 0.42}" r="${w * 0.24}" fill="${a}"/>
  <circle cx="${w * 0.62}" cy="${h * 0.5}" r="${w * 0.24}" fill="${b}" opacity=".85"/>
  <circle cx="${w * 0.5}" cy="${h * 0.66}" r="${w * 0.2}" fill="${c}" opacity=".8"/>
</svg>`

/** Diagonal bands. */
const bands = (colors: string[]) => (w: number, h: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${colors.map((color, i) => `<path d="M${-w * 0.2 + i * (w / colors.length)} ${h}L${w * 0.6 + i * (w / colors.length)} 0H${w * 0.6 + (i + 1) * (w / colors.length)}L${-w * 0.2 + (i + 1) * (w / colors.length)} ${h}z" fill="${color}"/>`).join('\n  ')}
</svg>`

/** Nine posts of mixed shapes, so the grid shows how pictures of any ratio are cut to a tile. */
const FEED: Tile[] = [
  { width: 1080, height: 1350, svg: scene(SKIES[0], 0.62, '#33375a') },
  { width: 1080, height: 1080, svg: type('#f0a77a', '#1b2540', 'Atlas', 0.23) },
  { width: 1350, height: 900, svg: scene(SKIES[2], 0.3, '#1d4a55') },
  { width: 1080, height: 1350, svg: orbs('#1b2540', '#f0a77a', '#e58a86', '#f8dcae') },
  { width: 1080, height: 1080, svg: scene(SKIES[1], 0.7, '#4a2b52') },
  { width: 1080, height: 1350, svg: type('#f8dcae', '#3a2230', '04', 0.46) },
  { width: 1080, height: 1350, svg: bands(['#1b2540', '#33375a', '#e58a86', '#f0a77a', '#f8dcae']) },
  { width: 1350, height: 900, svg: scene(SKIES[3], 0.45, '#5b3a49') },
  { width: 1080, height: 1080, svg: orbs('#f8dcae', '#1b2540', '#33375a', '#e58a86') },
]

export const DEMO_FEED = FEED.map((tile, index) => ({ name: `Demo post ${String(index + 1).padStart(2, '0')}`, url: asUrl(tile.svg(tile.width, tile.height)) }))

export const DEMO = {
  avatarUrl: asUrl(AVATAR),
  bannerUrl: asUrl(BANNER),
  displayName: 'Atlas Studio',
  handle: 'atlas.studio',
  bio: 'Design studio making small tools and careful interfaces. Brooklyn to everywhere.',
  link: 'atlas.example/work',
}
