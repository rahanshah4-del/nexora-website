import { useEffect, useMemo, useRef, useState } from 'react'
import { FaLinkedin } from 'react-icons/fa6'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineBookOpen, HiOutlineClock, HiOutlineSquares2X2 } from 'react-icons/hi2'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { FALLBACK, POSTER } from '../../components/RelatedBlogSection.jsx'
import { AUTHOR_PAGE_PATH, author, isAuthorConfigured } from '../../config/author.js'
import usePublishedBlogArticles from '../../hooks/usePublishedBlogArticles.js'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

// /author/ — the blog's author (src/config/author.js) and their articles.
// Mirrors the prerendered page (scripts/prerender.mjs buildAuthorPage). Stays
// noindex,follow until the config holds a real name, role and bio.
// Only facts the page can compute (article and topic counts) are shown as
// stats; nothing about the author beyond src/config/author.js is stated.

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date)
}

function minutes(article) {
  const words = Number(article.wordCount)
  return words > 0 ? Math.max(1, Math.round(words / 200)) : 0
}

// Page 1 holds a wide lead card (2 cells) + 7 cards = 9 cells; later pages hold 9 cards. Every page fills 3 full rows.
const FIRST_PAGE = 8
const PAGE_SIZE = 9

function pageSlice(list, page) {
  if (page === 1) return list.slice(0, FIRST_PAGE)
  const start = FIRST_PAGE + (page - 2) * PAGE_SIZE
  return list.slice(start, start + PAGE_SIZE)
}

function pageCount(total) {
  return total <= FIRST_PAGE ? 1 : 1 + Math.ceil((total - FIRST_PAGE) / PAGE_SIZE)
}

// 1 2 3 … 7 style list: always first, last and the neighbours of the current page.
function pageItems(current, total) {
  const keep = new Set([1, total, current - 1, current, current + 1])
  const out = []
  for (let n = 1; n <= total; n += 1) {
    if (!keep.has(n)) continue
    if (out.length && n - out[out.length - 1] > 1) out.push('gap')
    out.push(n)
  }
  return out
}

function Pagination({ page, total, onPage }) {
  if (total <= 1) return null
  const base = 'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/60'
  return (
    <nav aria-label="Article pages" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1} className={`${base} border-slate-200 bg-white text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200`}>
        <HiOutlineArrowLeft aria-hidden="true" className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
      </button>
      {pageItems(page, total).map((item, i) => (item === 'gap'
        ? <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-slate-400">…</span>
        : (
          <button key={item} type="button" onClick={() => onPage(item)} aria-label={`Page ${item}`} aria-current={item === page ? 'page' : undefined} className={`${base} ${item === page ? 'border-transparent bg-[linear-gradient(135deg,#4f46e5,#0ea5e9)] text-white shadow-[0_10px_24px_-10px_rgba(79,70,229,0.8)]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}>{item}</button>
        )))}
      <button type="button" onClick={() => onPage(page + 1)} disabled={page === total} className={`${base} border-slate-200 bg-white text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200`}>
        <span className="hidden sm:inline">Next</span> <HiOutlineArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </nav>
  )
}

// Opening animation. Pure CSS, no library; everything is switched off for prefers-reduced-motion.
const ANIMATION_CSS = `
@keyframes au-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
@keyframes au-pop { from { opacity: 0; transform: scale(.82) rotate(-4deg); } to { opacity: 1; transform: none; } }
@keyframes au-spin { to { transform: rotate(360deg); } }
@keyframes au-drift { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(2.5%, 3%, 0); } }
@keyframes au-card { from { opacity: 0; transform: translateY(30px) scale(.97); } to { opacity: 1; transform: none; } }
.au-rise { opacity: 0; animation: au-rise .8s cubic-bezier(.2,.7,.2,1) forwards; animation-delay: var(--d, 0ms); }
.au-pop { opacity: 0; animation: au-pop .9s cubic-bezier(.2,.8,.2,1) .05s forwards; }
.au-ring { animation: au-spin 9s linear infinite; }
.au-glow { animation: au-drift 14s ease-in-out infinite; }
.au-card { opacity: 0; animation: au-card .7s cubic-bezier(.2,.7,.2,1) forwards; animation-delay: var(--d, 0ms); }
@media (prefers-reduced-motion: reduce) {
  .au-rise, .au-pop, .au-card { opacity: 1; animation: none; }
  .au-ring, .au-glow { animation: none; }
}`

// Counts up to `value` once on mount (instantly under reduced motion).
function CountUp({ value }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!value) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return undefined }
    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start - 700) / 1100)
      setShown(Math.round(value * (t <= 0 ? 0 : 1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{shown}</>
}

function byNewest(a, b) {
  return String(b.publishDate || '').localeCompare(String(a.publishDate || ''))
}

function ArticleCard({ article, large, delay = 0 }) {
  const style = POSTER[article.category] || FALLBACK
  const Icon = style.Icon
  const read = minutes(article)
  const date = formatDate(article.publishDate)
  return (
    <Link
      to={`/blog/${article.slug}/`}
      className={`au-card group relative flex min-h-[17rem] flex-col justify-between overflow-hidden rounded-[1.6rem] p-6 text-white shadow-[0_20px_50px_-26px_rgba(15,23,42,0.6)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-28px_rgba(15,23,42,0.65)] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-7 h-full ${large ? 'md:min-h-[21rem]' : ''}`}
      style={{ background: `linear-gradient(145deg, ${style.from} 0%, ${style.to} 100%)`, '--d': `${delay}ms` }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-12 h-52 w-52 rounded-full bg-black/20 blur-3xl" />
      <Icon aria-hidden="true" className="pointer-events-none absolute -bottom-5 -right-3 h-40 w-40 text-white/15 transition duration-500 group-hover:rotate-6 group-hover:scale-110 motion-reduce:transition-none" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md">
          <Icon aria-hidden="true" className="h-3.5 w-3.5" /> {article.category || 'Article'}
        </span>
        {date ? <time dateTime={article.publishDate} className="text-xs font-medium text-white/80">{date}</time> : null}
      </div>
      <div className="relative">
        <h3 className={`font-display font-bold leading-[1.15] tracking-tight ${large ? 'text-[1.6rem] sm:text-[2rem] md:max-w-[80%]' : 'text-[1.3rem]'}`}>{article.title}</h3>
        {article.excerpt ? <p className="mt-3 line-clamp-2 text-[14.5px] leading-6 text-white/80">{article.excerpt}</p> : null}
        <div className="mt-5 flex items-center justify-between text-[13px] font-medium text-white/85">
          <span className="inline-flex items-center gap-1.5">{read ? <><HiOutlineClock aria-hidden="true" className="h-4 w-4" /> {read} min read</> : null}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-slate-900 transition group-hover:gap-2.5">
            Read <HiOutlineArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function AuthorPage() {
  const { articles } = usePublishedBlogArticles()
  const [topic, setTopic] = useState('All')
  const [page, setPage] = useState(1)
  const listTop = useRef(null)
  const moved = useRef(false)

  const sorted = useMemo(() => [...articles].sort(byNewest), [articles])
  const topics = useMemo(() => {
    const counts = new Map()
    sorted.forEach((a) => { if (a.category) counts.set(a.category, (counts.get(a.category) || 0) + 1) })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [sorted])
  const filtered = topic === 'All' ? sorted : sorted.filter((a) => a.category === topic)
  const total = pageCount(filtered.length)
  const current = Math.min(page, total)
  const shown = pageSlice(filtered, current)
  const lead = current === 1 && filtered.length >= 3

  // Bring the list back into view when the page changes (not on first paint).
  useEffect(() => {
    if (!moved.current) { moved.current = true; return }
    listTop.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [current, topic])
  const linkedinUrl = (author.sameAs || []).find((url) => /linkedin\.com\/in\//i.test(url))
  const initial = String(author.name || '?').trim().charAt(0).toUpperCase()

  return (
    <PublicPageShell>
      <PageSeo
        title={`${author.name} — Author at Nexora Solution`}
        description={`Articles by ${author.name} on the Nexora Solution blog.`}
        canonical={absoluteUrl(AUTHOR_PAGE_PATH)}
        path={AUTHOR_PAGE_PATH}
        robots={isAuthorConfigured() ? 'index,follow' : 'noindex,follow'}
      />

      <section className="relative isolate overflow-hidden bg-[#070d1c] text-white">
        <style>{ANIMATION_CSS}</style>
        <div aria-hidden="true" className="au-glow pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(99,102,241,0.45),transparent),radial-gradient(40rem_24rem_at_0%_110%,rgba(14,165,233,0.30),transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 sm:py-20 md:grid-cols-[auto_1fr] md:gap-14 lg:px-8 lg:py-24">
          <div className="au-pop relative mx-auto md:mx-0">
            <span aria-hidden="true" className="au-ring absolute -inset-2 rounded-full bg-[conic-gradient(from_140deg,#6366f1,#0ea5e9,#a78bfa,#6366f1)] opacity-80 blur-[2px]" />
            {author.photo ? (
              <img src={author.photo} alt={author.name} width="400" height="400" fetchpriority="high" className="relative h-40 w-40 rounded-full border-4 border-[#070d1c] object-cover sm:h-52 sm:w-52" />
            ) : (
              <span aria-hidden="true" className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-[#070d1c] bg-slate-800 text-5xl font-semibold sm:h-52 sm:w-52">{author.emoji || initial}</span>
            )}
          </div>
          <div className="text-center md:text-left">
            <p style={{ '--d': '150ms' }} className="au-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
              <HiOutlineBookOpen aria-hidden="true" className="h-4 w-4" /> Author
            </p>
            <h1 style={{ '--d': '260ms' }} className="au-rise mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{author.name}</h1>
            {author.role ? <p style={{ '--d': '380ms' }} className="au-rise mt-2 text-lg font-medium text-sky-200">{author.role}</p> : null}
            {author.bio ? <p style={{ '--d': '480ms' }} className="au-rise mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-white/75 md:mx-0">{author.bio}</p> : null}
            <div style={{ '--d': '600ms' }} className="au-rise mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {linkedinUrl ? (
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer me" aria-label={`${author.name} on LinkedIn`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-sky-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60">
                  <FaLinkedin aria-hidden="true" className="h-5 w-5 text-[#0a66c2]" /> LinkedIn
                </a>
              ) : null}
              <a href="#articles" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60">
                Read the articles <HiOutlineArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
            {sorted.length ? (
              <dl style={{ '--d': '720ms' }} className="au-rise mx-auto mt-9 grid max-w-md grid-cols-2 gap-3 md:mx-0">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur">
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">Articles</dt>
                  <dd className="mt-1 font-display text-3xl font-bold"><CountUp value={sorted.length} /></dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur">
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">Topics</dt>
                  <dd className="mt-1 font-display text-3xl font-bold"><CountUp value={topics.length} /></dd>
                </div>
              </dl>
            ) : null}
          </div>
        </div>
      </section>

      <section id="articles" ref={listTop} aria-labelledby="author-articles-heading" className="scroll-mt-24 bg-[linear-gradient(180deg,#f5f5f7_0%,#ffffff_100%)] px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="author-articles-heading" className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.4rem]">Published articles</h2>
              <p className="mt-2 text-base text-slate-500">Newest first. Pick a topic to narrow the list.</p>
            </div>
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue-600 hover:text-blue-700">
              View the whole blog <HiOutlineArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {topics.length > 1 ? (
            <div role="group" aria-label="Filter by topic" className="mt-7 flex flex-wrap gap-2">
              {[['All', sorted.length], ...topics].map(([name, count]) => {
                const on = topic === name
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setTopic(name); setPage(1) }}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/60 ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}
                  >
                    {name === 'All' ? <HiOutlineSquares2X2 aria-hidden="true" className="h-4 w-4" /> : null}
                    {name}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
          ) : null}

          <ul className="mt-9 grid gap-5 md:grid-cols-3">
            {shown.map((article, i) => (
              <li key={`${topic}-${current}-${article.slug}`} className={i === 0 && lead ? 'md:col-span-2' : ''}>
                <ArticleCard article={article} large={i === 0 && lead} delay={i * 70} />
              </li>
            ))}
          </ul>
          {!shown.length ? <p className="mt-9 text-slate-500">No articles in this topic yet.</p> : null}
          <Pagination page={current} total={total} onPage={setPage} />
          {filtered.length ? <p className="mt-4 text-center text-sm text-slate-500">Showing {Math.min(filtered.length, (current === 1 ? 0 : FIRST_PAGE + (current - 2) * PAGE_SIZE) + 1)}–{Math.min(filtered.length, (current === 1 ? 0 : FIRST_PAGE + (current - 2) * PAGE_SIZE) + shown.length)} of {filtered.length} articles</p> : null}
        </div>
      </section>
    </PublicPageShell>
  )
}
