import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsLeftRight, DownloadSimple, Link, UploadSimple } from '@phosphor-icons/react'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { ACCEPT_ATTRIBUTE, validateLocalImage } from '../../src/imageFile'
import { useCopy } from '../../src/useCopy'
import { useImageIntake } from '../../src/useImageIntake'
import { apcaValue, referenceFor } from './apca'
import { contrastRatio, findPassingForeground, hslToHex, normalizeHex, rgbToHsl, hexToRgb } from './contrastMath'
import { downloadProofFrame } from './exportProof'
import { DEFAULT_PAIR, TARGETS, pairHash, readPair } from './settings'

const DEFAULT_SPECIMEN = 'Good design makes room for everyone.'
const GUIDE = 'https://git.apcacontrast.com/documentation/WhyAPCA'
const ratioText = (value: number) => (Math.floor(value * 100) / 100).toFixed(2)
type Slot = 'foreground' | 'background'

function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const hex = normalizeHex(value)
  const id = label.toLowerCase().replaceAll(' ', '-')
  return (
    <div className="cp-colour-field">
      <label className="step-label" htmlFor={id}>{label}</label>
      <div className="cp-colour-input">
        <input type="color" aria-label={`${label} colour picker`} value={hex ?? '#000000'} onChange={(event) => onChange(event.target.value.toUpperCase())} />
        <input id={id} type="text" value={value} spellCheck={false} autoComplete="off" maxLength={16} aria-invalid={!hex} aria-describedby={!hex ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} onBlur={() => { if (hex) onChange(hex) }} />
      </div>
      {!hex ? <p className="field-error" id={`${id}-error`}>Use #RGB or #RRGGBB, without transparency.</p> : null}
    </div>
  )
}

function Specimen({ label, foreground, background, text, target }: { label: string; foreground: string; background: string; text: string; target: number }) {
  const ratio = contrastRatio(foreground, background)
  const lc = apcaValue(foreground, background)
  const reference = referenceFor(lc)
  return (
    <figure className="cp-specimen">
      <figcaption><span className="step-label">{label}</span><span className={`cp-verdict${ratio < target ? ' is-fail' : ''}`}>{ratio >= target ? 'PASS' : 'FAIL'}</span></figcaption>
      <div className="cp-specimen__surface" style={{ background, color: foreground }}>
        <p className="cp-specimen__letters" aria-hidden="true">Aa</p>
        <p className="cp-specimen__text" style={{ fontSize: reference.size }}>{text || DEFAULT_SPECIMEN}</p>
      </div>
      <div className="cp-specimen__values"><strong>{foreground}</strong><span>ON {background}</span></div>
      <div className="cp-specimen__metrics"><span>{ratioText(ratio)} : 1</span><span>APCA Lc {lc.toFixed(1)}</span></div>
      <p className="cp-reference">{reference.label}{Math.abs(lc) >= 45 ? ' / MIN. FLUENT REFERENCE' : ''}</p>
    </figure>
  )
}

export function ContrastPair() {
  const [pair, setPair] = useState(() => readPair(window.location.hash))
  const [specimen, setSpecimen] = useState(DEFAULT_SPECIMEN)
  const [image, setImage] = useState<{ element: HTMLImageElement; name: string } | null>(null)
  const [sampleSlot, setSampleSlot] = useState<Slot>('foreground')
  const [point, setPoint] = useState({ x: 0, y: 0 })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const intakeSequence = useRef(0)
  const lightnessAnchor = useRef(rgbToHsl(hexToRgb(normalizeHex(pair.foreground) ?? DEFAULT_PAIR.foreground)))
  const cssCopy = useCopy('COPY CSS')
  const linkCopy = useCopy('COPY LINK')
  const foreground = normalizeHex(pair.foreground)
  const background = normalizeHex(pair.background)
  const valid = Boolean(foreground && background)
  const corrected = useMemo(() => foreground && background ? findPassingForeground(foreground, background, pair.target) : null, [foreground, background, pair.target])
  const ratio = foreground && background ? contrastRatio(foreground, background) : null
  const hsl = foreground ? rgbToHsl(hexToRgb(foreground)) : { h: 0, s: 0, l: .5 }
  const targetLabel = TARGETS.find((item) => item.ratio === pair.target)!
  const updatePair = (next: typeof pair) => {
    const hex = normalizeHex(next.foreground)
    if (hex) lightnessAnchor.current = rgbToHsl(hexToRgb(hex))
    setPair(next)
  }

  useEffect(() => {
    const onHashChange = () => {
      if (!/(?:^#|&)(?:text|bg|target)=/.test(window.location.hash)) return
      const next = readPair(window.location.hash)
      lightnessAnchor.current = rgbToHsl(hexToRgb(next.foreground))
      setPair(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => { window.removeEventListener('hashchange', onHashChange); intakeSequence.current += 1 }
  }, [])

  useEffect(() => {
    if (foreground && background) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${pairHash(foreground, background, pair.target)}`)
  }, [foreground, background, pair.target])

  useEffect(() => {
    if (!image || !canvas.current) return
    const scale = Math.min(1, 1200 / Math.max(image.element.naturalWidth, image.element.naturalHeight))
    canvas.current.width = Math.max(1, Math.round(image.element.naturalWidth * scale))
    canvas.current.height = Math.max(1, Math.round(image.element.naturalHeight * scale))
    const context = canvas.current.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.current.width, canvas.current.height)
    context.drawImage(image.element, 0, 0, canvas.current.width, canvas.current.height)
  }, [image])

  const acceptFile = async (file: File) => {
    const invalid = validateLocalImage(file)
    if (invalid) { setError(invalid); return }
    const sequence = ++intakeSequence.current
    const url = URL.createObjectURL(file)
    try {
      const element = new Image()
      element.src = url
      await element.decode()
      if (sequence !== intakeSequence.current) return
      if (element.naturalWidth * element.naturalHeight > 40_000_000) throw new Error('Use an image below 40 megapixels for local sampling.')
      setImage({ element, name: file.name })
      setPoint({ x: 0, y: 0 })
      setError('')
      setMessage('Choose text or background, then select a pixel. Transparent pixels are flattened onto white.')
    } catch (cause) {
      if (sequence === intakeSequence.current) setError(cause instanceof Error ? cause.message : 'That image could not be decoded.')
    } finally { URL.revokeObjectURL(url) }
  }
  const isDragging = useImageIntake((file) => void acceptFile(file))
  const sample = (x: number, y: number) => {
    const context = canvas.current?.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const [r, g, b] = context.getImageData(x, y, 1, 1).data
    const hex = `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`
    updatePair({ ...pair, [sampleSlot]: hex })
    setMessage(`${sampleSlot === 'foreground' ? 'Text' : 'Background'} sampled: ${hex}`)
  }
  const reset = () => {
    intakeSequence.current += 1
    updatePair(DEFAULT_PAIR)
    setSpecimen(DEFAULT_SPECIMEN)
    setImage(null)
    setError('')
    setMessage('Demo pair restored.')
  }
  const exportProof = () => {
    if (!foreground || !background) return
    try { downloadProofFrame({ foreground, background, corrected, target: pair.target, specimen: specimen || DEFAULT_SPECIMEN }); setError('') }
    catch { setError('PNG export is unavailable. Try another browser.') }
  }

  return (
    <main className="tool-shell">
      <a className="skip-link" href="#pair-controls" onClick={(event) => { event.preventDefault(); document.getElementById('pair-controls')?.focus() }}>SKIP TO CONTROLS</a>
      <ToolHeader id="contrast-pair" note="LOCAL / sRGB" />
      {isDragging ? <div className="drop-overlay">DROP IMAGE TO SAMPLE</div> : null}
      <section className="tool-intro"><h1>Contrast Pair</h1><p>Two colours. One readable pair.</p></section>

      <section className="workbench cp-workbench" aria-label="Contrast Pair workbench">
        <div className="stage-panel cp-stage">
          <div className="panel-heading"><p className="step-label">PAIR / {targetLabel.label}</p><button className="quiet-button" type="button" onClick={reset}>RESET DEMO</button></div>
          {foreground && background ? <div className="cp-comparison">
            <Specimen label="YOUR PAIR" foreground={foreground} background={background} text={specimen} target={pair.target} />
            {corrected ? <Specimen label={corrected === foreground ? 'ALREADY PASSES' : 'NEAREST PASSING'} foreground={corrected} background={background} text={specimen} target={pair.target} /> : <div className="cp-no-solution"><p className="step-label">NO PASSING TEXT COLOUR</p><p>This background cannot reach {pair.target} : 1, even with black or white text.</p><button className="secondary-button" type="button" onClick={() => setPair({ ...pair, background: '#FFFFFF' })}>TRY WHITE BACKGROUND</button></div>}
          </div> : <div className="cp-no-solution"><p>Finish both hex colours to measure the pair.</p></div>}
          <div className="cp-result" aria-live="polite">
            <span className="step-label">WCAG 2.2 / {targetLabel.label}</span>
            <p>{ratio === null ? '—' : `${ratioText(ratio)} : 1`}<span>{ratio === null ? 'WAITING FOR COLOURS' : ratio >= pair.target ? 'PASSES' : corrected ? `→ ${ratioText(contrastRatio(corrected, background!))} : 1` : 'CHANGE THE BACKGROUND'}</span></p>
          </div>
          <div className="cp-checks" aria-label="WCAG contrast thresholds">
            {TARGETS.map((item) => <div key={item.ratio}><span>{item.label}</span><strong>{ratio === null ? '—' : ratio >= item.ratio ? 'PASS' : 'FAIL'}</strong><span>{item.ratio} : 1</span></div>)}
          </div>
          <p className="cp-method-note">Nearest by HSL lightness. Hue and saturation stay fixed before 8-bit rounding; the background stays fixed.</p>
        </div>

        <aside className="side-panel cp-controls" id="pair-controls" tabIndex={-1} aria-label="Pair controls">
          <ColourField label="Text colour" value={pair.foreground} onChange={(value) => updatePair({ ...pair, foreground: value })} />
          <button className="quiet-button cp-swap" type="button" aria-label="Swap text and background colours" onClick={() => updatePair({ ...pair, foreground: pair.background, background: pair.foreground })}><ArrowsLeftRight size={14} aria-hidden="true" /> SWAP</button>
          <ColourField label="Background colour" value={pair.background} onChange={(value) => setPair({ ...pair, background: value })} />
          <div><p className="step-label" id="cp-target-label">WCAG TARGET</p><div className="segmented cp-targets" role="group" aria-labelledby="cp-target-label">{TARGETS.map((item) => <button key={item.ratio} type="button" aria-pressed={item.ratio === pair.target} onClick={() => setPair({ ...pair, target: item.ratio })}>{item.label}<span>{item.ratio} : 1</span></button>)}</div><p className="cp-caption">{targetLabel.note}</p></div>
          <div className="cp-lightness"><label className="step-label" htmlFor="cp-lightness">TEXT LIGHTNESS <span>{Math.round(hsl.l * 100)}%</span></label><input id="cp-lightness" type="range" min="0" max="1000" value={Math.round(hsl.l * 1000)} disabled={!valid} onChange={(event) => setPair({ ...pair, foreground: hslToHex({ ...lightnessAnchor.current, l: Number(event.target.value) / 1000 }) })} /></div>
          <button className="secondary-button" type="button" disabled={!corrected || corrected === foreground} onClick={() => { if (corrected) updatePair({ ...pair, foreground: corrected }) }}>USE PASSING COLOUR</button>
          <div className="cp-export-actions"><button className="quiet-button" type="button" disabled={!valid || !corrected} onClick={() => void cssCopy.copy(`color: ${corrected};\nbackground-color: ${background};`)}>{cssCopy.label}</button><button className="quiet-button" type="button" disabled={!valid} onClick={() => void linkCopy.copy(`${window.location.origin}${window.location.pathname}${window.location.search}${pairHash(foreground!, background!, pair.target)}`)}><Link size={13} aria-hidden="true" />{linkCopy.label}</button><button className="primary-button" type="button" disabled={!valid} onClick={exportProof}><DownloadSimple size={14} aria-hidden="true" /> EXPORT PNG</button></div>
        </aside>
      </section>

      <section className="cp-intake" aria-label="Image colour sampling">
        <div className="cp-intake__heading"><div><p className="step-label">OR SAMPLE AN IMAGE</p><p>{image ? image.name : 'Select two pixels from a local screenshot or photograph.'}</p></div><label className="secondary-button"><UploadSimple size={14} aria-hidden="true" />{image ? 'CHANGE IMAGE' : 'OPEN IMAGE'}<input type="file" accept={ACCEPT_ATTRIBUTE} aria-label="Open image to sample colours" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void acceptFile(file); event.currentTarget.value = '' }} /></label></div>
        {image ? <div className="cp-sampler">
          <div className="segmented segmented--row" role="group" aria-label="Sample into"><button type="button" aria-pressed={sampleSlot === 'foreground'} onClick={() => setSampleSlot('foreground')}>SAMPLE TEXT</button><button type="button" aria-pressed={sampleSlot === 'background'} onClick={() => setSampleSlot('background')}>SAMPLE BACKGROUND</button></div>
          <div className="cp-sampler__image"><canvas ref={canvas} tabIndex={0} role="img" aria-label="Colour sampling image. Click a pixel, or use arrow keys to position the crosshair and Enter to sample. Shift moves ten pixels." onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); const x = Math.min(event.currentTarget.width - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * event.currentTarget.width))); const y = Math.min(event.currentTarget.height - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * event.currentTarget.height))); setPoint({ x, y }); sample(x, y) }} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sample(point.x, point.y); return }
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
            event.preventDefault()
            const step = event.shiftKey ? 10 : 1
            setPoint({ x: Math.min(event.currentTarget.width - 1, Math.max(0, point.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0))), y: Math.min(event.currentTarget.height - 1, Math.max(0, point.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))) })
          }} /><span className="cp-crosshair" aria-hidden="true" style={{ left: `${point.x / (canvas.current?.width ?? 1) * 100}%`, top: `${point.y / (canvas.current?.height ?? 1) * 100}%` }} /></div>
          <p className="cp-caption">CLICK A PIXEL / ARROWS + ENTER WITH A KEYBOARD / TRANSPARENCY ON WHITE</p>
        </div> : null}
      </section>
      <p className="cp-status" role="status">{message}</p>
      {error ? <p className="field-error" role="alert">{error}</p> : null}

      <details className="cp-details"><summary>SPECIMEN & HOW TO READ THE RESULT</summary><div className="cp-details__body">
        <label className="step-label" htmlFor="cp-specimen-text">PREVIEW TEXT</label><input id="cp-specimen-text" className="cp-text-edit" type="text" value={specimen} maxLength={90} onChange={(event) => setSpecimen(event.target.value)} />
        <p>WCAG pass/fail uses the full, unrounded ratio for opaque sRGB colours. Large text means at least 24 px regular or 18.67 px bold. A ratio alone does not certify an entire design.</p>
        <p>APCA Lc is a beta advisory measurement for web content, separate from the WCAG 2.2 result. Negative values mean light text on dark; positive values mean dark text on light. Swapping colours changes it. The specimen uses Arial 400 at the minimum reference size below.</p>
        <dl className="cp-apca-scale"><div><dt>Lc 90</dt><dd>Preferred body / 14 px</dd></div><div><dt>Lc 75</dt><dd>Minimum body / 16 px</dd></div><div><dt>Lc 60</dt><dd>Minimum fluent / 24 px</dd></div><div><dt>Lc 45</dt><dd>Minimum large / 42 px</dd></div><div><dt>Lc 30</dt><dd>Minimum any text / non-content only</dd></div><div><dt>Lc 15</dt><dd>Invisibility point / certain non-text only</dd></div></dl>
        <div className="cp-doc-links"><a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" target="_blank" rel="noreferrer">WCAG 2.2</a><a href={GUIDE} target="_blank" rel="noreferrer">Why APCA</a><a href="https://github.com/Myndex/SAPC-APCA/discussions" target="_blank" rel="noreferrer">APCA questions & feedback</a><a href="../licenses/apca-w3-LICENSE.txt" target="_blank" rel="noreferrer">APCA licence</a></div>
        <p>APCA 0.0.98G-4g via apca-w3 0.1.9, © Andrew Somers / Myndex. For web content on self-illuminated displays; see the linked licence for use restrictions. Image sampling uses browser-decoded pixels, downscaled to 1200 px on the longest edge.</p>
      </div></details>
      <ToolFooter id="contrast-pair" />
    </main>
  )
}
