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
import { HelpSearch, HelpSidebar, MobileNav } from './HelpShared.jsx'


function Block({ block }) {
  if (block.p) return <p className="text-[15.5px] leading-7 text-slate-700">{block.p}</p>
  if (block.callout) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <strong className="font-semibold">Note: </strong>{block.callout}
      </div>
    )
  }
  if (block.steps) {
    return (
      <ol className="space-y-3">
        {block.steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="font-semibold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-sm leading-6 text-slate-600">{s.text}</p>
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
              <p className="font-semibold text-slate-900">{item.title}</p>
              {item.text ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p> : null}
            </>
          )
          const cls = 'block h-full rounded-xl border border-slate-200 bg-white p-4'
          const href = item.to || item.external
          return (
            <li key={item.title}>
              {href ? <Link to={href} className={`${cls} transition hover:border-teal-400 hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>}
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
          <Link key={l.to} to={l.to} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">{l.label} →</Link>
        ))}
      </div>
    )
  }
  return null
}

function Faq({ item, defaultOpen }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left">
        <span className="font-semibold text-slate-900">{item.q}</span>
        <span className={`text-teal-600 transition-transform ${open ? 'rotate-45' : ''}`} aria-hidden="true">＋</span>
      </button>
      {open && <p className="border-t border-slate-100 px-4 py-3.5 text-[15px] leading-7 text-slate-700">{item.a}</p>}
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
        canonical={`https://nexorasolution.online${article.path}/`}
        path={article.path}
        faqItems={article.faqs.map((f) => ({ question: f.q, answer: f.a }))}
      />
      <div className="border-b border-slate-200 bg-gradient-to-b from-teal-50/70 to-white">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-24 sm:px-6 lg:px-8">
          <HelpSearch />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <HelpSidebar activeSlug={slug} />
          </div>
        </aside>
        <div className="min-w-0">
          <MobileNav activeSlug={slug} />
          <nav aria-label="Breadcrumb" className="mt-4 text-xs text-slate-500 lg:mt-0">
            <Link to="/" className="hover:text-slate-800">Home</Link> / <Link to={HELP_CENTER_PATH} className="hover:text-slate-800">Help Center</Link> / <span>{group?.title}</span>
          </nav>
          <article className="mt-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{article.title}</h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">{article.summary}</p>
            <p className="mt-2 text-xs text-slate-400">Last updated {HELP_LAST_UPDATED}</p>
            {article.sections.map((s) => (
              <section key={s.id} id={s.id} className="mt-10 scroll-mt-24 space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{s.heading}</h2>
                {s.blocks.map((b, i) => <Block key={i} block={b} />)}
              </section>
            ))}
            <section id="faq" className="mt-12 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Questions & answers</h2>
              <div className="mt-4 space-y-2.5">
                {article.faqs.map((f, i) => <Faq key={f.q} item={f} defaultOpen={i === 0} />)}
              </div>
            </section>
            {article.related.length > 0 && (
              <section className="mt-12">
                <h2 className="text-lg font-bold text-slate-900">Related articles</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {article.related.map((r) => HELP_ARTICLE_BY_SLUG[r]).filter(Boolean).map((r) => (
                    <Link key={r.slug} to={r.path} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-400 hover:shadow-md">
                      <p className="font-semibold text-slate-900">{r.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{r.summary}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <div className="mt-10 rounded-2xl bg-slate-900 p-6 text-white">
              <p className="text-lg font-bold">Still have a question?</p>
              <p className="mt-1 text-sm text-slate-300">Message the Nexora team. We reply on WhatsApp and email.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="https://wa.me/923194329754" className="rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400">WhatsApp us</Link>
                <Link to="/contact" className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Contact page</Link>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {prev ? <Link to={prev.path} className="rounded-xl border border-slate-200 p-4 hover:border-teal-400"><span className="text-xs text-slate-500">← Previous</span><span className="block font-semibold text-slate-900">{prev.title}</span></Link> : <span />}
              {next ? <Link to={next.path} className="rounded-xl border border-slate-200 p-4 text-right hover:border-teal-400"><span className="text-xs text-slate-500">Next →</span><span className="block font-semibold text-slate-900">{next.title}</span></Link> : null}
            </div>
          </article>
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">On this page</p>
            <ul className="mt-3 space-y-2 border-l border-slate-200 text-sm">
              {toc.map((t) => (
                <li key={t.id}><a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-3 text-slate-600 hover:border-teal-500 hover:text-teal-700">{t.label}</a></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PublicPageShell>
  )
}
