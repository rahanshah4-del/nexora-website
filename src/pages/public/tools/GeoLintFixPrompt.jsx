import { useState } from 'react'
import { FIX_PROMPT_TOOLS, buildAllPrompt, buildFixPrompt, toolById } from '../../../lib/geolintPrompt.js'
import { AI_ENGINE_PATHS } from './aiEngineMarks.js'

const STORE_KEY = 'geolint:fix-prompt-tool'

function readTool() {
  try {
    const id = window.localStorage.getItem(STORE_KEY)
    return FIX_PROMPT_TOOLS.some((t) => t.id === id) ? id : 'claude'
  } catch {
    return 'claude'
  }
}

function rememberTool(id) {
  try {
    window.localStorage.setItem(STORE_KEY, id)
  } catch {
    // storage can be blocked; the choice then simply is not remembered
  }
}

/** Logo of the AI tool. Cursor has no mark in our set, so it gets a plain cursor-arrow icon. */
function ToolMark({ tool, className = 'h-5 w-5' }) {
  if (tool.mark && AI_ENGINE_PATHS[tool.mark]) {
    return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" focusable="false"><path d={AI_ENGINE_PATHS[tool.mark]} /></svg>
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 3l14 7.5-6 1.8-2.2 6.2L5 3z" />
    </svg>
  )
}

function ToolPicker({ value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {FIX_PROMPT_TOOLS.map((t) => {
        const on = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${on ? 'bg-white text-slate-950 ring-white shadow-[0_8px_24px_-8px_rgba(125,211,252,.7)]' : 'bg-white/5 text-slate-300 ring-white/15 hover:bg-white/10 hover:text-white'}`}
          >
            <ToolMark tool={t} className="h-4 w-4" />
            {t.name}
          </button>
        )
      })}
    </div>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return [copied, copy]
}

/** Big "Fix everything with AI" card: one prompt that applies every fix in the report. */
export function FixAllPromptPanel({ report }) {
  const [toolId, setToolId] = useState(readTool)
  const [open, setOpen] = useState(false)
  const [copied, copy] = useCopy()
  const tool = toolById(toolId)
  const count = Array.isArray(report?.remediation) ? report.remediation.length : 0
  const prompt = buildAllPrompt(report, toolId)
  if (!count || !prompt) return null
  const pick = (id) => { setToolId(id); rememberTool(id) }

  return (
    <div data-testid="fix-all-prompt" className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-[0_40px_90px_-50px_rgba(37,99,235,.9)] ring-1 ring-white/10 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><ToolMark tool={tool} className="h-6 w-6 text-white" /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Fix with AI</p>
            <h3 className="font-display text-xl font-bold leading-tight sm:text-2xl">One prompt fixes all {count} issues</h3>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-[14px] leading-6 text-slate-300">We turned this audit into a prompt for your AI coding tool. It lists every issue with what GeoLint measured, the steps and the code, and tells the tool not to invent facts.</p>

        <div className="mt-5"><ToolPicker value={toolId} onChange={pick} label="Choose your AI tool" /></div>
        <p className="mt-2 text-[12.5px] text-slate-400">{tool.where}</p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
            <span className="min-w-0 truncate text-[12px] font-medium text-slate-400">Prompt for {tool.name} · {prompt.length.toLocaleString('en-US')} characters</span>
            <button type="button" onClick={() => copy(prompt)} className="shrink-0 rounded-lg bg-sky-400 px-3.5 py-1.5 text-[12.5px] font-bold text-slate-950 transition hover:bg-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">{copied ? 'Copied ✓' : 'Copy prompt'}</button>
          </div>
          <pre tabIndex={0} aria-label="Fix prompt you can copy" className={`${open ? 'max-h-[28rem]' : 'max-h-40'} overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-5 text-slate-200`}><code>{prompt}</code></pre>
          <button type="button" onClick={() => setOpen((v) => !v)} className="w-full border-t border-white/10 py-2 text-[12px] font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white">{open ? 'Show less' : 'Show the full prompt'}</button>
        </div>
        <p className="mt-3 text-[11.5px] leading-5 text-slate-500">Review what the AI changes before you publish. Logos belong to their owners and only identify the tools. No partnership or endorsement is implied.</p>
      </div>
    </div>
  )
}

/** Small "Copy fix prompt" row inside one fix card. */
export function FixPromptRow({ item, report, number }) {
  const [toolId, setToolId] = useState(readTool)
  const [copied, copy] = useCopy()
  const tool = toolById(toolId)
  const pick = (id) => { setToolId(id); rememberTool(id) }
  return (
    <div data-testid="fix-prompt-row" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 ring-1 ring-slate-800">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">Fix with AI</span>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Choose your AI tool">
        {FIX_PROMPT_TOOLS.map((t) => (
          <button key={t.id} type="button" onClick={() => pick(t.id)} aria-pressed={t.id === toolId} title={t.name} aria-label={t.name} className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${t.id === toolId ? 'bg-white text-slate-950 ring-white' : 'bg-white/5 text-slate-300 ring-white/15 hover:bg-white/10 hover:text-white'}`}>
            <ToolMark tool={t} className="h-4 w-4" />
          </button>
        ))}
      </div>
      <button type="button" onClick={() => copy(buildFixPrompt(item, report, toolId, number))} className="ml-auto rounded-lg bg-sky-400 px-3 py-1.5 text-[12px] font-bold text-slate-950 transition hover:bg-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">{copied ? 'Copied ✓' : `Copy prompt for ${tool.name}`}</button>
    </div>
  )
}
