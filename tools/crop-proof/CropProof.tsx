import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { Crosshair, ImageSquare } from '@phosphor-icons/react'
import { ACCEPT_ATTRIBUTE, validateLocalImage } from '../../src/imageFile'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { useCopy } from '../../src/useCopy'
import { useImageIntake } from '../../src/useImageIntake'
import fixtureUrl from './fixtures/lighthouse.jpg?url'
import { CROP_PRESETS, focalCss, getContainedRect, isEdgeBiased, keptShare, normalizeFocal, tightestPreset, type FocalPoint } from './cropMath'
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
  event: PointerEvent<HTMLElement>,
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
  const [naturalSize, setNaturalSize] = useState<Dimensions>({ width: 1600, height: 1000 })
  const [surfaceSize, setSurfaceSize] = useState<Dimensions>({ width: 1, height: 1 })
  const cssCopy = useCopy('COPY')
  const imageElement = useRef<HTMLImageElement>(null)
  const sourceSurface = useRef<HTMLDivElement>(null)
  const focalControl = useRef<HTMLButtonElement>(null)

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
  const tightest = useMemo(() => tightestPreset(naturalSize.width, naturalSize.height), [naturalSize])
  const renderedImageRect = useMemo(() => {
    if (surfaceSize.width <= 0 || surfaceSize.height <= 0) return { x: 0, y: 0, width: 1, height: 1 }
    return getContainedRect(naturalSize.width, naturalSize.height, surfaceSize.width, surfaceSize.height)
  }, [naturalSize, surfaceSize])
  const focalStyle = {
    left: `${renderedImageRect.x + renderedImageRect.width * (focal.x / 100)}px`,
    top: `${renderedImageRect.y + renderedImageRect.height * (focal.y / 100)}px`,
  }

  const replaceImage = useCallback((nextImage: LoadedImage) => {
    setLoadedImage((current) => {
      if (current?.isObjectUrl) URL.revokeObjectURL(current.src)
      return nextImage
    })
    setFocal(DEFAULT_FOCAL)
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

  const loadDemo = () => {
    replaceImage({ src: fixtureUrl, name: 'Lighthouse at dusk', isObjectUrl: false })
  }

  const placeFocal = (event: PointerEvent<HTMLDivElement>) => {
    const surface = sourceSurface.current
    if (!surface) return
    setFocal(positionFromPointer(event, surface, naturalSize))
  }

  const onSurfaceDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    focalControl.current?.focus({ preventScroll: true })
    placeFocal(event)
  }

  const onSurfaceMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) placeFocal(event)
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

  const exportProof = () => {
    if (!imageElement.current?.complete) return
    downloadProofFrame(imageElement.current, focal)
  }

  return (
    <main className="tool-shell">
      <ToolHeader id="crop-proof" note="LOCAL / NO UPLOAD" />

      <section className="tool-intro">
        <h1>Crop Proof</h1>
        <p>One focal point across six crops. Mark the subject once, see what every format keeps.</p>
      </section>

      {isDragging ? <div className="drop-overlay" aria-hidden="true">DROP IMAGE TO LOAD</div> : null}

      {!loadedImage ? (
        <section className="input-gate" aria-labelledby="input-title">
          <div className="input-gate__copy">
            <ImageSquare size={26} weight="thin" aria-hidden="true" />
            <h2 id="input-title">Select an image</h2>
            <p>PNG, JPEG, or WebP / 25 MB max</p>
            <p>Drop or paste (Ctrl/Cmd + V) works too</p>
            <div className="input-actions">
              <label className="primary-button">
                CHOOSE FILE
                <input type="file" accept={ACCEPT_ATTRIBUTE} onChange={onFile} />
              </label>
              <button className="gate-demo" type="button" onClick={loadDemo}>
                <img src={fixtureUrl} alt="" />
                <span><b>USE DEMO</b><small>Lighthouse at dusk</small></span>
              </button>
            </div>
            {fileError ? <p className="field-error" role="alert">{fileError}</p> : null}
          </div>
        </section>
      ) : (
        <>
          <section className="workbench">
            <div className="stage-panel">
              <div className="panel-heading">
                <div>
                  <p className="step-label">SOURCE / {naturalSize.width} × {naturalSize.height}</p>
                  <h2>{loadedImage.name}</h2>
                </div>
                <label className="quiet-button">
                  REPLACE
                  <input type="file" accept={ACCEPT_ATTRIBUTE} onChange={onFile} />
                </label>
              </div>
              <div
                className="source-surface"
                ref={sourceSurface}
                onPointerDown={onSurfaceDown}
                onPointerMove={onSurfaceMove}
                onMouseDown={(event) => event.preventDefault()}
              >
                <img
                  ref={imageElement}
                  src={loadedImage.src}
                  alt="Source preview for crop positioning"
                  draggable={false}
                  onLoad={(event) => setNaturalSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })}
                  onError={() => {
                    setFileError('That image could not be read. Try another file.')
                    setLoadedImage(null)
                  }}
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
                  ref={focalControl}
                  className={`focal-control ${warning ? 'is-warning' : ''}`}
                  style={focalStyle}
                  type="button"
                  aria-label={`Focal point at ${Math.round(focal.x)} percent horizontal and ${Math.round(focal.y)} percent vertical. Click the image, drag, or use arrow keys to move.`}
                  onKeyDown={moveWithKeyboard}
                >
                  <Crosshair size={28} weight="thin" aria-hidden="true" />
                </button>
                <div className="coordinate-readout" aria-live="polite">
                  <span>X {Math.round(focal.x)}%</span>
                  <span>Y {Math.round(focal.y)}%</span>
                </div>
              </div>
              <p className="interaction-help">CLICK OR DRAG THE IMAGE / ARROWS 1% / SHIFT + ARROWS 5%</p>
            </div>

            <aside className="side-panel" aria-labelledby="manipulation-heading">
              <div>
                <p className="step-label">POSITION</p>
                <h2 className="readout" id="manipulation-heading">{Math.round(focal.x)} / {Math.round(focal.y)}</h2>
              </div>
              <div className={`finding-card ${warning ? 'is-warning' : ''}`}>
                <div>
                  <p>FOCAL POINT</p>
                  <strong>{warning ? 'NEAR AN EDGE' : 'SAFELY INSIDE'}</strong>
                </div>
              </div>
              <div className="finding-card">
                <div>
                  <p>TIGHTEST CROP</p>
                  <strong>{tightest.preset.label.toUpperCase()}</strong>
                </div>
                <span className="finding-card__count">{Math.round(tightest.share * 100)}% KEPT</span>
              </div>
              <div className="css-output">
                <p className="step-label">CSS</p>
                <code>{cssValue}</code>
                <button className="quiet-button" type="button" onClick={() => cssCopy.copy(cssValue)}>{cssCopy.label}</button>
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
                    <span>{preset.context} / {Math.round(keptShare(naturalSize.width, naturalSize.height, preset) * 100)}%</span>
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
            <p className="proof-note">PERCENTAGE = SHARE OF THE SOURCE IMAGE THAT STAYS IN FRAME</p>
          </section>
        </>
      )}

      <ToolFooter id="crop-proof" />
    </main>
  )
}
