;(() => {
  if (window.__copyStress) return window.__copyStress.open()

  const state = { mode: 'expansion', originals: new Map(), overlays: [], findings: [], root: null }
  const modes = ['expansion', 'empty', 'accented', 'rtl', 'unbroken']
  const labels = { expansion: '2× COPY', empty: 'EMPTY', accented: 'ACCENTED', rtl: 'RTL', unbroken: 'UNBROKEN' }
  const ignored = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'OPTION', 'SVG', 'CODE', 'PRE'])
  const escape = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
  const selector = (element) => {
    if (element.id) return `#${element.id}`
    const name = [...element.classList].find((item) => !item.startsWith('copy-stress'))
    return `${element.tagName.toLowerCase()}${name ? `.${name}` : ''}`
  }
  const serialiseFinding = (finding) => {
    const rect = finding.element.getBoundingClientRect()
    return {
      type: finding.kind,
      selector: selector(finding.element),
      text: finding.element.textContent.trim().slice(0, 180),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    }
  }
  const downloadReport = () => {
    const report = { tool: 'Copy Stress', version: '0.1.0', url: location.href, mode: state.mode, findings: state.findings.map(serialiseFinding) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'copy-stress-report.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const transform = (value) => {
    if (state.mode === 'empty') return ''
    if (state.mode === 'expansion') return `${value} · ${value}`
    if (state.mode === 'accented') return `[${value.replace(/[aAeEiIoOuUcCnNyY]/g, (character) => ({ a: 'à', A: 'À', e: 'ë', E: 'Ë', i: 'ï', I: 'Ï', o: 'ô', O: 'Ô', u: 'ü', U: 'Ü', c: 'ç', C: 'Ç', n: 'ñ', N: 'Ñ', y: 'ÿ', Y: 'Ÿ' })[character])}]`
    if (state.mode === 'rtl') return `‏${[...value].reverse().join('')}`
    return `${value.replace(/[^a-z0-9]/gi, '').toUpperCase()}WITHNOBREAKS`
  }
  const clearOverlays = () => {
    state.overlays.forEach((element) => element.remove())
    state.overlays = []
  }
  const restore = () => {
    state.originals.forEach((value, node) => { node.nodeValue = value })
    state.originals.clear()
    clearOverlays()
    document.documentElement.dir = ''
  }
  const textNodes = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    let node
    while ((node = walker.nextNode())) {
      const parent = node.parentElement
      if (!parent || ignored.has(parent.tagName) || parent.closest('#copy-stress-panel')) continue
      if (!node.nodeValue || !node.nodeValue.trim() || parent.getBoundingClientRect().width < 4) continue
      nodes.push(node)
    }
    return nodes
  }
  const draw = (findings) => {
    clearOverlays()
    findings.forEach((finding, index) => {
      const box = document.createElement('div')
      const rect = finding.element.getBoundingClientRect()
      box.className = 'copy-stress-outline'
      box.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border:1px dashed #fff;z-index:2147483646;pointer-events:none;box-sizing:border-box;`
      const tag = document.createElement('span')
      tag.textContent = `${String(index + 1).padStart(2, '0')} / ${finding.kind}`
      tag.style.cssText = 'position:absolute;left:-1px;top:-18px;padding:4px 6px;background:#050505;color:#fff;border:1px solid #fff;font:600 10px/1 monospace;letter-spacing:.04em;white-space:nowrap;'
      box.append(tag)
      document.body.append(box)
      state.overlays.push(box)
    })
  }
  const inspect = () => {
    restore()
    const nodes = textNodes()
    nodes.forEach((node) => {
      state.originals.set(node, node.nodeValue)
      node.nodeValue = transform(node.nodeValue)
    })
    if (state.mode === 'rtl') document.documentElement.dir = 'rtl'
    requestAnimationFrame(() => {
      const elements = [...new Set([...state.originals.keys()].map((node) => node.parentElement).filter(Boolean))]
      const findings = elements.flatMap((element) => {
        const style = getComputedStyle(element)
        const overflow = element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
        const empty = state.mode === 'empty' && !element.textContent.trim() && element.getBoundingClientRect().width > 12
        if (!overflow && !empty) return []
        return [{ element, kind: empty ? 'EMPTY' : 'OVERFLOW', label: selector(element), style }]
      }).slice(0, 24)
      state.findings = findings
      draw(findings)
      state.root.querySelector('[data-copy-stress-count]').textContent = String(findings.length).padStart(2, '0')
      state.root.querySelector('[data-copy-stress-mode]').textContent = labels[state.mode]
    })
  }
  const open = () => {
    if (state.root) return inspect()
    const root = document.createElement('aside')
    root.id = 'copy-stress-panel'
    root.style.cssText = 'position:fixed;right:18px;bottom:18px;width:240px;padding:14px;border:1px solid #777;background:#080808;color:#f4f4f1;z-index:2147483647;box-shadow:0 12px 36px rgba(0,0,0,.35);font:500 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;'
    root.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #303030;padding-bottom:10px;margin-bottom:12px"><strong style="font-size:11px">COPY STRESS</strong><button data-copy-stress-close style="border:0;background:transparent;color:#aaa;font:inherit;cursor:pointer">CLOSE</button></div><p style="color:#999;margin:0 0 12px">MODE / <span data-copy-stress-mode>2× COPY</span></p><div data-copy-stress-modes style="display:grid;grid-template-columns:1fr 1fr;gap:5px"></div><div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:11px;border-top:1px solid #303030"><span>FINDINGS</span><strong data-copy-stress-count>00</strong></div><button data-copy-stress-report style="width:100%;margin-top:8px;padding:9px;border:1px solid #777;background:transparent;color:#fff;font:inherit;cursor:pointer">DOWNLOAD JSON</button><button data-copy-stress-reset style="width:100%;margin-top:7px;padding:9px;border:1px solid #777;background:transparent;color:#fff;font:inherit;cursor:pointer">RESET PAGE</button>`
    const modeBox = root.querySelector('[data-copy-stress-modes]')
    modes.forEach((mode) => {
      const button = document.createElement('button')
      button.textContent = labels[mode]
      button.style.cssText = 'min-height:28px;border:1px solid #444;background:#111;color:#ddd;font:600 9px/1 monospace;cursor:pointer;letter-spacing:.04em;'
      button.onclick = () => { state.mode = mode; inspect() }
      modeBox.append(button)
    })
    root.querySelector('[data-copy-stress-reset]').onclick = () => restore()
    root.querySelector('[data-copy-stress-report]').onclick = downloadReport
    root.querySelector('[data-copy-stress-close]').onclick = () => { restore(); root.remove(); state.root = null }
    document.body.append(root)
    state.root = root
    inspect()
  }
  window.__copyStress = { open }
  open()
})()
