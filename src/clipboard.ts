/** Copy text, falling back to a hidden textarea where the async Clipboard API is blocked. */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    const fallback = document.createElement('textarea')
    fallback.value = value
    fallback.setAttribute('readonly', '')
    fallback.style.position = 'fixed'
    fallback.style.opacity = '0'
    document.body.append(fallback)
    fallback.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    fallback.remove()
    return copied
  }
}
