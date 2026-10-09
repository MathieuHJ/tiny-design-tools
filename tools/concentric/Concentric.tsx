import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from '@phosphor-icons/react'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { useCopy } from '../../src/useCopy'
import {
  LEVEL_OPTIONS,
  MAX_PADDING,
  MAX_RADIUS,
  VIEW,
  buildScene,
  clampSettings,
  concentricRadius,
  cssFor,
  fromHash,
  toHash,
  type Scene,
  type Settings,
} from './concentricMath'
import cardUrl from './fixtures/card.jpg?url'
import { LEVEL_STYLE, downloadProofFrame } from './exportProof'

function NestSvg({ scene, label }: { scene: Scene; label: string }) {
  const clip = useId()
  const inner = scene.boxes[scene.boxes.length - 1]
  return (
    <svg className="nest-svg" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} role="img" aria-label={label}>
      <defs>
        <clipPath id={clip}>
          <rect x={inner.x} y={inner.y} width={inner.width} height={inner.height} rx={inner.radius} ry={inner.radius} />
        </clipPath>
      </defs>
      {scene.boxes.map((box, index) => (
        <rect
          key={index}
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          rx={box.radius}
          ry={box.radius}
          fill={LEVEL_STYLE[index].fill}
          stroke={LEVEL_STYLE[index].stroke}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <image href={cardUrl} x={inner.x} y={inner.y} width={inner.width} height={inner.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
      {inner ? <rect x={inner.x} y={inner.y} width={inner.width} height={inner.height} rx={inner.radius} ry={inner.radius} fill="none" stroke={LEVEL_STYLE[scene.boxes.length - 1].stroke} vectorEffect="non-scaling-stroke" /> : null}
      {scene.guides.map((guide, index) => (
        <g key={index}>
          <circle className="nest-guide-halo" cx={guide.cx} cy={guide.cy} r={guide.r} vectorEffect="non-scaling-stroke" />
          <circle className="nest-guide" cx={guide.cx} cy={guide.cy} r={guide.r} vectorEffect="non-scaling-stroke" />
          <path className="nest-centre-halo" d={`M${guide.cx - 3} ${guide.cy}H${guide.cx + 3}M${guide.cx} ${guide.cy - 3}V${guide.cy + 3}`} vectorEffect="non-scaling-stroke" />
          <path className="nest-centre" d={`M${guide.cx - 3} ${guide.cy}H${guide.cx + 3}M${guide.cx} ${guide.cy - 3}V${guide.cy + 3}`} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      {[scene.cornerProbe, scene.sideProbe].map((probe, index) => probe ? (
        <line key={index} className="nest-probe" x1={probe.x1} y1={probe.y1} x2={probe.x2} y2={probe.y2} vectorEffect="non-scaling-stroke" />
      ) : null)}
    </svg>
  )
}

type FieldProps = {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
}

/** A slider with a typed value beside it. Typing is free until the field is left, then it snaps into range. */
function Field({ label, value, max, onChange }: FieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="nest-field">
      <div className="control-row">
        <label className="step-label" htmlFor={`${id}-number`}>{label}</label>
        <span className="nest-number">
          <input
            id={`${id}-number`}
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            step={1}
            value={draft ?? value}
            onChange={(event) => {
              setDraft(event.currentTarget.value)
              if (event.currentTarget.value !== '') onChange(Number(event.currentTarget.value))
            }}
            onBlur={() => setDraft(null)}
          />
          <span aria-hidden="true">PX</span>
        </span>
      </div>
      <input
        className="range"
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label={`${label} slider`}
        onChange={(event) => {
          setDraft(null)
          onChange(Number(event.currentTarget.value))
        }}
      />
    </div>
  )
}

function readInitial(): Settings {
  return typeof window === 'undefined' ? clampSettings({}) : fromHash(window.location.hash)
}

export function Concentric() {
  const [settings, setSettings] = useState<Settings>(readInitial)
  const cssCopy = useCopy('COPY')

  // replaceState does not fire this, so it only runs when the hash is changed from outside: a pasted link or Back.
  useEffect(() => {
    const onHashChange = () => setSettings(fromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const linkCopy = useCopy('COPY LINK')

  const update = (patch: Partial<Settings>) => {
    const next = clampSettings({ ...settings, ...patch })
    setSettings(next)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${toHash(next)}`)
  }

  const same = useMemo(() => buildScene(settings, 'same'), [settings])
  const concentric = useMemo(() => buildScene(settings, 'concentric'), [settings])
  const css = useMemo(() => cssFor(settings), [settings])
  const inner = concentricRadius(settings.radius, settings.padding, 1)
  const overflow = settings.radius - settings.padding < 0

  return (
    <main className="tool-shell">
      <ToolHeader id="concentric" note="LOCAL / NO UPLOAD" />

      <section className="tool-intro">
        <h1>Concentric</h1>
        <p>Nested corners that actually line up. Set the outer radius and the padding, and get the inner radius.</p>
      </section>

      <section className="workbench nest-workbench">
        <div className="stage-panel nest-preview">
          <div className="panel-heading">
            <div>
              <p className="step-label">PREVIEW / 320 × 200 PX</p>
              <h2>Same radius, against concentric</h2>
            </div>
          </div>
          <div className="nest-stage">
            <figure className="nest-panel">
              <figcaption>
                <span className="step-label">SAME RADIUS</span>
                {same.ratio !== null ? <span className="nest-ratio">CORNER GAP ×{same.ratio.toFixed(2)}</span> : null}
              </figcaption>
              <NestSvg scene={same} label={`Nested boxes that all use a ${settings.radius} pixel radius`} />
            </figure>
            <figure className="nest-panel">
              <figcaption>
                <span className="step-label">CONCENTRIC</span>
                {concentric.ratio !== null ? <span className="nest-ratio">CORNER GAP ×{concentric.ratio.toFixed(2)}</span> : null}
              </figcaption>
              <NestSvg scene={concentric} label={`Nested boxes whose radius shrinks by ${settings.padding} pixels at each level`} />
            </figure>
          </div>
          <p className="interaction-help">DASHED CIRCLES CONTINUE EACH ARC / BRIGHT LINES MEASURE THE GAP AT THE CORNER AND ON THE SIDE / WHEN THE CENTRES MEET THE GAP IS EVEN</p>

        </div>
        <div className="stage-panel nest-css-panel">
          <div className="nest-css__head">
            <p className="step-label">CSS</p>
            <div className="nest-actions">
              <button className="quiet-button" type="button" onClick={() => cssCopy.copy(css)}>{cssCopy.label}</button>
              <button className="quiet-button" type="button" onClick={() => linkCopy.copy(window.location.href)}>
                <Link size={12} weight="bold" aria-hidden="true" />
                {linkCopy.label}
              </button>
            </div>
          </div>
          <pre><code>{css}</code></pre>
        </div>

        <aside className="side-panel nest-controls" aria-label="Concentric controls">
          <div className="nest-answer">
            <p className="step-label">INNER RADIUS</p>
            <p className="readout" aria-live="polite">{inner}<span> PX</span></p>
            {overflow ? <p className="nest-note">PADDING IS LARGER THAN THE RADIUS, SO THE INNER CORNER IS SQUARE</p> : null}
          </div>

          <Field label="OUTER RADIUS" value={settings.radius} max={MAX_RADIUS} onChange={(radius) => update({ radius })} />
          <Field label="PADDING" value={settings.padding} max={MAX_PADDING} onChange={(padding) => update({ padding })} />

          <div>
            <p className="step-label" id="levels-label">LEVELS</p>
            <div className="segmented segmented--row" role="group" aria-labelledby="levels-label">
              {LEVEL_OPTIONS.map((levels) => (
                <button type="button" key={levels} aria-pressed={settings.levels === levels} onClick={() => update({ levels })}>
                  {levels}
                </button>
              ))}
            </div>
          </div>

          <button className="primary-button" type="button" onClick={() => void downloadProofFrame(settings)}>EXPORT PNG</button>
        </aside>
      </section>

      <ToolFooter id="concentric" />
    </main>
  )
}
