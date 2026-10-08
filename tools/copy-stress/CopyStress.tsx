import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ArrowsOutCardinal, BookmarkSimple, DownloadSimple } from '@phosphor-icons/react'
import { useCopy } from '../../src/useCopy'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { buildBookmarklet, runtimeUrlFor } from './bookmarklet'
import { downloadCopyStressProof } from './exportProof'
import { modeLabels, selectorFor, STRESS_MODES, stressText, type StressMode } from './stressMath'

type Finding = {
  label: string
  selector: string
  kind: 'EMPTY' | 'OVERFLOW'
}

const fixture = [
  { label: 'NAVIGATION', text: 'Design system', className: 'stress-nav-item' },
  { label: 'PROJECT NAME', text: 'Visual regression review', className: 'stress-title' },
  { label: 'ACTION', text: 'Share file', className: 'stress-button' },
  { label: 'STATUS', text: 'Ready for review', className: 'stress-status' },
  { label: 'METER', text: '14 components selected', className: 'stress-meter' },
]

function findingFor(element: HTMLElement, mode: StressMode): Finding | null {
  const label = element.dataset.label ?? 'COPY'
  const value = element.textContent?.trim() ?? ''
  const hasOverflow = element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
  if (mode === 'empty' && !value) return { label, selector: selectorFor(element), kind: 'EMPTY' }
  if (hasOverflow) return { label, selector: selectorFor(element), kind: 'OVERFLOW' }
  return null
}

export function CopyStress() {
  const [mode, setMode] = useState<StressMode>('expansion')
  const [findings, setFindings] = useState<Finding[]>([])
  const [dragHint, setDragHint] = useState(false)
  const launcherCopy = useCopy('COPY LAUNCHER')
  const surface = useRef<HTMLDivElement>(null)
  const launcher = useRef<HTMLAnchorElement>(null)
  const bookmarkletUrl = useMemo(
    () => buildBookmarklet(runtimeUrlFor(import.meta.env.BASE_URL, window.location.origin)),
    [],
  )

  // React 19 replaces any javascript: href passed as a prop with a throwing stub, which would
  // save a broken bookmark when the link is dragged. Setting the attribute directly keeps it intact.
  useEffect(() => {
    launcher.current?.setAttribute('href', bookmarkletUrl)
  }, [bookmarkletUrl])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next = [...(surface.current?.querySelectorAll<HTMLElement>('[data-stress-target]') ?? [])]
        .map((element) => findingFor(element, mode))
        .filter((finding): finding is Finding => Boolean(finding))
      setFindings(next)
    })
    return () => cancelAnimationFrame(frame)
  }, [mode])

  // Clicking the launcher here would stress this page, not the one the designer wants to review.
  const onLauncherClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setDragHint(true)
    window.setTimeout(() => setDragHint(false), 3200)
  }

  return (
    <main className="tool-shell">
      <ToolHeader id="copy-stress" note="LOCAL / BOOKMARKLET" />

      <section className="tool-intro">
        <h1>Copy Stress</h1>
        <p>Stress real interface copy. Make the broken elements visible.</p>
      </section>

      <section className="bookmarklet-gate" aria-labelledby="bookmarklet-heading">
        <div>
          <p className="label">REAL PAGE</p>
          <h2 id="bookmarklet-heading">Run it on the page you need to review.</h2>
          <ol className="bookmarklet-steps">
            <li><span>01</span>Drag <strong>STRESS PAGE</strong> to your bookmarks bar.</li>
            <li><span>02</span>Open the page you want to check.</li>
            <li><span>03</span>Click the bookmark. Nothing is uploaded.</li>
          </ol>
          <p className="bookmarklet-touch-note">Bookmarklets need a desktop browser. On a phone, send this page to your computer.</p>
        </div>
        <div className="bookmarklet-actions">
          <a
            ref={launcher}
            className="primary-button bookmarklet-launcher"
            draggable="true"
            onClick={onLauncherClick}
            aria-describedby="launcher-hint"
          >
            <BookmarkSimple size={14} weight="bold" aria-hidden="true" />
            STRESS PAGE
          </a>
          <button className="secondary-button" type="button" onClick={() => launcherCopy.copy(bookmarkletUrl)}>
            {launcherCopy.label}
          </button>
          <p className="bookmarklet-hint" id="launcher-hint" role="status">
            {dragHint ? 'DRAG IT TO YOUR BOOKMARKS BAR. CLICKING HERE ONLY STRESSES THIS PAGE.' : 'DRAG ME, OR COPY AND PASTE AS A BOOKMARK URL'}
          </p>
        </div>
      </section>

      <section className="workbench copy-workbench" aria-labelledby="simulation-heading">
        <div className="stage-panel copy-source" ref={surface}>
          <div className="panel-heading">
            <div>
              <p className="step-label">SIMULATION</p>
              <h2 id="simulation-heading">A small interface under pressure.</h2>
            </div>
            <p className="copy-mode-readout">{modeLabels[mode]}</p>
          </div>
          <div className={`stress-fixture stress-fixture--${mode}`} dir={mode === 'rtl' ? 'rtl' : 'ltr'}>
            <div className="stress-fixture__bar">
              <span className="stress-logo">ACME</span>
              <span className="stress-nav-item" data-stress-target data-label="NAVIGATION">{stressText(fixture[0].text, mode)}</span>
              <span className="stress-avatar" aria-hidden="true" />
            </div>
            <div className="stress-fixture__body">
              <p className="stress-kicker">PROJECT / 18</p>
              <h3 className="stress-title" data-stress-target data-label="PROJECT NAME">{stressText(fixture[1].text, mode)}</h3>
              <div className="stress-card">
                <p className="stress-status" data-stress-target data-label="STATUS">{stressText(fixture[3].text, mode)}</p>
                <button className="stress-button" data-stress-target data-label="ACTION" type="button">{stressText(fixture[2].text, mode)}</button>
                <p className="stress-meter" data-stress-target data-label="METER">{stressText(fixture[4].text, mode)}</p>
              </div>
            </div>
          </div>
          <div aria-live="polite">
            {findings.map((finding, index) => (
              <div className="copy-finding-rail" key={`${finding.selector}-${index}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{finding.kind}</strong>
                <em>{finding.label}</em>
              </div>
            ))}
          </div>
        </div>

        <aside className="side-panel copy-controls" aria-label="Copy stress controls">
          <div>
            <p className="step-label" id="stress-mode-label">STRESS MODE</p>
            <div className="segmented copy-mode-list" role="group" aria-labelledby="stress-mode-label">
              {STRESS_MODES.map((item) => (
                <button type="button" key={item} aria-pressed={item === mode} onClick={() => setMode(item)}>
                  {modeLabels[item]}
                </button>
              ))}
            </div>
          </div>
          <div className="finding-card copy-finding-summary">
            <div>
              <p>FINDINGS</p>
              <strong className="copy-finding-count">{String(findings.length).padStart(2, '0')}</strong>
              <span>{findings.length === 1 ? 'ELEMENT NEEDS' : 'ELEMENTS NEED'} REVIEW</span>
            </div>
          </div>
          <button className="primary-button" type="button" onClick={() => downloadCopyStressProof(mode, findings)}>
            <DownloadSimple size={15} weight="regular" aria-hidden="true" />
            EXPORT PNG
          </button>
        </aside>
      </section>

      <section className="copy-proof-note">
        <ArrowsOutCardinal size={17} weight="thin" aria-hidden="true" />
        <p>The bookmarklet checks regular page text only. Pages with strict script policies can block it.</p>
      </section>

      <ToolFooter id="copy-stress" />
    </main>
  )
}
