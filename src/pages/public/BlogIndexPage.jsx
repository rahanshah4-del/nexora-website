import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlineMagnifyingGlass, HiOutlineTag, HiOutlineXMark } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import usePublishedBlogArticles from '../../hooks/usePublishedBlogArticles.js'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

const pageSize = 6

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function pageNumbers(totalPages) {
  return Array.from({ length: totalPages }, (_, index) => index + 1)
}

function categoriesWithCounts(articles) {
  const counts = new Map()
  articles.forEach((article) => counts.set(article.category, (counts.get(article.category) || 0) + 1))
  return Array.from(counts.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => a.category.localeCompare(b.category))
}

function tagsWithCounts(articles) {
  const counts = new Map()
  articles.forEach((article) => article.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)))
  return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag))
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
    return articles.filter((article) => {
      const matchesCategory = category === 'All' || article.category === category
      const matchesTag = !tag || article.tags.includes(tag)
      const haystack = normalize(`${article.title} ${article.excerpt} ${article.category} ${article.tags.join(' ')}`)
      const matchesSearch = !query || haystack.includes(query)
      return matchesCategory && matchesTag && matchesSearch
    })
  }, [articles, category, params, tag])

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleArticles = filteredArticles.slice((safePage - 1) * pageSize, safePage * pageSize)

  function updateFilter(next) {
    const nextParams = new URLSearchParams(params)
    Object.entries(next).forEach(([key, value]) => {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    })
    nextParams.delete('page')
    setParams(nextParams)
  }

  function submitSearch(event) {
    event.preventDefault()
    updateFilter({ q: searchValue.trim() })
  }

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

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-14 pt-12 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            Nexora Blog
          </span>
          <h1 className="website-hero-heading mx-auto mt-6 max-w-5xl text-[2.85rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.4rem] lg:text-[5.7rem]">
            Business software guides for <span className="marker-highlight marker-highlight-blue">smarter growth.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            Explore practical guides about POS, ERP, CRM, WhatsApp automation, AI, technology and business operations.
          </p>
        </div>
      </section>

      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            {/* Mobile filter toggle — Apple style */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 px-5 text-sm font-semibold tracking-[-0.01em] text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:bg-white hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.08)] active:scale-[0.98]"
              >
                <span className="flex items-center gap-2.5">
                  <HiOutlineMagnifyingGlass className="h-[18px] w-[18px] text-slate-400" />
                  Search & filters
                </span>
                <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-semibold tracking-[-0.01em] text-slate-500">
                  {(category !== 'All' || tag || params.get('q')) ? 'Active' : 'All'}
                </span>
              </button>
            </div>

            {/* Desktop sidebar — always visible */}
            <aside className="hidden h-max rounded-[1.35rem] border border-blue-100 bg-white p-5 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)] lg:block">
              <form onSubmit={submitSearch} className="relative">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search blog"
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
                />
              </form>

              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Categories</p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => updateFilter({ category: '', tag: '' })}
                    className={`rounded-xl px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${category === 'All' && !tag ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    All Articles
                  </button>
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item.category}
                      onClick={() => updateFilter({ category: item.category, tag: '' })}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${category === item.category ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                    >
                      <span>{item.category}</span>
                      <span>{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.slice(0, 18).map((item) => (
                    <button
                      type="button"
                      key={item.tag}
                      onClick={() => updateFilter({ tag: item.tag })}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition active:scale-[0.96] ${tag === item.tag ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                    >
                      <HiOutlineTag className="h-3.5 w-3.5" />
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-500">
                  {loading ? 'Loading latest articles...' : `Showing ${visibleArticles.length} of ${filteredArticles.length} articles`}
                </p>
                {(category !== 'All' || tag || params.get('q')) && (
                  <button type="button" onClick={() => { setSearchValue(''); setParams({}) }} className="w-max text-sm font-black text-blue-700 transition active:scale-[0.96]">
                    Clear filters
                  </button>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
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
                      className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-16px_rgba(37,99,235,0.28)] active:scale-[0.99]"
                    >
                      <Link
                        to={`/blog/${article.slug}`}
                        className="relative grid h-[190px] place-items-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 sm:h-[220px] lg:h-[250px]"
                      >
                        <div aria-hidden="true" className="absolute inset-0 bg-slate-200/60" style={{ animation: 'nexoraImgShimmer 1.5s ease-in-out infinite' }} />
                        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                            const s = e.currentTarget.previousElementSibling?.previousElementSibling
                            if (s) s.style.display = 'none'
                            e.currentTarget.classList.add('nexora-img-fade-in')
                          }}
                          onError={(e) => {
                            const s = e.currentTarget.previousElementSibling?.previousElementSibling
                            if (s) s.style.display = 'none'
                          }}
                        />
                      </Link>
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-lg border border-blue-100/60 bg-white/80 px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-blue-700 shadow-sm backdrop-blur-sm">
                            {article.category}
                          </span>
                          <span className="text-[0.7rem] font-semibold text-slate-400">{rTime}</span>
                        </div>
                        <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                          <Link to={`/blog/${article.slug}`} className="transition-colors duration-200 hover:text-blue-700">
                            {article.title}
                          </Link>
                        </h2>
                        <p className="mt-2.5 text-sm leading-7 text-slate-500 line-clamp-3">{article.excerpt}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {article.tags.slice(0, 3).map((item) => (
                            <button
                              type="button"
                              key={item}
                              onClick={() => updateFilter({ tag: item })}
                              className="rounded-full border border-slate-100 bg-slate-50/70 px-2.5 py-1 text-[0.65rem] font-bold text-slate-500 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.96]"
                            >
                              #{item}
                            </button>
                          ))}
                        </div>
                        <Link
                          to={`/blog/${article.slug}`}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-200 hover:from-blue-100 hover:shadow-md active:scale-[0.97]"
                        >
                          <span>Read article</span>
                          <HiOutlineArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-2">
                {pageNumbers(totalPages).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      const nextParams = new URLSearchParams(params)
                      nextParams.set('page', String(item))
                      setParams(nextParams)
                    }}
                    className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black transition active:scale-[0.94] ${safePage === item ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile: Apple-style bottom-sheet filter drawer ── */}
        {filtersOpen ? (
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-[3px] animate-[fadeIn_0.25s_ease-out_forwards]"
              onClick={() => setFiltersOpen(false)}
              aria-hidden="true"
            />

            {/* Sheet panel */}
            <div
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[1.8rem] bg-white shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.18)] animate-[slideUp_0.3s_cubic-bezier(0.32,0.72,0,1)_forwards]"
              role="dialog"
              aria-modal="true"
              aria-label="Search filters"
            >
            {/* Drag handle */}
            <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-1 rounded-t-[1.8rem]">
              <div className="h-1 w-10 rounded-full bg-slate-300/70" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-slate-100/80 text-slate-500 transition-all duration-200 hover:bg-slate-200/80 hover:text-slate-700 active:scale-95"
                aria-label="Close filters"
              >
                <HiOutlineXMark className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>

            {/* Filter content */}
            <div className="px-6 pb-8">
              <form onSubmit={(e) => { submitSearch(e); setFiltersOpen(false) }} className="relative">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search blog"
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
                />
              </form>

              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Categories</p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => { updateFilter({ category: '', tag: '' }); setFiltersOpen(false) }}
                    className={`rounded-xl px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${category === 'All' && !tag ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    All Articles
                  </button>
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item.category}
                      onClick={() => { updateFilter({ category: item.category, tag: '' }); setFiltersOpen(false) }}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${category === item.category ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                    >
                      <span>{item.category}</span>
                      <span>{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.slice(0, 18).map((item) => (
                    <button
                      type="button"
                      key={item.tag}
                      onClick={() => { updateFilter({ tag: item.tag }); setFiltersOpen(false) }}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition active:scale-[0.96] ${tag === item.tag ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                    >
                      <HiOutlineTag className="h-3.5 w-3.5" />
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </section>
    </PublicPageShell>
  )
}
