import { spawn, spawnSync } from 'node:child_process'
import { mkdir, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const projectRoot = resolve(import.meta.dirname, '..')
const releaseDirectory = resolve(projectRoot, 'release')
const temporaryVideoDirectory = resolve(releaseDirectory, '.copy-stress-capture-video')
const captureUrl = 'http://127.0.0.1:4180/copy-stress/'

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(captureUrl)).ok) return
    } catch {
      // The preview process has not bound its port yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150))
  }
  throw new Error('The local preview did not start on port 4180.')
}

await mkdir(releaseDirectory, { recursive: true })
await rm(temporaryVideoDirectory, { recursive: true, force: true })
await mkdir(temporaryVideoDirectory, { recursive: true })

const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4180', '--strictPort'], {
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
    recordVideo: { dir: temporaryVideoDirectory, size: { width: 1280, height: 720 } },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  const video = page.video()

  await page.goto(captureUrl)
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'UNBROKEN' }).click()
  await page.waitForTimeout(1500)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'EXPORT PNG' }).click()
  const download = await downloadPromise
  await download.saveAs(resolve(releaseDirectory, 'copy-stress-proof.png'))
  await page.waitForTimeout(4500)
  await page.screenshot({ path: resolve(releaseDirectory, 'copy-stress-product.png'), fullPage: true })

  await page.close()
  await context.close()
  const temporaryVideo = await video?.path()
  if (!temporaryVideo) throw new Error('Playwright did not create the release capture.')
  const webmPath = resolve(releaseDirectory, 'copy-stress-capture.webm')
  await rm(webmPath, { force: true })
  await rename(temporaryVideo, webmPath)
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-i', webmPath, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(releaseDirectory, 'copy-stress-capture.mp4')], { stdio: 'ignore' })
  if (ffmpeg.error) process.stderr.write('ffmpeg was unavailable, so the WebM capture remains the release source.\n')
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
  await rm(temporaryVideoDirectory, { recursive: true, force: true })
}

process.stdout.write('Prepared Copy Stress proof frame, product screenshot, and release capture.\n')
