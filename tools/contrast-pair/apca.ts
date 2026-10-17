import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { hexToRgb } from './contrastMath'

/** Upstream APCA 0.0.98G-4g. Keep the sign: light text on dark is negative. */
export function apcaValue(foreground: string, background: string): number {
  const foregroundRgb = hexToRgb(foreground)
  const backgroundRgb = hexToRgb(background)
  return Number(APCAcontrast(
    sRGBtoY([foregroundRgb.r, foregroundRgb.g, foregroundRgb.b]),
    sRGBtoY([backgroundRgb.r, backgroundRgb.g, backgroundRgb.b]),
  ))
}

export function referenceFor(lc: number) {
  const value = Math.abs(lc)
  if (value >= 90) return { size: 14, label: '14 PX / ARIAL 400' }
  if (value >= 75) return { size: 16, label: '16 PX / ARIAL 400' }
  if (value >= 60) return { size: 24, label: '24 PX / ARIAL 400' }
  if (value >= 45) return { size: 42, label: '42 PX / ARIAL 400' }
  return { size: 48, label: value >= 30 ? 'NON-CONTENT TEXT ONLY' : value >= 15 ? 'CERTAIN NON-TEXT ONLY' : 'INSUFFICIENT TEXT CONTRAST' }
}
