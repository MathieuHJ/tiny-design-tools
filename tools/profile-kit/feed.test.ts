import { describe, expect, it } from 'vitest'
import { MAX_FEED, moveItem, removeItem, roomFor, selectionAfterMove, selectionAfterRemove } from './feed'

describe('Profile Kit feed order', () => {
  it('moves a post to a new place without changing the others', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('leaves the order alone for a move that goes nowhere, and never changes the input', () => {
    const list = ['a', 'b', 'c']
    expect(moveItem(list, 1, 1)).toEqual(list)
    expect(moveItem(list, -1, 2)).toEqual(list)
    expect(moveItem(list, 0, 9)).toEqual(list)
    expect(moveItem(list, 0, 2)).not.toBe(list)
    expect(list).toEqual(['a', 'b', 'c'])
  })

  it('removes one post, and ignores an index that is not there', () => {
    expect(removeItem(['a', 'b', 'c'], 1)).toEqual(['a', 'c'])
    expect(removeItem(['a', 'b', 'c'], 5)).toEqual(['a', 'b', 'c'])
  })
})

describe('Profile Kit feed selection', () => {
  it('keeps the selection on the same post when another is removed', () => {
    expect(selectionAfterRemove(3, 1, 4)).toBe(2)
    expect(selectionAfterRemove(1, 3, 4)).toBe(1)
    expect(selectionAfterRemove(null, 1, 4)).toBeNull()
  })

  it('moves to the neighbour when the selected post is removed, and clears when none are left', () => {
    expect(selectionAfterRemove(2, 2, 4)).toBe(2)
    expect(selectionAfterRemove(3, 3, 3)).toBe(2)
    expect(selectionAfterRemove(0, 0, 0)).toBeNull()
  })

  it('follows the post it was on as the others move around it', () => {
    const list = ['a', 'b', 'c', 'd', 'e']
    for (const [from, to] of [[0, 3], [3, 0], [1, 4], [4, 2], [2, 2]] as const) {
      for (let selected = 0; selected < list.length; selected += 1) {
        const after = moveItem(list, from, to)
        expect(after[selectionAfterMove(selected, from, to)!]).toBe(list[selected])
      }
    }
    expect(selectionAfterMove(null, 0, 1)).toBeNull()
  })
})

describe('Profile Kit feed size', () => {
  it('accepts posts up to the cap and reports what did not fit', () => {
    expect(roomFor(0, 5)).toEqual({ accepted: 5, dropped: 0 })
    expect(roomFor(MAX_FEED - 2, 5)).toEqual({ accepted: 2, dropped: 3 })
    expect(roomFor(MAX_FEED, 3)).toEqual({ accepted: 0, dropped: 3 })
    expect(roomFor(MAX_FEED + 5, 1)).toEqual({ accepted: 0, dropped: 1 })
  })
})
