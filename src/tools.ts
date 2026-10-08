import pkg from '../package.json'

export const REPO_URL = 'https://github.com/MathieuHJ/tiny-design-tools'
export const SITE_URL = 'https://mathieuhj.github.io/tiny-design-tools/'
export const AUTHOR = { name: 'Mat', role: 'Design Engineer', url: 'https://mhj.digital' } as const
export const VERSION = pkg.version

export type ToolId = 'crop-proof' | 'copy-stress'

export type ToolMeta = {
  id: ToolId
  number: string
  name: string
  category: string
  tagline: string
  input: string
  output: string
  /** Path from the site root, with a trailing slash. */
  path: string
}

/** Single source of truth for the gallery, tool headers and footers. Order is release order. */
export const TOOLS: readonly ToolMeta[] = [
  {
    id: 'crop-proof',
    number: '01',
    name: 'Crop Proof',
    category: 'Responsive imagery',
    tagline: 'One focal point across six crops.',
    input: 'PNG, JPEG, WebP',
    output: 'PNG sheet + CSS',
    path: 'crop-proof/',
  },
  {
    id: 'copy-stress',
    number: '02',
    name: 'Copy Stress',
    category: 'Content QA',
    tagline: 'Stress copy. Reveal the breakpoints.',
    input: 'Any live page',
    output: 'PNG proof + JSON',
    path: 'copy-stress/',
  },
]

export function toolById(id: ToolId): ToolMeta {
  const tool = TOOLS.find((item) => item.id === id)
  if (!tool) throw new Error(`Unknown tool: ${id}`)
  return tool
}

export function nextTool(id: ToolId): ToolMeta {
  const index = TOOLS.findIndex((item) => item.id === id)
  return TOOLS[(index + 1) % TOOLS.length]
}
