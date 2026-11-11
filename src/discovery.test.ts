import { describe, expect, it } from 'vitest'
import { discoveryContent, discoverySchema, discoverySitemap } from './discovery'
import { AUTHOR, SITE_URL, TOOLS } from './tools'

describe('static discovery documents', () => {
  it('links every released tool without requiring JavaScript', () => {
    const content = discoveryContent()
    for (const tool of TOOLS) {
      expect(content).toContain(`href="./${tool.path}"`)
      expect(content).toContain(tool.name)
    }
    expect(content).toContain(AUTHOR.url)
    expect(content).toContain('No account, uploads, or analytics.')
  })

  it.each(TOOLS)('describes $name using the public registry', (tool) => {
    const content = discoveryContent(tool)
    expect(content).toContain(`<h1>${tool.name}</h1>`)
    expect(content).toContain(tool.input)
    expect(content).toContain(tool.output)
    expect(content).toContain('href="../"')
    expect(content).toContain('Enable JavaScript')
    const schema = discoverySchema(tool)
    expect(schema).toMatchObject({
      '@type': 'WebApplication', name: tool.name,
      url: new URL(tool.path, SITE_URL).href, isAccessibleForFree: true,
    })
    expect(schema).not.toHaveProperty('aggregateRating')
  })

  it('escapes text before inserting it into HTML', () => {
    const content = discoveryContent({ ...TOOLS[0], name: '<script>"test" & data</script>' })
    expect(content).not.toContain('<script>')
    expect(content).toContain('&lt;script&gt;&quot;test&quot; &amp; data&lt;/script&gt;')
  })

  it('lists the gallery and all tools once in the sitemap', () => {
    const sitemap = discoverySitemap()
    expect(sitemap.match(/<loc>/g)).toHaveLength(TOOLS.length + 1)
    for (const path of ['', ...TOOLS.map((tool) => tool.path)]) {
      expect(sitemap).toContain(`<loc>${SITE_URL}${path}</loc>`)
    }
    expect(discoverySchema()).toMatchObject({ '@type': 'CollectionPage' })
  })
})
