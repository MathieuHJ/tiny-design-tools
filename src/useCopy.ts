import { useCallback, useEffect, useRef, useState } from 'react'
import { copyText } from './clipboard'

type CopyState = 'idle' | 'copied' | 'failed'

/** Copy with visible feedback: the idle label becomes COPIED, or COPY FAILED if the browser refuses. */
export function useCopy(idleLabel: string) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(async (value: string) => {
    const copied = await copyText(value)
    setState(copied ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1800)
  }, [])

  const label = state === 'copied' ? 'COPIED' : state === 'failed' ? 'COPY FAILED' : idleLabel
  return { label, copy }
}
