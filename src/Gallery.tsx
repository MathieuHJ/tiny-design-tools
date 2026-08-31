import proofFrameUrl from '../release/crop-proof-proof.png?url'

export function Gallery() {
  return (
    <main className="gallery-shell">
      <header className="gallery-header">
        <a className="repo-mark" href="./" aria-label="Tiny Design Tools home">TDT</a>
        <p>LOCAL / OPEN SOURCE</p>
      </header>
      <section className="gallery-hero">
        <h1>Tiny design tools.</h1>
        <p>Focused visual instruments. No account, upload, or setup.</p>
      </section>
      <section className="tool-index" aria-labelledby="released-tools">
        <div className="section-heading">
          <p className="eyebrow" id="released-tools">TOOLS / 01</p>
        </div>
        <a className="tool-card" href="./crop-proof/">
          <img className="tool-card__preview" src={proofFrameUrl} alt="" />
          <div>
            <p className="tool-number">01 / RESPONSIVE IMAGERY</p>
            <h2>Crop Proof</h2>
            <p>One focal point across six crops.</p>
          </div>
          <span className="tool-card__action">OPEN</span>
        </a>
      </section>
    </main>
  )
}
