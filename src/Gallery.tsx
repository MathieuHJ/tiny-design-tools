import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import copyStressProof from '../release/copy-stress-proof.png?url'
import concentricProof from '../release/concentric-proof.png?url'
import cropProofProof from '../release/crop-proof-proof.png?url'
import squintProof from '../release/squint-proof.png?url'
import { AUTHOR, REPO_URL, TOOLS, VERSION, type ToolId } from './tools'

const PREVIEWS: Record<ToolId, string> = {
  'crop-proof': cropProofProof,
  'copy-stress': copyStressProof,
  squint: squintProof,
  concentric: concentricProof,
}

const PRINCIPLES = ['NO ACCOUNT', 'NO UPLOAD', 'NO ANALYTICS', 'MIT LICENSED']

export function Gallery() {
  return (
    <main className="gallery-shell" id="top">
      <a className="skip-link" href="#tools">SKIP TO TOOLS</a>
      <header className="gallery-header">
        <a className="repo-mark" href="./" aria-label="Tiny Design Tools home">TINY DESIGN TOOLS</a>
        <nav aria-label="Project">
          <a className="text-link" href={REPO_URL} target="_blank" rel="noreferrer">
            GITHUB <ArrowUpRight size={11} weight="bold" aria-hidden="true" />
          </a>
          <a className="text-link" href={AUTHOR.url} target="_blank" rel="noreferrer">
            PORTFOLIO <ArrowUpRight size={11} weight="bold" aria-hidden="true" />
          </a>
        </nav>
      </header>

      <section className="gallery-hero">
        <h1>Tiny design tools.</h1>
        <div>
          <p>Small instruments for visual work. Each takes real input, makes one thing visible, and exports proof you can share.</p>
          <ul className="principles" aria-label="Principles">
            {PRINCIPLES.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="tool-index" id="tools" aria-labelledby="released-tools">
        <div className="section-heading">
          <p className="eyebrow" id="released-tools">TOOLS / {String(TOOLS.length).padStart(2, '0')}</p>
        </div>
        <div className="tool-grid">
          {TOOLS.map((tool) => (
            <a className="tool-card" href={`./${tool.path}`} key={tool.id} aria-labelledby={`${tool.id}-name`}>
              <div className="tool-card__media">
                <img src={PREVIEWS[tool.id]} alt="" width={1280} height={640} loading="lazy" />
              </div>
              <div className="tool-card__body">
                <p className="tool-number">{tool.number} / {tool.category.toUpperCase()}</p>
                <h2 id={`${tool.id}-name`}>
                  {tool.name}
                  <ArrowRight className="tool-card__arrow" size={16} weight="regular" aria-hidden="true" />
                </h2>
                <p className="tool-card__tagline">{tool.tagline}</p>
                <dl className="tool-card__facts">
                  <div><dt>INPUT</dt><dd>{tool.input}</dd></div>
                  <div><dt>EXPORT</dt><dd>{tool.output}</dd></div>
                </dl>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="gallery-about" aria-labelledby="about-heading">
        <p className="eyebrow" id="about-heading">ABOUT</p>
        <p>
          Built by {AUTHOR.name}, a {AUTHOR.role.toLowerCase()}, for the checks design work keeps repeating. Files are decoded
          by your browser and never leave it. Source, issues and ideas are on GitHub.
        </p>
        <div className="gallery-about__links">
          <a className="secondary-button" href={REPO_URL} target="_blank" rel="noreferrer">
            VIEW SOURCE <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
          </a>
          <a className="secondary-button" href={AUTHOR.url} target="_blank" rel="noreferrer">
            MORE FROM {AUTHOR.name.toUpperCase()} <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="tool-footer">
        <p>TDT V{VERSION} / MIT</p>
        <a className="text-link" href="#top">BACK TO TOP</a>
      </footer>
    </main>
  )
}
