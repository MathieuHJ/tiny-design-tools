import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { downloadBlob, downloadCanvas } from '../../src/download'
import { validateLocalImage } from '../../src/imageFile'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { useImageIntake } from '../../src/useImageIntake'
import { FORMAT_TYPES, buildZip, loadAsset, mockFilename, releaseAsset, renderBoard, renderMock, type ImageFormat } from './assets'
import { CropPad, type CropFrame } from './CropPad'
import type { Crop } from './cropMath'
import { DEMO } from './demo'
import { EMPTY_PROFILE, type Asset, type ProfileData, type Theme } from './model'
import { BANNER_FRAMES, CHECKED_ON, PLATFORMS, PLATFORM_IDS, limitStatus, type Confidence, type PlatformId } from './platforms'
import { PreviewCanvas, type View } from './PreviewCanvas'

const SHORT: Record<PlatformId, string> = { instagram: 'IG', tiktok: 'TT', facebook: 'FB', x: 'X' }
const AVATAR_FRAMES: CropFrame[] = [{ id: 'avatar', label: 'AVATAR', width: 1, height: 1, shape: 'circle', primary: true }]
const BANNER_CROP_FRAMES: CropFrame[] = BANNER_FRAMES.map((frame) => ({ id: frame.id, label: frame.label, width: frame.width, height: frame.height, shape: 'rect', primary: frame.primary }))
const CONFIDENCE_LABEL: Record<Confidence, string> = { official: 'OFFICIAL', reported: 'REPORTED', disputed: 'DISPUTED' }

type Slot = 'avatar' | 'banner'

export function ProfileKit() {
  const [data, setData] = useState<ProfileData>(EMPTY_PROFILE)
  // The four-up board is too small to read on a phone, so start on one platform there.
  const [view, setView] = useState<View>(() => (window.matchMedia('(max-width: 560px)').matches ? 'instagram' : 'all'))
  const [format, setFormat] = useState<ImageFormat>('png')
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const latest = useRef(data)
  const ids = useId()

  useEffect(() => {
    latest.current = data
  }, [data])

  useEffect(() => () => {
    releaseAsset(latest.current.avatar)
    releaseAsset(latest.current.banner)
  }, [])

  const setAsset = useCallback((slot: Slot, next: Asset | null) => {
    setData((current) => {
      releaseAsset(current[slot])
      return { ...current, [slot]: next }
    })
  }, [])

  const fail = (message: string) => setNotice(message)

  const takeFile = useCallback(async (slot: Slot, file: File) => {
    const error = validateLocalImage(file)
    if (error) return fail(error)
    try {
      setAsset(slot, await loadAsset(URL.createObjectURL(file), file.name || 'Pasted image', true))
      setNotice(null)
    } catch {
      fail('That image could not be read. Try another file.')
    }
  }, [setAsset])

  // A drop or paste anywhere fills the avatar first, then the banner. Dropping on a slot fills that slot.
  const takeAnywhere = useCallback((file: File) => {
    const current = latest.current
    if (!current.avatar) void takeFile('avatar', file)
    else if (!current.banner) void takeFile('banner', file)
    else fail('Avatar and banner are both set. Use REPLACE on the one to change.')
  }, [takeFile])
  const isDragging = useImageIntake(takeAnywhere)

  const setCrop = (slot: Slot, crop: Crop) => setData((current) => (current[slot] ? { ...current, [slot]: { ...current[slot]!, crop } } : current))
  const text = (key: 'displayName' | 'handle' | 'bio' | 'link') => (value: string) => setData((current) => ({ ...current, [key]: value }))
  const setTheme = (theme: Theme) => setData((current) => ({ ...current, theme }))

  const loadDemo = async () => {
    try {
      const [avatar, banner] = await Promise.all([loadAsset(DEMO.avatarUrl, 'Demo avatar', false), loadAsset(DEMO.bannerUrl, 'Demo banner', false)])
      setData((current) => {
        releaseAsset(current.avatar)
        releaseAsset(current.banner)
        return { ...current, avatar, banner, displayName: DEMO.displayName, handle: DEMO.handle, bio: DEMO.bio, link: DEMO.link }
      })
      setNotice(null)
    } catch {
      fail('The demo could not be loaded.')
    }
  }

  const clearAll = () => {
    setData((current) => {
      releaseAsset(current.avatar)
      releaseAsset(current.banner)
      return { ...EMPTY_PROFILE, theme: current.theme }
    })
    setNotice(null)
  }

  const exportBoard = () => downloadCanvas(renderBoard(data), 'profile-kit-board.png')
  const exportMock = () => {
    if (view !== 'all') downloadCanvas(renderMock(view, data), mockFilename(view))
  }
  const exportZip = async () => {
    setBusy(true)
    try {
      downloadBlob(await buildZip(data, format), 'profile-kit.zip')
      setNotice(null)
    } catch {
      fail('The export could not be built in this browser.')
    } finally {
      setBusy(false)
    }
  }

  const warnings = useMemo(() => {
    const out: string[] = []
    for (const id of PLATFORM_IDS) {
      const platform = PLATFORMS[id]
      const name = limitStatus(data.displayName, platform.displayName)
      const handle = limitStatus(data.handle.replace(/^@/, ''), platform.handle)
      if (name?.over) out.push(`${SHORT[id]} NAME ${name.used} / ${name.max}`)
      if (handle?.over) out.push(`${SHORT[id]} HANDLE ${handle.used} / ${handle.max}`)
    }
    return out
  }, [data.displayName, data.handle])

  const shown = view === 'all' ? PLATFORM_IDS : [view]
  const files = [data.avatar && 'avatars', data.banner && 'banners'].filter(Boolean).length

  return (
    <main className="tool-shell">
      <ToolHeader id="profile-kit" note="LOCAL / NO UPLOAD" />

      <section className="tool-intro">
        <h1>Profile Kit</h1>
        <p>See your avatar, banner and bio on Instagram, TikTok, Facebook and X before you post. Export the assets and a board.</p>
      </section>

      {isDragging ? <div className="drop-overlay" aria-hidden="true">DROP IMAGE: AVATAR FIRST, THEN BANNER</div> : null}

      <section className="workbench pk-workbench">
        <div className="stage-panel pk-stage">
          <div className="pk-stage__inner">
            <div className="pk-bar">
              <div className="pk-tabs segmented" role="group" aria-label="Platform">
                <button type="button" aria-pressed={view === 'all'} onClick={() => setView('all')}>ALL</button>
                {PLATFORM_IDS.map((id) => (
                  <button type="button" key={id} aria-label={PLATFORMS[id].name.toUpperCase()} aria-pressed={view === id} onClick={() => setView(id)}>
                    <span className="pk-long">{PLATFORMS[id].name.toUpperCase()}</span>
                    <span className="pk-short" aria-hidden="true">{SHORT[id]}</span>
                  </button>
                ))}
              </div>
              <div className="segmented segmented--row pk-theme" role="group" aria-label="Screen theme">
                <button type="button" aria-pressed={data.theme === 'dark'} onClick={() => setTheme('dark')}>DARK</button>
                <button type="button" aria-pressed={data.theme === 'light'} onClick={() => setTheme('light')}>LIGHT</button>
              </div>
            </div>

            <PreviewCanvas view={view} data={data} />

            <details className="pk-specs">
              <summary>SPECS / CHECKED {CHECKED_ON.toUpperCase()}</summary>
              <p className="pk-specs__note">Platforms change these without notice. Only X publishes its numbers; the rest are what independent guides agree on, and disputed values are marked.</p>
              {shown.map((id) => (
                <div key={id} className="pk-specs__platform">
                  <p className="step-label">{PLATFORMS[id].name}</p>
                  <ul>
                    {PLATFORMS[id].specs.map((row) => (
                      <li key={row.label}>
                        <span>{row.label}</span>
                        <span>{row.value}{row.note ? <small>{row.note}</small> : null}</span>
                        <em className={`pk-confidence is-${row.confidence}`}>{CONFIDENCE_LABEL[row.confidence]}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          </div>
        </div>

        <aside className="side-panel pk-editor" aria-label="Profile Kit editor">
          <div className="pk-actions">
            <button className="quiet-button" type="button" onClick={loadDemo}>LOAD DEMO</button>
            <button className="quiet-button" type="button" onClick={clearAll}>CLEAR</button>
          </div>
          {notice ? <p className="field-error" role="alert">{notice}</p> : null}

          <section className="pk-section" aria-labelledby={`${ids}-profile`}>
            <h2 className="sr-only" id={`${ids}-profile`}>Profile</h2>
            <CropPad
              title="AVATAR"
              asset={data.avatar}
              frames={AVATAR_FRAMES}
              empty="Drop a square-ish photo or logo"
              onFile={(file) => void takeFile('avatar', file)}
              onCrop={(crop) => setCrop('avatar', crop)}
              onRemove={() => setAsset('avatar', null)}
            />
            <div className="pk-field">
              <label className="step-label" htmlFor={`${ids}-name`}>NAME</label>
              <input id={`${ids}-name`} type="text" value={data.displayName} placeholder="Your name" onChange={(event) => text('displayName')(event.currentTarget.value)} />
            </div>
            <div className="pk-field">
              <label className="step-label" htmlFor={`${ids}-handle`}>HANDLE</label>
              <input id={`${ids}-handle`} type="text" value={data.handle} placeholder="yourhandle" autoCapitalize="none" spellCheck={false} onChange={(event) => text('handle')(event.currentTarget.value)} />
            </div>
            {warnings.length ? <p className="pk-warn">{warnings.join(' / ')}</p> : null}
            <div className="pk-field">
              <label className="step-label" htmlFor={`${ids}-bio`}>BIO</label>
              <textarea id={`${ids}-bio`} rows={4} value={data.bio} placeholder="What you do, in a line or two" onChange={(event) => text('bio')(event.currentTarget.value)} />
              <ul className="pk-counters" aria-label="Bio length against each platform">
                {PLATFORM_IDS.map((id) => {
                  const status = limitStatus(data.bio, PLATFORMS[id].bio)!
                  return (
                    <li key={id} className={status.over ? 'is-over' : ''} title={PLATFORMS[id].bio.note}>
                      <span>{SHORT[id]}</span>
                      <b>{status.used}/{status.max}</b>
                      {status.over ? <em>OVER</em> : null}
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="pk-field">
              <label className="step-label" htmlFor={`${ids}-link`}>LINK</label>
              <input id={`${ids}-link`} type="text" value={data.link} placeholder="yoursite.com" autoCapitalize="none" spellCheck={false} onChange={(event) => text('link')(event.currentTarget.value)} />
            </div>
          </section>

          <section className="pk-section" aria-label="Banner">
            <CropPad
              title="BANNER / FACEBOOK AND X"
              asset={data.banner}
              frames={BANNER_CROP_FRAMES}
              empty="Drop a wide image"
              onFile={(file) => void takeFile('banner', file)}
              onCrop={(crop) => setCrop('banner', crop)}
              onRemove={() => setAsset('banner', null)}
            />
          </section>

          <section className="pk-section pk-export" aria-label="Export">
            <div className="pk-field">
              <p className="step-label" id={`${ids}-format`}>ASSET FILES</p>
              <div className="segmented segmented--row" role="group" aria-labelledby={`${ids}-format`}>
                {(['png', 'jpeg'] as const).map((item) => (
                  <button type="button" key={item} aria-pressed={format === item} onClick={() => setFormat(item)}>{item === 'png' ? 'PNG' : 'JPEG'}</button>
                ))}
              </div>
              <p className="pk-hint">JPEG keeps photographic banners small. X limits profile photos to 2 MB.</p>
            </div>
            <button className="primary-button" type="button" onClick={exportBoard}>EXPORT BOARD PNG</button>
            <button className="secondary-button" type="button" onClick={exportZip} disabled={busy}>
              <DownloadSimple size={14} weight="regular" aria-hidden="true" />
              {busy ? 'BUILDING' : 'EXPORT ALL FILES (ZIP)'}
            </button>
            {view !== 'all' ? (
              <button className="quiet-button" type="button" onClick={exportMock}>EXPORT {PLATFORMS[view].name.toUpperCase()} MOCK PNG</button>
            ) : null}
            <p className="pk-hint">
              The ZIP has the board, one mock per platform{files ? `, and each ${[data.avatar && 'avatar', data.banner && 'banner'].filter(Boolean).join(' and ')} at its platform size (${FORMAT_TYPES[format].extension.toUpperCase()})` : ''}.
              {files ? '' : ' Add an avatar or banner to include the sized files.'}
            </p>
          </section>
        </aside>
      </section>

      <ToolFooter id="profile-kit" />
    </main>
  )
}
