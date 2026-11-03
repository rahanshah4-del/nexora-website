import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlinePlayCircle } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import ProductVideoSection from '../../components/product/ProductVideoSection.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import { SOLUTION_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import PublicPageShell from './PublicPageShell.jsx'
import { getSolutionPageData, whatsappLeadLink } from './solutionPagesData.js'

const SLUG = 'crm'

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center sm:w-auto gap-2 whitespace-nowrap rounded-full px-7 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const ctaPrimary = `${ctaBase} bg-orange-400 text-indigo-950 hover:bg-orange-300 focus-visible:outline-orange-300`
const ctaGhost = `${ctaBase} border border-indigo-300/50 text-white hover:bg-indigo-900 focus-visible:outline-white`
const ctaOutline = `${ctaBase} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-slate-500`
const linkClass = 'font-medium text-indigo-800 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-800'

/* The pipeline stages the app really has, with a few illustrative deals. */
const board = [
  ['New Lead', [['Textile exporter, Faisalabad', 'PKR 450,000']]],
  ['Contacted', [['Dental clinic group', 'PKR 120,000']]],
  ['Qualified', [['Property agency, Lahore', 'PKR 300,000']]],
  ['Proposal', [['Online store owner', 'PKR 90,000']]],
  ['Negotiation', [['Training institute', 'PKR 210,000']]],
  ['Won', [['Logistics startup', 'PKR 380,000']]],
  ['Lost', []],
]

function PipelineBoard() {
  return (
    <figure aria-label="Sample sales pipeline board" className="mt-12">
      <div className="overflow-x-auto rounded-lg border border-indigo-400/30 bg-indigo-900/60">
        <div className="grid min-w-[56rem] grid-cols-7 divide-x divide-indigo-400/20">
          {board.map(([stage, deals]) => (
            <div key={stage} className="min-h-40 p-3">
              <p className={`text-sm font-semibold ${stage === 'Won' ? 'text-emerald-300' : stage === 'Lost' ? 'text-rose-300' : 'text-indigo-100'}`}>{stage}</p>
              {deals.map(([name, value]) => (
                <div key={name} className="mt-3 rounded-md bg-white p-3 text-slate-900">
                  <p className="text-sm font-medium leading-5">{name}</p>
                  <p className="mt-1 text-xs text-slate-500">{value}</p>
                </div>
              ))}
              {deals.length === 0 ? <p className="mt-3 text-xs text-indigo-300">No deals here</p> : null}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-indigo-300">Sample deals with made-up names and amounts, shown for illustration. Deals are dragged between stages.</figcaption>
    </figure>
  )
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function CrmPage() {
  const { page, seo, faqs, relatedSolutions, supportingPages, compareLinks } = getSolutionPageData(SLUG)
  const sections = page.detailSections || []

  return (
    <PublicPageShell>
      <PageSeo
        {...seo}
        faqItems={faqs}
        softwareApplication={{ name: page.productName, description: page.description, applicationCategory: 'BusinessApplication' }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">{page.productName}</span>
      </nav>

      {/* Hero: the pipeline is the product */}
      <section className="bg-indigo-950 pb-16 pt-14 text-white sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-orange-300">{page.eyebrow}</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {page.headlineBefore}
              {page.headlineHighlight}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-indigo-100">{page.description}</p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-indigo-200">
              Start with a 1-month free trial, choose Basic after the trial, then upgrade to Standard when your users, records and reports need more room.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link to="/signup" className={ctaPrimary}>
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaGhost}>
                Book Demo
                <HiOutlinePlayCircle className="text-xl" />
              </a>
            </div>
          </div>
          <PipelineBoard />
        </div>
      </section>

      <ModuleIntroSection key={SLUG} solutionSlug={SLUG} />

      <ProductVideoSection solutionSlug={SLUG} />

      {/* Features: coloured top rule per capability, three across */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Key features for {page.productName}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{page.featuresIntro}</p>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map(([title, text, FeatureIcon], i) => (
              <article key={title} className={`border-t-4 pt-5 ${['border-indigo-700', 'border-orange-400', 'border-sky-500'][i % 3]}`}>
                <FeatureIcon className="text-2xl text-indigo-800" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-base leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Supporting pages */}
      {supportingPages.length > 0 ? (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Explore {page.productName} in depth</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">A closer look at how each part of {page.productName} actually works.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {supportingPages.map((sp) => (
                <Link key={sp.key} to={`/${sp.key}`} className="group flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">
                  <span>
                    <h3 className="text-lg font-semibold text-slate-900">{sp.badge}</h3>
                    <span className="mt-1 block text-base text-slate-600">{sp.title}</span>
                  </span>
                  <HiOutlineArrowRight className="shrink-0 text-lg text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-800" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {compareLinks.length > 0 ? (
        <section className="bg-white px-5 pt-8 sm:px-6 lg:px-8">
          <p className="mx-auto max-w-7xl text-sm leading-7 text-slate-600">
            <span className="font-medium text-slate-900">Comparing your options? </span>
            {compareLinks.map((l, i) => (
              <span key={l.to}>
                {i > 0 ? ', ' : null}
                <Link to={l.to} className={linkClass}>{l.text}</Link>
              </span>
            ))}
          </p>
        </section>
      ) : null}

      {/* Guide: sticky contents list on the left, chapters on the right */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[16rem_1fr] lg:px-8">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-semibold text-slate-900">On this page</p>
            <ul className="mt-3 grid gap-2 border-l-2 border-indigo-100 pl-4 text-sm">
              {sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${slugify(s.heading)}`} className="text-slate-600 hover:text-indigo-800">{s.heading}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="grid max-w-3xl gap-12">
            {sections.map((s) => (
              <article key={s.heading} id={slugify(s.heading)} className="scroll-mt-24">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{s.heading}</h2>
                <p className="mt-4 text-lg leading-8 text-slate-700">{s.body}</p>
                {s.links?.length ? (
                  <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {s.links.map((l) => <Link key={l.to} to={l.to} className={linkClass}>{l.label}</Link>)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits and use cases */}
      <section className="bg-indigo-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{page.benefitsHeading || 'Better operations, faster teams and clearer ROI.'}</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {page.benefitsIntro || 'Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.'}
            </p>
            <ul className="mt-6 list-disc space-y-2 pl-5 text-lg leading-8 text-slate-700">
              {page.benefits.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{page.useCaseHeading || 'Industry use cases'}</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {page.useCaseIntro || 'Flexible enough for modern service, sales, education, property, retail and operations teams.'}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {page.useCases.map((u) => (
                <li key={u} className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-900">{u}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Related */}
      {relatedSolutions.length > 0 ? (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Software that works with {page.productName}</h2>
              <Link to="/pricing" className={ctaOutline}>Compare Pricing</Link>
            </div>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {relatedSolutions.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className="group block border-t-4 border-indigo-700 pt-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">
                    <p className="text-lg font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-2 text-base leading-7 text-slate-600">{item.text}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-800">
                      View solution
                      <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{q}</h3>
                  <span className="mt-1 shrink-0 text-xl leading-none text-indigo-800 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-base leading-7 text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <RelatedBlogSection topics={SOLUTION_BLOG_TOPICS[SLUG] || []} intro={`Practical guides for ${page.productName} users and owners.`} />

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-lg bg-indigo-950 p-8 sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ready to see {page.productName} in action?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-indigo-200">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className={ctaPrimary}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaGhost}>Book Demo</a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
