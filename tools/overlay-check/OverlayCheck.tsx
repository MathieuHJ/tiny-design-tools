import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { DownloadSimple, UploadSimple } from '@phosphor-icons/react'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { ACCEPT_ATTRIBUTE, validateLocalImage } from '../../src/imageFile'
import { useImageIntake } from '../../src/useImageIntake'
import { useCopy } from '../../src/useCopy'
import demoUrl from '../profile-kit/fixtures/banner.jpg?url'
import { cssFor, normalizeRegion, type Analysis, type Region, type Settings } from './overlayMath'
import { renderScene, layoutText, type Scene } from './renderScene'
import { downloadProofFrame, downloadScene } from './exportProof'
import { DEFAULT_FONT_SIZE, DEFAULT_SETTINGS, DEFAULT_TEXT, MAX_PIXELS, TARGETS, adjustedRegion, ratioLabel, sceneCss } from './model'

type Source = { url: string; name: string; local: boolean }
type Work = { image: HTMLCanvasElement; width: number; height: number; name: string; id: number }
type Drag = { id: number; action: 'move' | 'resize'; startX: number; startY: number; region: Region; bounds: DOMRect }

export function OverlayCheck() {
  const [source, setSource] = useState<Source>({ url: demoUrl, name: 'Sunlit dunes / demo', local: false })
  const [work, setWork] = useState<Work | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [text, setText] = useState(DEFAULT_TEXT)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [showOriginal, setShowOriginal] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [result, setResult] = useState<{ key: string; analysis: Analysis } | null>(null)
  const display = useRef<HTMLCanvasElement>(null)
  const worker = useRef<Worker | null>(null)
  const imageSequence = useRef(0)
  const requestSequence = useRef(0)
  const latestRequest = useRef({ id: 0, key: '' })
  const drag = useRef<Drag | null>(null)
  const cssCopy = useCopy('COPY CSS')
  const key = work ? `${work.id}:${JSON.stringify(settings)}` : ''
  const analysis = result?.key === key ? result.analysis : null
  const scene = useMemo<Scene | null>(() => work ? { image: work.image, settings, text, fontSize } : null, [work, settings, text, fontSize])
  const previewImage = useMemo(() => {
    if (!work) return null
    const scale = Math.min(1, 1500 / Math.max(work.width, work.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(work.width * scale))
    canvas.height = Math.max(1, Math.round(work.height * scale))
    canvas.getContext('2d')?.drawImage(work.image, 0, 0, canvas.width, canvas.height)
    return canvas
  }, [work])
  const fits = scene ? layoutText(scene).fits : false
  const hasText = Boolean(text.trim())
  const checked = Boolean(work && analysis && hasText && fits)
  const css = work ? sceneCss(settings, work.width, work.height, fontSize, cssFor(settings, work.width, work.height)) : ''

  useEffect(() => {
    const sequence = ++imageSequence.current
    let cancelled = false
    const load = async () => {
      try {
        const image = new Image()
        image.src = source.url
        await image.decode()
        if (cancelled) return
        const width = image.naturalWidth
        const height = image.naturalHeight
        if (width * height > MAX_PIXELS || width > 12000 || height > 12000) throw new Error('Use a photo up to 12 megapixels and 12,000 px per edge. Every source pixel is checked without downsampling.')
        const imageCanvas = document.createElement('canvas')
        imageCanvas.width = width
        imageCanvas.height = height
        const context = imageCanvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Local image processing is unavailable in this browser.')
        context.fillStyle = '#FFFFFF'
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0)
        setWork({ image: imageCanvas, width, height, name: source.name, id: sequence })
        setError('')
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'That photo could not be read.')
      }
    }
    void load()
    return () => { cancelled = true; if (source.local) URL.revokeObjectURL(source.url) }
  }, [source])

  useEffect(() => {
    setReady(false)
    if (!work) return
    const next = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.current = next
    next.onmessage = (event: MessageEvent) => {
      if (event.data.type === 'ready') setReady(true)
      if (event.data.type === 'result' && event.data.id === latestRequest.current.id) setResult({ key: latestRequest.current.key, analysis: event.data.analysis })
      if (event.data.type === 'error' && event.data.id === latestRequest.current.id) setError(event.data.message)
    }
    next.onerror = () => setError('The local checker could not start. Reset the demo or try a browser with Web Worker support.')
    const pixels = work.image.getContext('2d')!.getImageData(0, 0, work.width, work.height).data
    next.postMessage({ type: 'image', data: pixels, width: work.width, height: work.height }, [pixels.buffer])
    return () => { next.terminate(); worker.current = null }
  }, [work])

  useEffect(() => {
    const id = ++requestSequence.current
    latestRequest.current = { id, key }
    if (!work || !ready) return
    const timer = window.setTimeout(() => worker.current?.postMessage({ type: 'analyze', id, settings }), 120)
    return () => window.clearTimeout(timer)
  }, [settings, work, ready, key])

  useEffect(() => {
    if (!scene || !previewImage || !display.current) return
    const rendered = renderScene({ ...scene, image: previewImage }, { opacity: showOriginal ? 0 : settings.opacity })
    const canvas = display.current
    // The displayed backing store is capped; the checker and exports use the complete source.
    const scale = Math.min(1, 1500 / Math.max(rendered.width, rendered.height))
    canvas.width = Math.max(1, Math.round(rendered.width * scale))
    canvas.height = Math.max(1, Math.round(rendered.height * scale))
    canvas.getContext('2d')?.drawImage(rendered, 0, 0, canvas.width, canvas.height)
  }, [scene, previewImage, showOriginal, settings.opacity])

  const acceptFile = (file: File) => {
    const invalid = validateLocalImage(file)
    if (invalid) { setError(invalid); return }
    setWork(null)
    setResult(null)
    setError('')
    setSource({ url: URL.createObjectURL(file), name: file.name || 'Pasted photo', local: true })
    setShowOriginal(false)
  }
  const isDragging = useImageIntake(acceptFile)
  const reset = () => {
    setWork(null)
    setResult(null)
    setSettings(DEFAULT_SETTINGS)
    setText(DEFAULT_TEXT)
    setFontSize(DEFAULT_FONT_SIZE)
    setSource({ url: demoUrl, name: 'Sunlit dunes / demo', local: false })
    setShowOriginal(false)
    setError('')
  }

  const beginDrag = (event: PointerEvent<HTMLElement>, action: Drag['action']) => {
    if (event.button !== 0) return
    const stage = event.currentTarget.closest('.oc-image-stage')
    if (!stage) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, action, startX: event.clientX, startY: event.clientY, region: settings.region, bounds: stage.getBoundingClientRect() }
  }
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current
    if (!active || active.id !== event.pointerId) return
    const dx = (event.clientX - active.startX) / active.bounds.width
    const dy = (event.clientY - active.startY) / active.bounds.height
    const region = active.action === 'move'
      ? { ...active.region, x: Math.max(0, Math.min(1 - active.region.width, active.region.x + dx)), y: Math.max(0, Math.min(1 - active.region.height, active.region.y + dy)) }
      : { ...active.region, width: Math.min(1 - active.region.x, Math.max(.08, active.region.width + dx)), height: Math.min(1 - active.region.y, Math.max(.08, active.region.height + dy)) }
    setSettings((current) => ({ ...current, region: normalizeRegion(region) }))
  }
  const endDrag = (event: PointerEvent<HTMLElement>) => { if (drag.current?.id === event.pointerId) drag.current = null }
  const keyboardRegion = (event: KeyboardEvent<HTMLElement>, resize: boolean) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const amount = event.shiftKey ? .05 : .01
    const dx = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0
    const dy = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0
    const patch = resize ? { width: Math.min(1 - settings.region.x, settings.region.width + dx), height: Math.min(1 - settings.region.y, settings.region.height + dy) } : { x: Math.max(0, Math.min(1 - settings.region.width, settings.region.x + dx)), y: Math.max(0, Math.min(1 - settings.region.height, settings.region.y + dy)) }
    setSettings(adjustedRegion(settings, patch))
  }
  const regionStyle = { left: `${settings.region.x * 100}%`, top: `${settings.region.y * 100}%`, width: `${settings.region.width * 100}%`, height: `${settings.region.height * 100}%` }
  const applySuggested = () => { if (analysis) { setSettings({ ...settings, opacity: analysis.suggestedOpacity }); setShowOriginal(false) } }
  const exportProof = () => { if (scene && analysis && checked) downloadProofFrame(scene, analysis) }

  return (
    <main className="tool-shell">
      <a className="skip-link" href="#overlay-controls">SKIP TO CONTROLS</a>
      <ToolHeader id="overlay-check" note="LOCAL / NO UPLOAD" />
      {isDragging ? <div className="drop-overlay">DROP PHOTO TO CHECK</div> : null}
      <section className="tool-intro"><h1>Overlay Check</h1><p>Readable text over real photographs.</p></section>
      <section className="workbench oc-workbench" aria-label="Overlay Check workbench">
        <div className="stage-panel oc-stage-panel">
          <div className="oc-stage-heading"><div><p className="step-label">PHOTO / TEXT REGION</p><p>{work ? `${work.name} / ${work.width} × ${work.height}` : error ? 'Choose another photo or reset the demo.' : 'Opening local photo…'}</p></div><div className="segmented segmented--row" role="group" aria-label="Preview mode"><button type="button" aria-pressed={showOriginal} onClick={() => setShowOriginal(true)}>ORIGINAL</button><button type="button" aria-pressed={!showOriginal} onClick={() => setShowOriginal(false)}>WITH SCRIM</button></div></div>
          {work ? <div className="oc-image-stage" style={{ aspectRatio: `${work.width} / ${work.height}` }}>
            <canvas ref={display} aria-label={`${showOriginal ? 'Original' : 'Scrimmed'} photo with text: ${text}`} role="img" />
            <div className="oc-text-region" style={regionStyle}>
              <button className="oc-region-move" type="button" aria-label="Move text region. Use arrow keys; Shift moves five percent." onPointerDown={(event) => beginDrag(event, 'move')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { drag.current = null }} onKeyDown={(event) => keyboardRegion(event, false)}><span className="sr-only">Move text region</span></button>
              <span className="oc-region-tag" aria-hidden="true">TEXT REGION</span>
              <button className="oc-region-resize" type="button" aria-label="Resize text region. Use arrow keys; Shift resizes five percent." onPointerDown={(event) => beginDrag(event, 'resize')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { drag.current = null }} onKeyDown={(event) => keyboardRegion(event, true)}><span aria-hidden="true">↘</span></button>
            </div>
            {analysis ? <span className="oc-worst-mark" aria-hidden="true" style={{ left: `${(showOriginal ? analysis.original : analysis.current).worst.x / work.width * 100}%`, top: `${(showOriginal ? analysis.original : analysis.current).worst.y / work.height * 100}%` }} /> : null}
          </div> : <div className="oc-loading"><span>{error ? 'PHOTO NOT LOADED' : 'PREPARING PHOTO'}</span></div>}
          <p className="oc-interaction-note">DRAG THE BOX / RESIZE ITS CORNER / ARROW KEYS WHEN FOCUSED</p>
          <div className="oc-readouts" aria-live="polite"><div><p className="step-label">WORST CONTRAST</p><p className="readout">{analysis ? ratioLabel(analysis.current.minRatio) : '—'}<span> : 1</span></p><span>{analysis ? `ORIGINAL ${ratioLabel(analysis.original.minRatio)} : 1` : 'CHECKING SOURCE PIXELS'}</span></div><div><p className="step-label">FAILING PIXELS</p><p className="readout">{analysis ? analysis.current.failedPixels.toLocaleString() : '—'}</p><span>{analysis ? `OF ${analysis.current.totalPixels.toLocaleString()} IN THE BOX` : 'LOCAL BACKGROUND CHECK'}</span></div><div className={`oc-verdict${analysis?.current.failedPixels ? ' is-fail' : ''}`}><p className="step-label">{TARGETS.find((item) => item.value === settings.target)?.label}</p><strong>{!analysis ? 'CHECKING' : !hasText ? 'ADD TEXT' : !fits ? 'TEXT CLIPPED' : analysis.current.failedPixels === 0 ? 'REGION PASSES' : 'NEEDS SCRIM'}</strong><span>{settings.target} : 1 TARGET</span></div></div>
          {!hasText || !fits ? <p className="field-error" role="status">{!hasText ? 'Add text before exporting.' : 'Text exceeds the box. Enlarge the box, reduce type size, or shorten the text before exporting.'}</p> : null}
        </div>
        <aside className="side-panel oc-controls" id="overlay-controls" tabIndex={-1} aria-label="Overlay controls">
          <div className="oc-file-actions"><label className="secondary-button"><UploadSimple size={14} aria-hidden="true" />OPEN PHOTO<input type="file" accept={ACCEPT_ATTRIBUTE} aria-label="Open photo" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) acceptFile(file); event.currentTarget.value = '' }} /></label><button className="quiet-button" type="button" onClick={reset}>RESET DEMO</button></div>
          <div><label className="step-label" htmlFor="oc-text">YOUR TEXT</label><textarea id="oc-text" rows={3} value={text} maxLength={240} onChange={(event) => setText(event.target.value)} /></div>
          <div><label className="step-label oc-slider-label" htmlFor="oc-type-size">TYPE SIZE<span>{(fontSize * 100).toFixed(1)}% WIDTH</span></label><input id="oc-type-size" type="range" min="20" max="100" step="1" value={Math.round(fontSize * 1000)} onChange={(event) => setFontSize(Number(event.target.value) / 1000)} /></div>
          <div><p className="step-label" id="oc-tone">TEXT</p><div className="segmented segmented--row" role="group" aria-labelledby="oc-tone">{(['light', 'dark'] as const).map((tone) => <button type="button" key={tone} aria-pressed={settings.tone === tone} onClick={() => setSettings({ ...settings, tone })}>{tone === 'light' ? 'WHITE' : 'BLACK'}</button>)}</div></div>
          <div><p className="step-label" id="oc-direction">SCRIM</p><div className="segmented segmented--row" role="group" aria-labelledby="oc-direction">{(['bottom', 'top', 'uniform'] as const).map((direction) => <button type="button" key={direction} aria-pressed={settings.direction === direction} onClick={() => setSettings({ ...settings, direction })}>{direction.toUpperCase()}</button>)}</div></div>
          <div><p className="step-label" id="oc-target">WCAG TARGET</p><div className="segmented segmented--row oc-targets" role="group" aria-labelledby="oc-target">{TARGETS.map((target) => <button type="button" key={target.value} aria-pressed={settings.target === target.value} onClick={() => setSettings({ ...settings, target: target.value })}>{target.label}</button>)}</div></div>
          <div><label className="step-label oc-slider-label" htmlFor="oc-opacity">SCRIM STRENGTH<span>{Math.round(settings.opacity * 100)}%</span></label><input id="oc-opacity" type="range" min="0" max="100" step="1" value={Math.round(settings.opacity * 100)} onChange={(event) => { setSettings({ ...settings, opacity: Number(event.target.value) / 100 }); setShowOriginal(false) }} /><button className="secondary-button oc-minimum" type="button" disabled={!analysis} onClick={applySuggested}>{analysis ? `USE MINIMUM / ${Math.round(analysis.suggestedOpacity * 100)}%` : 'FINDING MINIMUM…'}</button></div>
          <div className="oc-export-actions"><button className="quiet-button" type="button" disabled={!checked || analysis?.current.failedPixels !== 0} onClick={() => void cssCopy.copy(css)}>{cssCopy.label}</button><button className="quiet-button" type="button" disabled={!checked} onClick={() => { if (scene) downloadScene(scene) }}>SAVE IMAGE</button><button className="primary-button" type="button" disabled={!checked} onClick={exportProof}><DownloadSimple size={14} aria-hidden="true" />EXPORT PROOF PNG</button></div>
        </aside>
      </section>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <details className="oc-details"><summary>TEXT REGION & HOW TO USE THE CSS</summary><div className="oc-details-body">
        <fieldset className="oc-region-fields"><legend className="step-label">TEXT BOX / PERCENT OF IMAGE</legend>{(['x', 'y', 'width', 'height'] as const).map((field) => <label key={field}>{field.toUpperCase()}<input type="number" min={field === 'width' || field === 'height' ? 8 : 0} max="100" step="1" value={Math.round(settings.region[field] * 100)} onChange={(event) => { const value = event.currentTarget.valueAsNumber; if (Number.isFinite(value)) setSettings(adjustedRegion(settings, { [field]: value / 100 })) }} /></label>)}</fieldset>
        <p>The result checks every decoded source pixel inside the full rectangle, not an average and not just the text strokes. Analysis is conservative about 8-bit compositing. The gradient keeps the full chosen strength behind the box and fades outside it.</p>
        <p>The result covers opaque white or black text on this image, at this aspect ratio and region. Recheck after cropping, repositioning, or changing the image. AA large text requires at least 24 CSS px regular or 18.67 CSS px bold at the size you ship.</p>
        <p>Copy the CSS into a container with this structure. Keep the image at its original aspect ratio; the text region uses percentages and the type uses container width.</p><pre><code>{'<div class="overlay-check">\n  <img src="photo.jpg" alt="…" />\n  <p class="overlay-check__text">Your text</p>\n</div>'}</code></pre>
        <pre className="oc-css"><code>{css || 'Load a photo to create the CSS.'}</code></pre><a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" target="_blank" rel="noreferrer">WCAG 2.2 contrast guidance</a>
        <p>Photos stay in this tab. Up to 25 MB / 12 megapixels. Transparency is composited onto white. This is a conservative contrast check, not a complete accessibility audit. The demo photograph is credited in the repository.</p>
      </div></details>
      <ToolFooter id="overlay-check" />
    </main>
  )
}
