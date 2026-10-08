import { useEffect, useRef, useState } from 'react'
import { firstImageFile } from './imageFile'

/**
 * Accept an image dropped anywhere on the page or pasted from the clipboard.
 * Returns whether a drag is currently over the window, for the drop overlay.
 */
export function useImageIntake(onFile: (file: File) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const handler = useRef(onFile)

  useEffect(() => {
    handler.current = onFile
  }, [onFile])

  useEffect(() => {
    let depth = 0
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth += 1
      setIsDragging(true)
    }
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setIsDragging(false)
    }
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth = 0
      setIsDragging(false)
      const file = firstImageFile(event.dataTransfer)
      if (file) handler.current(file)
    }
    const onPaste = (event: ClipboardEvent) => {
      const file = firstImageFile(event.clipboardData)
      if (!file) return
      event.preventDefault()
      handler.current(file)
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  return isDragging
}
