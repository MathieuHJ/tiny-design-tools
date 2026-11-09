;(() => {
  if (window.__copyStress) return window.__copyStress.open()

  const state = { mode: 'original', originals: new Map(), overlays: [], findings: [], root: null, frame: 0, layoutFrame: 0, originalDir: null, changedDir: false, active: false, status: 'reset' }
  const modes = ['original', 'expansion', 'empty', 'accented', 'rtl', 'unbroken']
  const labels = { original: 'ORIGINAL', expansion: '2\u00d7 COPY', empty: 'EMPTY', accented: 'ACCENTED', rtl: 'RTL', unbroken: 'UNBROKEN' }
  const ignored = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'OPTION', 'SVG', 'CODE', 'PRE'])
  const selector = (element) => {
    if (element.id) return `#${CSS.escape(element.id)}`
    const name = [...element.classList].find((item) => !item.startsWith('copy-stress'))
    return `${element.tagName.toLowerCase()}${name ? `.${CSS.escape(name)}` : ''}`
  }
  const serialiseFinding = (finding) => {
    const rect = finding.element.getBoundingClientRect()
    return {
      type: finding.kind,
      severity: finding.severity,
      note: finding.note,
      selector: selector(finding.element),
      text: finding.element.textContent.trim().slice(0, 180),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    }
  }
  const downloadReport = () => {
    const report = { tool: 'Copy Stress', version: '0.3.0', url: location.href, mode: state.mode, status: state.status, findings: state.findings.map(serialiseFinding) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'copy-stress-report.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const transform = (value) => {
    if (state.mode === 'original') return value
    if (state.mode === 'empty') return ''
    if (state.mode === 'expansion') return `${value} \u00b7 ${value}`
    if (state.mode === 'accented') return `[${value.replace(/[aAeEiIoOuUcCnNyY]/g, (character) => ({ a: '\u00e0', A: '\u00c0', e: '\u00eb', E: '\u00cb', i: '\u00ef', I: '\u00cf', o: '\u00f4', O: '\u00d4', u: '\u00fc', U: '\u00dc', c: '\u00e7', C: '\u00c7', n: '\u00f1', N: '\u00d1', y: '\u00ff', Y: '\u0178' })[character])}]`
    if (state.mode === 'rtl') return `\u200f${(typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map((part) => part.segment) : [...value]).reverse().join('')}`
    return `${value.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase()}WITHNOBREAKS`
  }
  const clearOverlays = () => {
    state.overlays.forEach((element) => element.remove())
    state.overlays = []
  }
  const restore = () => {
    cancelAnimationFrame(state.frame)
    cancelAnimationFrame(state.layoutFrame)
    state.active = false
    state.status = 'reset'
    state.originals.forEach(({ original, applied }, node) => { if (original !== applied && node.nodeValue === applied) node.nodeValue = original })
    state.originals.clear()
    clearOverlays()
    state.findings = []
    if (state.changedDir) {
      if (document.documentElement.getAttribute('dir') === 'rtl') {
        if (state.originalDir === null) document.documentElement.removeAttribute('dir')
        else document.documentElement.setAttribute('dir', state.originalDir)
      }
      state.changedDir = false
    }
    if (state.root) state.root.querySelector('[data-copy-stress-count]').textContent = '00'
  }
  const eligible = (element, control = false) => {
    for (let parent = element; parent; parent = parent.parentElement) {
      if ((ignored.has(parent.tagName) && !(control && parent === element && parent.tagName === 'TEXTAREA')) || parent.id === 'copy-stress-panel' || parent.classList.contains('copy-stress-outline')) return false
      const style = getComputedStyle(parent)
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0 || style.contentVisibility === 'hidden') return false
      if (style.clipPath === 'inset(50%)' || (style.clip !== 'auto' && parent.getBoundingClientRect().width <= 1)) return false
    }
    return element.getClientRects().length > 0
  }
  const textNodes = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    let node
    while ((node = walker.nextNode())) {
      if (!node.parentElement || !node.nodeValue?.trim() || !eligible(node.parentElement)) continue
      nodes.push(node)
    }
    return nodes
  }
  function* textContainers(element) {
    let ancestor = element
    while (ancestor) {
      yield ancestor
      if (ancestor === document.documentElement) break
      const position = getComputedStyle(ancestor).position
      // Positioned popovers need not fit their unrelated DOM ancestors.
      if (position === 'fixed') break
      if (position !== 'absolute') {
        ancestor = ancestor.parentElement
        continue
      }
      const offsetParent = ancestor.offsetParent
      // A static body can be offsetParent even when the viewport is the actual
      // containing block. Do not compare a viewport-positioned tooltip to body margins.
      const bodyStyle = offsetParent === document.body ? getComputedStyle(offsetParent) : null
      const bodyContains = bodyStyle && (bodyStyle.position !== 'static' ||
        bodyStyle.transform !== 'none' || bodyStyle.perspective !== 'none' ||
        bodyStyle.filter !== 'none' || /layout|paint|strict|content/.test(bodyStyle.contain) ||
        /transform|perspective|filter/.test(bodyStyle.willChange))
      ancestor = !offsetParent || (offsetParent === document.body && !bodyContains)
        ? document.documentElement : offsetParent
    }
  }
  const collectFindings = () => {
    const findings = []
    const add = (element, kind, severity, note) => {
      if (!findings.some((item) => item.element === element && item.kind === kind)) findings.push({ element, kind, severity, note })
    }
    for (const node of state.originals.keys()) {
      const element = node.parentElement
      if (!element || !element.isConnected || !eligible(element)) continue
      if (!node.nodeValue.trim()) {
        if (!element.textContent.trim()) add(element, 'EMPTY', 'review', 'Text removed by the empty-copy stress mode; review whether this content is essential.')
        continue
      }
      if (parseFloat(getComputedStyle(element).fontSize) < 10) add(element, 'SMALL TEXT', 'review', 'Computed font size below 10px. Readability heuristic, not a WCAG failure or a complete accessibility audit.')
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = [...range.getClientRects()]
      for (const ancestor of textContainers(element)) {
        const style = getComputedStyle(ancestor)
        if (style.display === 'inline' || style.display === 'contents') continue
        const bounds = ancestor.getBoundingClientRect()
        if (!ancestor.clientWidth || !bounds.width) continue
        // Scale layout pixels to viewport pixels (e.g. transformed cards).
        const scaleX = ancestor.offsetWidth ? bounds.width / ancestor.offsetWidth : 1
        const scaleY = ancestor.offsetHeight ? bounds.height / ancestor.offsetHeight : 1
        const left = bounds.left + ancestor.clientLeft * scaleX
        const top = bounds.top + ancestor.clientTop * scaleY
        const right = left + ancestor.clientWidth * scaleX
        const bottom = top + ancestor.clientHeight * scaleY
        const clipsY = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)
        const outside = rects.some((rect) => rect.left < left - 1 || rect.right > right + 1 || (clipsY && (rect.top < top - 1 || rect.bottom > bottom + 1)))
        if (outside) {
          add(ancestor, 'OVERFLOW', 'layout', 'Text extends beyond this container. Review intentional scrolling and clipping manually.')
          break
        }
      }
    }
    // Inspect controls independently: an originally empty label has no text node.
    document.querySelectorAll('input[required], select[required], textarea[required], [aria-required="true"]').forEach((control) => {
      if (!eligible(control, true)) return
      const labels = [...(control.labels || [])]
      const labelledBy = (control.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter(Boolean)
      const hasVisibleText = (label) => {
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          if (!control.contains(node) && node.nodeValue.trim() && eligible(node.parentElement)) return true
        }
        return false
      }
      if (![...labels, ...labelledBy].some(hasVisibleText)) add(control, 'MISSING VISIBLE LABEL', 'review', 'Required field has no associated visible text label. An aria-label or placeholder alone does not provide a persistent visible label.')
    })
    return findings
  }
  const draw = (findings) => {
    clearOverlays()
    findings.forEach((finding, index) => {
      const box = document.createElement('div')
      const rect = finding.element.getBoundingClientRect()
      box.className = 'copy-stress-outline'
      box.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border:1px ${finding.severity === 'layout' ? 'solid' : 'dashed'} #fff;box-shadow:0 0 0 1px #050505;z-index:2147483646;pointer-events:none;box-sizing:border-box;`
      const tag = document.createElement('span')
      tag.textContent = `${String(index + 1).padStart(2, '0')} / ${finding.kind}${finding.severity === 'review' ? ' / REVIEW' : ''}`
      tag.style.cssText = 'position:absolute;left:-1px;top:-18px;padding:4px 6px;background:#050505;color:#fff;border:1px solid #fff;font:600 11px/1 monospace;letter-spacing:.04em;white-space:nowrap;'
      box.append(tag)
      document.body.append(box)
      state.overlays.push(box)
    })
  }
  const inspect = () => {
    restore()
    const nodes = textNodes()
    nodes.forEach((node) => {
      const original = node.nodeValue
      const applied = transform(original)
      state.originals.set(node, { original, applied })
      if (applied !== original) node.nodeValue = applied
    })
    if (state.mode === 'rtl') {
      state.originalDir = document.documentElement.getAttribute('dir')
      state.changedDir = true
      document.documentElement.dir = 'rtl'
    }
    state.active = true
    state.status = 'pending'
    state.root.querySelector('[data-copy-stress-mode]').textContent = labels[state.mode]
    state.frame = requestAnimationFrame(() => {
      if (!state.root || !state.active) return
      state.findings = collectFindings()
      state.status = 'inspected'
      draw(state.findings)
      state.root.querySelector('[data-copy-stress-count]').textContent = String(state.findings.length).padStart(2, '0')
    })
  }
  const updateLayout = () => {
    if (!state.root || !state.active) return
    cancelAnimationFrame(state.layoutFrame)
    state.layoutFrame = requestAnimationFrame(() => {
      if (!state.root || !state.active) return
      state.findings = collectFindings()
      state.status = 'inspected'
      draw(state.findings)
      state.root.querySelector('[data-copy-stress-count]').textContent = String(state.findings.length).padStart(2, '0')
    })
  }
  const open = () => {
    if (state.root) return inspect()
    const root = document.createElement('aside')
    root.id = 'copy-stress-panel'
    root.style.cssText = 'position:fixed;right:18px;bottom:18px;width:240px;max-width:calc(100vw - 36px);box-sizing:border-box;max-height:calc(100vh - 36px);overflow:auto;padding:14px;border:1px solid #777;background:#080808;color:#f4f4f1;z-index:2147483647;box-shadow:0 12px 36px rgba(0,0,0,.35);font:500 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;'
    root.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #303030;padding-bottom:10px;margin-bottom:12px"><strong style="font-size:11px">COPY STRESS</strong><button data-copy-stress-close style="min-height:44px;border:0;background:transparent;color:#aaa;font:inherit;cursor:pointer">CLOSE</button></div><p style="color:#999;margin:0 0 12px">MODE / <span data-copy-stress-mode>ORIGINAL</span></p><div data-copy-stress-modes style="display:grid;grid-template-columns:1fr 1fr;gap:5px"></div><div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:11px;border-top:1px solid #303030"><span>FINDINGS / REVIEW</span><strong data-copy-stress-count>00</strong></div><button data-copy-stress-report style="min-height:44px;width:100%;margin-top:8px;padding:9px;border:1px solid #777;background:transparent;color:#fff;font:inherit;cursor:pointer">DOWNLOAD JSON</button><button data-copy-stress-reset style="min-height:44px;width:100%;margin-top:7px;padding:9px;border:1px solid #777;background:transparent;color:#fff;font:inherit;cursor:pointer">RESET PAGE</button>`
    const modeBox = root.querySelector('[data-copy-stress-modes]')
    modes.forEach((mode) => {
      const button = document.createElement('button')
      button.textContent = labels[mode]
      button.dataset.copyStressModeButton = mode
      button.style.cssText = 'min-height:44px;border:1px solid #444;background:#111;color:#ddd;font:600 11px/1 monospace;cursor:pointer;letter-spacing:.04em;'
      button.onclick = () => { state.mode = mode; inspect() }
      modeBox.append(button)
    })
    root.querySelector('[data-copy-stress-reset]').onclick = () => { restore(); state.mode = 'original'; root.querySelector('[data-copy-stress-mode]').textContent = 'RESET' }
    root.querySelector('[data-copy-stress-report]').onclick = downloadReport
    root.querySelector('[data-copy-stress-close]').onclick = () => { restore(); root.remove(); state.root = null; window.removeEventListener('scroll', updateLayout, true); window.removeEventListener('resize', updateLayout) }
    document.body.append(root)
    state.root = root
    window.addEventListener('scroll', updateLayout, true)
    window.addEventListener('resize', updateLayout)
    inspect()
  }
  window.__copyStress = { open }
  open()
})()
