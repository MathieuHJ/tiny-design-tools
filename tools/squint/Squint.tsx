import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Eye } from '@phosphor-icons/react'
import { ACCEPT_ATTRIBUTE, validateLocalImage } from '../../src/imageFile'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { useImageIntake } from '../../src/useImageIntake'
import fixtureUrl from './fixtures/demo-interface.svg?url'
import { downloadProofFrame } from './exportProof'
import {
  DEFAULT_STRENGTH,
  TONES,
  blurImage,
  blurSigma,
  findHotspots,
  renderTone,
  squintLabel,
  toneLabels,
  workingSize,
  type Hotspot,
  type Tone,
} from './squintMath'

type LoadedImage = {
  src: string
  name: string
  isObjectUrl: boolean
}

type Work = {
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
  pixels: Uint8ClampedArray
  canvas: HTMLCanvasElement
}

/** Decode the image once into a capped working copy on a white ground, so transparency reads as paper. */
async function prepareWork(src: string): Promise<Work> {
  const image = new Image()
  image.src = src
  await image.decode()
  const size = workingSize(image.naturalWidth, image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas is unavailable in this browser.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size.width, size.height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, size.width, size.height)
  const data = context.getImageData(0, 0, size.width, size.height)
  return { ...size, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, pixels: data.data, canvas }
}

function Marks({ hotspots }: { hotspots: Hotspot[] }) {
  return (
    <>
      {hotspots.map((hotspot, index) => (
        <span
          className={`hotspot ${hotspot.x > 0.82 ? 'is-left' : ''} ${hotspot.y < 0.08 ? 'is-low' : ''}`}
          key={index}
          style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
          aria-hidden="true"
        >
          <i>{String(index + 1).padStart(2, '0')}</i>
        </span>
      ))}
    </>
  )
}

export function Squint() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null)
  const [work, setWork] = useState<Work | null>(null)
  const [strength, setStrength] = useState(DEFAULT_STRENGTH)
  const [tone, setTone] = useState<Tone>('grey')
  const [showMarks, setShowMarks] = useState(true)
  const [fileError, setFileError] = useState<string | null>(null)
  const squintCanvas = useRef<HTMLCanvasElement>(null)

  // Keep the slider instant; let the heavier blur catch up between frames.
  const appliedStrength = useDeferredValue(strength)

  useEffect(() => {
    return () => {
      if (loaded?.isObjectUrl) URL.revokeObjectURL(loaded.src)
    }
  }, [loaded])

  useEffect(() => {
    if (!loaded) return
    let cancelled = false
    prepareWork(loaded.src)
      .then((next) => {
        if (!cancelled) setWork(next)
      })
      .catch(() => {
        if (cancelled) return
        setFileError('That image could not be read. Try another file.')
        setLoaded(null)
        setWork(null)
      })
    return () => {
      cancelled = true
    }
  }, [loaded])

  const sigma = work ? blurSigma(appliedStrength, Math.max(work.width, work.height)) : 0
  const blurred = useMemo(() => (work ? blurImage(work.pixels, work.width, work.height, sigma) : null), [work, sigma])
  const pixels = useMemo(() => (blurred ? renderTone(blurred, tone) : null), [blurred, tone])
  const hotspots = useMemo(
    () => (work && blurred ? findHotspots(blurred.luma, work.width, work.height, sigma) : []),
    [work, blurred, sigma],
  )

  useEffect(() => {
    const canvas = squintCanvas.current
    if (!canvas || !work || !pixels) return
    canvas.width = work.width
    canvas.height = work.height
    canvas.getContext('2d')?.putImageData(new ImageData(pixels, work.width, work.height), 0, 0)
  }, [pixels, work])

  const replaceImage = useCallback((next: LoadedImage) => {
    setLoaded(next)
    setWork(null)
    setFileError(null)
  }, [])

  const acceptFile = useCallback((file: File) => {
    const error = validateLocalImage(file)
    if (error) {
      setFileError(error)
      return
    }
    replaceImage({ src: URL.createObjectURL(file), name: file.name || 'Pasted image', isObjectUrl: true })
  }, [replaceImage])

  const isDragging = useImageIntake(acceptFile)

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) acceptFile(file)
  }

  const loadDemo = () => replaceImage({ src: fixtureUrl, name: 'Travel landing page', isObjectUrl: false })

  const exportProof = () => {
    const squinted = squintCanvas.current
    if (!work || !squinted) return
    downloadProofFrame({
      original: work.canvas,
      squinted,
      width: work.width,
      height: work.height,
      strength: appliedStrength,
      tone,
      hotspots,
    }, showMarks)
  }

  const frameStyle = work ? { aspectRatio: `${work.width} / ${work.height}` } : undefined

  return (
    <main className="tool-shell">
      <ToolHeader id="squint" note="LOCAL / NO UPLOAD" />

      <section className="tool-intro">
        <h1>Squint</h1>
        <p>Blur the design. See what still reads. Anything that vanishes was never carrying the hierarchy.</p>
      </section>

      {isDragging ? <div className="drop-overlay" aria-hidden="true">DROP SCREENSHOT TO LOAD</div> : null}

      {!loaded ? (
        <section className="input-gate" aria-labelledby="input-title">
          <div className="input-gate__copy">
            <Eye size={26} weight="thin" aria-hidden="true" />
            <h2 id="input-title">Select a screenshot</h2>
            <p>PNG, JPEG, or WebP / 25 MB max</p>
            <p>Drop or paste (Ctrl/Cmd + V) works too</p>
            <div className="input-actions">
              <label className="primary-button">
                CHOOSE FILE
                <input type="file" accept={ACCEPT_ATTRIBUTE} onChange={onFile} />
              </label>
              <button className="gate-demo" type="button" onClick={loadDemo}>
                <img src={fixtureUrl} alt="" />
                <span><b>USE DEMO</b><small>Travel landing page</small></span>
              </button>
            </div>
            {fileError ? <p className="field-error" role="alert">{fileError}</p> : null}
          </div>
        </section>
      ) : (
        <section className="workbench">
          <div className="stage-panel">
            <div className="panel-heading">
              <div>
                <p className="step-label">SOURCE{work ? ` / ${work.naturalWidth} × ${work.naturalHeight}` : ''}</p>
                <h2>{loaded.name}</h2>
              </div>
              <label className="quiet-button">
                REPLACE
                <input type="file" accept={ACCEPT_ATTRIBUTE} onChange={onFile} />
              </label>
            </div>

            {work ? (
              <div className="squint-stage">
                <figure className="squint-panel">
                  <figcaption className="step-label">ORIGINAL</figcaption>
                  <div className="squint-frame" style={frameStyle}>
                    <img src={loaded.src} alt="Original design" draggable={false} />
                    {showMarks ? <Marks hotspots={hotspots} /> : null}
                  </div>
                </figure>
                <figure className="squint-panel">
                  <figcaption className="step-label">{squintLabel(appliedStrength, tone)}</figcaption>
                  <div className="squint-frame" style={frameStyle}>
                    <canvas
                      ref={squintCanvas}
                      role="img"
                      aria-label={`The design blurred at strength ${Math.round(appliedStrength)} in ${toneLabels[tone].toLowerCase()}`}
                    />
                    {showMarks ? <Marks hotspots={hotspots} /> : null}
                  </div>
                </figure>
              </div>
            ) : (
              <p className="squint-loading" role="status">READING IMAGE</p>
            )}
            <p className="interaction-help">RAISE STRENGTH UNTIL SOMETHING IMPORTANT VANISHES / MARKS = STRONGEST CONTRAST LEFT</p>
            {fileError ? <p className="field-error field-error--workbench" role="alert">{fileError}</p> : null}
          </div>

          <aside className="side-panel squint-controls" aria-label="Squint controls">
            <div className="squint-controls__strength">
              <div className="control-row">
                <label className="step-label" htmlFor="squint-strength">STRENGTH</label>
                <output className="readout" htmlFor="squint-strength">{strength}</output>
              </div>
              <input
                id="squint-strength"
                className="range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={strength}
                onChange={(event) => setStrength(Number(event.currentTarget.value))}
              />
            </div>

            <div>
              <p className="step-label" id="tone-label">TONE</p>
              <div className="segmented segmented--row" role="group" aria-labelledby="tone-label">
                {TONES.map((item) => (
                  <button type="button" key={item} aria-pressed={item === tone} onClick={() => setTone(item)}>
                    {toneLabels[item]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="step-label" id="marks-label">CONTRAST POINTS</p>
              <div className="segmented segmented--row" role="group" aria-labelledby="marks-label">
                <button type="button" aria-pressed={showMarks} onClick={() => setShowMarks(true)}>SHOW</button>
                <button type="button" aria-pressed={!showMarks} onClick={() => setShowMarks(false)}>HIDE</button>
              </div>
            </div>

            <div className={`finding-card ${hotspots.length === 0 ? 'is-warning' : ''}`}>
              <div>
                <p>STILL READING</p>
                <strong>{hotspots.length === 0 ? 'NOTHING' : `${hotspots.length} ${hotspots.length === 1 ? 'POINT' : 'POINTS'}`}</strong>
              </div>
            </div>
            {hotspots.length > 0 ? (
              <ol className="hotspot-list">
                {hotspots.map((hotspot, index) => (
                  <li key={index}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    X {Math.round(hotspot.x * 100)}% / Y {Math.round(hotspot.y * 100)}%
                  </li>
                ))}
              </ol>
            ) : null}

            <button className="primary-button squint-export" type="button" onClick={exportProof} disabled={!work}>
              EXPORT PNG
            </button>
          </aside>
        </section>
      )}

      <ToolFooter id="squint" />
    </main>
  )
}
