import { useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import PublicPageShell from '../PublicPageShell.jsx'
import NotFoundPage from '../NotFoundPage.jsx'
import {
  HELP_ARTICLES,
  HELP_ARTICLE_BY_SLUG,
  HELP_CENTER_PATH,
  HELP_GROUPS,
  HELP_LAST_UPDATED,
} from '../../../lib/helpCenterData.js'
import { APPLE_FONT, Chevron, GroupTile, HelpSearch, HelpSidebar, MobileNav } from './HelpShared.jsx'


function Block({ block }) {
  if (block.p) return <p className="text-[17px] leading-[1.7] text-slate-700">{block.p}</p>
  if (block.callout) {
    return (
      <div className="rounded-2xl bg-[#f5f5f7] px-5 py-4 text-[15px] leading-6 text-slate-700">
        <strong className="font-semibold text-[#1d1d1f]">Note. </strong>{block.callout}
      </div>
    )
  }
  if (block.steps) {
    return (
      <ol className="space-y-3.5">
        {block.steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-3xl bg-[#f5f5f7] p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-[15px] font-semibold text-white">{i + 1}</span>
            <div>
              <p className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">{s.title}</p>
              <p className="mt-1 text-[15px] leading-6 text-slate-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    )
  }
  if (block.list) {
    return (
      <ul className="grid gap-3 sm:grid-cols-2">
        {block.list.map((item) => {
          const body = (
            <>
              <p className="font-semibold tracking-tight text-[#1d1d1f]">{item.title}</p>
              {item.text ? <p className="mt-1 text-[15px] leading-6 text-slate-600">{item.text}</p> : null}
            </>
          )
          const cls = 'block h-full rounded-3xl bg-[#f5f5f7] p-5'
          const href = item.to || item.external
          return (
            <li key={item.title}>
              {href ? <Link to={href} className={`${cls} transition duration-300 hover:-translate-y-0.5 hover:bg-[#ececf0] active:scale-[.985]`}>{body}</Link> : <div className={cls}>{body}</div>}
            </li>
          )
        })}
      </ul>
    )
  }
  const links = block.links || (block.link ? [block.link] : null)
  if (links) {
    return (
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="rounded-full bg-[#0071e3] px-5 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:scale-[.97]">{l.label} →</Link>
        ))}
      </div>
    )
  }
  return null
}

function Faq({ item, defaultOpen }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-6 py-5 text-left">
        <span className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">{item.q}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-lg leading-none text-slate-600 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
      </button>
      {open && <p className="pb-6 pr-10 text-[16px] leading-[1.7] text-slate-600">{item.a}</p>}
    </div>
  )
}

export default function HelpArticlePage({ slug }) {
  const article = HELP_ARTICLE_BY_SLUG[slug]
  if (!article) return <NotFoundPage />
  const group = HELP_GROUPS.find((g) => g.id === article.group)
  const idx = HELP_ARTICLES.findIndex((a) => a.slug === slug)
  const prev = HELP_ARTICLES[idx - 1]
  const next = HELP_ARTICLES[idx + 1]
  const toc = [...article.sections.map((s) => ({ id: s.id, label: s.heading })), { id: 'faq', label: 'Questions & answers' }]

  return (
    <PublicPageShell>
      <PageSeo
        title={article.seoTitle}
        description={article.seoDescription}
        keywords={article.keywords}
        canonical={`https://nexorasolution.us${article.path}/`}
        path={article.path}
        faqItems={article.faqs.map((f) => ({ question: f.q, answer: f.a }))}
      />
      <div style={{ fontFamily: APPLE_FONT }} className="bg-white text-[#1d1d1f]">
      <div className="bg-[#f5f5f7]/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 pb-4 pt-24 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
            <Link to={HELP_CENTER_PATH} className="font-medium text-[#0066cc] hover:underline">Help Center</Link>
            <Chevron className="h-3 w-3" />
            <span>{group?.title}</span>
          </nav>
          <div className="w-full sm:w-80"><HelpSearch /></div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_13rem] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <HelpSidebar activeSlug={slug} />
          </div>
        </aside>
        <div className="min-w-0">
          <MobileNav activeSlug={slug} />
          <article className="mt-5 lg:mt-0">
            <GroupTile id={article.group} size="lg" />
            <h1 className="mt-6 text-4xl font-semibold leading-[1.06] tracking-[-0.03em] sm:text-5xl">{article.title}</h1>
            <p className="mt-4 max-w-2xl text-xl leading-8 text-slate-600">{article.summary}</p>
            <p className="mt-3 text-sm text-slate-500">Last updated {HELP_LAST_UPDATED}</p>
            {article.sections.map((s) => (
              <section key={s.id} id={s.id} className="mt-14 scroll-mt-24 space-y-5">
                <h2 className="text-[1.75rem] font-semibold tracking-[-0.02em] sm:text-3xl">{s.heading}</h2>
                {s.blocks.map((b, i) => <Block key={i} block={b} />)}
              </section>
            ))}
            <section id="faq" className="mt-16 scroll-mt-24">
              <h2 className="text-[1.75rem] font-semibold tracking-[-0.02em] sm:text-3xl">Questions & answers</h2>
              <div className="mt-4 border-t border-slate-200">
                {article.faqs.map((f, i) => <Faq key={f.q} item={f} defaultOpen={i === 0} />)}
              </div>
            </section>
            {article.related.length > 0 && (
              <section className="mt-16">
                <h2 className="text-2xl font-semibold tracking-[-0.02em]">Related articles</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {article.related.map((r) => HELP_ARTICLE_BY_SLUG[r]).filter(Boolean).map((r) => (
                    <Link key={r.slug} to={r.path} className="rounded-3xl bg-[#f5f5f7] p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-[#ececf0] active:scale-[.985]">
                      <p className="font-semibold tracking-tight">{r.title}</p>
                      <p className="mt-1 text-[15px] leading-6 text-slate-600">{r.summary}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <div className="mt-16 rounded-[28px] bg-[#f5f5f7] p-7 sm:p-9">
              <p className="text-2xl font-semibold tracking-[-0.02em]">Still have a question?</p>
              <p className="mt-2 text-[16px] text-slate-600">Message the Nexora team. We reply on WhatsApp and email.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="https://wa.me/923194329754" className="rounded-full bg-[#0071e3] px-5 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:scale-[.97]">WhatsApp us</Link>
                <Link to="/contact" className="rounded-full bg-white px-5 py-2.5 text-[15px] font-medium text-[#0066cc] ring-1 ring-slate-300 transition hover:bg-slate-50 active:scale-[.97]">Contact page</Link>
              </div>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {prev ? <Link to={prev.path} className="rounded-3xl p-5 ring-1 ring-slate-200 transition hover:bg-[#f5f5f7]"><span className="text-sm text-slate-500">← Previous</span><span className="mt-1 block font-semibold tracking-tight">{prev.title}</span></Link> : <span />}
              {next ? <Link to={next.path} className="rounded-3xl p-5 text-right ring-1 ring-slate-200 transition hover:bg-[#f5f5f7]"><span className="text-sm text-slate-500">Next →</span><span className="mt-1 block font-semibold tracking-tight">{next.title}</span></Link> : null}
            </div>
          </article>
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-slate-500">On this page</p>
            <ul className="mt-3 space-y-2 border-l border-slate-200 text-sm">
              {toc.map((t) => (
                <li key={t.id}><a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-3 text-slate-600 hover:border-[#0071e3] hover:text-[#0066cc]">{t.label}</a></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      </div>
    </PublicPageShell>
  )
}
