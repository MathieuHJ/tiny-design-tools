import { describe, expect, it } from 'vitest'
import { buildBookmarklet, runtimeUrlFor } from './bookmarklet'
import { isOverflowing, selectorFor, stressText } from './stressMath'

describe('Copy Stress primitives', () => {
  it('produces distinct hostile fixtures without mutating the source value', () => {
    expect(stressText('Share file', 'expansion')).toBe('Share file · Share file')
    expect(stressText('Share file', 'empty')).toBe('')
    expect(stressText('Share file', 'unbroken')).toBe('SHAREFILEWITHNOBREAKS')
  })

  it('detects horizontal and vertical layout overflow with a small tolerance', () => {
    expect(isOverflowing({ clientWidth: 120, scrollWidth: 121, clientHeight: 30, scrollHeight: 30 })).toBe(false)
    expect(isOverflowing({ clientWidth: 120, scrollWidth: 122, clientHeight: 30, scrollHeight: 30 })).toBe(true)
    expect(isOverflowing({ clientWidth: 120, scrollWidth: 120, clientHeight: 30, scrollHeight: 33 })).toBe(true)
  })

  it('uses a stable, readable selector for an element without an id', () => {
    const element = {
      id: '',
      tagName: 'BUTTON',
      classList: ['fixture-button', 'is-failed'],
    } as unknown as Element
    expect(selectorFor(element)).toBe('button.fixture-button')
  })
})

describe('Copy Stress launcher', () => {
  it('builds a javascript: URL whose body parses and loads the runtime script', () => {
    const url = buildBookmarklet('https://example.com/tiny-design-tools/copy-stress/bookmarklet.js')
    expect(url.startsWith('javascript:')).toBe(true)
    const body = url.slice('javascript:'.length)
    expect(() => new Function(body)).not.toThrow()
    expect(body).toContain('"https://example.com/tiny-design-tools/copy-stress/bookmarklet.js"')
    expect(body).not.toContain('%')
  })

  it('keeps a hostile runtime URL inside its string literal', () => {
    const url = buildBookmarklet('https://example.com/a"b\\c.js')
    expect(() => new Function(url.slice('javascript:'.length))).not.toThrow()
  })

  it('resolves the runtime under the Pages base path and at the dev root', () => {
    expect(runtimeUrlFor('/tiny-design-tools/', 'https://mathieuhj.github.io'))
      .toBe('https://mathieuhj.github.io/tiny-design-tools/copy-stress/bookmarklet.js')
    expect(runtimeUrlFor('/', 'http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173/copy-stress/bookmarklet.js')
  })
})
