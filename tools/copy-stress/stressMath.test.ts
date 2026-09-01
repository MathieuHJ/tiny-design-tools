import { describe, expect, it } from 'vitest'
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
