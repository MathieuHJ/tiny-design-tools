import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'release')
const videoDirectory = resolve(output, '.contrast-pair-video')
const origin = 'http://127.0.0.1:4196'
const externalRequests = []
const browserErrors = []
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4196', '--strictPort'], { cwd: root, stdio: 'ignore' })

let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${origin}/contrast-pair/`)).ok) { ready = true; break } } catch { /* Server is starting. */ }
    await new Promise((done) => setTimeout(done, 200))
  }
  assert(ready, 'Local preview must bind port 4196.')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin)) externalRequests.push(request.url()) })
  const textField = page.getByLabel('Text colour', { exact: true })
  const backgroundField = page.getByLabel('Background colour', { exact: true })
  const exportButton = page.getByRole('button', { name: 'EXPORT PNG', exact: true })

  await page.goto(`${origin}/contrast-pair/`)
  await page.getByRole('heading', { name: 'Contrast Pair', exact: true }).waitFor()
  assert.equal(await page.locator('.cp-specimen').count(), 2)
  assert.equal(await page.locator('.cp-verdict').first().textContent(), 'FAIL')
  assert.equal(await page.locator('.cp-verdict').nth(1).textContent(), 'PASS')
  await page.screenshot({ path: resolve(output, 'contrast-pair-product.png'), fullPage: true })
  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise
  await download.saveAs(resolve(output, 'contrast-pair-proof.png'))
  const png = await readFile(resolve(output, 'contrast-pair-proof.png'))
  assert.equal(png.readUInt32BE(16), 1280)
  assert.equal(png.readUInt32BE(20), 640)
  await page.getByRole('button', { name: 'COPY CSS', exact: true }).click()
  const css = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(css, /^color: #[\dA-F]{6};\nbackground-color: #F4F2ED;$/)
  const shareHash = new URL(page.url()).hash
  await page.getByRole('button', { name: 'USE PASSING COLOUR', exact: true }).click()
  assert.equal(await page.locator('.cp-verdict').first().textContent(), 'PASS')
  await page.goto(`${origin}/contrast-pair/${shareHash}`)
  assert.equal(await textField.inputValue(), '#8991A5')

  await textField.fill('#003300')
  await backgroundField.fill('#003300')
  assert.equal(await page.locator('.cp-verdict').nth(1).textContent(), 'PASS')
  const slider = page.getByLabel('TEXT LIGHTNESS', { exact: false })
  await slider.press('Home')
  assert.equal(await textField.inputValue(), '#000000')
  await slider.press('PageUp')
  assert.notEqual(await textField.inputValue(), '#000000')
  const returnedColour = await textField.inputValue()
  assert.notEqual(returnedColour.slice(1, 3), returnedColour.slice(3, 5), 'Slider must retain green hue after black.')
  const beforeSkip = page.url()
  await page.getByRole('link', { name: 'SKIP TO CONTROLS', exact: true }).focus()
  await page.keyboard.press('Enter')
  assert.equal(page.url(), beforeSkip)
  assert.equal(await textField.inputValue(), returnedColour)
  await page.getByRole('button', { name: 'RESET DEMO', exact: true }).click()

  // WCAG must evaluate the exact ratio even when normal rounding would read 4.50.
  await textField.fill('#6E7978')
  await backgroundField.fill('#FFFFFF')
  assert.equal(await page.locator('.cp-verdict').first().textContent(), 'FAIL')
  assert.match(await page.locator('.cp-specimen__metrics').first().textContent(), /4\.49 : 1/)
  await textField.fill('#000')
  await textField.blur()
  assert.equal(await textField.inputValue(), '#000000')
  assert.equal(await page.locator('.cp-verdict').first().textContent(), 'PASS')
  await page.getByRole('button', { name: 'Swap text and background colours', exact: true }).click()
  assert.equal(await textField.inputValue(), '#FFFFFF')
  assert.match(await page.locator('.cp-specimen__metrics').first().textContent(), /Lc -107\.9/)
  await textField.fill('#GGG')
  assert.equal(await exportButton.isDisabled(), true)
  assert.equal(await textField.getAttribute('aria-invalid'), 'true')
  await textField.fill('#777777')
  await backgroundField.fill('#777777')
  await page.getByRole('button', { name: 'AAA TEXT', exact: false }).click()
  assert.match(await page.locator('.cp-no-solution').textContent(), /cannot reach 7/)
  assert.equal(await page.getByRole('button', { name: 'USE PASSING COLOUR', exact: true }).isDisabled(), true)
  assert.equal(await exportButton.isEnabled(), true)

  // Sample actual local image bytes. Transparent pixels must composite onto white.
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 30; canvas.height = 10
    const context = canvas.getContext('2d')
    context.fillStyle = '#FF0000'; context.fillRect(0, 0, 10, 10)
    context.fillStyle = '#0000FF'; context.fillRect(10, 0, 10, 10)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const imageInput = page.getByLabel('Open image to sample colours', { exact: true })
  await imageInput.setInputFiles({ name: 'qa-pixels.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })
  const sampler = page.locator('.cp-sampler canvas')
  await sampler.waitFor()
  await page.waitForFunction(() => document.querySelector('.cp-sampler canvas')?.width === 30)
  await sampler.click({ position: { x: 5 / 30 * (await sampler.boundingBox()).width, y: 5 / 10 * (await sampler.boundingBox()).height } })
  assert.equal(await textField.inputValue(), '#FF0000')
  await page.getByRole('button', { name: 'SAMPLE BACKGROUND', exact: true }).click()
  await sampler.focus()
  await sampler.press('Shift+ArrowRight')
  await sampler.press('Enter')
  assert.equal(await backgroundField.inputValue(), '#0000FF')
  await sampler.press('Shift+ArrowRight')
  await sampler.press('Enter')
  assert.equal(await backgroundField.inputValue(), '#FFFFFF')
  await imageInput.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await page.getByRole('alert').waitFor()
  await page.getByRole('button', { name: 'RESET DEMO', exact: true }).click()
  assert.equal(await sampler.count(), 0)
  assert.equal(await textField.inputValue(), '#8991A5')

  // Mobile overflow, keyboard focus, and large targets are part of the shipped surface.
  await page.setViewportSize({ width: 390, height: 844 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No mobile page overflow.')
  await page.keyboard.press('Tab')
  assert(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'), 'Keyboard focus remains visible.')
  assert((await exportButton.boundingBox()).height >= 44, 'Mobile export target is at least 44 px.')
  await page.screenshot({ path: resolve(output, 'contrast-pair-mobile.png'), fullPage: true })
  await context.close()

  // A real 9-second interaction capture, separate from the verification pass.
  await mkdir(videoDirectory, { recursive: true })
  const capture = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', recordVideo: { dir: videoDirectory, size: { width: 1280, height: 900 } } })
  const clip = await capture.newPage()
  const video = clip.video()
  await clip.goto(`${origin}/contrast-pair/`)
  await clip.waitForTimeout(2200)
  await clip.getByRole('button', { name: 'AAA TEXT', exact: false }).click()
  await clip.waitForTimeout(2000)
  await clip.getByRole('button', { name: 'USE PASSING COLOUR', exact: true }).click()
  await clip.waitForTimeout(2200)
  await clip.getByRole('button', { name: 'RESET DEMO', exact: true }).click()
  await clip.waitForTimeout(2200)
  await capture.close()
  await rename(await video.path(), resolve(output, 'contrast-pair-capture.webm'))
  const conversion = spawnSync('ffmpeg', ['-y', '-i', resolve(output, 'contrast-pair-capture.webm'), '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(output, 'contrast-pair-capture.mp4')], { stdio: 'ignore' })
  assert.equal(conversion.status, 0, 'MP4 conversion should succeed.')
  await rm(videoDirectory, { recursive: true, force: true })
  assert.deepEqual(browserErrors, [], 'No browser errors.')
  assert.deepEqual(externalRequests, [], 'No external requests during local manipulation.')
  process.stdout.write('Contrast Pair: desktop, mobile, correction, raw thresholds, APCA polarity, local image sampling, keyboard, reset, clipboard, shared state, 1280 × 640 export and capture verified.\n')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
