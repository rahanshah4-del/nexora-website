import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Link from '../../components/AppLink.jsx'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineLink,
  HiOutlineListBullet,
  HiOutlineShare,
  HiOutlineTag,
  HiOutlineUserCircle,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import { getBlogArticle } from '../../lib/blogData.js'
import usePublishedBlogArticles from '../../hooks/usePublishedBlogArticles.js'
import { trackBlogView } from '../../lib/blogViews.js'
import { buildLocalizedPath, buildLocalizedCanonical } from '../../lib/blogLanguages.js'
import { absoluteUrl, createArticleSchema } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'
import AITermTooltip from '../../components/AITermTooltip.jsx'
import AIHighlightTooltip from '../../components/AIHighlightTooltip.jsx'
import { createHighlightBudget, formatBlogContent, injectAiHighlightSpans } from '../../lib/blogContentFormatter.js'
import { documentLoadPath, resolveMissingArticle } from '../../lib/blogArticleFallback.js'
import { isNoindexPost, NOINDEX_FOLLOW } from '../../lib/indexingRules.js'
import AuthorBox from '../../components/AuthorBox.jsx'

const NotFoundPage = lazy(() => import('./NotFoundPage.jsx'))

// How long to wait for Firestore when the article is not in memory. After that,
// an in-app navigation falls back to a full page load (which serves the
// prerendered article, seed included) and a direct load shows the not-found
// page. Offline, the Firestore SDK never reports an error, so without this the
// skeleton would stay forever.
const FIRESTORE_WAIT_MS = 6000

function calculateReadingTime(article) {
  const text = [
    ...article.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...article.faqs.flatMap(([q, a]) => [q, a]),
  ].join(' ')
  const words = text.split(/\s+/).filter(Boolean).length
  const mins = Math.max(1, Math.ceil(words / 200))
  return { readingTime: `${mins} min read`, wordCount: words }
}

function shareLinks(article) {
  const url = encodeURIComponent(article.canonical)
  const text = encodeURIComponent(article.title)
  return [
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${url}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${url}`],
    ['X', `https://twitter.com/intent/tweet?url=${url}&text=${text}`],
    ['WhatsApp', `https://wa.me/?text=${text}%20${url}`],
  ]
}

function ShareButton({ label, href }) {
  const icons = {
    LinkedIn: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg>,
    Facebook: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    X: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    WhatsApp: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Share on ${label}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-slate-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:scale-[0.92]"
    >
      {icons[label] || <HiOutlineLink className="h-4 w-4" />}
    </a>
  )
}

function ArticleCard({ article, label }) {
  if (!article) return null
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group block rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-[0_24px_60px_-16px_rgba(37,99,235,0.24)] active:scale-[0.98]"
    >
      {label ? (
        <span className="inline-flex items-center rounded-lg border border-blue-100/60 bg-white/80 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-blue-700 shadow-sm backdrop-blur-sm">
          {label}
        </span>
      ) : null}
      <p className="mt-3 text-lg font-medium text-slate-900 transition-colors duration-200 group-hover:text-blue-700">{article.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500 line-clamp-2">{article.excerpt}</p>
    </Link>
  )
}

export default function BlogArticlePage() {
  const { slug } = useParams()
  const { articles, loading } = usePublishedBlogArticles(slug)
  const article = articles.find((item) => item.slug === slug) || getBlogArticle(slug)

  /* Hooks must run on every render — this effect was previously below the
     early returns, which crashed with "Rendered more hooks than during the
     previous render" when the skeleton swapped to the article. */
  const articleSlug = article?.slug || ''
  useEffect(() => {
    if (articleSlug) trackBlogView(articleSlug)
  }, [articleSlug])

  /* No article in memory. This used to <Navigate to="/blog">, which turned
     every CMS-only post into a copy of the blog index whenever Firestore was
     slow or unreachable. Now: after an in-app navigation, load the URL for real
     (the prerendered page carries the article); on the document's own URL,
     where the HTML had no article, show the not-found page — never a redirect. */
  const { pathname } = useLocation()
  // Keyed by slug: the route component is reused across posts, so a wait that
  // ran out on one post must not count for the next.
  const [waitedOutSlug, setWaitedOutSlug] = useState('')
  const stillWaiting = !article && loading
  useEffect(() => {
    if (!stillWaiting) return undefined
    const timer = window.setTimeout(() => setWaitedOutSlug(slug), FIRESTORE_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [stillWaiting, slug])
  const missing = resolveMissingArticle({
    hasArticle: Boolean(article),
    loading,
    waitedOut: waitedOutSlug === slug,
    routePath: pathname,
    documentPath: documentLoadPath(),
  })
  const reloadForPrerenderedPage = missing === 'reload'
  useEffect(() => {
    if (reloadForPrerenderedPage) window.location.replace(window.location.href)
  }, [reloadForPrerenderedPage])

  /* ── Articles are English-only ──────────────────────────────────────────
     The reader-language switcher, the per-article Firestore translation load
     and the getAvailableTranslationLangs() availability read used to live here.
     They were removed with the translated blog: the `blogTranslations`
     documents are keyed to a retired generation of article slugs, so no
     translated article has ever been prerendered, /<lang>/blog/<slug>/ now
     returns a real 404 (see SPA_ROUTES in worker/index.js), and the switcher
     navigated straight into it via window.location.href — a dead end with no
     route back to the article. There was no correct destination left for it.

     If translated articles are ever generated, what needs to come back is:
     the reader-language state and the Firestore load (loadBlogTranslationFromFirestore),
     the availability read that drives hreflang (so only languages with a real
     page are advertised), the dropdown UI, and the locale-prefixed entries in
     SPA_ROUTES. The SEO block below would also need its per-language canonical
     and hreflang group restored. The Arabic-script vs Roman Urdu question noted
     in scripts/prerender.mjs has to be settled first. ───────────────────── */

  if (missing === 'wait' || missing === 'reload') {
    return (
      <PublicPageShell>
        <section className="bg-white">
          <style>{`
            @keyframes applePulse { 0%, 100% { opacity: .3; } 50% { opacity: .7; } }
            @keyframes appleShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            @media (prefers-reduced-motion: reduce) {
              .apple-pulse { animation: none !important; opacity: .3 !important; }
              .apple-shimmer { animation: none !important; display: none !important; }
            }
            .apple-pulse { animation: applePulse 2s ease-in-out infinite; }
            .apple-shimmer-wrap { overflow: hidden; position: relative; }
            .apple-shimmer { position: absolute; inset: 0; background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,.5) 50%,transparent 100%); animation: appleShimmer 1.8s ease-in-out infinite; }
            .skeleton-box { border-radius: .75rem; background: #e2e8f0; }
            .skeleton-box-pulse { border-radius: .75rem; background: #e2e8f0; animation: applePulse 2s ease-in-out infinite; }
          `}</style>

          <div className="relative overflow-hidden pb-12 pt-16 sm:pb-16 sm:pt-20 lg:pb-20 lg:pt-16">
            <div className="soft-arc-bg pointer-events-none" />
            <div className="relative mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
              {/* Back button skeleton */}
              <div className="h-10 w-28 skeleton-box-pulse" />

              {/* Category + reading-time pills */}
              <div className="mt-8 flex items-center gap-2">
                <div className="h-6 w-24 skeleton-box-pulse rounded-lg" />
                <div className="h-4 w-20 skeleton-box-pulse" />
                <div className="h-4 w-24 skeleton-box-pulse" />
              </div>

              {/* Title skeleton — multi-line */}
              <div className="mt-5 space-y-3">
                <div className="h-14 w-full max-w-2xl skeleton-box-pulse rounded-xl" />
                <div className="h-14 w-3/4 skeleton-box-pulse rounded-xl" />
              </div>

              {/* Excerpt */}
              <div className="mt-6">
                <div className="h-5 w-full max-w-xl skeleton-box-pulse" />
                <div className="mt-2 h-5 w-2/3 skeleton-box-pulse" />
              </div>

              {/* Author / date / updated row */}
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="h-12 skeleton-box-pulse" />
                <div className="h-12 skeleton-box-pulse" />
                <div className="h-12 skeleton-box-pulse" />
              </div>
            </div>
          </div>

          {/* Hero image skeleton */}
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[18rem_1fr] lg:px-8">
              <div className="hidden lg:block">
                <div className="h-72 skeleton-box-pulse" />
              </div>
              <div>
                <div className="relative overflow-hidden rounded-[1.35rem] sm:rounded-[1.6rem]">
                  <div className="aspect-[1200/675] skeleton-box-pulse apple-shimmer-wrap">
                    <div className="apple-shimmer" />
                  </div>
                </div>

                {/* Paragraph skeletons */}
                <div className="mt-10 space-y-4">
                  <div className="h-8 w-1/2 skeleton-box-pulse" />
                  <div className="h-5 w-full skeleton-box-pulse" />
                  <div className="h-5 w-full skeleton-box-pulse" />
                  <div className="h-5 w-5/6 skeleton-box-pulse" />
                  <div className="h-5 w-full skeleton-box-pulse" />
                  <div className="h-5 w-4/5 skeleton-box-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </PublicPageShell>
    )
  }

  if (!article) return <Suspense fallback={null}><NotFoundPage /></Suspense>

  const { readingTime, wordCount } = calculateReadingTime(article)
  const articleIndex = articles.findIndex((item) => item.slug === article.slug)
  const adjacent = {
    previous: articleIndex > 0 ? articles[articleIndex - 1] : null,
    next: articleIndex >= 0 && articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null,
  }
  const relatedArticles = articles
    .filter((item) => item.slug !== article.slug)
    .map((item) => ({
      item,
      score: (item.category === article.category ? 3 : 0) + item.tags.filter((tag) => article.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || String(b.publishDate || '').localeCompare(String(a.publishDate || '')))
    .slice(0, 3)
    .map(({ item }) => item)
  const articleSchema = createArticleSchema({
    path: article.path,
    headline: article.title,
    description: article.metaDescription,
    image: article.featuredImage,
    authorName: article.author.name,
    authorUrl: article.author.url,
    authorImage: article.author.photo,
    datePublished: article.publishDate,
    dateModified: article.updatedDate,
    category: article.category,
    tags: article.tags,
    wordCount: article.wordCount,
  })

  /* SEO identity is always the English article, whatever path this renders at.
     Hardcoding 'en' is what makes a locale-prefixed URL self-heal: the eight
     /<lang>/blog/:slug routes are still registered in src/AppRouter.jsx but are
     unreachable over HTTP (the Worker 404s them) and nothing links to them, and
     if one ever did render it would canonicalize back to the English original
     rather than claiming to be a translation.
     No hreflang props are passed: an article has no translated sibling, so there
     is no group to advertise. PageSeo clears any static hreflang link when
     `hreflangs` is absent, which matches buildHreflangBlock() in
     scripts/prerender.mjs emitting an empty block. Omitting `currentLang` and
     `ogLocale` likewise lands on PageSeo's en/en_PK defaults. */
  const seoCanonical = buildLocalizedCanonical(article.slug, 'en')
  const seoPath = buildLocalizedPath(article.slug, 'en')
  // Fresh each render so a re-render re-highlights identically. Deliberately not
  // memoised: the budget is consumed as the sections below format, so a cached
  // one would come back already spent and render the article with no highlights.
  const highlightBudget = createHighlightBudget()

  return (
    <PublicPageShell>
      <PageSeo
        title={article.seoTitle}
        description={article.metaDescription}
        canonical={seoCanonical}
        path={seoPath}
        robots={isNoindexPost(article.slug) ? NOINDEX_FOLLOW : 'index,follow'}
        ogTitle={article.title}
        ogDescription={article.metaDescription}
        ogImage={absoluteUrl(article.featuredImage)}
        twitterCard="summary_large_image"
        faqItems={article.faqs}
        structuredData={[articleSchema]}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/blog">Blog</Link>
        <span> / </span>
        <span aria-current="page">{article.title}</span>
      </nav>

      <article>
        <header className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-12 pt-20 sm:pb-16 sm:pt-24 lg:pb-20 lg:pt-28">
          <div className="soft-arc-bg pointer-events-none" />
          <div className="relative mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Link
              to="/blog"
              className="group inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/75 px-4 py-2 text-[13px] font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-px hover:border-slate-300/70 hover:bg-white hover:text-slate-500 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97] active:shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:min-h-[42px] sm:px-5 sm:text-sm"
            >
              <HiOutlineArrowLeft className="h-[17px] w-[17px] transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to Blog
            </Link>
            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-medium text-blue-700">
              <Link to={`/blog/?category=${encodeURIComponent(article.category)}`} className="rounded-lg border border-blue-100/60 bg-white/80 px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-blue-700 shadow-sm backdrop-blur-sm transition hover:bg-blue-100 active:scale-[0.96]">
                {article.category}
              </Link>
              {article.keywords && article.keywords.length > 0 ? article.keywords.slice(0, 4).map((kw) => (
                <span key={kw} className="rounded-full border border-[#0071e3]/20 bg-[#0071e3]/5 px-2.5 py-1 text-[10px] font-semibold text-[#0071e3]">
                  {kw}
                </span>
              )) : null}
              <span className="text-slate-400">{readingTime}</span>
              <span className="text-slate-400">{wordCount.toLocaleString('en-PK')} words</span>
            </div>
            <h1 className="mt-5 max-w-4xl text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.02em] text-slate-900 sm:text-[2.5rem] sm:leading-[1.08] lg:text-[3.1rem] lg:leading-[1.06]">
              {article.title}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-500 sm:text-lg">{article.excerpt}</p>
            <div className="mt-7 grid gap-3 text-sm font-medium text-slate-500 sm:grid-cols-3">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <HiOutlineUserCircle className="h-5 w-5 text-blue-700" />
                {article.author.name}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <HiOutlineCalendarDays className="h-5 w-5 text-blue-700" />
                Published {article.publishDate}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <HiOutlineClock className="h-5 w-5 text-blue-700" />
                Updated {article.updatedDate}
              </span>
            </div>
          </div>
        </header>

        <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[18rem_1fr] lg:px-8">
            <aside className="h-max rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:sticky lg:top-24">
              <div className="flex items-center gap-2">
                <HiOutlineDocumentText className="h-4 w-4 text-blue-600" />
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-400">Table of Contents</p>
              </div>
              <div className="mt-4 grid max-h-52 gap-1 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
                {article.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.97]"
                  >
                    <HiOutlineListBullet className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition-colors duration-200 group-hover:text-blue-400" />
                    <span className="leading-tight">{section.heading}</span>
                  </a>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-100/60 pt-5">
                <div className="flex items-center gap-2">
                  <HiOutlineShare className="h-4 w-4 text-blue-600" />
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-400">Share</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {shareLinks(article).map(([label, href]) => (
                    <ShareButton key={label} label={label} href={href} />
                  ))}
                </div>
              </div>
            </aside>

            <div>
              <div className="relative grid max-h-[260px] place-items-center overflow-hidden rounded-[1.35rem] border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50 shadow-[0_28px_76px_-52px_rgba(37,99,235,0.42)] sm:rounded-[1.6rem] md:max-h-[420px] lg:max-h-[520px]">
                <div aria-hidden="true" className="absolute inset-0 bg-slate-200/60" style={{ animation: 'nexoraImgShimmer 1.5s ease-in-out infinite' }} />
                <img
                  src={article.featuredImage}
                  alt={article.featuredImageAlt}
                  width="1200"
                  height="675"
                  decoding="async"
                  fetchpriority="high"
                  className="relative max-h-[260px] w-full object-contain object-center md:max-h-[420px] lg:max-h-[520px]"
                  style={{ aspectRatio: '1200 / 675' }}
                  onLoad={(e) => {
                    const s = e.currentTarget.previousElementSibling
                    if (s) s.style.display = 'none'
                    e.currentTarget.classList.add('nexora-img-fade-in')
                  }}
                  onError={(e) => {
                    const s = e.currentTarget.previousElementSibling
                    if (s) s.style.display = 'none'
                  }}
                />
              </div>

              <div className="prose prose-slate mt-10 max-w-none">
                {article.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-28">
                    <h2 className="mt-10 text-3xl font-medium tracking-tight text-slate-900">{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => {
                      const formatted = formatBlogContent(paragraph.replace(/</g, '&lt;').replace(/>/g, '&gt;'), { html: true, autoHighlight: true, budget: highlightBudget })
                      const withHighlights = article.aiHighlights?.length ? injectAiHighlightSpans(formatted, article.aiHighlights) : formatted
                      return (
                        <p
                          key={paragraph.slice(0, 40)}
                          className="mt-5 text-base leading-8 text-slate-500"
                          dangerouslySetInnerHTML={{ __html: withHighlights }}
                        />
                      )
                    })}
                  </section>
                ))}
              </div>

              {article.primaryLink || article.secondaryLinks?.length ? (
                <div className="mt-8 rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm leading-7 text-slate-500">
                    <span className="font-medium text-slate-900">Continue exploring: </span>
                    {[article.primaryLink, ...(article.secondaryLinks || [])].filter(Boolean).map((link, i) => (
                      <span key={link.to}>
                        {i > 0 ? ' · ' : null}
                        <Link to={link.to} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{link.label}</Link>
                      </span>
                    ))}
                  </p>
                </div>
              ) : null}

              <div className="mt-10 flex flex-wrap gap-1.5">
                {article.tags.map((item) => (
                  <Link key={item} to={`/blog/?tag=${encodeURIComponent(item)}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[0.7rem] font-medium text-slate-500 shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.96]">
                    <HiOutlineTag className="h-3 w-3" />
                    {item}
                  </Link>
                ))}
              </div>

              <section className="mt-14 rounded-[1.8rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 sm:p-8">
                <h2 className="text-3xl font-medium tracking-tight text-slate-900">Frequently asked questions</h2>
                <div className="mt-6 grid gap-4">
                  {article.faqs.map(([question, answer]) => (
                    <div key={question} className="rounded-[1.2rem] bg-white p-5 shadow-sm">
                      <h3 className="text-base font-medium text-slate-900">{question}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-14">
                <AuthorBox author={article.author} />
              </div>

              <section className="mt-14 grid gap-4 md:grid-cols-2">
                <ArticleCard article={adjacent.previous} label="Previous Article" />
                <ArticleCard article={adjacent.next} label="Next Article" />
              </section>

              <section className="mt-14">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-lg border border-blue-100/60 bg-white/80 px-3.5 py-2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur-sm">
                      Related Articles
                    </span>
                    <h2 className="website-section-heading mt-5 text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
                      Keep reading
                    </h2>
                  </div>
                  <Link to="/blog" className="premium-button-secondary w-max transition active:scale-[0.97]">
                    View Blog
                    <HiOutlineArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {relatedArticles.map((item) => (
                    <ArticleCard key={item.slug} article={item} />
                  ))}
                </div>
              </section>

              {/* ── Nexora Solution brand footer ── */}
              <footer className="mt-12 rounded-2xl border border-slate-200/60 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5 sm:px-8 text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Powered by</p>
                <p className="mt-1 text-[15px] font-black text-slate-900 tracking-tight">Nexora Solution</p>
                <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-slate-500">
                  Nexora Solution is Pakistan&rsquo;s AI-powered POS, CRM, ERP and Business Automation platform helping restaurants, retail stores, schools and growing businesses operate smarter with intelligent AI features.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[12px] font-semibold">
                  <a href="https://nexorasolution.online" className="text-blue-600 hover:underline">nexorasolution.online</a>
                  <span className="text-slate-300">·</span>
                  <Link to="/blog" className="text-blue-600 hover:underline">Nexora Blog</Link>
                </div>
              </footer>
            </div>
          </div>
        </section>
      </article>
      {/* Nexora AI — floating term tooltips on hover */}
      <AITermTooltip />
      <AIHighlightTooltip />
    </PublicPageShell>
  )
}
