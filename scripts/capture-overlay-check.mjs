import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'release')
const origin = 'http://127.0.0.1:4197'
const videoDirectory = resolve(output, '.overlay-check-video')
const errors = []
const externalRequests = []
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4197', '--strictPort'], { cwd: root, stdio: 'ignore' })

async function saveDownload(page, button, file) {
  const promise = page.waitForEvent('download')
  await button.click()
  const download = await promise
  await download.saveAs(resolve(output, file))
  const bytes = await readFile(resolve(output, file))
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

async function checked(page) {
  await page.waitForFunction(() => {
    const status = document.querySelector('.oc-verdict strong')?.textContent
    return status && status !== 'CHECKING'
  })
}

let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${origin}/overlay-check/`)).ok) { ready = true; break } } catch { /* Server is starting. */ }
    await new Promise((done) => setTimeout(done, 200))
  }
  assert(ready, 'Local preview must bind port 4197.')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin)) externalRequests.push(request.url()) })
  await page.goto(`${origin}/overlay-check/`)
  const exportButton = page.getByRole('button', { name: 'EXPORT PROOF PNG', exact: true })
  await checked(page)
  assert.equal(await exportButton.isEnabled(), true)
  assert.equal(await page.locator('.oc-verdict strong').textContent(), 'NEEDS SCRIM')
  await page.getByRole('button', { name: /USE MINIMUM/ }).click()
  await checked(page)
  assert.equal(await page.locator('.oc-verdict strong').textContent(), 'REGION PASSES')
  assert.deepEqual(await saveDownload(page, exportButton, 'overlay-check-proof.png'), { width: 1280, height: 640 })
  assert.deepEqual(await saveDownload(page, page.getByRole('button', { name: 'SAVE IMAGE', exact: true }), 'overlay-check-image.png'), { width: 2000, height: 1333 })
  await page.screenshot({ path: resolve(output, 'overlay-check-product.png'), fullPage: true })
  await page.getByRole('button', { name: 'COPY CSS', exact: true }).click()
  const css = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(css, /linear-gradient\(to bottom in srgb/)
  assert.match(css, /aspect-ratio: 2000 \/ 1333/)
  assert.match(css, /container-type: inline-size/)

  // Pointer move and resize, then their keyboard equivalents.
  const move = page.getByRole('button', { name: /^Move text region/ })
  const resize = page.getByRole('button', { name: /^Resize text region/ })
  await move.scrollIntoViewIfNeeded()
  const beforeMove = await page.locator('.oc-text-region').boundingBox()
  const moveBounds = await move.boundingBox()
  await page.mouse.move(moveBounds.x + 30, moveBounds.y + 30)
  await page.mouse.down()
  await page.mouse.move(moveBounds.x + 55, moveBounds.y + 15, { steps: 5 })
  await page.mouse.up()
  await page.waitForFunction(({ x, y }) => { const box = document.querySelector('.oc-text-region').getBoundingClientRect(); return box.x > x && box.y < y }, beforeMove)
  const afterMove = await page.locator('.oc-text-region').boundingBox()
  assert(afterMove.x > beforeMove.x)
  assert(afterMove.y < beforeMove.y)
  const resizeBounds = await resize.boundingBox()
  await page.mouse.move(resizeBounds.x + 15, resizeBounds.y + 15)
  await page.mouse.down()
  await page.mouse.move(resizeBounds.x + 35, resizeBounds.y + 30, { steps: 5 })
  await page.mouse.up()
  await page.waitForFunction((width) => document.querySelector('.oc-text-region').getBoundingClientRect().width > width, afterMove.width)
  assert((await page.locator('.oc-text-region').boundingBox()).width > afterMove.width)
  await move.focus()
  await move.press('ArrowLeft')
  await resize.focus()
  await resize.press('ArrowRight')
  await checked(page)
  await page.getByRole('button', { name: 'ORIGINAL', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'ORIGINAL', exact: true }).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: 'WITH SCRIM', exact: true }).click()

  const text = page.getByLabel('YOUR TEXT', { exact: true })
  await text.fill('')
  assert.equal(await exportButton.isDisabled(), true)
  await text.fill('Long copy '.repeat(24).trim())
  assert.equal(await page.locator('.oc-verdict strong').textContent(), 'TEXT CLIPPED')
  assert.equal(await exportButton.isDisabled(), true)
  await page.getByRole('button', { name: 'RESET DEMO', exact: true }).click()
  await checked(page)
  await page.getByRole('button', { name: /USE MINIMUM/ }).click()
  await checked(page)

  // Real pixel fixtures with an isolated outlier and transparency. Native dimensions remain intact.
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1000
    const context = canvas.getContext('2d'); context.fillStyle = '#181818'; context.fillRect(0, 0, 1000, 1000)
    context.fillStyle = '#fff'; context.fillRect(500, 700, 1, 1)
    return canvas.toDataURL().split(',')[1]
  })
  await page.getByLabel('SCRIM STRENGTH', { exact: false }).press('Home')
  const fileInput = page.getByLabel('Open photo', { exact: true })
  await fileInput.setInputFiles({ name: 'one-bright-pixel.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') })
  await checked(page)
  assert.equal(await page.locator('.oc-verdict strong').textContent(), 'NEEDS SCRIM')
  assert.equal(await page.locator('.oc-readouts .readout').nth(1).textContent(), '1')
  await page.getByRole('button', { name: /USE MINIMUM/ }).click()
  await checked(page)
  assert.equal(await page.locator('.oc-verdict strong').textContent(), 'REGION PASSES')
  await page.getByRole('button', { name: 'BLACK', exact: true }).click()
  await checked(page)
  await page.getByRole('button', { name: 'TOP', exact: true }).click()
  await checked(page)
  await page.getByRole('button', { name: /USE MINIMUM/ }).click()
  await checked(page)
  assert.equal(await page.locator('.oc-verdict strong').textContent(), 'REGION PASSES')
  await page.getByRole('button', { name: 'UNIFORM', exact: true }).click()
  await checked(page)
  await page.getByRole('button', { name: 'AAA TEXT', exact: true }).click()
  await checked(page)
  await page.getByRole('button', { name: /USE MINIMUM/ }).click()
  await checked(page)
  assert.equal(await page.locator('.oc-verdict strong').textContent(), 'REGION PASSES')

  // Exercise exported CSS against actual browser-rendered background pixels at source size.
  await page.getByRole('button', { name: /COPY CSS|COPIED/, exact: true }).click()
  const fixtureCss = await page.evaluate(() => navigator.clipboard.readText())
  const cssPage = await context.newPage()
  await cssPage.setViewportSize({ width: 1000, height: 1000 })
  await cssPage.setContent(`<style>html,body{margin:0;width:1000px;height:1000px}${fixtureCss}.overlay-check__text{visibility:hidden}</style><div class="overlay-check"><img src="data:image/png;base64,${fixture}" alt=""><p class="overlay-check__text"></p></div>`)
  await cssPage.locator('img').evaluate((image) => image.decode())
  const screenshot = await cssPage.screenshot()
  const parity = await page.evaluate(async (base64) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1000
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, 1000, 1000).data
    const linear = (channel) => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }
    let minRatio = Infinity
    for (let y = 560; y < 901; y++) for (let x = 80; x < 840; x++) {
      const i = (y * 1000 + x) * 4
      const luminance = .2126 * linear(pixels[i]) + .7152 * linear(pixels[i + 1]) + .0722 * linear(pixels[i + 2])
      minRatio = Math.min(minRatio, (luminance + .05) / .05)
    }
    return minRatio
  }, screenshot.toString('base64'))
  assert(parity >= 7, 'Exported CSS must meet the target in the real renderer.')
  await cssPage.close()

  await fileInput.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') })
  await page.getByRole('alert').waitFor()
  assert.equal(await exportButton.isDisabled(), true)
  await page.getByRole('button', { name: 'RESET DEMO', exact: true }).click()
  await checked(page)
  await page.getByRole('button', { name: /USE MINIMUM/ }).click()
  await checked(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.oc-region-resize')).width === '44px')
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile page must not overflow.')
  assert(Math.round((await resize.boundingBox()).width) >= 44)
  assert(Math.round((await exportButton.boundingBox()).height) >= 44)
  await page.keyboard.press('Tab')
  await resize.focus()
  assert(await resize.evaluate((element) => getComputedStyle(element).outlineStyle !== 'none'), 'Keyboard focus must remain visible.')
  await page.screenshot({ path: resolve(output, 'overlay-check-mobile.png'), fullPage: true })
  await context.close()

  await mkdir(videoDirectory, { recursive: true })
  const capture = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce', recordVideo: { dir: videoDirectory, size: { width: 1280, height: 1000 } } })
  const clip = await capture.newPage()
  const video = clip.video()
  await clip.goto(`${origin}/overlay-check/`)
  await checked(clip)
  await clip.waitForTimeout(1800)
  await clip.getByRole('button', { name: /USE MINIMUM/ }).click()
  await checked(clip)
  await clip.waitForTimeout(2000)
  await clip.getByRole('button', { name: 'ORIGINAL', exact: true }).click()
  await clip.waitForTimeout(1800)
  await clip.getByRole('button', { name: 'WITH SCRIM', exact: true }).click()
  await clip.waitForTimeout(2200)
  await capture.close()
  await rename(await video.path(), resolve(output, 'overlay-check-capture.webm'))
  const conversion = spawnSync('ffmpeg', ['-y', '-i', resolve(output, 'overlay-check-capture.webm'), '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(output, 'overlay-check-capture.mp4')], { stdio: 'ignore' })
  assert.equal(conversion.status, 0)
  await rm(videoDirectory, { recursive: true, force: true })
  assert.deepEqual(errors, [], 'No browser errors.')
  assert.deepEqual(externalRequests, [], 'No external requests during manipulation.')
  process.stdout.write('Overlay Check: source pixel outlier, actual CSS contrast, worker, drag/resize, keyboard, targets, clipping, clipboard, full-size export, 1280 × 640 proof, reset, mobile and video verified.\n')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
