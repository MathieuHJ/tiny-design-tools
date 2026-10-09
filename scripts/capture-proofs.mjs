import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

/*
 * Regenerates the 1280 × 640 proof frames used by the gallery and each tool README, by driving the
 * real tools in a browser and using their own export buttons. Runs against the dev server so it works
 * before the gallery (which imports these images) can be built.
 */

const projectRoot = resolve(import.meta.dirname, '..')
const releaseDirectory = resolve(projectRoot, 'release')
const origin = 'http://127.0.0.1:4181'

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${origin}/crop-proof/`)).ok) return
    } catch {
      // The dev server has not bound its port yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))
  }
  throw new Error('The dev server did not start on port 4181.')
}

async function pngSize(path) {
  const bytes = await readFile(path)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

async function saveExport(page, buttonName, filename) {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: buttonName }).click()
  const download = await downloadPromise
  const target = resolve(releaseDirectory, filename)
  await download.saveAs(target)
  const size = await pngSize(target)
  if (size.width !== 1280 || size.height !== 640) {
    throw new Error(`${filename} is ${size.width} × ${size.height}, expected 1280 × 640.`)
  }
  process.stdout.write(`${filename}  ${size.width} × ${size.height}\n`)
}

await mkdir(releaseDirectory, { recursive: true })
const server = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '4181', '--strictPort'], {
  cwd: projectRoot,
  stdio: 'ignore',
})

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    acceptDownloads: true,
  })
  const page = await context.newPage()

  // Crop Proof: the lighthouse photo, with the focal point held on the lighthouse and the lit house beside it.
  await page.goto(`${origin}/crop-proof/`)
  await page.getByRole('button', { name: 'USE DEMO' }).click()
  // The grid is sized by a resize observer; wait until it covers the rendered image before aiming at it.
  await page.waitForFunction(() => (document.querySelector('.source-grid')?.getBoundingClientRect().width ?? 0) > 200)
  const grid = await page.locator('.source-grid').boundingBox()
  await page.mouse.click(grid.x + grid.width * 0.6, grid.y + grid.height * 0.46)
  await page.waitForTimeout(300)
  await saveExport(page, 'EXPORT PNG', 'crop-proof-proof.png')

  // Copy Stress: unbroken strings against the simulated interface.
  await page.goto(`${origin}/copy-stress/`)
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'UNBROKEN' }).click()
  await page.waitForTimeout(500)
  await saveExport(page, 'EXPORT PNG', 'copy-stress-proof.png')

  // Squint: the travel landing page, squinted to grey, where the call to action disappears.
  await page.goto(`${origin}/squint/`)
  await page.getByRole('button', { name: 'USE DEMO' }).click()
  await page.locator('canvas').waitFor()
  await page.waitForTimeout(600)
  await saveExport(page, 'EXPORT PNG', 'squint-proof.png')

  // Concentric: a larger radius and padding than the default, so the uneven corner is easy to see, around a photograph.
  await page.goto(`${origin}/concentric/#r=40&p=16&l=2`)
  await page.waitForSelector('.nest-svg')
  await page.waitForTimeout(800)
  await saveExport(page, 'EXPORT PNG', 'concentric-proof.png')

  // Profile Kit: the demo profile on all four platforms.
  await page.goto(`${origin}/profile-kit/`)
  await page.waitForSelector('.pk-tile', { timeout: 20000 })
  await page.waitForTimeout(600)
  await saveExport(page, 'EXPORT BOARD PNG', 'profile-kit-proof.png')

  await context.close()
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
