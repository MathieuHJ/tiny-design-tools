import { useEffect, useRef, useState } from 'react'
import { allImageFiles, firstImageFile } from './imageFile'

/**
 * Accept an image dropped anywhere on the page or pasted from the clipboard.
 * Returns whether a drag is currently over the window, for the drop overlay.
 * Pass `onFiles` to receive every image in a drop or paste instead of only the first.
 */
export function useImageIntake(onFile: (file: File) => void, onFiles?: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const handler = useRef(onFile)
  const manyHandler = useRef(onFiles)

  useEffect(() => {
    handler.current = onFile
    manyHandler.current = onFiles
  }, [onFile, onFiles])

  const deliver = (data: DataTransfer | null) => {
    if (manyHandler.current) {
      const files = allImageFiles(data)
      if (files.length) manyHandler.current(files)
      return files.length > 0
    }
    const file = firstImageFile(data)
    if (file) handler.current(file)
    return Boolean(file)
  }

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
      depth = 0
      setIsDragging(false)
      // A drop zone inside the page has already taken this file and cancelled the event.
      if (event.defaultPrevented) return
      event.preventDefault()
      deliver(event.dataTransfer)
    }
    const onPaste = (event: ClipboardEvent) => {
      if (deliver(event.clipboardData)) event.preventDefault()
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
