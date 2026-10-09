import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { downloadBlob, downloadCanvas } from '../../src/download'
import { ACCEPT_ATTRIBUTE, validateLocalImage } from '../../src/imageFile'
import { ToolFooter, ToolHeader } from '../../src/ToolChrome'
import { useImageIntake } from '../../src/useImageIntake'
import { FORMAT_TYPES, blobFromUrl, buildZip, loadAsset, mockFilename, releaseAsset, renderBoard, renderMock, type ImageFormat } from './assets'
import { CropPad, type CropFrame } from './CropPad'
import type { Crop } from './cropMath'
import { DEMO, DEMO_FEED } from './demo'
import { MAX_FEED, moveItem, removeItem, roomFor, selectionAfterMove, selectionAfterRemove } from './feed'
import { EMPTY_PROFILE, type Asset, type ProfileData, type Theme } from './model'
import { BANNER_FRAMES, CHECKED_ON, PLATFORMS, PLATFORM_IDS, limitStatus, type Confidence, type PlatformId } from './platforms'
import { PreviewCanvas, type View } from './PreviewCanvas'
import { clearProject, loadProject, saveProject, type SavedAsset, type SavedProject } from './storage'

const SHORT: Record<PlatformId, string> = { instagram: 'IG', tiktok: 'TT', facebook: 'FB', x: 'X' }
const AVATAR_FRAMES: CropFrame[] = [{ id: 'avatar', label: 'AVATAR', width: 1, height: 1, shape: 'circle', primary: true }]
const BANNER_CROP_FRAMES: CropFrame[] = BANNER_FRAMES.map((frame) => ({ id: frame.id, label: frame.label, width: frame.width, height: frame.height, shape: 'rect', primary: frame.primary }))
const TILE_FRAMES: CropFrame[] = [
  { id: 'tile', label: 'GRID TILE 3:4', width: 3, height: 4, shape: 'rect', primary: true },
  { id: 'safe', label: 'TIKTOK SQUARE-SAFE', width: 1, height: 1, shape: 'rect' },
]
const CONFIDENCE_LABEL: Record<Confidence, string> = { official: 'OFFICIAL', reported: 'REPORTED', disputed: 'DISPUTED' }

type Slot = 'avatar' | 'banner'
type SaveState = 'idle' | 'pending' | 'saved' | 'failed'

const isEmpty = (data: ProfileData) =>
  !data.avatar && !data.banner && data.feed.length === 0 && !data.displayName && !data.handle && !data.bio && !data.link

const packAsset = (asset: Asset): SavedAsset => ({ name: asset.name, blob: asset.blob, crop: asset.crop })

export function ProfileKit() {
  const [data, setData] = useState<ProfileData>(EMPTY_PROFILE)
  // The four-up board is too small to read on a phone, so start on one platform there.
  const [view, setView] = useState<View>(() => (window.matchMedia('(max-width: 560px)').matches ? 'instagram' : 'all'))
  const [format, setFormat] = useState<ImageFormat>('png')
  const [selected, setSelected] = useState<number | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState<SaveState>('idle')
  const [demoSeed, setDemoSeed] = useState<ProfileData | null>(null)
  const [seeding, setSeeding] = useState(false)
  const latest = useRef(data)
  const touched = useRef(false)
  const ids = useId()

  useEffect(() => {
    latest.current = data
  }, [data])

  const fail = (message: string) => setNotice(message)

  const releaseAll = (profile: ProfileData) => {
    releaseAsset(profile.avatar)
    releaseAsset(profile.banner)
    profile.feed.forEach(releaseAsset)
  }

  useEffect(() => () => releaseAll(latest.current), [])

  /** The demo profile: photographs, text, and nine posts. Built fresh each time so each use owns its object URLs. */
  const buildDemo = useCallback(async (theme: Theme): Promise<ProfileData> => {
    const fromUrl = async (url: string, name: string) => loadAsset(await blobFromUrl(url), name)
    const [avatar, banner, ...feed] = await Promise.all([
      fromUrl(DEMO.avatarUrl, DEMO.avatarName),
      fromUrl(DEMO.bannerUrl, DEMO.bannerName),
      ...DEMO_FEED.map((post) => fromUrl(post.url, post.name)),
    ])
    return { avatar, banner, feed, theme, displayName: DEMO.displayName, handle: DEMO.handle, bio: DEMO.bio, link: DEMO.link }
  }, [])

  // Restore what was kept in this browser. If the user has already started, or this run was superseded, drop it.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const project = await loadProject()
      if (project && !cancelled && !touched.current) {
        const restore = (asset: SavedAsset | null) => (asset ? loadAsset(asset.blob, asset.name, asset.crop).catch(() => null) : Promise.resolve(null))
        const [avatar, banner, ...feed] = await Promise.all([restore(project.avatar), restore(project.banner), ...project.feed.map(restore)])
        const restored: ProfileData = {
          displayName: project.displayName,
          handle: project.handle,
          bio: project.bio,
          link: project.link,
          theme: project.theme,
          avatar,
          banner,
          feed: feed.filter((asset): asset is Asset => asset !== null),
        }
        if (cancelled || touched.current) releaseAll(restored)
        else {
          setData(restored)
          setFormat(project.format)
          setSaved('saved')
        }
      }
      if (!project && !cancelled && !touched.current) {
        // A first visit opens on the demo, so the page is never an empty form. It is not saved unless it is edited.
        setSeeding(true)
        try {
          const demo = await buildDemo('dark')
          if (cancelled || touched.current) releaseAll(demo)
          else {
            setData(demo)
            setDemoSeed(demo)
          }
        } catch {
          // The demo is a courtesy. The empty tool still works.
        }
        setSeeding(false)
      }
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [buildDemo])

  // Keep the profile in this browser, a moment after the last change, and straight away if the tab is hidden.
  const formatRef = useRef(format)
  useEffect(() => {
    formatRef.current = format
  }, [format])

  const persist = useCallback(async (profile: ProfileData, imageFormat: ImageFormat) => {
    if (isEmpty(profile)) {
      await clearProject()
      setSaved('idle')
      return
    }
    const project: SavedProject = {
      version: 1,
      displayName: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      link: profile.link,
      theme: profile.theme,
      format: imageFormat,
      avatar: profile.avatar && packAsset(profile.avatar),
      banner: profile.banner && packAsset(profile.banner),
      feed: profile.feed.map(packAsset),
    }
    setSaved((await saveProject(project)) ? 'saved' : 'failed')
  }, [])

  useEffect(() => {
    if (!ready || !touched.current) return
    if (!isEmpty(data)) setSaved((state) => (state === 'failed' ? state : 'pending'))
    const timer = window.setTimeout(() => void persist(data, format), 400)
    return () => window.clearTimeout(timer)
  }, [data, format, ready, persist])

  useEffect(() => {
    if (!ready) return
    const onHide = () => {
      if (document.visibilityState === 'hidden' && touched.current) void persist(latest.current, formatRef.current)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [ready, persist])

  /** Validate and decode one file. A file that cannot be used comes back with the reason, never as an exception. */
  const readFile = useCallback(async (file: File): Promise<{ asset: Asset | null; error: string | null }> => {
    const error = validateLocalImage(file)
    if (error) return { asset: null, error }
    try {
      return { asset: await loadAsset(file, file.name || 'Pasted image'), error: null }
    } catch {
      return { asset: null, error: 'That image could not be read. Try another file.' }
    }
  }, [])

  const setSlot = useCallback((slot: Slot, next: Asset | null) => {
    touched.current = true
    setData((current) => {
      releaseAsset(current[slot])
      return { ...current, [slot]: next }
    })
  }, [])

  /**
   * Load a batch of files into the slots and the feed, then say once what happened: what was skipped and why,
   * and what did not fit. Every path in goes through here, so a bad file in a batch is never swallowed.
   */
  const ingest = useCallback(async (plan: { avatar?: File; banner?: File; feed: File[]; dropped: number }) => {
    touched.current = true
    const [avatar, banner, ...posts] = await Promise.all([
      plan.avatar ? readFile(plan.avatar) : null,
      plan.banner ? readFile(plan.banner) : null,
      ...plan.feed.map(readFile),
    ])
    const errors = [avatar, banner, ...posts].flatMap((result) => (result?.error ? [result.error] : []))
    const room = MAX_FEED - latest.current.feed.length
    const loaded = posts.flatMap((result) => (result.asset ? [result.asset] : []))
    loaded.slice(Math.max(0, room)).forEach(releaseAsset)
    if (avatar?.asset) releaseAsset(latest.current.avatar)
    if (banner?.asset) releaseAsset(latest.current.banner)
    setData((current) => ({
      ...current,
      avatar: avatar?.asset ?? current.avatar,
      banner: banner?.asset ?? current.banner,
      feed: [...current.feed, ...loaded.slice(0, Math.max(0, room))],
    }))
    const skipped = errors.length > 1 ? `${errors.length} files were skipped. ${[...new Set(errors)].join(' ')}` : errors[0]
    const parts = [skipped, plan.dropped ? `The feed holds ${MAX_FEED} posts. ${plan.dropped} ${plan.dropped === 1 ? 'image was' : 'images were'} left out.` : undefined]
    setNotice(parts.filter(Boolean).join(' ') || null)
  }, [readFile])

  const takeInto = useCallback((slot: Slot, file: File) => ingest({ [slot]: file, feed: [], dropped: 0 }), [ingest])

  const addToFeed = useCallback((files: File[]) => {
    const { accepted, dropped } = roomFor(latest.current.feed.length, files.length)
    return ingest({ feed: files.slice(0, accepted), dropped })
  }, [ingest])

  // A drop or paste anywhere fills the avatar, then the banner, then the feed. Dropping on a slot fills that slot.
  const takeAnywhere = useCallback((files: File[]) => {
    const queue = [...files]
    const current = latest.current
    const avatar = current.avatar ? undefined : queue.shift()
    const banner = current.banner ? undefined : queue.shift()
    const { accepted, dropped } = roomFor(current.feed.length, queue.length)
    return ingest({ avatar, banner, feed: queue.slice(0, accepted), dropped })
  }, [ingest])
  const isDragging = useImageIntake((file) => void takeAnywhere([file]), (files) => void takeAnywhere(files))

  const setCrop = (slot: Slot, crop: Crop) => {
    touched.current = true
    setData((current) => (current[slot] ? { ...current, [slot]: { ...current[slot]!, crop } } : current))
  }
  const setFeedCrop = (index: number, crop: Crop) => {
    touched.current = true
    setData((current) => ({ ...current, feed: current.feed.map((asset, position) => (position === index ? { ...asset, crop } : asset)) }))
  }
  const text = (key: 'displayName' | 'handle' | 'bio' | 'link') => (value: string) => {
    touched.current = true
    setData((current) => ({ ...current, [key]: value }))
  }
  const setTheme = (theme: Theme) => setData((current) => ({ ...current, theme }))

  const moveFeed = (from: number, to: number) => {
    touched.current = true
    setData((current) => ({ ...current, feed: moveItem(current.feed, from, to) }))
    setSelected((current) => selectionAfterMove(current, from, to))
  }
  const removeFeed = (index: number) => {
    touched.current = true
    const remaining = latest.current.feed.length - 1
    setData((current) => {
      releaseAsset(current.feed[index])
      return { ...current, feed: removeItem(current.feed, index) }
    })
    setSelected((current) => selectionAfterRemove(current, index, remaining))
  }
  const replaceFeed = async (index: number, file: File) => {
    const { asset, error } = await readFile(file)
    if (!asset) return fail(error ?? 'That image could not be read.')
    setNotice(null)
    touched.current = true
    setData((current) => {
      releaseAsset(current.feed[index])
      return { ...current, feed: current.feed.map((existing, position) => (position === index ? asset : existing)) }
    })
  }
  const clearFeed = () => {
    touched.current = true
    setData((current) => {
      current.feed.forEach(releaseAsset)
      return { ...current, feed: [] }
    })
    setSelected(null)
  }

  const loadDemo = async () => {
    try {
      const demo = await buildDemo(latest.current.theme)
      // Asked for by name, so it is the user's profile now: it is kept, and labelled as kept.
      touched.current = true
      releaseAll(latest.current)
      setData(demo)
      setSelected(null)
      setNotice(null)
    } catch {
      fail('The demo could not be loaded.')
    }
  }

  const clearAll = () => {
    touched.current = true
    setData((current) => {
      releaseAll(current)
      return { ...EMPTY_PROFILE, theme: current.theme }
    })
    setSelected(null)
    setNotice(null)
    void clearProject()
    setSaved('idle')
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
  const files = [data.avatar && 'avatar', data.banner && 'banner'].filter(Boolean) as string[]
  const feed = data.feed
  const current = selected !== null ? feed[selected] : undefined

  const tileDrag = (index: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
      setDragFrom(index)
    },
    onDragOver: (event: DragEvent) => {
      if (dragFrom === null) return
      event.preventDefault()
      setDragOver(index)
    },
    onDrop: (event: DragEvent) => {
      if (dragFrom === null) return
      event.preventDefault()
      moveFeed(dragFrom, index)
      setDragFrom(null)
      setDragOver(null)
    },
    onDragEnd: () => {
      setDragFrom(null)
      setDragOver(null)
    },
  })

  return (
    <main className="tool-shell">
      <ToolHeader id="profile-kit" note="LOCAL / NO UPLOAD" />

      <section className="tool-intro">
        <h1>Profile Kit</h1>
        <p>See your avatar, banner, bio and feed on Instagram, TikTok, Facebook and X before you post. Export the assets and a board.</p>
      </section>

      {isDragging ? <div className="drop-overlay" aria-hidden="true">DROP IMAGES: AVATAR, THEN BANNER, THEN FEED</div> : null}

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
            <p className="pk-saved" role="status">
              {seeding ? 'LOADING DEMO' : data === demoSeed ? 'DEMO / CHANGE ANYTHING, OR CLEAR TO START EMPTY' : saved === 'saved' ? 'KEPT IN THIS BROWSER' : saved === 'pending' ? 'SAVING' : saved === 'failed' ? 'NOT KEPT / STORAGE FULL OR BLOCKED' : ''}
            </p>
          </div>
          {notice ? <p className="field-error" role="alert">{notice}</p> : null}

          <section className="pk-section" aria-labelledby={`${ids}-profile`}>
            <h2 className="sr-only" id={`${ids}-profile`}>Profile</h2>
            <CropPad
              title="AVATAR"
              asset={data.avatar}
              frames={AVATAR_FRAMES}
              empty="Drop a square-ish photo or logo"
              onFile={(file) => void takeInto('avatar', file)}
              onCrop={(crop) => setCrop('avatar', crop)}
              onRemove={() => setSlot('avatar', null)}
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
              onFile={(file) => void takeInto('banner', file)}
              onCrop={(crop) => setCrop('banner', crop)}
              onRemove={() => setSlot('banner', null)}
            />
          </section>

          <section className="pk-section pk-feed" aria-label="Feed">
            <div className="pk-pad__head">
              <p className="step-label">FEED / INSTAGRAM AND TIKTOK / {feed.length} {feed.length === 1 ? 'POST' : 'POSTS'}</p>
              <div className="pk-pad__actions">
                <label className="quiet-button">
                  ADD IMAGES
                  <input type="file" accept={ACCEPT_ATTRIBUTE} multiple onChange={(event) => {
                    const picked = [...(event.currentTarget.files ?? [])]
                    event.currentTarget.value = ''
                    if (picked.length) void addToFeed(picked)
                  }} />
                </label>
                {feed.length ? <button className="quiet-button" type="button" onClick={clearFeed}>CLEAR FEED</button> : null}
              </div>
            </div>

            {feed.length === 0 ? (
              <label
                className="pk-drop"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const dropped = [...event.dataTransfer.files]
                  if (dropped.length) void addToFeed(dropped)
                }}
              >
                <span>Drop post images here, in the order you want them</span>
                <span className="pk-drop__action">CHOOSE FILES</span>
                <input type="file" accept={ACCEPT_ATTRIBUTE} multiple onChange={(event) => {
                  const picked = [...(event.currentTarget.files ?? [])]
                  event.currentTarget.value = ''
                  if (picked.length) void addToFeed(picked)
                }} />
              </label>
            ) : (
              <>
                <ol className="pk-tiles" aria-label="Posts, newest first">
                  {feed.map((asset, index) => (
                    <li key={asset.id}>
                      <button
                        type="button"
                        className={`pk-tile ${selected === index ? 'is-selected' : ''} ${dragOver === index && dragFrom !== index ? 'is-over' : ''} ${dragFrom === index ? 'is-dragging' : ''}`}
                        aria-pressed={selected === index}
                        aria-label={`Post ${index + 1}, ${asset.name}`}
                        onClick={() => setSelected(selected === index ? null : index)}
                        {...tileDrag(index)}
                      >
                        <img
                          src={asset.url}
                          alt=""
                          draggable={false}
                          style={{
                            objectPosition: `${asset.crop.x * 100}% ${asset.crop.y * 100}%`,
                            transformOrigin: `${asset.crop.x * 100}% ${asset.crop.y * 100}%`,
                            transform: `scale(${asset.crop.zoom})`,
                          } as CSSProperties}
                        />
                        <span>{String(index + 1).padStart(2, '0')}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <p className="pk-hint">FIRST TILE = NEWEST POST. DRAG TILES TO REORDER, OR SELECT ONE.</p>
                {current && selected !== null ? (
                  <div className="pk-selected">
                    <div className="pk-tilebar" role="group" aria-label={`Post ${selected + 1}`}>
                      <button className="quiet-button" type="button" disabled={selected === 0} onClick={() => moveFeed(selected, selected - 1)}>EARLIER</button>
                      <button className="quiet-button" type="button" disabled={selected === feed.length - 1} onClick={() => moveFeed(selected, selected + 1)}>LATER</button>
                    </div>
                    <CropPad
                      key={current.id}
                      title={`POST ${String(selected + 1).padStart(2, '0')}`}
                      asset={current}
                      frames={TILE_FRAMES}
                      empty=""
                      onFile={(file) => void replaceFeed(selected, file)}
                      onCrop={(crop) => setFeedCrop(selected, crop)}
                      onRemove={() => removeFeed(selected)}
                    />
                  </div>
                ) : null}
              </>
            )}
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
              The ZIP has the board, one mock per platform{files.length ? `, and each ${files.join(' and ')} at its platform size (${FORMAT_TYPES[format].extension.toUpperCase()})` : ''}.
              {files.length ? '' : ' Add an avatar or banner to include the sized files.'}
            </p>
            <p className="pk-hint">Your profile is kept in this browser so a refresh does not lose it. It never leaves your device, and CLEAR removes it.</p>
          </section>
        </aside>
      </section>

      <ToolFooter id="profile-kit" />
    </main>
  )
}
