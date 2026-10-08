export type Measure = (text: string) => number

/**
 * Break text into lines no wider than maxWidth. Respects line breaks, breaks a word that is too long for a
 * line on its own, and ends the last allowed line with an ellipsis when text is left over.
 */
export function wrapText(text: string, maxWidth: number, measure: Measure, maxLines = Number.POSITIVE_INFINITY): string[] {
  const lines: string[] = []
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n')

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      line = ''
      let rest = word
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut -= 1
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      line = rest
    }
    lines.push(line)
  }

  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, Math.max(1, maxLines))
  kept[kept.length - 1] = truncate(`${kept[kept.length - 1]}…`, maxWidth, measure)
  return kept
}

/** Shorten a single line to fit, ending in an ellipsis. */
export function truncate(text: string, maxWidth: number, measure: Measure): string {
  if (measure(text) <= maxWidth) return text
  const body = text.replace(/…$/, '')
  let end = body.length
  while (end > 0 && measure(`${body.slice(0, end).trimEnd()}…`) > maxWidth) end -= 1
  return `${body.slice(0, end).trimEnd()}…`
}
