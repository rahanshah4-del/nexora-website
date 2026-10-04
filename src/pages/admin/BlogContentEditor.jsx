import { useMemo, useRef, useState } from 'react'
import { createHighlightBudget, formatBlogContent } from '../../lib/blogContentFormatter.js'
import { contentToSections, renderBlogBlocksHtml } from '../../lib/blogBlocks.js'
import { htmlToBlogMarkdown } from '../../lib/blogPaste.js'

const HELP = [
  ['## Heading', 'new section (shows in the table of contents)'],
  ['### Sub-heading', 'smaller heading inside a section'],
  ['**bold**', 'bold text'],
  ['- item / 1. item', 'bullet / numbered list'],
  ['| A | B |', 'table (first row = header)'],
  ['> text', 'quote / callout'],
]

/**
 * Article body editor for the Blog CMS: a textarea that converts pasted rich
 * text (ChatGPT, Google Docs, web pages) into Markdown, plus a live preview
 * rendered with the same code and styles as the public blog page.
 */
export default function BlogContentEditor({ value, onChange, introHeading }) {
  const textareaRef = useRef(null)
  const [mode, setMode] = useState('write')
  const [pasteNote, setPasteNote] = useState('')

  function handlePaste(event) {
    const html = event.clipboardData?.getData('text/html')
    if (!html) return
    const markdown = htmlToBlogMarkdown(html)
    if (!markdown) return
    event.preventDefault()
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const after = value.slice(end)
    const glueBefore = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
    const glueAfter = after && !after.startsWith('\n') ? '\n\n' : ''
    const next = `${before}${glueBefore}${markdown}${glueAfter}${after}`
    onChange(next)
    setPasteNote('Pasted with formatting — headings, bold, lists and tables were kept.')
    requestAnimationFrame(() => {
      const caret = (before + glueBefore + markdown).length
      el?.setSelectionRange(caret, caret)
    })
  }

  const previewHtml = useMemo(() => {
    if (mode !== 'preview') return ''
    const budget = createHighlightBudget()
    const inline = (escaped) => formatBlogContent(escaped, { html: true, autoHighlight: true, budget })
    // Same structure as the public page: every section starts with its heading.
    return contentToSections(value, introHeading).map((section) => (
      `<h2>${section.heading.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h2>`
      + section.paragraphs.map((p) => renderBlogBlocksHtml(p, inline)).join('')
    )).join('')
  }, [mode, value, introHeading])

  const sectionCount = useMemo(() => contentToSections(value, introHeading).length, [value, introHeading])

  return (
    <div className="lg:col-span-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="block text-xs font-black text-slate-600">Article Content</span>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-black">
          {['write', 'preview'].map((key) => (
            <button key={key} type="button" onClick={() => setMode(key)}
              className={`rounded-lg px-3 py-1.5 capitalize ${mode === key ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              {key}
            </button>
          ))}
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => { onChange(event.target.value); setPasteNote('') }}
          onPaste={handlePaste}
          spellCheck
          className="mt-2 min-h-[28rem] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-[13px] leading-6 text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          placeholder="Paste your article here (from ChatGPT, Google Docs…) — formatting is kept."
        />
      ) : (
        <div className="mt-2 max-h-[40rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white px-5 py-6">
          {value.trim()
            ? <div className="nx-prose" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            : <p className="text-sm text-slate-500">Nothing to preview yet.</p>}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-2 text-[11px] text-slate-500">
        <p>{pasteNote || `${sectionCount} section${sectionCount === 1 ? '' : 's'} · blank line = new paragraph`}</p>
        <details className="max-w-md">
          <summary className="cursor-pointer font-bold text-slate-600">Formatting help</summary>
          <ul className="mt-1 grid gap-0.5">
            {HELP.map(([code, label]) => <li key={code}><code className="rounded bg-slate-100 px-1">{code}</code> — {label}</li>)}
          </ul>
        </details>
      </div>
    </div>
  )
}
