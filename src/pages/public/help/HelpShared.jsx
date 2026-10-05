import { useEffect, useMemo, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import {
  HELP_ARTICLES,
  HELP_CENTER_PATH,
  HELP_GROUPS,
  articleSearchText,
  articlesInGroup,
} from '../../../lib/helpCenterData.js'

export function HelpSidebar({ activeSlug, onNavigate }) {
  return (
    <nav aria-label="Help Center" className="space-y-6 text-sm">
      <Link
        to={HELP_CENTER_PATH}
        onClick={onNavigate}
        className={`block rounded-lg px-3 py-2 font-semibold ${!activeSlug ? 'bg-teal-50 text-teal-800' : 'text-slate-800 hover:bg-slate-100'}`}
      >
        Help Center home
      </Link>
      {HELP_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {articlesInGroup(group.id).map((a) => (
              <li key={a.slug}>
                <Link
                  to={a.path}
                  onClick={onNavigate}
                  aria-current={a.slug === activeSlug ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-1.5 transition ${a.slug === activeSlug ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
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
      <div className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 ${large ? 'py-4' : 'py-2.5'}`}>
        <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" /></svg>
        <input
          id="help-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules, questions, free tools…"
          autoComplete="off"
          className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {q.trim().length > 1 && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-[22rem] overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {results.length ? (
            results.map(({ a }) => (
              <Link key={a.slug} to={a.path} className="block rounded-xl px-3 py-2.5 hover:bg-slate-50">
                <span className="block text-sm font-semibold text-slate-900">{a.title}</span>
                <span className="block text-xs text-slate-500">{a.summary}</span>
              </Link>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-slate-500">
              No article matches “{q}”. Try a shorter word, or <Link to="/contact" className="font-semibold text-teal-700 underline">ask our team</Link>.
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
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
        aria-expanded={open}
      >
        Browse all topics
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} className="mb-4 text-sm font-semibold text-slate-500">Close ✕</button>
            <HelpSidebar activeSlug={activeSlug} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
