import { useState } from 'react'
import { toolShareSnippets } from '../../../lib/toolShare.js'

function CopyBlock({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="text-[12px] font-medium text-slate-300">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${label} code you can copy`} className="overflow-x-auto p-3 text-[12px] leading-5 text-slate-100"><code>{value}</code></pre>
    </div>
  )
}

/**
 * "Share this tool": copy-ready HTML and Markdown links to the tool page.
 * Sits under the tool and above the guide on every /tools/<tool>/ page.
 */
export default function ToolShareSection({ path, title }) {
  const share = toolShareSnippets({ path, title })
  return (
    <section aria-labelledby="share-tool-heading" className="bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <h2 id="share-tool-heading" className="font-display text-xl font-bold tracking-tight text-slate-950">Share this tool</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-600">
          Found it useful? Paste one of these links into your blog, newsletter, template page or README. The tool stays free, with no signup and no watermark.
        </p>
        <CopyBlock label="HTML link" value={share.html} />
        <CopyBlock label="Markdown link" value={share.markdown} />
      </div>
    </section>
  )
}
