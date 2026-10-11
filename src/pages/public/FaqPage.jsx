import { useMemo, useState } from 'react'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineArrowRight, HiOutlineChevronDown, HiOutlineMagnifyingGlass, HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import { FAQ_GROUPS, faqAnchor, faqSchemaItems } from '../../lib/faqData.js'
import { SITE_EMAILS } from '../../lib/seoStructuredData.js'

const WHATSAPP_URL = 'https://wa.me/923194329754'

function matches(item, needle) {
  return `${item.q} ${item.a}`.toLowerCase().includes(needle)
}

export default function FaqPage() {
  const seo = getSeoForPath('/faq')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()

  // With no search, every group and answer is in the page (crawlers and no-JS
  // readers see all of it). A search only filters what is shown.
  const groups = useMemo(
    () => FAQ_GROUPS
      .map((group) => ({ ...group, items: needle ? group.items.filter((item) => matches(item, needle)) : group.items }))
      .filter((group) => group.items.length > 0),
    [needle],
  )
  const total = useMemo(() => FAQ_GROUPS.reduce((n, g) => n + g.items.length, 0), [])
  const shown = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <PublicPageShell>
      <PageSeo {...seo} faqItems={faqSchemaItems()} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><span aria-current="page">FAQ</span>
      </nav>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-8 pt-16 sm:pt-20 lg:pt-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              FAQ
            </span>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Frequently asked questions about Nexora</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              {total} answers on pricing and the free trial, POS and ERP modules, offline billing, the free invoice and GST tools, security and support.
            </p>
          </div>

          <form role="search" onSubmit={(e) => e.preventDefault()} className="mx-auto mt-8 max-w-xl">
            <label htmlFor="faq-search" className="sr-only">Search the FAQ</label>
            <div className="relative">
              <HiOutlineMagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: pricing, offline, GST, printer..."
                className="w-full rounded-full border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                autoComplete="off"
              />
            </div>
            {needle ? (
              <p className="mt-3 text-center text-[13px] text-slate-500" aria-live="polite">
                {shown} of {total} answers match &ldquo;{query.trim()}&rdquo;
              </p>
            ) : null}
          </form>

          <nav aria-label="FAQ topics" className="mt-8 flex flex-wrap justify-center gap-2">
            {FAQ_GROUPS.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="rounded-full border border-slate-200/70 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="bg-[#f8fafc] pb-16 pt-6 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          {groups.length === 0 ? (
            <div className="rounded-[1.2rem] border border-slate-200/60 bg-white p-8 text-center shadow-sm">
              <p className="text-[15px] font-medium text-slate-900">No answer matches &ldquo;{query.trim()}&rdquo;.</p>
              <p className="mt-2 text-[14px] leading-7 text-slate-500">
                Try a shorter word, or ask the team on{' '}
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">WhatsApp</a>
                {' '}or{' '}
                <Link to="/contact" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">contact us</Link>.
              </p>
            </div>
          ) : null}

          {groups.map((group) => (
            <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="scroll-mt-28 pt-10 first:pt-4">
              <h2 id={`${group.id}-title`} className="text-2xl font-medium tracking-[-0.015em] text-slate-900">{group.title}</h2>
              <p className="mt-1.5 text-[14px] leading-7 text-slate-500">{group.intro}</p>
              <div className="mt-5 grid gap-3">
                {group.items.map((item, index) => (
                  <details
                    key={`${item.q}-${needle ? 'f' : 'a'}`}
                    id={faqAnchor(item.q)}
                    open={Boolean(needle) || undefined}
                    className="group scroll-mt-28 rounded-[1.2rem] border border-slate-200/60 bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] open:shadow-[0_8px_28px_-12px_rgba(15,23,42,0.12)]"
                    {...(!needle && index === 0 && group.id === FAQ_GROUPS[0].id ? { open: true } : {})}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                      <h3 className="text-[15px] font-medium tracking-[-0.01em] text-slate-900">{item.q}</h3>
                      <HiOutlineChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                      <p className="text-[14px] leading-[1.75] text-slate-600">{item.a}</p>
                      {item.links?.length ? (
                        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                          <span className="font-medium text-slate-400">Related:</span>
                          {item.links.map((link) => (
                            <Link key={link.to} to={link.to} className="inline-flex items-center gap-1 font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-slate-900">
                              {link.label} <HiOutlineArrowRight aria-hidden="true" className="h-3 w-3" />
                            </Link>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-14 rounded-[1.6rem] border border-slate-200/60 bg-white p-7 text-center shadow-sm sm:p-9">
            <h2 className="text-xl font-medium tracking-[-0.01em] text-slate-900">Still have a question?</h2>
            <p className="mx-auto mt-2 max-w-xl text-[14px] leading-7 text-slate-500">
              Ask the team on WhatsApp, email {SITE_EMAILS.support}, or browse the step-by-step guides in the Help Center.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800">
                Ask on WhatsApp <HiOutlineArrowRight className="text-lg" />
              </a>
              <Link to="/help-center" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/70 bg-white px-6 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
                Open the Help Center
              </Link>
              <Link to="/contact" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/70 bg-white px-6 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
