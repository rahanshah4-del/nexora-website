import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

// /search/ is prerendered (scripts/prerender.mjs buildSearchPage) but had no
// route here, so it rendered the 404 page once the app booted. It searches the
// build-time /search-index.json. Result pages are never worth indexing.
function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const [input, setInput] = useState(query)
  const [index, setIndex] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/search-index.json')
      .then((response) => (response.ok ? response.json() : []))
      .catch(() => [])
      .then((rows) => { if (!cancelled) setIndex(Array.isArray(rows) ? rows : []) })
    return () => { cancelled = true }
  }, [])

  const results = useMemo(() => {
    const needle = normalize(query)
    if (!needle || !index) return []
    return index.filter((item) => normalize(`${item.title} ${item.excerpt} ${item.category} ${(item.tags || []).join(' ')}`).includes(needle))
  }, [index, query])

  return (
    <PublicPageShell>
      <PageSeo
        title="Search Nexora Solution — Find POS, ERP & CRM Information"
        description="Search the Nexora Solution website for POS software, ERP systems, CRM guides, pricing information and business resources."
        canonical={absoluteUrl('/search/')}
        path="/search/"
        robots="noindex,follow"
      />
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-medium tracking-[-0.02em] text-slate-900">Search Nexora Solution</h1>
          <p className="mt-4 text-base leading-7 text-slate-500">Search the Nexora blog for POS, ERP and CRM guides.</p>
          <form
            className="mt-8 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setParams(input.trim() ? { q: input.trim() } : {})
            }}
          >
            <input
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Search..."
              aria-label="Search"
              className="h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-5 text-sm font-medium text-white">Search</button>
          </form>

          {query ? (
            <div className="mt-10">
              <p className="text-sm text-slate-400">
                {index === null ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'} for “${query}”`}
              </p>
              <ul className="mt-4 divide-y divide-slate-100">
                {results.map((item) => (
                  <li key={item.slug} className="py-4">
                    <Link to={`${item.url}/`} className="text-[16px] font-medium text-slate-900 hover:text-blue-700">{item.title}</Link>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.excerpt}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </PublicPageShell>
  )
}
