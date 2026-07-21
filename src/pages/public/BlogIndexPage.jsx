import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineXMark,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import usePublishedBlogArticles from '../../hooks/usePublishedBlogArticles.js'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

const pageSize = 6

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function pageNumbers(totalPages) {
  return Array.from({ length: totalPages }, (_, i) => i + 1)
}

function categoriesWithCounts(articles) {
  const counts = new Map()
  articles.forEach((a) => counts.set(a.category, (counts.get(a.category) || 0) + 1))
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => a.category.localeCompare(b.category))
}

function tagsWithCounts(articles) {
  const counts = new Map()
  articles.forEach((a) => a.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)))
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag))
}

export default function BlogIndexPage() {
  const [params, setParams] = useSearchParams()
  const [searchValue, setSearchValue] = useState(params.get('q') || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { articles, loading } = usePublishedBlogArticles()

  const category = params.get('category') || 'All'
  const tag = params.get('tag') || ''
  const page = Math.max(1, Number(params.get('page') || 1))

  const categories = useMemo(() => categoriesWithCounts(articles), [articles])
  const tags = useMemo(() => tagsWithCounts(articles), [articles])

  const filteredArticles = useMemo(() => {
    const query = normalize(params.get('q'))
    return articles.filter((a) => {
      const cat = category === 'All' || a.category === category
      const t = !tag || a.tags.includes(tag)
      const hay = normalize(`${a.title} ${a.excerpt} ${a.category} ${a.tags.join(' ')}`)
      return cat && t && (!query || hay.includes(query))
    })
  }, [articles, category, params, tag])

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleArticles = filteredArticles.slice((safePage - 1) * pageSize, safePage * pageSize)

  function updateFilter(next) {
    const np = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v ? np.set(k, v) : np.delete(k)))
    np.delete('page')
    setParams(np)
  }

  function submitSearch(e) {
    e.preventDefault()
    updateFilter({ q: searchValue.trim() })
  }

  const FilterContent = () => (
    <>
      <form onSubmit={(e) => { submitSearch(e); setFiltersOpen(false) }} className="relative">
        <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search articles..."
          className="h-12 w-full rounded-xl border border-slate-200/60 bg-slate-50 pl-11 pr-4 text-[14px] font-medium tracking-[-0.01em] text-slate-500 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
        />
      </form>

      <div className="mt-7">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-400">Categories</p>
        <div className="mt-3 grid gap-1.5">
          <button
            type="button"
            onClick={() => { updateFilter({ category: '', tag: '' }); setFiltersOpen(false) }}
            className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 active:scale-[0.98] ${
              category === 'All' && !tag
                ? 'bg-slate-900 text-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.2)]'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All Articles
          </button>
          {categories.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() => { updateFilter({ category: item.category, tag: '' }); setFiltersOpen(false) }}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 active:scale-[0.98] ${
                category === item.category
                  ? 'bg-slate-900 text-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.2)]'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{item.category}</span>
              <span className="text-[11px] opacity-60">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-400">Popular Tags</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.slice(0, 15).map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => { updateFilter({ tag: item.tag }); setFiltersOpen(false) }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[-0.01em] transition-all duration-200 active:scale-[0.96] ${
                tag === item.tag
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <HiOutlineTag className="h-3 w-3" />
              {item.tag}
            </button>
          ))}
        </div>
      </div>

      {(category !== 'All' || tag || params.get('q')) ? (
        <button
          type="button"
          onClick={() => { setSearchValue(''); setParams({}); setFiltersOpen(false) }}
          className="mt-7 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200/60 bg-white/80 py-2.5 text-[12px] font-medium tracking-[-0.01em] text-slate-500 transition-all duration-200 hover:border-slate-300 hover:text-slate-500 active:scale-[0.97]"
        >
          Clear all filters
        </button>
      ) : null}
    </>
  )

  return (
    <PublicPageShell>
      <PageSeo
        title="Nexora Blog | POS, ERP, CRM, AI and Business Software Guides"
        description="Read SEO-ready guides from Nexora Solution about Restaurant POS, Retail POS, School ERP, Transport Software, CRM, WhatsApp CRM, AI and business technology."
        canonical={absoluteUrl('/blog')}
        path="/blog"
        ogTitle="Nexora Blog"
        ogDescription="Practical business software guides for Pakistani businesses."
        twitterCard="summary_large_image"
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Blog</span>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-22 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
            Nexora Blog
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-[2.4rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.4rem] lg:text-[4rem]">
            Business software guides for{' '}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              smarter growth.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-slate-500 sm:text-[17px]">
            Practical guides about POS, ERP, CRM, WhatsApp automation, AI, and business operations — written for Pakistani teams.
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">

            {/* Mobile filter toggle */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200/60 bg-white/80 px-4 text-[14px] font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:bg-white active:scale-[0.98]"
              >
                <span className="flex items-center gap-2.5">
                  <HiOutlineMagnifyingGlass className="h-[18px] w-[18px] text-slate-400" />
                  Filters
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  {(category !== 'All' || tag || params.get('q')) ? 'Active' : 'All'}
                </span>
              </button>
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden h-max lg:block">
              <div className="sticky top-24 rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)]">
                <FilterContent />
              </div>
            </aside>

            {/* Articles area */}
            <div>
              {/* Status bar */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[13px] font-medium tracking-[-0.01em] text-slate-400">
                  {loading
                    ? 'Loading articles...'
                    : `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''}`}
                </p>
                {(category !== 'All' || tag || params.get('q')) ? (
                  <button
                    type="button"
                    onClick={() => { setSearchValue(''); setParams({}) }}
                    className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-500"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>

              {/* Article grid */}
              {visibleArticles.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {visibleArticles.map((article, i) => {
                    const text = [
                      ...article.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
                      ...article.faqs.flatMap(([q, a]) => [q, a]),
                    ].join(' ')
                    const wordCount = text.split(/\s+/).filter(Boolean).length
                    const rTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`

                    return (
                      <article
                        key={article.slug}
                        className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/60 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/60 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] active:scale-[0.99]"
                      >
                        {/* Image */}
                        <Link
                          to={`/blog/${article.slug}`}
                          className="relative grid h-[200px] place-items-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 sm:h-[220px]"
                        >
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-slate-200/60"
                            style={{ animation: 'nexoraImgShimmer 1.5s ease-in-out infinite' }}
                          />
                          <img
                            src={article.featuredImage}
                            alt={article.featuredImageAlt}
                            loading={i < 2 ? 'eager' : 'lazy'}
                            decoding="async"
                            fetchpriority={i < 2 ? 'high' : 'low'}
                            width="640"
                            height="360"
                            className="relative h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
                            style={{ aspectRatio: '640 / 360' }}
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
                        </Link>

                        {/* Content */}
                        <div className="flex flex-1 flex-col p-5">
                          {/* Meta row */}
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">
                              {article.category}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <HiOutlineCalendarDays className="h-3 w-3" />
                              {article.publishDate}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <HiOutlineClock className="h-3 w-3" />
                              {rTime}
                            </span>
                          </div>

                          {/* Title */}
                          <h2 className="mt-3 text-[17px] font-medium leading-[1.35] tracking-[-0.01em] text-slate-900">
                            <Link
                              to={`/blog/${article.slug}`}
                              className="transition-colors duration-200 hover:text-slate-500"
                            >
                              {article.title}
                            </Link>
                          </h2>

                          {/* Excerpt */}
                          <p className="mt-2 text-[13px] leading-[1.65] text-slate-500 line-clamp-2">
                            {article.excerpt}
                          </p>

                          {/* Tags */}
                          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                            {article.tags.slice(0, 3).map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => updateFilter({ tag: item })}
                                className="rounded-full border border-slate-100 bg-slate-50/70 px-2.5 py-1 text-[10px] font-medium text-slate-500 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:text-slate-500 active:scale-[0.96]"
                              >
                                #{item}
                              </button>
                            ))}
                          </div>

                          {/* Read more */}
                          <Link
                            to={`/blog/${article.slug}`}
                            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-slate-500 transition-all duration-200 hover:gap-2 hover:text-slate-900"
                          >
                            Read article
                            <HiOutlineArrowRight className="h-[14px] w-[14px] transition-transform duration-200 group-hover:translate-x-0.5" />
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-[15px] font-medium text-slate-400">No articles found</p>
                  <p className="mt-1 text-[13px] text-slate-400">Try adjusting your filters or search terms.</p>
                  <button
                    type="button"
                    onClick={() => { setSearchValue(''); setParams({}) }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/80 px-4 py-2 text-[13px] font-medium tracking-[-0.01em] text-slate-500 transition-all duration-200 hover:bg-white active:scale-[0.97]"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 ? (
                <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
                  {pageNumbers(totalPages).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        const np = new URLSearchParams(params)
                        np.set('page', String(item))
                        setParams(np)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 active:scale-[0.94] ${
                        safePage === item
                          ? 'bg-slate-900 text-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.2)]'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-500'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </nav>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Mobile filter drawer ── */}
        <div className={`fixed inset-0 z-[60] lg:hidden ${filtersOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${filtersOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setFiltersOpen(false)}
          />

          {/* Sheet */}
          <div
            className={`absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[1.8rem] bg-white shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.18)] transition-transform duration-350 ease-out ${filtersOpen ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ transitionDuration: '350ms', transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
          >
            <div className="sticky top-0 z-10 flex justify-center rounded-t-[1.8rem] bg-white pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-300/70" />
            </div>
            <div className="flex items-center justify-between px-6 py-3">
              <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 hover:bg-slate-200 active:scale-95"
                aria-label="Close filters"
              >
                <HiOutlineXMark className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
            <div className="px-6 pb-8">
              <FilterContent />
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
