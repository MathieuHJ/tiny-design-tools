import { useRef, type ChangeEvent, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { ACCEPT_ATTRIBUTE } from '../../src/imageFile'
import { MAX_ZOOM, MIN_ZOOM, cropForCenter, normalizeCrop, pickDrivers, windowFor, type Crop } from './cropMath'
import type { Asset } from './model'

export type CropFrame = {
  id: string
  label: string
  width: number
  height: number
  shape: 'rect' | 'circle'
  /** The frame the pointer moves. The others follow it, so the pad shows how one crop lands on every platform. */
  primary?: boolean
}

type Props = {
  title: string
  asset: Asset | null
  frames: CropFrame[]
  empty: string
  onFile: (file: File) => void
  onCrop: (crop: Crop) => void
  onRemove: () => void
}

export function CropPad({ title, asset, frames, empty, onFile, onCrop, onRemove }: Props) {
  const surface = useRef<HTMLDivElement>(null)
  const ordered = [...frames].sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)))

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) onFile(file)
  }

  if (!asset) {
    return (
      <div className="pk-pad">
        <div className="pk-pad__head"><p className="step-label">{title}</p></div>
        <label
          className="pk-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files[0]
            if (file) onFile(file)
          }}
        >
          <span>{empty}</span>
          <span className="pk-drop__action">CHOOSE FILE</span>
          <input type="file" accept={ACCEPT_ATTRIBUTE} onChange={choose} />
        </label>
      </div>
    )
  }

  const crop = normalizeCrop(asset.crop)
  const windowOf = (frame: CropFrame) => windowFor(asset.width, asset.height, frame.width, frame.height, crop)
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const box = surface.current?.getBoundingClientRect()
    if (!box) return
    const point = {
      x: ((event.clientX - box.left) / box.width) * asset.width,
      y: ((event.clientY - box.top) / box.height) * asset.height,
    }
    const driver = pickDrivers(asset.width, asset.height, ordered, crop)
    const byX = cropForCenter(point, asset.width, asset.height, windowOf(ordered[driver.x]))
    const byY = cropForCenter(point, asset.width, asset.height, windowOf(ordered[driver.y]))
    onCrop({ ...crop, x: byX.x, y: byY.y })
  }

  const nudge = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.05 : 0.01
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]
    if (!delta) return
    event.preventDefault()
    onCrop(normalizeCrop({ ...crop, x: crop.x + delta[0], y: crop.y + delta[1] }))
  }

  const driver = pickDrivers(asset.width, asset.height, ordered, crop)
  const driverX = windowOf(ordered[driver.x])
  const driverY = windowOf(ordered[driver.y])
  return (
    <div className="pk-pad">
      <div className="pk-pad__head">
        <p className="step-label">{title} / {asset.width} × {asset.height}</p>
        <div className="pk-pad__actions">
          <label className="quiet-button">
            REPLACE
            <input type="file" accept={ACCEPT_ATTRIBUTE} onChange={choose} />
          </label>
          <button className="quiet-button" type="button" onClick={onRemove}>REMOVE</button>
        </div>
      </div>
      <div className="pk-pad__stage">
        <div
          className="pk-pad__surface"
          ref={surface}
          style={{ '--ratio': asset.width / asset.height } as CSSProperties}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            move(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event)
          }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <img src={asset.url} alt={`${title} source`} draggable={false} />
          {frames.map((frame, index) => {
            const view = windowOf(frame)
            return (
              <span
                key={frame.id}
                className={`pk-window ${frame.shape === 'circle' ? 'is-circle' : ''} ${frame === ordered[0] ? 'is-primary' : ''}`}
                style={{
                  left: `${(view.x / asset.width) * 100}%`,
                  top: `${(view.y / asset.height) * 100}%`,
                  width: `${(view.width / asset.width) * 100}%`,
                  height: `${(view.height / asset.height) * 100}%`,
                }}
                aria-hidden="true"
              >
                <i style={{ top: `${index * 15}px` }}>{frame.label}</i>
              </span>
            )
          })}
          <button
            className="pk-handle"
            type="button"
            style={{ left: `${((driverX.x + driverX.width / 2) / asset.width) * 100}%`, top: `${((driverY.y + driverY.height / 2) / asset.height) * 100}%` }}
            aria-label={`${title} crop position ${Math.round(crop.x * 100)} percent across, ${Math.round(crop.y * 100)} percent down. Use arrow keys to move.`}
            onKeyDown={nudge}
          />
        </div>
      </div>
      <div className="pk-zoom">
        <label className="step-label" htmlFor={`${asset.id}-zoom`}>ZOOM</label>
        <input
          id={`${asset.id}-zoom`}
          className="range"
          type="range"
          min={MIN_ZOOM * 100}
          max={MAX_ZOOM * 100}
          step={5}
          value={Math.round(crop.zoom * 100)}
          onChange={(event) => onCrop(normalizeCrop({ ...crop, zoom: Number(event.currentTarget.value) / 100 }))}
        />
        <output htmlFor={`${asset.id}-zoom`}>{crop.zoom.toFixed(2)}×</output>
      </div>
    </div>
  )
}
