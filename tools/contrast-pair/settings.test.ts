import { describe, expect, it } from 'vitest'
import { DEFAULT_PAIR, pairHash, readPair } from './settings'

describe('shareable pair settings', () => {
  it('round-trips the exact hex pair and WCAG target', () => {
    expect(readPair(pairHash('#123456', '#ABCDEF', 7))).toEqual({ foreground: '#123456', background: '#ABCDEF', target: 7 })
  })

  it('rejects malformed settings and unsupported thresholds', () => {
    expect(readPair('#text=invalid&bg=12345678&target=0')).toEqual(DEFAULT_PAIR)
  })
})
