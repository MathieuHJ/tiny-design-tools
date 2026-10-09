import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

/*
 * Makes the images for social posts: each tool, in a real browser, in a state worth showing, set inside a
 * minimal window frame on a soft background. The output is 2400 × 1350 (16:9), which X shows in full.
 *
 *   pnpm capture:social            light cards, into release/social/
 *   pnpm capture:social dark       dark cards instead
 *
 * Runs against the dev server, so it needs nothing but the repository.
 */

const theme = process.argv[2] === 'dark' ? 'dark' : 'light'
const projectRoot = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(projectRoot, 'release', 'social')
const origin = 'http://127.0.0.1:4182'
const siteHost = 'mathieuhj.github.io/tiny-design-tools'

const CARD = { width: 1600, height: 900, scale: 1.5 }
const TITLE_BAR = 38

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${origin}/crop-proof/`)).ok) return
    } catch {
      // The dev server has not bound its port yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))
  }
  throw new Error('The dev server did not start on port 4182.')
}

/** The part of the page to show, in document pixels: an element, optionally limited in height. */
async function regionOf(page, selector, { maxHeight = Infinity, until, pad = 0 } = {}) {
  return page.evaluate(([sel, max, stop, around]) => {
    const box = (node) => {
      const r = node.getBoundingClientRect()
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height }
    }
    const rect = box(document.querySelector(sel))
    if (stop) {
      const end = box(document.querySelector(stop))
      rect.height = end.y + end.height - rect.y
    }
    rect.height = Math.min(rect.height, max)
    // Breathing room, so content that sits against the edge of its container does not touch the window frame.
    const left = Math.max(0, rect.x - around)
    return { x: left, y: Math.max(0, rect.y - around), width: rect.width + (rect.x - left) * 2, height: rect.height + around * 2 }
  }, [selector, maxHeight, until ?? null, pad])
}

/** Each scene drives one real page into a state worth showing, then says which part of it to frame. */
const scenes = [
  {
    id: 'collection',
    name: 'TINY DESIGN TOOLS',
    tagline: 'Small, local instruments for visual work.',
    path: '',
    viewport: { width: 1280, height: 1000 },
    async setup(page) {
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(700)
      return { x: 0, y: 0, width: 1280, height: 880 }
    },
  },
  {
    id: 'crop-proof',
    name: 'CROP PROOF',
    tagline: 'One focal point across six crops.',
    path: 'crop-proof/',
    viewport: { width: 1140, height: 1100 },
    async setup(page) {
      await page.getByRole('button', { name: 'USE DEMO' }).click()
      await page.waitForFunction(() => (document.querySelector('.source-grid')?.getBoundingClientRect().width ?? 0) > 200)
      const grid = await page.locator('.source-grid').boundingBox()
      await page.mouse.click(grid.x + grid.width * 0.6, grid.y + grid.height * 0.46)
      await page.mouse.move(2, 2)
      await page.waitForTimeout(500)
      await page.locator('.proof-section').scrollIntoViewIfNeeded()
      return regionOf(page, '.proof-section', { pad: 28 })
    },
  },
  {
    id: 'copy-stress',
    name: 'COPY STRESS',
    tagline: 'Stress copy. Reveal the breakpoints.',
    // The real bookmarklet, running on a real page: this site's own gallery, with every string made unbreakable.
    path: '',
    viewport: { width: 1100, height: 900 },
    async setup(page) {
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(600)
      await page.evaluate(() => {
        const script = document.createElement('script')
        script.src = '/copy-stress/bookmarklet.js'
        document.head.append(script)
      })
      await page.waitForSelector('#copy-stress-panel')
      await page.locator('#copy-stress-panel button', { hasText: 'UNBROKEN' }).click()
      await page.waitForTimeout(700)
      return { x: 0, y: 0, width: 1100, height: 900 }
    },
  },
  {
    id: 'squint',
    name: 'SQUINT',
    tagline: 'Blur the design. See what still reads.',
    path: 'squint/',
    viewport: { width: 1040, height: 800 },
    async setup(page) {
      await page.getByRole('button', { name: 'USE DEMO' }).click()
      await page.locator('canvas').waitFor()
      await page.waitForTimeout(1000)
      return regionOf(page, '.workbench', { maxHeight: 620 })
    },
  },
  {
    id: 'concentric',
    name: 'CONCENTRIC',
    tagline: 'Nested corners that actually line up.',
    path: 'concentric/#r=40&p=16&l=2',
    viewport: { width: 1040, height: 900 },
    async setup(page) {
      await page.waitForSelector('.nest-svg')
      await page.waitForTimeout(1000)
      return regionOf(page, '.workbench')
    },
  },
  {
    id: 'profile-kit',
    name: 'PROFILE KIT',
    tagline: 'Your profile on four platforms, before you post.',
    path: 'profile-kit/',
    viewport: { width: 1180, height: 1000 },
    async setup(page) {
      await page.waitForSelector('.pk-tile', { timeout: 20000 })
      await page.waitForTimeout(1000)
      return regionOf(page, '.pk-workbench', { maxHeight: 590 })
    },
  },
]

function cardHtml({ scene, shot, size }) {
  const dark = theme === 'dark'
  const ink = dark ? '#f2f2f0' : '#111111'
  const muted = dark ? '#8c8c88' : '#6b6b67'
  const background = dark
    ? 'radial-gradient(120% 100% at 22% 0%, #1a1a1a 0%, #0d0d0d 55%, #070707 100%)'
    : 'radial-gradient(120% 100% at 22% 0%, #f6f6f3 0%, #e8e8e4 55%, #d9d9d4 100%)'
  const shadow = dark
    ? '0 0 0 1px rgba(255,255,255,.1), 0 40px 80px -24px rgba(0,0,0,.8)'
    : '0 0 0 1px rgba(0,0,0,.14), 0 24px 48px -16px rgba(0,0,0,.4), 0 60px 110px -40px rgba(0,0,0,.4)'
  const url = `${siteHost}/${scene.path.replace(/#.*$/, '')}`.replace(/\/$/, '/')
  const marginX = 130
  const marginY = 84
  const fit = Math.min((CARD.width - marginX * 2) / size.width, (CARD.height - marginY * 2) / (size.height + TITLE_BAR), 1.7)

  return `<!doctype html><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:${CARD.width}px;height:${CARD.height}px;overflow:hidden}
    body{position:relative;background:${background};color:${ink};font-family:Inter,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
    .mono{font:600 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}
    .top,.bottom{position:absolute;left:${marginX}px;right:${marginX}px;display:flex;justify-content:space-between;align-items:center}
    .top{top:30px}.bottom{bottom:30px}
    .muted{color:${muted}}
    .tagline{font:500 19px/1 Inter,"Helvetica Neue",Arial,sans-serif;letter-spacing:-.01em}
    .window{position:absolute;left:50%;top:50%;width:${size.width}px;transform:translate(-50%,-50%) scale(${fit});border-radius:14px;overflow:hidden;background:#0b0b0b;box-shadow:${shadow}}
    .bar{height:${TITLE_BAR}px;display:grid;grid-template-columns:90px 1fr 90px;align-items:center;background:#111;border-bottom:1px solid #262626}
    .dots{display:flex;gap:7px;padding-left:16px}
    .dots i{width:10px;height:10px;border-radius:50%;background:#3a3a3a}
    .pill{justify-self:center;padding:5px 16px;border:1px solid #262626;border-radius:7px;background:#0b0b0b;color:#8c8c88;font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em}
    img{display:block;width:${size.width}px;height:${size.height}px}
  </style>
  <div class="top"><span class="mono muted">Tiny Design Tools</span><span class="mono">${scene.name}</span></div>
  <div class="window"><div class="bar"><div class="dots"><i></i><i></i><i></i></div><div class="pill">${url}</div><div></div></div><img src="data:image/png;base64,${shot}"></div>
  <div class="bottom"><span class="tagline">${scene.tagline}</span><span class="mono muted">Local / No upload / Open source</span></div>`
}

await mkdir(outputDirectory, { recursive: true })
const server = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '4182', '--strictPort'], { cwd: projectRoot, stdio: 'ignore' })

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const only = process.argv.slice(3)

  for (const scene of scenes.filter((item) => only.length === 0 || only.includes(item.id))) {
    const context = await browser.newContext({ viewport: scene.viewport, deviceScaleFactor: 2, colorScheme: 'dark', reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto(`${origin}/${scene.path}`)
    const region = await scene.setup(page)
    const shot = (await page.screenshot({ type: 'png', fullPage: true, clip: region })).toString('base64')
    await context.close()

    const cardContext = await browser.newContext({ viewport: { width: CARD.width, height: CARD.height }, deviceScaleFactor: CARD.scale })
    const cardPage = await cardContext.newPage()
    await cardPage.setContent(cardHtml({ scene, shot, size: { width: Math.round(region.width), height: Math.round(region.height) } }), { waitUntil: 'load' })
    await cardPage.waitForTimeout(250)
    const file = resolve(outputDirectory, `${scene.id}${theme === 'dark' ? '-dark' : ''}.png`)
    await writeFile(file, await cardPage.screenshot({ type: 'png' }))
    await cardContext.close()
    process.stdout.write(`${scene.id}${theme === 'dark' ? '-dark' : ''}.png\n`)
  }
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
