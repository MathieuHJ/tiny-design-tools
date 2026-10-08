import { useEffect, useRef, useState } from 'react'
import { BOARD, SCREEN, drawBoard, drawProfile } from './drawProfile'
import type { ProfileData } from './model'
import { PLATFORMS, type PlatformId } from './platforms'

export type View = PlatformId | 'all'

/** The live preview. It runs the same drawing code as the exports, so what is shown is what is saved. */
export function PreviewCanvas({ view, data }: { view: View; data: ProfileData }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const holder = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)

  useEffect(() => {
    const node = holder.current
    if (!node) return
    const measure = () => setAvailable(node.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const logical = view === 'all' ? BOARD : SCREEN
  const cssWidth = Math.max(1, Math.min(available || logical.width, view === 'all' ? 1000 : 372))
  const cssHeight = (cssWidth * logical.height) / logical.width

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const ratio = window.devicePixelRatio || 1
    element.width = Math.round(cssWidth * ratio)
    element.height = Math.round(cssHeight * ratio)
    context.setTransform(element.width / logical.width, 0, 0, element.height / logical.height, 0, 0)
    if (view === 'all') drawBoard(context, data)
    else drawProfile(context, view, data)
  }, [view, data, cssWidth, cssHeight, logical.width, logical.height])

  return (
    <div className="pk-preview" ref={holder}>
      <canvas
        ref={canvas}
        style={{ width: `${cssWidth}px`, height: `${cssHeight}px` }}
        role="img"
        aria-label={view === 'all' ? 'The profile on Instagram, TikTok, Facebook and X, side by side' : `The profile as it would look on ${PLATFORMS[view].name}`}
      />
    </div>
  )
}
