import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const source = await readFile(new URL('../public/copy-stress/bookmarklet.js', import.meta.url), 'utf8')
assert.match(source, /^[\x00-\x7f]*$/)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setContent(`<!doctype html><html dir="rtl"><head><style>
    body { margin: 20px; direction:ltr; font:16px Arial; min-height:1800px; }
    .narrow { width:100px; margin:20px 0; } .clip { overflow:hidden; white-space:nowrap; }
    .safe { overflow-wrap:anywhere; } .tiny { font-size:6px; }
    .hidden { display:none; } .sr { position:absolute;width:1px;height:1px;clip:rect(0,0,0,0);overflow:hidden; }
  </style></head><body>
    <div id="german" class="narrow"><span>Donaudampfschifffahrtsgesellschaftskapit\u00e4n</span></div>
    <div id="url" class="narrow clip"><span>https://example.com/this-is-a-long-url-with-no-spaces-in-it-at-all-123</span></div>
    <div id="emoji" class="narrow">\ud83d\udc69\u200d\ud83d\udcbb\ud83c\udff3\ufe0f\u200d\ud83c\udf08</div>
    <label for="missing"></label><input id="missing" required aria-label="Name">
    <label>Visible label <input id="nested" required></label>
    <label for="labelled">Name</label><input id="labelled" required>
    <label for="invisible" class="sr">Invisible label</label><input id="invisible" required>
    <span id="aria-label">Visible ARIA label</span><input id="aria" required aria-labelledby="aria-label">
    <label for="unlabelled-area"></label><textarea id="unlabelled-area" required></textarea>
    <div id="wide" class="narrow clip">mmmmmmmmmmmmmmmmmmmm</div>
    <button id="button" class="narrow clip">Save my important changes</button>
    <p id="legal" class="tiny">Legal terms apply</p>
    <div id="price" style="width:50px">$123456789.00</div>
    <div id="safe-price" style="width:500px">$123456789.00</div>
    <button id="safe-button" style="width:500px">Save my important changes</button>
    <p id="tiny:colon" class="tiny">Tiny escaped selector</p>
    <div id="tooltip-card" class="narrow"><span id="fixed-tip" style="position:fixed;right:10px;top:10px">Help</span></div>
    <div id="absolute-card" class="narrow"><span id="absolute-tip" style="position:absolute;right:10px;top:50px">Help</span></div>
    <div id="safe" class="narrow safe">Donaudampfschifffahrtsgesellschaftskapit\u00e4n</div>
    <div class="hidden"><span id="hidden">Hidden text</span></div>
    <pre><span id="code">Unchanged source</span></pre>
  </body></html>`)
  assert.equal((await page.locator('#url').textContent()).length, 70)
  const original = await page.locator('body').innerText()
  const report = async () => {
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-copy-stress-report]').click()
    const download = await downloadPromise
    return JSON.parse(await readFile(await download.path(), 'utf8'))
  }
  if (process.env.COMPARE_BASELINE) {
    const baseline = execFileSync('git', ['show', 'a06de977478d7639742d135f200f8429bb5cf189:public/copy-stress/bookmarklet.js'], { encoding: 'utf8' })
    await page.evaluate(baseline)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const oldReport = await report()
    console.log('Baseline expansion findings:', oldReport.findings.map((f) => `${f.selector}: ${f.type}`).join('; '))
    await page.locator('[data-copy-stress-close]').click()
    await page.evaluate(() => { delete window.__copyStress; document.documentElement.setAttribute('dir', 'rtl') })
  }
  await page.evaluate(source)
  const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await settle()
  let result = await report()
  assert.equal(result.mode, 'original')
  assert.equal(result.status, 'inspected')
  for (const id of ['german', 'url', 'wide', 'button', 'price']) assert(result.findings.some((f) => f.selector === `#${id}` && f.type === 'OVERFLOW'), `${id} overflow detected`)
  for (const id of ['missing', 'invisible', 'unlabelled-area']) assert(result.findings.some((f) => f.selector === `#${id}` && f.type === 'MISSING VISIBLE LABEL'), `${id} missing label detected`)
  for (const id of ['emoji', 'safe', 'nested', 'labelled', 'aria', 'hidden', 'code', 'safe-price', 'safe-button', 'tooltip-card', 'fixed-tip', 'absolute-card', 'absolute-tip']) assert(!result.findings.some((f) => f.selector === `#${id}`), `${id} is safe`)
  assert(result.findings.some((f) => f.selector === '#legal' && f.severity === 'review' && f.note.includes('not a WCAG')))
  assert(result.findings.some((f) => f.selector === '#tiny\\:colon' && f.type === 'SMALL TEXT'))
  assert(!result.findings.some((f) => f.selector === 'body' || f.selector === 'html'), 'Safe viewport-positioned tooltips do not flag page containers')
  console.log('Original fixture findings:', result.findings.map((f) => `${f.selector}: ${f.type}`).join('; '))
  if (process.env.COMPARE_BASELINE) {
    await page.locator('[data-copy-stress-mode-button="expansion"]').click()
    await settle()
    const expanded = await report()
    console.log('Fixed expansion findings:', expanded.findings.map((f) => `${f.selector}: ${f.type}`).join('; '))
    await page.locator('[data-copy-stress-mode-button="original"]').click()
    await settle()
  }
  const count = result.findings.length
  await page.evaluate(() => window.__copyStress.open())
  await settle()
  assert.equal((await report()).findings.length, count, 'Repeated inspections exclude their own overlays')
  await page.locator('[data-copy-stress-mode-button="rtl"]').click()
  await settle()
  assert.equal(await page.locator('#emoji').textContent(), '\u200f\ud83c\udff3\ufe0f\u200d\ud83c\udf08\ud83d\udc69\u200d\ud83d\udcbb')
  await page.locator('[data-copy-stress-mode-button="accented"]').click()
  await settle()
  assert.match(await page.locator('#safe-button').textContent(), /^\[S\u00e0v\u00eb/)
  await page.locator('[data-copy-stress-mode-button="unbroken"]').click()
  await settle()
  assert.match(await page.locator('#german').textContent(), /KAPIT\u00c4NWITHNOBREAKS/)
  assert.equal(await page.locator('#hidden').textContent(), 'Hidden text')
  assert.equal(await page.locator('#code').textContent(), 'Unchanged source')
  await page.locator('[data-copy-stress-reset]').click()
  await settle()
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl')
  assert.equal(await page.locator('[data-copy-stress-count]').textContent(), '00')
  const resetReport = await report()
  assert.deepEqual(resetReport.findings, [])
  assert.equal(resetReport.status, 'reset')
  assert.equal(await page.locator('.copy-stress-outline').count(), 0)
  // Schedule inspection and close in the same frame to expose stale rAF work.
  await page.evaluate(() => {
    document.querySelector('[data-copy-stress-mode-button="expansion"]').click()
    document.querySelector('[data-copy-stress-close]').click()
  })
  await settle()
  assert.equal(await page.locator('body').innerText(), original)
  assert.equal(await page.locator('.copy-stress-outline').count(), 0)
  for (const dir of [null, '', 'ltr', 'auto']) {
    await page.evaluate((value) => value === null ? document.documentElement.removeAttribute('dir') : document.documentElement.setAttribute('dir', value), dir)
    await page.evaluate(source)
    await page.evaluate(() => {
      document.querySelector('[data-copy-stress-mode-button="rtl"]').click()
      document.querySelector('[data-copy-stress-reset]').click()
    })
    await settle()
    assert.equal(await page.locator('html').getAttribute('dir'), dir, 'Exact dir restoration')
    await page.locator('[data-copy-stress-close]').click()
  }
  await page.evaluate(source)
  await page.locator('[data-copy-stress-mode-button="original"]').click()
  await settle()
  const top = await page.locator('.copy-stress-outline').first().evaluate((element) => element.getBoundingClientRect().top)
  await page.evaluate(() => window.scrollTo(0, 100))
  await settle()
  const scrolledTop = await page.locator('.copy-stress-outline').first().evaluate((element) => element.getBoundingClientRect().top)
  assert.equal(Math.round(top - scrolledTop), 100, 'Outlines follow scroll')
  await page.setViewportSize({ width: 390, height: 844 })
  await settle()
  assert(await page.locator('#copy-stress-panel').evaluate((element) => element.getBoundingClientRect().left >= 0))
  await page.locator('[data-copy-stress-mode-button="empty"]').click()
  await settle()
  result = await report()
  assert(result.findings.some((f) => f.type === 'EMPTY' && f.severity === 'review'))
  assert(result.findings.some((f) => f.selector === '#labelled' && f.type === 'MISSING VISIBLE LABEL'))
  await page.locator('[data-copy-stress-mode-button="expansion"]').click()
  await settle()
  await page.evaluate(() => { document.querySelector('#safe').firstChild.nodeValue = 'Live site update' })
  await page.locator('[data-copy-stress-reset]').click()
  assert.equal(await page.locator('#safe').textContent(), 'Live site update', 'Reset preserves intervening live site edits')
  await page.locator('[data-copy-stress-mode-button="rtl"]').click()
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'auto'))
  await page.locator('[data-copy-stress-reset]').click()
  assert.equal(await page.locator('html').getAttribute('dir'), 'auto', 'Reset preserves intervening direction edits')
  assert.deepEqual(errors, [], 'No asynchronous errors')
  console.log('Copy Stress runtime: original cases, safe text, labels, Unicode, restore, races, repeat, scroll, and mobile checks passed.')
} finally {
  await browser.close()
}
