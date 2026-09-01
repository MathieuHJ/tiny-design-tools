export const STRESS_MODES = ['expansion', 'empty', 'accented', 'rtl', 'unbroken'] as const

export type StressMode = typeof STRESS_MODES[number]

const accentedCharacters: Record<string, string> = {
  a: 'à', A: 'À', e: 'ë', E: 'Ë', i: 'ï', I: 'Ï', o: 'ô', O: 'Ô', u: 'ü', U: 'Ü',
  c: 'ç', C: 'Ç', n: 'ñ', N: 'Ñ', y: 'ÿ', Y: 'Ÿ',
}

export const modeLabels: Record<StressMode, string> = {
  expansion: '2× COPY',
  empty: 'EMPTY',
  accented: 'ACCENTED',
  rtl: 'RTL',
  unbroken: 'UNBROKEN',
}

export function stressText(text: string, mode: StressMode) {
  switch (mode) {
    case 'expansion':
      return `${text} · ${text}`
    case 'empty':
      return ''
    case 'accented':
      return `[${[...text].map((character) => accentedCharacters[character] ?? character).join('')}]`
    case 'rtl':
      return `‏${[...text].reverse().join('')}`
    case 'unbroken':
      return `${text.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase()}WITHNOBREAKS`
  }
}

export function isOverflowing(dimensions: {
  clientHeight: number
  clientWidth: number
  scrollHeight: number
  scrollWidth: number
}) {
  return dimensions.scrollWidth > dimensions.clientWidth + 1 || dimensions.scrollHeight > dimensions.clientHeight + 1
}

export function selectorFor(element: Element) {
  if (element.id) return `#${element.id}`
  const className = [...element.classList].find((name) => !name.startsWith('is-'))
  return `${element.tagName.toLowerCase()}${className ? `.${className}` : ''}`
}
