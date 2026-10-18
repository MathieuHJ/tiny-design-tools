import { analyzePixels, type Pixels, type Settings } from './overlayMath'

type Request =
  | ({ type: 'image' } & Pixels)
  | { type: 'analyze'; id: number; settings: Settings }

let image: Pixels | null = null

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data
  try {
    if (request.type === 'image') {
      image = { data: request.data, width: request.width, height: request.height }
      self.postMessage({ type: 'ready' })
    } else if (request.type === 'analyze') {
      if (!image) throw new Error('Load an image before checking its overlay.')
      self.postMessage({ type: 'result', id: request.id, analysis: analyzePixels(image, request.settings) })
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      ...('id' in request ? { id: request.id } : {}),
      message: error instanceof Error ? error.message : 'The image could not be analysed.',
    })
  }
}
