import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { Crosshair, ImageSquare } from '@phosphor-icons/react'
import fixtureUrl from './fixtures/editorial-scene.svg?url'
import { CROP_PRESETS, focalCss, getContainedRect, isEdgeBiased, normalizeFocal, validateLocalImage, type FocalPoint } from './cropMath'
import { downloadProofFrame } from './exportProof'

type LoadedImage = {
  src: string
  name: string
  isObjectUrl: boolean
}

type Dimensions = {
  width: number
  height: number
}

const DEFAULT_FOCAL: FocalPoint = { x: 50, y: 50 }

function positionFromPointer(
  event: PointerEvent<HTMLButtonElement>,
  surface: HTMLElement,
  naturalSize: Dimensions,
): FocalPoint {
  const bounds = surface.getBoundingClientRect()
  const imageRect = getContainedRect(naturalSize.width, naturalSize.height, bounds.width, bounds.height)
  return normalizeFocal({
    x: ((event.clientX - bounds.left - imageRect.x) / imageRect.width) * 100,
    y: ((event.clientY - bounds.top - imageRect.y) / imageRect.height) * 100,
  })
}

export function CropProof() {
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null)
  const [focal, setFocal] = useState<FocalPoint>(DEFAULT_FOCAL)
  const [fileError, setFileError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [naturalSize, setNaturalSize] = useState<Dimensions>({ width: 1600, height: 1000 })
  const [surfaceSize, setSurfaceSize] = useState<Dimensions>({ width: 1, height: 1 })
  const imageElement = useRef<HTMLImageElement>(null)
  const sourceSurface = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (loadedImage?.isObjectUrl) URL.revokeObjectURL(loadedImage.src)
    }
  }, [loadedImage])

  useEffect(() => {
    const surface = sourceSurface.current
    if (!surface) return
    const observeSize = () => setSurfaceSize({ width: surface.clientWidth, height: surface.clientHeight })
    observeSize()
    const observer = new ResizeObserver(observeSize)
    observer.observe(surface)
    return () => observer.disconnect()
  }, [loadedImage])

  const cssValue = useMemo(() => focalCss(focal), [focal])
  const warning = isEdgeBiased(focal)
  const renderedImageRect = useMemo(() => {
    if (surfaceSize.width <= 0 || surfaceSize.height <= 0) return { x: 0, y: 0, width: 1, height: 1 }
    return getContainedRect(naturalSize.width, naturalSize.height, surfaceSize.width, surfaceSize.height)
  }, [naturalSize, surfaceSize])
  const focalStyle = {
    left: `${renderedImageRect.x + renderedImageRect.width * (focal.x / 100)}px`,
    top: `${renderedImageRect.y + renderedImageRect.height * (focal.y / 100)}px`,
  }

  const replaceImage = (nextImage: LoadedImage) => {
    setLoadedImage((current) => {
      if (current?.isObjectUrl) URL.revokeObjectURL(current.src)
      return nextImage
    })
    setFocal(DEFAULT_FOCAL)
    setFileError(null)
  }

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    const error = validateLocalImage(file)
    if (error) {
      setFileError(error)
      event.currentTarget.value = ''
      return
    }
    replaceImage({ src: URL.createObjectURL(file), name: file.name, isObjectUrl: true })
    event.currentTarget.value = ''
  }

  const loadDemo = () => {
    replaceImage({ src: fixtureUrl, name: 'Synthetic editorial scene', isObjectUrl: false })
  }

  const updateFocalFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const surface = sourceSurface.current
    if (!surface) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setFocal(positionFromPointer(event, surface, naturalSize))
  }

  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 5 : 1
    const delta = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key]
    if (!delta) return
    event.preventDefault()
    setFocal((current) => normalizeFocal({ x: current.x + delta.x, y: current.y + delta.y }))
  }

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssValue)
    } catch {
      const fallback = document.createElement('textarea')
      fallback.value = cssValue
      fallback.setAttribute('readonly', '')
      fallback.style.position = 'fixed'
      fallback.style.opacity = '0'
      document.body.append(fallback)
      fallback.select()
      document.execCommand('copy')
      fallback.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const exportProof = () => {
    if (!imageElement.current?.complete) return
    downloadProofFrame(imageElement.current, focal)
  }

  return (
    <main className="tool-shell">
      <header className="tool-header">
        <a className="repo-mark" href="../" aria-label="Back to Tiny Design Tools">TDT / 01</a>
        <p>LOCAL / NO UPLOAD</p>
      </header>

      <section className="tool-intro">
        <h1>Crop Proof</h1>
        <p>One focal point across six crops.</p>
      </section>

      {!loadedImage ? (
        <section className="input-gate" aria-labelledby="input-title">
          <div className="input-gate__copy">
            <ImageSquare size={24} weight="thin" aria-hidden="true" />
            <h2 id="input-title">Select an image</h2>
            <p>PNG, JPEG, or WebP / 25 MB max</p>
            <div className="input-actions">
              <label className="primary-button">
                CHOOSE FILE
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
              </label>
              <button className="secondary-button" type="button" onClick={loadDemo}>
                USE DEMO
              </button>
            </div>
            {fileError ? <p className="field-error" role="alert">{fileError}</p> : null}
          </div>
        </section>
      ) : (
        <>
          <section className="workbench">
            <div className="source-panel">
              <div className="panel-heading">
                <div>
                  <p className="step-label">SOURCE</p>
                  <h2>{loadedImage.name}</h2>
                </div>
                <label className="quiet-button">
                  REPLACE
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
                </label>
              </div>
              <div className="source-surface" ref={sourceSurface}>
                <img
                  ref={imageElement}
                  src={loadedImage.src}
                  alt="Source preview for crop positioning"
                  draggable={false}
                  onLoad={(event) => setNaturalSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })}
                />
                <div
                  className="source-grid"
                  aria-hidden="true"
                  style={{
                    left: `${renderedImageRect.x}px`,
                    top: `${renderedImageRect.y}px`,
                    width: `${renderedImageRect.width}px`,
                    height: `${renderedImageRect.height}px`,
                  }}
                />
                <button
                  className={`focal-control ${warning ? 'is-warning' : ''}`}
                  style={focalStyle}
                  type="button"
                  aria-label={`Focal point at ${Math.round(focal.x)} percent horizontal and ${Math.round(focal.y)} percent vertical. Drag or use arrow keys to move.`}
                  onPointerDown={updateFocalFromPointer}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFocalFromPointer(event)
                  }}
                  onKeyDown={moveWithKeyboard}
                >
                  <Crosshair size={28} weight="thin" aria-hidden="true" />
                </button>
                <div className="coordinate-readout" aria-live="polite">
                  <span>X {Math.round(focal.x)}%</span>
                  <span>Y {Math.round(focal.y)}%</span>
                </div>
              </div>
              <p className="interaction-help">DRAG / ARROWS 1% / SHIFT 5%</p>
            </div>

            <aside className="control-panel" aria-labelledby="manipulation-heading">
              <div>
                <p className="step-label">POSITION</p>
                <h2 id="manipulation-heading">{Math.round(focal.x)} / {Math.round(focal.y)}</h2>
              </div>
              <div className={`finding-card ${warning ? 'is-warning' : ''}`}>
                <div>
                  <p>STATUS</p>
                  <strong>{warning ? 'EDGE POINT' : 'VISIBLE'}</strong>
                </div>
                <span className="finding-card__count">6 / 6</span>
              </div>
              <div className="css-output">
                <p>CSS</p>
                <code>{cssValue}</code>
                <button className="quiet-button" type="button" onClick={copyCss}>{copied ? 'COPIED' : 'COPY'}</button>
              </div>
            </aside>
          </section>

          {fileError ? <p className="field-error field-error--workbench" role="alert">{fileError}</p> : null}

          <section className="proof-section" aria-labelledby="proof-heading">
            <div className="section-heading proof-heading">
              <div>
                <p className="step-label">CROPS / 06</p>
                <h2 id="proof-heading">Proof</h2>
              </div>
              <button className="primary-button" type="button" onClick={exportProof}>
                EXPORT PNG
              </button>
            </div>
            <div className="crop-grid">
              {CROP_PRESETS.map((preset, index) => (
                <article className={`crop-card crop-card--${preset.id}`} key={`${preset.id}-${index}`}>
                  <div className="crop-card__meta">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <h3>{preset.label}</h3>
                    <span>{preset.context}</span>
                  </div>
                  <div className="crop-card__stage">
                    <div className="crop-frame" style={{ aspectRatio: `${preset.width} / ${preset.height}` }}>
                      <img
                        src={loadedImage.src}
                        alt={`${preset.label} crop preview`}
                        draggable={false}
                        style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                      />
                      <Crosshair
                        className={`crop-target ${warning ? 'is-warning' : ''}`}
                        size={15}
                        weight="thin"
                        style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="tool-footer">
        <p>V0.1</p>
        <p>LOCAL / MIT</p>
      </footer>
    </main>
  )
}
