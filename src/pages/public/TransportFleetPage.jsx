import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlinePlayCircle } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import ProductVideoSection from '../../components/product/ProductVideoSection.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import { SOLUTION_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import PublicPageShell from './PublicPageShell.jsx'
import { getSolutionPageData, whatsappLeadLink } from './solutionPagesData.js'

const SLUG = 'transport-rental'

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center sm:w-auto gap-2 whitespace-nowrap rounded-lg px-7 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const ctaPrimary = `${ctaBase} bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700`
const ctaOutline = `${ctaBase} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-slate-500`
const linkClass = 'font-medium text-teal-800 underline decoration-teal-300 underline-offset-4 hover:decoration-teal-800'

/* A strip of road marking used as a divider between the big sections. */
function RoadStripe() {
  return <div aria-hidden="true" className="h-1.5 bg-[repeating-linear-gradient(90deg,#fbbf24_0,#fbbf24_28px,transparent_28px,transparent_52px)]" />
}

const statusStyle = {
  Available: 'bg-emerald-100 text-emerald-900',
  Rented: 'bg-amber-100 text-amber-900',
  Reserved: 'bg-sky-100 text-sky-900',
  Maintenance: 'bg-violet-100 text-violet-900',
}

/* Hero picture: the fleet board, with the four vehicle statuses the app uses. */
const fleet = [
  ['LEA 4821', 'Toyota Corolla', 'Available', 'PKR 9,000'],
  ['LEB 1175', 'Suzuki Alto', 'Rented', 'PKR 5,500'],
  ['ABC 902', 'Toyota Hiace, 14 seats', 'Reserved', 'PKR 16,000'],
  ['LXZ 3340', 'Honda City', 'Maintenance', 'PKR 8,500'],
]

function FleetBoard() {
  return (
    <figure aria-label="Sample fleet board" className="mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.5)]">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
          <p className="font-medium">Fleet vehicles</p>
          <p className="text-sm text-slate-300">Daily rate</p>
        </div>
        <ul className="divide-y divide-slate-200">
          {fleet.map(([plate, model, status, rate]) => (
            <li key={plate} className="flex items-center gap-3 px-4 py-3">
              <span className="shrink-0 rounded border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold tracking-wider text-slate-900">{plate}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{model}</span>
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusStyle[status]}`}>{status}</span>
              </span>
              <span className="shrink-0 text-sm font-medium text-slate-700">{rate}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-xs text-slate-400">Sample vehicles with made-up plates and rates, shown for illustration.</figcaption>
    </figure>
  )
}

const bookingStages = [
  ['Reserved', 'bg-sky-100 text-sky-900', 'The customer, vehicle, dates and rate are saved. The car is held for them.'],
  ['Active', 'bg-amber-100 text-amber-900', 'The vehicle goes out. Deposit and advance are noted, and a driver can be added.'],
  ['Returned', 'bg-emerald-100 text-emerald-900', 'The vehicle comes back and becomes available again. Any balance left shows as due.'],
  ['Cancelled', 'bg-rose-100 text-rose-900', 'If the customer drops out, a cancellation fine can be kept from the advance.'],
]

export default function TransportFleetPage() {
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
      <section className="bg-teal-50 pb-16 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-teal-800">{page.eyebrow}</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-[3.4rem]">
              {page.headlineBefore}
              {page.headlineHighlight}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{page.description}</p>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Start with a 1-month free trial, choose Basic after the trial, then upgrade to Standard when your users, records and reports need more room.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link to="/signup" className={ctaPrimary}>
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaOutline}>
                Book Demo
                <HiOutlinePlayCircle className="text-xl text-slate-500" />
              </a>
            </div>
          </div>
          <FleetBoard />
        </div>
      </section>
      <RoadStripe />

      <ModuleIntroSection key={SLUG} solutionSlug={SLUG} />

      <ProductVideoSection solutionSlug={SLUG} />

      {/* Booking lifecycle: four status columns */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Where a booking can be</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Every rental in Nexora has one of four statuses, so the counter always knows which cars are out and which are coming back.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bookingStages.map(([name, chip, text]) => (
              <article key={name} className="rounded-lg border border-slate-200 p-5">
                <h3><span className={`inline-block rounded px-2.5 py-1 text-sm font-semibold ${chip}`}>{name}</span></h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features: a two-column table, name left, description right */}
      <section className="bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Key features for {page.productName}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{page.featuresIntro}</p>
          <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {page.features.map(([title, text, FeatureIcon]) => (
              <article key={title} className="grid items-start gap-2 border-b border-slate-200 px-5 py-5 last:border-b-0 md:grid-cols-[17rem_1fr] md:gap-8">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                  <FeatureIcon className="shrink-0 text-2xl text-teal-700" aria-hidden="true" />
                  {title}
                </h3>
                <p className="text-base leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Supporting pages */}
      {supportingPages.length > 0 ? (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Explore {page.productName} in depth</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">A closer look at how each part of {page.productName} actually works.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {supportingPages.map((sp) => (
                <Link key={sp.key} to={`/${sp.key}`} className="group rounded-lg border border-slate-200 p-5 hover:border-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">
                  <h3 className="text-lg font-semibold text-slate-900">{sp.badge}</h3>
                  <p className="mt-1 text-sm text-slate-600">{sp.title}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-800">
                    Read more
                    <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
            {compareLinks.length > 0 ? (
              <p className="mt-8 text-sm leading-7 text-slate-600">
                <span className="font-medium text-slate-900">Comparing your options? </span>
                {compareLinks.map((l, i) => (
                  <span key={l.to}>{i > 0 ? ', ' : null}<Link to={l.to} className={linkClass}>{l.text}</Link></span>
                ))}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      <RoadStripe />

      {/* Guide: a road line runs down the left; each section hangs off it */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="border-l-4 border-dashed border-amber-400 pl-6 sm:pl-10">
            {sections.map((s) => (
              <article key={s.heading} className="relative pb-12 last:pb-0">
                <span className="absolute -left-[2.2rem] top-2 h-3 w-3 rounded-full bg-teal-700 ring-4 ring-white sm:-left-[3.4rem]" aria-hidden="true" />
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{s.heading}</h2>
                <p className="mt-3 text-lg leading-8 text-slate-700">{s.body}</p>
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

      {/* Benefits + use cases */}
      <section className="bg-teal-900 py-16 text-white sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Better operations, faster teams and clearer ROI.</h2>
            <p className="mt-4 text-base leading-8 text-teal-100">Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.</p>
            <ul className="mt-6 list-disc space-y-2 pl-5 text-lg leading-8 text-teal-50">
              {page.benefits.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Industry use cases</h2>
            <p className="mt-4 text-base leading-8 text-teal-100">Flexible enough for car rental companies, bike rentals, fleet operators and transport counters.</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {page.useCases.map((u) => (
                <li key={u} className="rounded border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-200">{u}</li>
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
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {relatedSolutions.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className="group block h-full rounded-lg border border-slate-200 p-5 hover:border-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">
                    <p className="text-lg font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-2 text-base leading-7 text-slate-600">{item.text}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-800">
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

      {/* FAQ: grouped list, answers visible */}
      <section className="bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {faqs.map(([q, a]) => (
              <article key={q} className="rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-900">{q}</h3>
                <p className="mt-2 text-base leading-7 text-slate-600">{a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RelatedBlogSection topics={SOLUTION_BLOG_TOPICS[SLUG] || []} intro={`Practical guides for ${page.productName} users and owners.`} />

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-lg bg-teal-700 p-8 text-white sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to see {page.productName} in action?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className={`${ctaBase} bg-white text-teal-900 hover:bg-teal-50`}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={`${ctaBase} border border-teal-200 text-white hover:bg-teal-800`}>Book Demo</a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
