import { useParams } from 'react-router-dom'
import Link from '../../components/AppLink.jsx'
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowRight,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineCloud,
  HiOutlineSparkles,
  HiOutlineInformationCircle,
  HiOutlineMapPin,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi2'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import { SOLUTION_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForSolutionSlug } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { featurePages, PILLAR_COMPARE_LINKS } from '../../lib/featurePagesData.js'
import ProductVideoSection from '../../components/product/ProductVideoSection.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import {
  SOLUTION_SLUG_TO_PILLAR,
  whatsappLeadLink,
  commonFaqs,
  getRelatedSolutions,
  solutionPages,
  solutionPreviewRows,
  ctaPrimary,
  ctaSecondary,
  ctaDownload,
} from './solutionPagesData.js'

function SoftwareMockup({ page, solutionSlug }) {
  const previewRows = solutionPreviewRows[solutionSlug] || solutionPreviewRows['crm']

  return (
    <div className="relative mx-auto w-full max-w-[60rem]">
      <div className="pos-float-card absolute -left-5 top-16 z-10 hidden w-48 rounded-[1.45rem] border border-slate-200/60 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.42)] backdrop-blur xl:block">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-400">{page.productName}</p>
        <p className="mt-2 text-2xl font-medium text-slate-900">{page.stats[0][1]}</p>
        <p className="mt-1 text-xs font-medium text-emerald-600">{page.stats[0][2]}</p>
      </div>

      <div className="pos-float-card absolute -right-4 bottom-14 z-10 hidden w-52 rounded-[1.45rem] border border-sky-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.4)] backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <HiOutlineCloud className="text-xl" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-900">Cloud Synced</p>
            <p className="text-xs text-slate-500">Desktop, web, mobile</p>
          </div>
        </div>
      </div>

      <div className="pos-preview-shell overflow-hidden rounded-[2rem] border border-slate-200/60/90 bg-white shadow-[0_44px_126px_-62px_rgba(15,23,42,0.58)] ring-1 ring-white/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="hidden rounded-full border border-slate-200/60 bg-slate-100/70 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500 sm:block">
            {page.previewLabel}
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </div>
        </div>

        <div className="grid min-h-[24rem] grid-cols-[6.2rem_1fr] bg-[linear-gradient(180deg,#fbfdff_0%,#edf6ff_100%)] sm:grid-cols-[8rem_1fr] lg:grid-cols-[9rem_1fr]">
          <aside className="border-r border-slate-100 bg-white/70 px-2 py-4">
            <div className="grid gap-1">
              {page.sidebar.map((item, index) => (
                <span
                  key={item}
                  className={`truncate rounded-lg px-2 py-2 text-[0.58rem] font-medium sm:text-[0.68rem] ${
                    index === 0 ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-3 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Nexora Suite</p>
                <p className="mt-1 text-xl font-medium text-slate-900 sm:text-2xl">{page.previewTitle}</p>
              </div>
              <span className="w-max rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white">Live workspace</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {page.stats.map(([label, value, note]) => (
                <div key={label} className="rounded-[1.2rem] border border-white bg-white p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
                  <p className="text-[0.65rem] font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-medium text-slate-900">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {previewRows.map(([label, value, note, Icon]) => (
                <div key={label} className="flex items-center gap-2 rounded-[1.2rem] border border-white bg-white p-3 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="text-sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.58rem] font-medium text-slate-500">{label}</p>
                    <p className="truncate text-sm font-medium text-slate-900">{value}</p>
                    <p className="truncate text-[0.55rem] font-medium text-slate-500">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GrowthPathStrip() {
  const steps = [
    {
      title: 'Start Free Trial',
      text: 'Explore Nexora with real workflows, CRM tools, invoices and dashboards. No credit card required.',
      icon: HiOutlinePlayCircle,
    },
    {
      title: 'Pick a Plan',
      text: 'After the trial, pick the plan that fits your team on the pricing page. New users get 50% off the first subscription with code WELCOME-NEXORA.',
      icon: HiOutlineShieldCheck,
    },
    {
      title: 'Upgrade When Business Grows',
      text: 'Move up to a larger plan or a custom Enterprise plan when you need more users, records, reports and team controls.',
      icon: HiOutlineChartBarSquare,
    },
  ]

  return (
    <section data-reveal className="bg-white px-5 pb-4 sm:px-6 lg:px-8">
      <div className="mx-auto -mt-8 grid max-w-7xl gap-4 rounded-[1.8rem] border border-slate-200/60 bg-white/95 p-4 shadow-[0_8px_40px_-20px_rgba(15,23,42,0.12)] sm:p-5 lg:grid-cols-3">
        {steps.map(({ title, text, icon: Icon }) => (
          <article key={title} className="flex min-w-0 gap-4 rounded-[1.35rem] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Icon className="text-2xl" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function SolutionPage({ solutionSlug: solutionSlugProp } = {}) {
  const { solutionSlug: solutionSlugParam } = useParams()
  const solutionSlug = solutionSlugProp || solutionSlugParam
  const page = solutionPages[solutionSlug]
  const seo = getSeoForSolutionSlug(solutionSlug)

  if (!page) return <NotFoundPage />

  const Icon = page.icon
  const faqs = page.ownFaqsOnly ? page.faqs : [...page.faqs, ...commonFaqs]
  const relatedSolutions = getRelatedSolutions(solutionSlug)
  const pillarKey = SOLUTION_SLUG_TO_PILLAR[solutionSlug]
  const supportingPages = pillarKey
    ? Object.entries(featurePages).filter(([, fp]) => fp.pillar === pillarKey).map(([key, fp]) => ({ key, ...fp }))
    : []
  const compareLinks = pillarKey ? (PILLAR_COMPARE_LINKS[pillarKey] || []) : []

  return (
    <PublicPageShell>
      <PageSeo
        {...seo}
        faqItems={faqs}
        softwareApplication={{
          name: page.productName,
          description: page.description,
          applicationCategory: 'BusinessApplication',
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">{page.productName}</span>
      </nav>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_72%,#ffffff_100%)] pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-slate-100/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                <Icon className="text-base" />
                {page.eyebrow}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/60 bg-violet-50/80 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-600 shadow-[0_0_12px_-2px_rgba(139,92,246,0.12)] backdrop-blur-sm">
                <HiOutlineSparkles className="h-3 w-3 text-violet-500" />
                AI-Powered
              </span>
            </div>
            <h1 className="mt-6 text-[2.75rem] font-semibold leading-[0.98] tracking-tight text-slate-900 sm:text-[4.2rem] lg:text-[5.2rem]">
              {page.headlineBefore}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{page.headlineHighlight}</span>
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">{page.description}</p>
            <p className="mt-4 rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-3 text-sm font-medium leading-6 text-slate-500 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.08)]">
              Start with a 1-month free trial, choose Basic after the trial, then upgrade to Standard when your users, records and reports need more room.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-start">
              <Link to="/signup" className={ctaPrimary}>
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaSecondary}>
                Book Demo
                <HiOutlinePlayCircle className="text-xl text-slate-500" />
              </a>
              {solutionSlug === 'pos' ? (
                <Link to="/download/restaurant-pos" className={ctaDownload}>
                    <HiOutlineArrowDownTray className="text-lg" />
                    Download for Windows
                  </Link>
              ) : null}
            </div>
            {solutionSlug === 'pos' ? (
              <p className="mx-auto mt-4 flex max-w-sm items-start justify-center gap-1.5 text-left text-xs leading-5 text-slate-400 lg:mx-0 lg:justify-start">
                    <HiOutlineInformationCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                      You’ll need a Nexora business account to log in after installing. Don’t have one yet?{' '}
                      <Link to="/signup" className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700">Create a free account</Link> first.
                    </span>
                  </p>
            ) : null}
          </div>

          <SoftwareMockup page={page} solutionSlug={solutionSlug} />
        </div>
      </section>

      <GrowthPathStrip />

      <ModuleIntroSection key={solutionSlug} solutionSlug={solutionSlug} />

      <ProductVideoSection solutionSlug={solutionSlug} />

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              Key features for <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{page.productName}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">
              {page.featuresIntro || 'Purpose-built tools, clean permissions and a premium workflow designed for daily business operations.'}
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map(([title, text, FeatureIcon]) => (
              <article key={title} className="group flex min-h-48 gap-4 rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white">
                  <FeatureIcon className="text-2xl" />
                </span>
                <div>
                  <h3 className="text-lg font-medium text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {supportingPages.length > 0 ? (
        <section data-reveal className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">Explore {page.productName} in depth</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">
                A closer look at how each part of {page.productName} actually works.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {supportingPages.map((sp) => {
                const SpIcon = sp.icon
                return (
                  <Link
                    key={sp.key}
                    to={`/${sp.key}`}
                    className="group flex items-center gap-4 rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)]"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white">
                      <SpIcon className="text-2xl" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-medium text-slate-900">{sp.badge}</h3>
                      <p className="mt-1 truncate text-sm leading-6 text-slate-500">{sp.title}</p>
                    </div>
                    <HiOutlineArrowRight className="shrink-0 text-lg text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-900" />
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {compareLinks.length > 0 ? (
        <section className="bg-white px-5 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl border-t border-slate-200/60 pt-8">
            <p className="text-sm leading-7 text-slate-500">
              <span className="font-medium text-slate-900">Comparing your options? </span>
              {compareLinks.map((l, i) => (
                <span key={l.to}>
                  {i > 0 ? ' · ' : null}
                  <Link to={l.to} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{l.text}</Link>
                </span>
              ))}
            </p>
          </div>
        </section>
      ) : null}

      {page.detailSections?.length ? (
        <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-5xl gap-12 px-5 sm:px-6 lg:px-8">
            {page.detailSections.map((section) => (
              <article key={section.heading}>
                <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-4xl">{section.heading}</h2>
                {section.body ? <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">{section.body}</p> : null}
                {section.steps?.length ? (
                  <ol className="mt-5 grid max-w-3xl list-decimal gap-2 pl-5 text-base leading-7 text-slate-600">
                    {section.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                ) : null}
                {section.links?.length ? (
                  <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {section.links.map((l) => (
                      <Link key={l.to} to={l.to} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{l.label}</Link>
                    ))}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-slate-200/60 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm">
              Business Benefits
            </span>
            <h2 className="mt-5 text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              {page.benefitsHeading || 'Better operations, faster teams and clearer ROI.'}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-500">
              {page.benefitsIntro || 'Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {page.benefits.map((benefit) => (
              <div key={benefit} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <HiOutlineCheckCircle className="text-2xl text-slate-500" />
                <p className="mt-4 text-lg font-medium text-slate-900">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">{page.useCaseHeading || 'Industry use cases'}</h2>
              <p className="mt-5 text-base leading-8 text-slate-500">
                {page.useCaseIntro || 'Flexible enough for modern service, sales, education, property, retail and operations teams.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.useCaseDetails ? page.useCaseDetails.map(([title, text]) => (
                <article key={title} className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.45)]">
                  <h3 className="text-base font-medium text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </article>
              )) : page.useCases.map((useCase) => (
                <div key={useCase} className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.45)]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                    <HiOutlineMapPin className="text-xl" />
                  </span>
                  <p className="text-sm font-medium text-slate-900">{useCase}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {relatedSolutions.length > 0 ? (
        <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-slate-200/60 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                  Related Solutions
                </span>
                <h2 className="mt-5 max-w-3xl text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
                  Software that works with {page.productName}
                </h2>
              </div>
              <Link to="/pricing" className={ctaSecondary}>
                Compare Pricing
              </Link>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {relatedSolutions.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="group rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)]"
                >
                  <p className="text-lg font-medium text-slate-900">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{item.text}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                    View solution
                    <HiOutlineArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section data-reveal className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">Frequently asked questions</h2>
          </div>
          <div className="mt-10 grid gap-4">
            {faqs.map(([question, answer]) => (
              <article key={question} className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_18px_54px_-42px_rgba(15,23,42,0.36)]">
                <h3 className="text-base font-medium text-slate-900">{question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RelatedBlogSection topics={SOLUTION_BLOG_TOPICS[solutionSlug] || []} intro={`Practical guides for ${page.productName} users and owners.`} />

      <section data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-slate-200/60 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">Ready to see {page.productName} in action?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className={ctaPrimary}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaSecondary}>
              Book Demo
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
