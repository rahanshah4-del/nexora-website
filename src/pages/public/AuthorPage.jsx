import { useMemo, useState } from 'react'
import { FaLinkedin } from 'react-icons/fa6'
import { HiOutlineArrowRight, HiOutlineBookOpen, HiOutlineClock, HiOutlineSquares2X2 } from 'react-icons/hi2'
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

function byNewest(a, b) {
  return String(b.publishDate || '').localeCompare(String(a.publishDate || ''))
}

function ArticleCard({ article, large }) {
  const style = POSTER[article.category] || FALLBACK
  const Icon = style.Icon
  const read = minutes(article)
  const date = formatDate(article.publishDate)
  return (
    <Link
      to={`/blog/${article.slug}/`}
      className={`group relative flex min-h-[17rem] flex-col justify-between overflow-hidden rounded-[1.6rem] p-6 text-white shadow-[0_20px_50px_-26px_rgba(15,23,42,0.6)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-28px_rgba(15,23,42,0.65)] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-7 h-full ${large ? 'md:min-h-[21rem]' : ''}`}
      style={{ background: `linear-gradient(145deg, ${style.from} 0%, ${style.to} 100%)` }}
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

  const sorted = useMemo(() => [...articles].sort(byNewest), [articles])
  const topics = useMemo(() => {
    const counts = new Map()
    sorted.forEach((a) => { if (a.category) counts.set(a.category, (counts.get(a.category) || 0) + 1) })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [sorted])
  const shown = topic === 'All' ? sorted : sorted.filter((a) => a.category === topic)
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
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(99,102,241,0.45),transparent),radial-gradient(40rem_24rem_at_0%_110%,rgba(14,165,233,0.30),transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 sm:py-20 md:grid-cols-[auto_1fr] md:gap-14 lg:px-8 lg:py-24">
          <div className="relative mx-auto md:mx-0">
            <span aria-hidden="true" className="absolute -inset-2 rounded-full bg-[conic-gradient(from_140deg,#6366f1,#0ea5e9,#a78bfa,#6366f1)] opacity-80 blur-[2px]" />
            {author.photo ? (
              <img src={author.photo} alt={author.name} width="400" height="400" fetchpriority="high" className="relative h-40 w-40 rounded-full border-4 border-[#070d1c] object-cover sm:h-52 sm:w-52" />
            ) : (
              <span aria-hidden="true" className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-[#070d1c] bg-slate-800 text-5xl font-semibold sm:h-52 sm:w-52">{author.emoji || initial}</span>
            )}
          </div>
          <div className="text-center md:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
              <HiOutlineBookOpen aria-hidden="true" className="h-4 w-4" /> Author
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{author.name}</h1>
            {author.role ? <p className="mt-2 text-lg font-medium text-sky-200">{author.role}</p> : null}
            {author.bio ? <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-white/75 md:mx-0">{author.bio}</p> : null}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
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
              <dl className="mx-auto mt-9 grid max-w-md grid-cols-2 gap-3 md:mx-0">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur">
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">Articles</dt>
                  <dd className="mt-1 font-display text-3xl font-bold">{sorted.length}</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur">
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">Topics</dt>
                  <dd className="mt-1 font-display text-3xl font-bold">{topics.length}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        </div>
      </section>

      <section id="articles" aria-labelledby="author-articles-heading" className="scroll-mt-24 bg-[linear-gradient(180deg,#f5f5f7_0%,#ffffff_100%)] px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
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
                    onClick={() => setTopic(name)}
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
              <li key={article.slug} className={i === 0 && shown.length >= 3 ? 'md:col-span-2' : ''}>
                <ArticleCard article={article} large={i === 0 && shown.length >= 3} />
              </li>
            ))}
          </ul>
          {!shown.length ? <p className="mt-9 text-slate-500">No articles in this topic yet.</p> : null}
        </div>
      </section>
    </PublicPageShell>
  )
}
