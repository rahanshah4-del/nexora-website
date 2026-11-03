import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowDownTray, HiOutlineArrowRight, HiOutlineInformationCircle, HiOutlinePlayCircle } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import ProductVideoSection from '../../components/product/ProductVideoSection.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import { SOLUTION_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import PublicPageShell from './PublicPageShell.jsx'
import { getSolutionPageData, whatsappLeadLink } from './solutionPagesData.js'

const SLUG = 'pos'

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center sm:w-auto gap-2 whitespace-nowrap rounded-md px-7 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const ctaPrimary = `${ctaBase} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`
const ctaOnDark = `${ctaBase} border border-neutral-500 text-white hover:bg-neutral-800 focus-visible:outline-white`
const linkClass = 'font-medium text-red-700 underline decoration-red-300 underline-offset-4 hover:decoration-red-700'

/* The hero is a kitchen order ticket, built from the real KOT flow:
   an order becomes a ticket, and staff move it pending, preparing, ready, served. */
function KotTicket() {
  const lines = [
    ['2', 'Chicken karahi'],
    ['4', 'Garlic naan'],
    ['1', 'Mint lemonade'],
  ]
  const steps = ['Pending', 'Preparing', 'Ready', 'Served']
  return (
    <figure aria-label="Sample kitchen order ticket" className="mx-auto w-full max-w-sm">
      <div className="bg-white font-mono text-sm text-neutral-900 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]" style={{ clipPath: 'polygon(0 0,100% 0,100% calc(100% - 10px),96% 100%,92% calc(100% - 10px),88% 100%,84% calc(100% - 10px),80% 100%,76% calc(100% - 10px),72% 100%,68% calc(100% - 10px),64% 100%,60% calc(100% - 10px),56% 100%,52% calc(100% - 10px),48% 100%,44% calc(100% - 10px),40% 100%,36% calc(100% - 10px),32% 100%,28% calc(100% - 10px),24% 100%,20% calc(100% - 10px),16% 100%,12% calc(100% - 10px),8% 100%,4% calc(100% - 10px),0 100%)' }}>
        <div className="border-b border-dashed border-neutral-400 px-5 pb-3 pt-5 text-center">
          <p className="text-base font-bold tracking-wide">KITCHEN ORDER</p>
          <p className="mt-1 text-xs text-neutral-500">Table 4, dine-in, order 0187</p>
        </div>
        <ul className="px-5 py-4">
          {lines.map(([qty, name]) => (
            <li key={name} className="flex gap-4 py-1">
              <span className="w-6 font-bold">{qty}x</span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-dashed border-neutral-400 px-5 pb-6 pt-3">
          <p className="mb-2 text-xs text-neutral-500">Kitchen display status</p>
          <ol className="grid grid-cols-4 gap-1 text-center text-[11px]">
            {steps.map((s, i) => (
              <li key={s} className={`rounded py-1 ${i === 1 ? 'bg-red-600 font-bold text-white' : 'bg-neutral-100 text-neutral-500'}`}>{s}</li>
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-neutral-400">Sample ticket with made-up items, shown for illustration.</figcaption>
    </figure>
  )
}

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function RestaurantPosPage() {
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

      {/* Hero */}
      <section className="bg-neutral-900 pb-20 pt-14 text-white sm:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-red-400">{page.eyebrow}</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {page.headlineBefore}
              {page.headlineHighlight}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-300">{page.description}</p>
            <p className="mt-4 max-w-xl text-base leading-7 text-neutral-400">
              Start with a 1-month free trial, choose Basic after the trial, then upgrade to Standard when your users, records and reports need more room.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link to="/signup" className={ctaPrimary}>
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaOnDark}>
                Book Demo
                <HiOutlinePlayCircle className="text-xl" />
              </a>
              <Link to="/download/restaurant-pos" className={ctaOnDark}>
                <HiOutlineArrowDownTray className="text-lg" />
                Download for Windows
              </Link>
            </div>
            <p className="mt-4 flex max-w-sm items-start gap-1.5 text-xs leading-5 text-neutral-400">
              <HiOutlineInformationCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                You’ll need a Nexora business account to log in after installing. Don’t have one yet?{' '}
                <Link to="/signup" className="font-medium text-neutral-200 underline underline-offset-2">Create a free account</Link> first.
              </span>
            </p>
          </div>
          <KotTicket />
        </div>
      </section>

      <ModuleIntroSection key={SLUG} solutionSlug={SLUG} />

      <ProductVideoSection solutionSlug={SLUG} />

      {/* Features as a menu board: name, dotted leader, description underneath */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">Key features for {page.productName}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-600">{page.featuresIntro}</p>
          <ul className="mt-12 grid gap-x-14 gap-y-8 md:grid-cols-2">
            {page.features.map(([title, text, FeatureIcon]) => (
              <li key={title}>
                <div className="flex items-end gap-2">
                  <FeatureIcon className="mb-0.5 shrink-0 text-xl text-red-600" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
                  <span className="mb-1.5 flex-1 border-b-2 border-dotted border-neutral-300" aria-hidden="true" />
                </div>
                <p className="mt-2 text-base leading-7 text-neutral-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Problems and fixes */}
      <section className="bg-neutral-100 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">{page.benefitsHeading}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-600">{page.benefitsIntro}</p>
          <ul className="mt-10 divide-y divide-neutral-300 border-y border-neutral-300">
            {page.benefits.map((b) => {
              const [problem, fix] = b.split(' — ')
              return (
                <li key={b} className="grid gap-1 py-5 md:grid-cols-2 md:gap-10">
                  <p className="text-lg font-semibold text-neutral-900">{problem}</p>
                  <p className="text-lg text-neutral-700">{fix}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">{page.useCaseHeading}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-600">{page.useCaseIntro}</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {page.useCaseDetails.map(([title, text]) => (
              <article key={title} className="border-l-4 border-red-600 bg-neutral-50 p-5">
                <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-base leading-7 text-neutral-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Supporting pages */}
      {supportingPages.length > 0 ? (
        <section className="bg-neutral-100 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">Explore {page.productName} in depth</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-600">A closer look at how each part of {page.productName} actually works.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {supportingPages.map((sp) => (
                <Link key={sp.key} to={`/${sp.key}`} className="group flex items-center justify-between gap-3 border border-neutral-300 bg-white p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                  <span>
                    <h3 className="text-lg font-semibold text-neutral-900">{sp.badge}</h3>
                    <span className="mt-1 block text-sm text-neutral-600">{sp.title}</span>
                  </span>
                  <HiOutlineArrowRight className="shrink-0 text-lg text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-red-600" />
                </Link>
              ))}
            </div>
            {compareLinks.length > 0 ? (
              <p className="mt-8 text-sm leading-7 text-neutral-600">
                <span className="font-medium text-neutral-900">Comparing your options? </span>
                {compareLinks.map((l, i) => (
                  <span key={l.to}>{i > 0 ? ', ' : null}<Link to={l.to} className={linkClass}>{l.text}</Link></span>
                ))}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Guide in two newspaper-style columns */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="gap-14 md:columns-2">
            {sections.map((s) => (
              <article key={s.heading} id={slugify(s.heading)} className="mb-10 break-inside-avoid-column">
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">{s.heading}</h2>
                {s.body ? <p className="mt-3 text-base leading-7 text-neutral-700">{s.body}</p> : null}
                {s.steps?.length ? (
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-base leading-7 text-neutral-700">
                    {s.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                ) : null}
                {s.links?.length ? (
                  <p className="mt-4 grid gap-1.5 text-sm">
                    {s.links.map((l) => <Link key={l.to} to={l.to} className={linkClass}>{l.label}</Link>)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      {relatedSolutions.length > 0 ? (
        <section className="bg-neutral-900 py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Software that works with {page.productName}</h2>
              <Link to="/pricing" className={ctaOnDark}>Compare Pricing</Link>
            </div>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {relatedSolutions.map((item) => (
                <li key={item.key} className="border-t border-neutral-600 pt-5">
                  <Link to={item.to} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                    <p className="text-lg font-semibold">{item.label}</p>
                    <p className="mt-2 text-base leading-7 text-neutral-300">{item.text}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-400">
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

      {/* FAQ: all answers visible */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">Frequently asked questions</h2>
          <dl className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
            {faqs.map(([q, a]) => (
              <div key={q} className="grid gap-2 py-5 md:grid-cols-[0.9fr_1.1fr] md:gap-10">
                <dt><h3 className="text-base font-semibold text-neutral-900 sm:text-lg">{q}</h3></dt>
                <dd className="text-base leading-7 text-neutral-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <RelatedBlogSection topics={SOLUTION_BLOG_TOPICS[SLUG] || []} intro={`Practical guides for ${page.productName} users and owners.`} />

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 bg-red-600 p-8 text-white sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to see {page.productName} in action?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-red-50">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className={`${ctaBase} bg-white text-red-700 hover:bg-red-50`}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={`${ctaBase} border border-red-300 text-white hover:bg-red-700`}>Book Demo</a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
