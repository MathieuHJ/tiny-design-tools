import { normalizeRegion, type Settings } from './overlayMath'

export const DEFAULT_TEXT = 'Make room\nfor a different view.'
export const DEFAULT_FONT_SIZE = .055
export const DEFAULT_SETTINGS: Settings = {
  region: { x: .08, y: .56, width: .76, height: .34 },
  direction: 'bottom',
  tone: 'light',
  target: 4.5,
  opacity: 0,
}
export const TARGETS = [{ value: 4.5, label: 'AA TEXT' }, { value: 3, label: 'AA LARGE' }, { value: 7, label: 'AAA TEXT' }] as const
export const MAX_PIXELS = 12_000_000

export function adjustedRegion(settings: Settings, patch: Partial<Settings['region']>): Settings {
  const width = Math.min(1, Math.max(.08, patch.width ?? settings.region.width))
  const height = Math.min(1, Math.max(.08, patch.height ?? settings.region.height))
  const x = Math.min(1 - width, Math.max(0, patch.x ?? settings.region.x))
  const y = Math.min(1 - height, Math.max(0, patch.y ?? settings.region.y))
  return { ...settings, region: normalizeRegion({ x, y, width, height }) }
}

export const ratioLabel = (value: number) => (Math.floor(value * 100) / 100).toFixed(2)

export function sceneCss(settings: Settings, width: number, height: number, fontSize: number, baseCss: string) {
  return `${baseCss}\n\n/* Keep the checked image, aspect ratio and text region together. */\n.overlay-check { container-type: inline-size; }\n.overlay-check__text {\n  margin: 0;\n  padding: 0;\n  font: 700 ${(fontSize * 100).toFixed(2)}cqw / 1.08 Arial, Helvetica, sans-serif;\n  font-kerning: normal;\n  tab-size: 8;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  overflow: hidden;\n}\n/* Checked: ${width} × ${height} source pixels against ${settings.target}:1. Recheck after cropping or repositioning. */`
}
