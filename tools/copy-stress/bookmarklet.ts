/**
 * The launcher users drag to their bookmarks bar. It injects the Copy Stress runtime into the current page.
 * The runtime URL is JSON-encoded so any quote or backslash in it stays inside the string literal.
 */
export function buildBookmarklet(runtimeUrl: string): string {
  const loader = `(()=>{const s=document.createElement('script');s.src=${JSON.stringify(runtimeUrl)};s.dataset.copyStress='1';document.head.append(s)})()`
  return `javascript:${loader}`
}

export function runtimeUrlFor(baseUrl: string, origin: string): string {
  return new URL(`${baseUrl}copy-stress/bookmarklet.js`, origin).href
}
