/* global document, requestAnimationFrame */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const projectRoot = resolve(import.meta.dirname, '..')
const output = resolve(projectRoot, 'test-results/copy-stress')
const port = 4187
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repository && !repository.endsWith('.github.io')
  ? `/${repository}/`
  : '/'
const url = `http://127.0.0.1:${port}${base}copy-stress/`
const modes = [
  ['original', 'ORIGINAL'],
  ['expansion', '2× COPY'],
  ['empty', 'EMPTY'],
  ['accented', 'ACCENTED'],
  ['rtl', 'RTL'],
  ['unbroken', 'UNBROKEN'],
]

// Ordered as the actual fixture DOM, not the source fixture array.
const labels = ['NAVIGATION', 'PROJECT NAME', 'STATUS', 'ACTION', 'METER']
const originals = [
  'Design system',
  'Visual regression review',
  'Ready for review',
  'Share file',
  '14 components selected',
]
const accented = [
  '[Dësïgñ sÿstëm]',
  '[Vïsüàl rëgrëssïôñ rëvïëw]',
  '[Rëàdÿ fôr rëvïëw]',
  '[Shàrë fïlë]',
  '[14 çômpôñëñts sëlëçtëd]',
]
const unbroken = [
  'DESIGNSYSTEMWITHNOBREAKS',
  'VISUALREGRESSIONREVIEWWITHNOBREAKS',
  'READYFORREVIEWWITHNOBREAKS',
  'SHAREFILEWITHNOBREAKS',
  '14COMPONENTSSELECTEDWITHNOBREAKS',
]
const expectedText = {
  original: originals,
  expansion: originals.map((value) => `${value} · ${value}`),
  empty: originals.map(() => ''),
  accented,
  rtl: originals.map((value) => `\u200f${[...value].reverse().join('')}`),
  unbroken,
}

await mkdir(output, { recursive: true })

let previewLog = ''
let previewError
const preview = spawn(
  'pnpm',
  ['preview', '--port', String(port), '--strictPort'],
  {
    cwd: projectRoot,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)
preview.on('error', (error) => { previewError = error })
preview.stdout.on('data', (data) => { previewLog += data.toString() })
preview.stderr.on('data', (data) => { previewLog += data.toString() })

async function waitForPreview() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (previewError) throw previewError
    if (preview.exitCode !== null) {
      throw new Error(`Preview exited (${preview.exitCode}):\n${previewLog}`)
    }
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1000),
      })
      if (response.ok) return
    } catch {
      // Poll server readiness, not a fixed UI sleep.
    }
    await delay(100)
  }
  throw new Error(`Preview did not become ready at ${url}:\n${previewLog}`)
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((done) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        requestAnimationFrame(done)
      }))
    })
  })
}

// Compare the full rendered list, not just a potentially stale count.
async function assertFindings(page, mode) {
  await page.waitForFunction((currentMode) => {
    const targets = [...document.querySelectorAll(
      '.stress-fixture [data-stress-target]',
    )]
    if (targets.length !== 5) return false
    const expected = targets.flatMap((element) => {
      const empty = currentMode === 'empty' &&
        !element.textContent.trim()
      const overflow = element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1
      if (!empty && !overflow) return []
      return [{
        kind: empty ? 'EMPTY' : 'OVERFLOW',
        label: element.dataset.label,
      }]
    })
    const actual = [...document.querySelectorAll('.copy-finding-rail')]
      .map((element) => ({
        kind: element.querySelector('strong')?.textContent,
        label: element.querySelector('em')?.textContent,
      }))
    return JSON.stringify(expected) === JSON.stringify(actual) &&
      document.querySelector('.copy-finding-count')?.textContent ===
        String(expected.length).padStart(2, '0')
  }, mode, { timeout: 10_000 })

  return page.locator('.copy-finding-rail').evaluateAll((elements) =>
    elements.map((element) => ({
      kind: element.querySelector('strong').textContent,
      label: element.querySelector('em').textContent,
    })),
  )
}

async function assertState(page, mode, modeLabel) {
  const group = page.getByRole('group', { name: 'STRESS MODE', exact: true })
  assert.equal(await group.getByRole('button').count(), 6)
  assert.equal(await group.locator('[aria-pressed="true"]').count(), 1)

  for (const [candidate, label] of modes) {
    assert.equal(
      await group.getByRole('button', { name: label, exact: true })
        .getAttribute('aria-pressed'),
      String(candidate === mode),
      `Pressed state for ${candidate} while ${mode} is active`,
    )
  }

  assert.equal(
    await page.locator('.copy-mode-readout').textContent(),
    modeLabel,
  )
  assert.equal(
    await page.locator('.stress-fixture').getAttribute('dir'),
    mode === 'rtl' ? 'rtl' : 'ltr',
  )
  const values = await page.locator(
    '.stress-fixture [data-stress-target]',
  ).evaluateAll((elements) => elements.map((element) => ({
    label: element.dataset.label,
    value: element.textContent,
  })))
  assert.deepEqual(values, labels.map((label, index) => ({
    label,
    value: expectedText[mode][index],
  })), `Fixture values for ${mode}`)

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  assert(
    layout.document <= layout.viewport + 1 &&
      layout.body <= layout.viewport + 1,
    `Page horizontal overflow in ${mode}: ${JSON.stringify(layout)}`,
  )

  const findings = await assertFindings(page, mode)
  if (mode === 'empty') {
    assert.deepEqual(findings, labels.map((label) => ({
      kind: 'EMPTY',
      label,
    })))
  }
  return findings
}

async function exportProof(page, viewportName, mode) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'EXPORT PNG', exact: true }).click()
  const download = await pending
  assert.equal(await download.failure(), null)
  assert.equal(
    download.suggestedFilename(),
    `copy-stress-${mode}-proof.png`,
  )
  const file = resolve(output, `${viewportName}-${mode}-proof.png`)
  await download.saveAs(file)
  const bytes = await readFile(file)
  assert(bytes.length > 32, 'PNG contains image data')
  assert.deepEqual(
    bytes.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    'PNG signature',
  )
  assert.equal(bytes.readUInt32BE(8), 13, 'IHDR chunk length')
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR')
  assert.equal(bytes.readUInt32BE(16), 1280, 'Export width')
  assert.equal(bytes.readUInt32BE(20), 640, 'Export height')
}

let browser
let page
const errors = []
const observations = []
try {
  await waitForPreview()
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  })
  page = await context.newPage()
  page.setDefaultTimeout(10_000)
  page.on('pageerror', (error) => errors.push(error.stack || error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console.error: ${message.text()}`)
    }
  })

  const response = await page.goto(url, { waitUntil: 'load' })
  assert(response?.ok(), `Copy Stress HTTP response: ${response?.status()}`)
  await page.getByRole('heading', { name: 'Copy Stress', exact: true })
    .waitFor()
  await settle(page)
  await assertState(page, 'expansion', '2× COPY')

  // Retain the active mode while resizing. This verifies findings refresh
  // from resize alone rather than relying on a subsequent mode click.
  for (const [mode, modeLabel] of modes) {
    await page.getByRole('group', { name: 'STRESS MODE', exact: true })
      .getByRole('button', { name: modeLabel, exact: true }).click()
    await settle(page)

    for (const [name, width, height] of [
      ['desktop', 1280, 900],
      ['mobile', 390, 844],
      ['desktop-return', 1280, 900],
    ]) {
      await page.setViewportSize({ width, height })
      await settle(page)
      const findings = await assertState(page, mode, modeLabel)
      observations.push({ viewport: name, width, mode, findings })

      if (name !== 'desktop-return') {
        await page.screenshot({
          path: resolve(output, `${name}-${mode}.png`),
          fullPage: true,
        })
        await exportProof(page, name, mode)
      }
    }
  }

  await settle(page)
  assert.deepEqual(errors, [], 'No uncaught JavaScript or console errors')
  console.log(
    'Copy Stress UI passed: six modes, desktop/mobile/return resize, ' +
    'fixture values, pressed states, findings, overflow, and PNG exports.',
  )
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({
      path: resolve(output, 'failure.png'),
      fullPage: true,
    }).catch(() => {})
  }
  throw error
} finally {
  await writeFile(
    resolve(output, 'observations.json'),
    JSON.stringify({ url, observations, errors }, null, 2),
  )
  await writeFile(resolve(output, 'preview.log'), previewLog)
  try {
    await browser?.close()
  } finally {
    if (preview.pid) {
      try {
        if (process.platform === 'win32') preview.kill('SIGTERM')
        else process.kill(-preview.pid, 'SIGTERM')
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
  }
}
