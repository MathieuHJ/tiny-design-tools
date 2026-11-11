import type { Plugin } from 'vite'
import { AUTHOR, REPO_URL, SITE_URL, TOOLS, type ToolMeta } from './tools'

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!)

const privacy = 'Free, open-source tools that run locally in your browser. No account, uploads, or analytics.'
const author = { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url }
const toolUrl = (tool: ToolMeta) => new URL(tool.path, SITE_URL).href

/** Useful document content before JavaScript starts, replaced by the existing React entry. */
export function discoveryContent(tool?: ToolMeta) {
  const prefix = tool ? '../' : './'
  const toolLinks = TOOLS.map((item) => `<li><a href="${prefix}${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>: ${escapeHtml(item.tagline)} Input: ${escapeHtml(item.input)}. Export: ${escapeHtml(item.output)}.</li>`).join('\n')
  return `<main class="gallery-shell">
    <h1>${escapeHtml(tool?.name ?? 'Tiny Design Tools')}</h1>
    <p>${escapeHtml(tool?.tagline ?? 'Small instruments for visual work. Each takes real input, makes one thing visible, and exports proof you can share.')}</p>
    ${tool ? `<p>Input: ${escapeHtml(tool.input)}. Export: ${escapeHtml(tool.output)}.</p><p>Enable JavaScript to use this tool.</p>` : ''}
    <p>${privacy}</p>
    <p>Built by <a href="${AUTHOR.url}">${AUTHOR.name}</a>, a ${AUTHOR.role.toLowerCase()}. <a href="${REPO_URL}">Source, issues and ideas on GitHub</a>.</p>
    ${tool ? '<p><a href="../">All Tiny Design Tools</a></p>' : ''}
    <h2>Explore the tools</h2><ul>${toolLinks}</ul>
  </main>`
}

export function discoverySchema(tool?: ToolMeta) {
  if (tool) return {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: tool.name, url: toolUrl(tool),
    description: `${tool.tagline} Input: ${tool.input}. Export: ${tool.output}. ${privacy}`,
    applicationCategory: 'DesignApplication', operatingSystem: 'Web browser',
    isAccessibleForFree: true, author,
    isPartOf: { '@type': 'WebSite', name: 'Tiny Design Tools', url: SITE_URL },
  }
  return {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Tiny Design Tools', url: SITE_URL, description: privacy, author,
    mainEntity: { '@type': 'ItemList', itemListElement: TOOLS.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, url: toolUrl(item),
    })) },
  }
}

export function discoverySitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[SITE_URL, ...TOOLS.map(toolUrl)].map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`
}

export function discoveryPlugin(): Plugin {
  return {
    name: 'tiny-design-tools-discovery',
    transformIndexHtml(html, context) {
      const path = context.path.replace(/^\//, '').replace(/index\.html$/, '')
      const tool = TOOLS.find((item) => item.path === path)
      if (path && !tool) return html
      const schema = JSON.stringify(discoverySchema(tool)).replace(/</g, '\\u003c')
      return html.replace('<div id="root"></div>', `<div id="root">${discoveryContent(tool)}</div>`)
        .replace('</head>', `    <script type="application/ld+json">${schema}</script>\n  </head>`)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: discoverySitemap() })
    },
  }
}
