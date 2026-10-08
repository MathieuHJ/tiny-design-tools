import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import { AUTHOR, REPO_URL, VERSION, nextTool, toolById, type ToolId } from './tools'

/** Header shared by every tool: path back to the collection plus the privacy note for this tool. */
export function ToolHeader({ id, note }: { id: ToolId; note: string }) {
  const tool = toolById(id)
  return (
    <header className="tool-header">
      <a className="repo-mark" href="../" aria-label="Back to all Tiny Design Tools">
        TDT <span className="repo-mark__sep" aria-hidden="true">/</span>
        <span className="repo-mark__tool">{tool.number}</span>
      </a>
      <nav aria-label="Project">
        <p>{note}</p>
        <a className="text-link text-link--optional" href={REPO_URL} target="_blank" rel="noreferrer">
          SOURCE <ArrowUpRight size={11} weight="bold" aria-hidden="true" />
        </a>
      </nav>
    </header>
  )
}

/** Footer shared by every tool: version, source for this tool, and a path to the next one. */
export function ToolFooter({ id }: { id: ToolId }) {
  const tool = toolById(id)
  const next = nextTool(id)
  return (
    <footer className="tool-footer">
      <nav aria-label="About this tool">
        <p>TDT V{VERSION} / MIT</p>
        <a className="text-link" href={`${REPO_URL}/tree/main/tools/${tool.id}`} target="_blank" rel="noreferrer">
          SOURCE <ArrowUpRight size={11} weight="bold" aria-hidden="true" />
        </a>
        <a className="text-link" href={AUTHOR.url} target="_blank" rel="noreferrer">
          BY {AUTHOR.name.toUpperCase()} <ArrowUpRight size={11} weight="bold" aria-hidden="true" />
        </a>
      </nav>
      <a className="text-link tool-footer__next" href={`../${next.path}`}>
        NEXT / {next.number} {next.name.toUpperCase()} <ArrowRight size={11} weight="bold" aria-hidden="true" />
      </a>
    </footer>
  )
}
