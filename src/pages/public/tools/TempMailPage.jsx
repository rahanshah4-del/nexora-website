import { useEffect, useState, useSyncExternalStore } from 'react'
import { HiOutlineCheckCircle, HiOutlineShieldCheck } from 'react-icons/hi2'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { TEMP_MAIL_CONTENT as page, TEMP_MAIL_PATH, tempMailPageSchemas } from '../../../lib/tempMailData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Byline, FaqSection } from './ToolPageParts.jsx'
import TempMailApp from './TempMailApp.jsx'
import { warmUp } from './tempMailClient.js'
import './tempmail.css'

/** Same footprint as the real tool, so nothing jumps when it appears. */
function AppPlaceholder() {
  return (
    <div aria-hidden="true">
      <div className="tm-hero-card" style={{ minHeight: 236 }}>
        <div className="tm-skel" style={{ margin: 0, height: 20, width: 190 }} />
        <div className="tm-skel" style={{ margin: '14px 0', height: 56 }} />
        <div className="tm-skel" style={{ margin: 0, height: 44, width: 'min(100%, 340px)' }} />
      </div>
      <div className="tm-card" style={{ marginTop: 20, minHeight: 330 }}>
        <div className="tm-skel" /><div className="tm-skel" />
      </div>
    </div>
  )
}

/** /tools/temp-mail/ — free temporary inbox backed by the nexora-temp-mail Worker. */
export default function TempMailPage() {
  const seo = getSeoForPath(TEMP_MAIL_PATH)
  const [schemas] = useState(() => tempMailPageSchemas())
  // false while prerendering/hydrating, true in the browser afterwards
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  useEffect(() => { warmUp() }, [])

  return (
    <PublicPageShell backTo="/tools" backLabel="All Free Tools">
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={TEMP_MAIL_PATH}
        keywords={seo.keywords}
        robots={seo.robots}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
        ogImage={seo.ogImage}
        ogLocale="en_US"
        ogLocaleAlternates={false}
        twitterCard="summary_large_image"
        defaultSchemas={false}
        structuredData={schemas}
      />

      <section className="tm-app relative overflow-hidden px-4 pb-12 pt-16 sm:px-6" style={{ background: 'linear-gradient(180deg, var(--tm-bg) 0%, var(--tm-soft) 100%)' }}>
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-80 w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.18)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl">
          <p className="tm-eyebrow" style={{ color: 'var(--tm-brand)' }}>{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-[2.7rem]" style={{ color: 'var(--tm-text)' }}>{page.h1}</h1>
          <p className="mt-4 max-w-3xl text-[16px] leading-7" style={{ color: 'var(--tm-mute)' }}>{page.lead}</p>
          <ul className="tm-badges" aria-label="Highlights">
            {page.badges.map((b) => <li key={b} className="tm-badge"><HiOutlineCheckCircle /> {b}</li>)}
          </ul>
          <div className="mt-7">
            {mounted ? <TempMailApp /> : <AppPlaceholder />}
          </div>
        </div>
      </section>

      <section aria-labelledby="tm-how" className="tm-app px-4 py-14 sm:px-6" style={{ background: 'var(--tm-bg)' }}>
        <div className="mx-auto max-w-5xl">
          <h2 id="tm-how" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {page.steps.map((step, i) => (
              <li key={step.title} className="tm-card p-5">
                <span className="tm-avatar" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>{i + 1}</span>
                <h3 className="mt-3 font-display text-[17px] font-bold">{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-7" style={{ color: 'var(--tm-mute)' }}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="tm-uses" className="tm-app px-4 py-14 sm:px-6" style={{ background: 'var(--tm-soft)' }}>
        <div className="mx-auto max-w-5xl">
          <h2 id="tm-uses" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">What a temporary email is good for</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {page.useCases.map((u) => (
              <article key={u.title} className="tm-card p-5">
                <h3 className="font-display text-[17px] font-bold">{u.title}</h3>
                <p className="mt-1.5 text-[15px] leading-7" style={{ color: 'var(--tm-mute)' }}>{u.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="tm-privacy" className="tm-app px-4 py-14 sm:px-6" style={{ background: 'var(--tm-bg)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="tm-card p-6 sm:p-8">
            <h2 id="tm-privacy" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight"><HiOutlineShieldCheck className="h-7 w-7" style={{ color: 'var(--tm-ok)' }} /> Privacy and limits</h2>
            <ul className="mt-5 space-y-2.5 text-[16px] leading-7">
              {page.privacy.map((p) => <li key={p} className="flex gap-2.5"><HiOutlineCheckCircle className="mt-1 h-5 w-5 shrink-0" style={{ color: 'var(--tm-ok)' }} /><span>{p}</span></li>)}
            </ul>
            <p className="mt-5 text-[15px] leading-7" style={{ color: 'var(--tm-mute)' }}>{page.limits}</p>
            <Byline className="mt-6" />
          </div>
        </div>
      </section>

      <FaqSection heading="Temporary email: frequently asked questions" faqs={page.faqs} tone="alt" />
    </PublicPageShell>
  )
}
