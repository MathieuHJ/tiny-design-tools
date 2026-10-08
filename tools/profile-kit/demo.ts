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

export const DEMO = {
  avatarUrl: asUrl(AVATAR),
  bannerUrl: asUrl(BANNER),
  displayName: 'Atlas Studio',
  handle: 'atlas.studio',
  bio: 'Design studio making small tools and careful interfaces. Brooklyn to everywhere.',
  link: 'atlas.example/work',
}
