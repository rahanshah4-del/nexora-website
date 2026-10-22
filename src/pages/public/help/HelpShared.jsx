import { useEffect, useMemo, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import {
  HELP_ARTICLES,
  HELP_CENTER_PATH,
  HELP_GROUPS,
  articleSearchText,
  articlesInGroup,
} from '../../../lib/helpCenterData.js'

export const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif'

const GROUP_TILE = {
  start: 'from-[#3b9cff] to-[#0a6cf0]',
  modules: 'from-[#a78bfa] to-[#7c3aed]',
  platform: 'from-[#34d399] to-[#059669]',
  tools: 'from-[#fbbf24] to-[#f97316]',
  services: 'from-[#fb7185] to-[#e11d48]',
}
const GROUP_ICON = {
  start: <path d="M5 13l4 4L19 7" />,
  modules: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  platform: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
  tools: <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-2.3-.7-.7-2.3z" />,
  services: <><path d="M4 8h16v11H4z" /><path d="M9 8V5h6v3" /></>,
}

/** Rounded gradient tile with a glyph, the Help Center's icon language. */
export function GroupTile({ id, size = 'md' }) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-[18px]' : 'h-10 w-10 rounded-[13px]'
  const glyph = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'
  return (
    <span className={`inline-flex ${box} shrink-0 items-center justify-center bg-gradient-to-b ${GROUP_TILE[id] || GROUP_TILE.start} text-white shadow-[0_6px_16px_-6px_rgba(10,108,240,.5),inset_0_1px_0_rgba(255,255,255,.35)]`}>
      <svg className={glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{GROUP_ICON[id] || GROUP_ICON.start}</svg>
    </span>
  )
}

export function Chevron({ className = 'h-4 w-4' }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 4 6 6-6 6" /></svg>
}

export function HelpSidebar({ activeSlug, onNavigate }) {
  return (
    <nav aria-label="Help Center" className="space-y-7 text-sm">
      <Link
        to={HELP_CENTER_PATH}
        onClick={onNavigate}
        className={`block rounded-xl px-3 py-2 text-[15px] font-semibold ${!activeSlug ? 'bg-slate-100 text-slate-900' : 'text-slate-800 hover:bg-slate-100'}`}
      >
        Help Center home
      </Link>
      {HELP_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="px-3 text-xs font-semibold text-slate-500">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {articlesInGroup(group.id).map((a) => (
              <li key={a.slug}>
                <Link
                  to={a.path}
                  onClick={onNavigate}
                  aria-current={a.slug === activeSlug ? 'page' : undefined}
                  className={`block rounded-xl px-3 py-1.5 transition ${a.slug === activeSlug ? 'bg-[#0071e3]/10 font-semibold text-[#0066cc]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** Client-side search over every article and Q&A. */
export function HelpSearch({ large = false }) {
  const [q, setQ] = useState('')
  const index = useMemo(() => HELP_ARTICLES.map((a) => ({ a, text: articleSearchText(a) })), [])
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 1)
    if (!terms.length) return []
    return index
      .map(({ a, text }) => {
        let score = 0
        const title = a.title.toLowerCase()
        for (const t of terms) {
          if (!text.includes(t)) return null
          score += title.includes(t) ? 5 : 1
        }
        return { a, score }
      })
      .filter(Boolean)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8)
  }, [q, index])

  return (
    <div className="relative">
      <label htmlFor="help-search" className="sr-only">Search the Help Center</label>
      <div className={`flex items-center gap-3 rounded-full bg-white px-5 shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_30px_-12px_rgba(0,0,0,.18)] ring-1 ring-slate-900/[0.06] transition focus-within:ring-2 focus-within:ring-[#0071e3] ${large ? 'py-4' : 'py-2.5'}`}>
        <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" /></svg>
        <input
          id="help-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={large ? 'Search modules, questions, free tools…' : 'Search help'}
          autoComplete="off"
          className={`w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 ${large ? 'text-lg' : 'text-base'}`}
        />
      </div>
      {q.trim().length > 1 && (
        <div className="absolute left-0 right-0 z-30 mt-3 max-h-[22rem] overflow-auto rounded-3xl bg-white p-2 text-left shadow-[0_20px_60px_-15px_rgba(0,0,0,.3)] ring-1 ring-slate-900/[0.06]">
          {results.length ? (
            results.map(({ a }) => (
              <Link key={a.slug} to={a.path} className="block rounded-2xl px-4 py-2.5 hover:bg-slate-100">
                <span className="block text-sm font-semibold text-slate-900">{a.title}</span>
                <span className="block text-xs text-slate-500">{a.summary}</span>
              </Link>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-slate-500">
              No article matches “{q}”. Try a shorter word, or <Link to="/contact" className="font-semibold text-[#0066cc] underline">ask our team</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Mobile drawer for the sidebar. */
export function MobileNav({ activeSlug }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800"
        aria-expanded={open}
      >
        Browse all topics
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[85%] max-w-sm overflow-y-auto rounded-r-3xl bg-white p-5 shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} className="mb-4 text-sm font-semibold text-slate-500">Close ✕</button>
            <HelpSidebar activeSlug={activeSlug} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
