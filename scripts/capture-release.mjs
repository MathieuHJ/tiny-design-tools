import { spawn, spawnSync } from 'node:child_process'
import { mkdir, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const projectRoot = resolve(import.meta.dirname, '..')
const releaseDirectory = resolve(projectRoot, 'release')
const temporaryVideoDirectory = resolve(releaseDirectory, '.capture-video')
const captureUrl = 'http://127.0.0.1:4179/crop-proof/'

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(captureUrl)
      if (response.ok) return
    } catch {
      // The preview process has not bound its port yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150))
  }
  throw new Error('The local preview did not start on port 4179.')
}

await mkdir(releaseDirectory, { recursive: true })
await rm(temporaryVideoDirectory, { recursive: true, force: true })
await mkdir(temporaryVideoDirectory, { recursive: true })

const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], {
  cwd: projectRoot,
  stdio: 'ignore',
})

let browser
try {
  await waitForPreview()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    recordVideo: {
      dir: temporaryVideoDirectory,
      size: { width: 1280, height: 720 },
    },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  const video = page.video()

  await page.goto(captureUrl)
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'USE DEMO' }).click()
  await page.locator('.source-surface img').waitFor({ state: 'visible' })
  await page.waitForTimeout(1200)

  const focal = page.getByRole('button', { name: /Focal point/ })
  const surface = page.locator('.source-surface')
  const focalBounds = await focal.boundingBox()
  const surfaceBounds = await surface.boundingBox()
  if (!focalBounds || !surfaceBounds) throw new Error('The focal control was not measurable.')

  await page.mouse.move(focalBounds.x + focalBounds.width / 2, focalBounds.y + focalBounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    surfaceBounds.x + surfaceBounds.width * 0.78,
    surfaceBounds.y + surfaceBounds.height * 0.38,
    { steps: 26 },
  )
  await page.mouse.up()
  await page.waitForTimeout(900)

  await page.locator('.proof-heading').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1600)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'EXPORT PNG' }).click()
  const download = await downloadPromise
  await download.saveAs(resolve(releaseDirectory, 'crop-proof-proof.png'))
  await page.waitForTimeout(3000)
  await page.screenshot({ path: resolve(releaseDirectory, 'crop-proof-product.png'), fullPage: true })

  await page.close()
  await context.close()
  const temporaryVideo = await video?.path()
  if (!temporaryVideo) throw new Error('Playwright did not create the release capture.')
  const webmPath = resolve(releaseDirectory, 'crop-proof-capture.webm')
  await rm(webmPath, { force: true })
  await rename(temporaryVideo, webmPath)

  const ffmpeg = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i', webmPath,
      '-an',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      resolve(releaseDirectory, 'crop-proof-capture.mp4'),
    ],
    { stdio: 'ignore' },
  )
  if (ffmpeg.error) {
    process.stderr.write('ffmpeg was unavailable, so the WebM capture remains the release source.\n')
  }
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
  await rm(temporaryVideoDirectory, { recursive: true, force: true })
}

process.stdout.write('Prepared Crop Proof proof frame, product screenshot, and release capture.\n')
