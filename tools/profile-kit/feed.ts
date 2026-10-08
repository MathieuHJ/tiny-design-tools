/** How many posts the feed holds. The mock shows the first dozen or so; more is only extra weight to keep. */
export const MAX_FEED = 24

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function removeItem<T>(list: readonly T[], index: number): T[] {
  return index < 0 || index >= list.length ? [...list] : list.filter((_, position) => position !== index)
}

/** Where the selection ends up after an item is removed: the same post if it is still there, else its neighbour. */
export function selectionAfterRemove(selected: number | null, removed: number, remaining: number): number | null {
  if (selected === null || remaining === 0) return null
  if (selected === removed) return Math.min(removed, remaining - 1)
  return selected > removed ? selected - 1 : selected
}

/** The selection follows the post it was on when that post moves. */
export function selectionAfterMove(selected: number | null, from: number, to: number): number | null {
  if (selected === null) return null
  if (selected === from) return to
  if (from < selected && to >= selected) return selected - 1
  if (from > selected && to <= selected) return selected + 1
  return selected
}

/** How many of `adding` new posts fit, given how many are already in the feed. */
export function roomFor(current: number, adding: number, max = MAX_FEED): { accepted: number; dropped: number } {
  const accepted = Math.max(0, Math.min(adding, max - current))
  return { accepted, dropped: adding - accepted }
}
