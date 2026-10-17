import { normalizeHex } from './contrastMath'

export const DEFAULT_PAIR = { foreground: '#8991A5', background: '#F4F2ED', target: 4.5 }
export const TARGETS = [
  { ratio: 4.5, label: 'AA TEXT', note: 'Normal text / 4.5 : 1' },
  { ratio: 3, label: 'AA LARGE', note: '24 px regular or 18.67 px bold / 3 : 1' },
  { ratio: 7, label: 'AAA TEXT', note: 'Normal text / 7 : 1' },
] as const

export function readPair(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const target = Number(params.get('target'))
  return {
    foreground: normalizeHex(`#${params.get('text') ?? ''}`) ?? DEFAULT_PAIR.foreground,
    background: normalizeHex(`#${params.get('bg') ?? ''}`) ?? DEFAULT_PAIR.background,
    target: TARGETS.some((item) => item.ratio === target) ? target : DEFAULT_PAIR.target,
  }
}

export function pairHash(foreground: string, background: string, target: number) {
  return `#text=${foreground.slice(1)}&bg=${background.slice(1)}&target=${target}`
}
