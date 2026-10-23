import { useEffect, useMemo, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import SmoothSearch from '../../../components/SmoothSearch.jsx'
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

function HomeGlyph() {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-b from-slate-700 to-slate-900 text-white shadow-[0_6px_14px_-6px_rgba(15,23,42,.6),inset_0_1px_0_rgba(255,255,255,.25)]">
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10.5V19h12v-8.5" /></svg>
    </span>
  )
}

/** Touch-friendly, premium version of the sidebar used inside the mobile drawer. */
function DrawerSidebar({ activeSlug, onNavigate }) {
  return (
    <nav aria-label="Help Center" className="space-y-6">
      <Link
        to={HELP_CENTER_PATH}
        onClick={onNavigate}
        aria-current={!activeSlug ? 'page' : undefined}
        className={`flex min-h-[56px] items-center gap-3 rounded-2xl px-3 py-2 text-[16px] font-semibold tracking-tight ring-1 transition active:scale-[0.99] ${!activeSlug ? 'bg-white text-slate-900 shadow-[0_8px_24px_-12px_rgba(15,23,42,.35)] ring-slate-900/10' : 'bg-white/70 text-slate-800 ring-slate-900/[0.06]'}`}
      >
        <HomeGlyph />
        <span className="flex-1">Help Center home</span>
        <Chevron className="h-4 w-4 text-slate-400" />
      </Link>

      {HELP_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`drawer-group-${group.id}`}>
          <div className="mb-2 flex items-center gap-2.5 px-1">
            <GroupTile id={group.id} />
            <h3 id={`drawer-group-${group.id}`} className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">{group.title}</h3>
          </div>
          <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,.04)]">
            {articlesInGroup(group.id).map((a, i) => {
              const active = a.slug === activeSlug
              return (
                <li key={a.slug} className={i > 0 ? 'border-t border-slate-100' : ''}>
                  <Link
                    to={a.path}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex min-h-[48px] items-center gap-3 px-4 py-2.5 text-[15px] leading-snug transition active:bg-slate-100 ${active ? 'bg-[#0071e3]/[0.07] font-semibold text-[#0062c4]' : 'text-slate-700'}`}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#0071e3]" aria-hidden="true" />}
                    <span className="min-w-0 flex-1">{a.title}</span>
                    <Chevron className={`h-4 w-4 shrink-0 ${active ? 'text-[#0071e3]' : 'text-slate-300'}`} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </nav>
  )
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
export function HelpSearch({ large = false, onNavigate }) {
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
      <SmoothSearch
        id="help-search"
        size={large ? 'lg' : 'md'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={large ? 'Search modules, questions, free tools…' : 'Search help'}
      />
      {q.trim().length > 1 && (
        <div className="absolute left-0 right-0 z-30 mt-3 max-h-[22rem] overflow-auto rounded-3xl bg-white p-2 text-left shadow-[0_20px_60px_-15px_rgba(0,0,0,.3)] ring-1 ring-slate-900/[0.06]">
          {results.length ? (
            results.map(({ a }) => (
              <Link key={a.slug} to={a.path} onClick={onNavigate} className="block rounded-2xl px-4 py-2.5 hover:bg-slate-100">
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
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.06),0_10px_28px_-14px_rgba(15,23,42,.25)] ring-1 ring-slate-900/[0.06] transition active:scale-[0.99]"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#3b9cff] to-[#0a6cf0] text-white">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" /></svg>
        </span>
        <span className="flex-1 text-left">Browse all topics</span>
        <Chevron className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Help Center topics">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-[88%] max-w-[22rem] flex-col rounded-r-[28px] bg-[#f5f5f7] shadow-[0_30px_80px_-20px_rgba(0,0,0,.5)]" style={{ fontFamily: APPLE_FONT }}>
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#0071e3]">Nexora</p>
                <p className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">Help Center</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,.08)] ring-1 ring-slate-900/[0.06] transition active:scale-95"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
              </button>
            </div>
            <div className="relative z-20 px-4 pb-3">
              <HelpSearch onNavigate={() => setOpen(false)} />
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1">
              <DrawerSidebar activeSlug={activeSlug} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
