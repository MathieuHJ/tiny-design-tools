import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsOutCardinal, DownloadSimple } from '@phosphor-icons/react'
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
  const surface = useRef<HTMLDivElement>(null)
  const bookmarkletUrl = useMemo(() => {
    const runtimeUrl = new URL(`${import.meta.env.BASE_URL}copy-stress/bookmarklet.js`, window.location.origin).href
    return `javascript:(()=>{const s=document.createElement('script');s.src='${runtimeUrl}';s.dataset.copyStress='1';document.head.append(s)})()`
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next = [...(surface.current?.querySelectorAll<HTMLElement>('[data-stress-target]') ?? [])]
        .map((element) => findingFor(element, mode))
        .filter((finding): finding is Finding => Boolean(finding))
      setFindings(next)
    })
    return () => cancelAnimationFrame(frame)
  }, [mode])

  const copyBookmarklet = async () => {
    await navigator.clipboard.writeText(bookmarkletUrl)
  }

  return (
    <main className="copy-shell">
      <header className="copy-header">
        <a className="copy-mark" href="../" aria-label="Back to Tiny Design Tools">TDT / 02</a>
        <p>LOCAL / BOOKMARKLET</p>
      </header>

      <section className="copy-intro">
        <h1>Copy Stress</h1>
        <p>Stress real interface copy. Make the broken elements visible.</p>
      </section>

      <section className="bookmarklet-gate" aria-labelledby="bookmarklet-heading">
        <div>
          <p className="copy-label">REAL PAGE</p>
          <h2 id="bookmarklet-heading">Run on the page you need to review.</h2>
          <p>Drag the launcher to your bookmarks bar, then open any page and run it. Nothing is uploaded.</p>
        </div>
        <div className="bookmarklet-actions">
          <a className="copy-primary" href={bookmarkletUrl}>STRESS PAGE</a>
          <button className="copy-secondary" type="button" onClick={copyBookmarklet}>COPY LAUNCHER</button>
        </div>
      </section>

      <section className="copy-workbench" aria-labelledby="simulation-heading">
        <div className="copy-source" ref={surface}>
          <div className="copy-panel-heading">
            <div>
              <p className="copy-label">SIMULATION</p>
              <h2 id="simulation-heading">A small interface under pressure.</h2>
            </div>
            <p>{modeLabels[mode]}</p>
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
          {findings.map((finding, index) => (
            <div className="copy-finding-rail" key={`${finding.selector}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{finding.kind}</strong>
              <em>{finding.label}</em>
            </div>
          ))}
        </div>

        <aside className="copy-controls" aria-label="Copy stress controls">
          <div>
            <p className="copy-label">STRESS MODE</p>
            <div className="copy-mode-list">
              {STRESS_MODES.map((item) => (
                <button className={item === mode ? 'is-selected' : ''} type="button" key={item} onClick={() => setMode(item)}>
                  {modeLabels[item]}
                </button>
              ))}
            </div>
          </div>
          <div className="copy-finding-summary">
            <p className="copy-label">FINDINGS</p>
            <strong>{String(findings.length).padStart(2, '0')}</strong>
            <span>{findings.length === 1 ? 'ELEMENT' : 'ELEMENTS'} NEED REVIEW</span>
          </div>
          <button className="copy-export" type="button" onClick={() => downloadCopyStressProof(mode, findings)}>
            <DownloadSimple size={15} weight="regular" aria-hidden="true" />
            EXPORT PNG
          </button>
        </aside>
      </section>

      <section className="copy-proof-note">
        <ArrowsOutCardinal size={17} weight="thin" aria-hidden="true" />
        <p>The bookmarklet checks regular page text only. Pages with strict script policies can block it.</p>
      </section>

      <footer className="copy-footer">
        <p>V0.1</p>
        <p>LOCAL / MIT</p>
      </footer>
    </main>
  )
}
