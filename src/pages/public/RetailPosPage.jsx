import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlinePlayCircle } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import ProductVideoSection from '../../components/product/ProductVideoSection.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import { SOLUTION_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import PublicPageShell from './PublicPageShell.jsx'
import { getSolutionPageData, whatsappLeadLink } from './solutionPagesData.js'

const SLUG = 'retail-pos'

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center sm:w-auto gap-2 whitespace-nowrap rounded-sm px-7 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const ctaPrimary = `${ctaBase} bg-zinc-950 text-white hover:bg-zinc-800 focus-visible:outline-zinc-950`
const ctaOutline = `${ctaBase} border-2 border-zinc-950 bg-white text-zinc-950 hover:bg-zinc-100 focus-visible:outline-zinc-950`
const ctaOnYellow = `${ctaBase} bg-zinc-950 text-yellow-300 hover:bg-zinc-800 focus-visible:outline-zinc-950`
const linkClass = 'font-semibold text-zinc-950 underline decoration-yellow-400 decoration-2 underline-offset-4 hover:bg-yellow-200'

/* A barcode drawn with fixed bar widths, so it renders identically on the server. */
const BARS = [2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2, 2, 1, 3, 1, 2, 1, 1]
function Barcode() {
  return (
    <div className="flex h-12 items-stretch gap-[2px]" aria-hidden="true">
      {BARS.map((w, i) => (
        <span key={`${w}-${i}`} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-transparent'} style={{ width: `${w * 2}px` }} />
      ))}
    </div>
  )
}

/* The hero counter screen. Every line on it is a field the retail receipt carries:
   subtotal, discount, tax, total, amount paid and change. */
function CounterScreen() {
  const cart = [
    ['Basmati rice 5kg', '2', 'PKR 3,400'],
    ['Cooking oil 3L', '1', 'PKR 2,150'],
    ['Detergent 1kg', '3', 'PKR 1,260'],
  ]
  const totals = [
    ['Subtotal', 'PKR 6,810'],
    ['Promo code SAVE5', '- PKR 340'],
    ['Tax 5 percent', 'PKR 324'],
  ]
  return (
    <figure aria-label="Sample retail checkout screen" className="mx-auto mt-14 max-w-4xl text-left">
      <div className="grid overflow-hidden border-2 border-zinc-950 bg-white md:grid-cols-[1.25fr_0.75fr]">
        <div className="p-5">
          <div className="flex items-center gap-3 border-2 border-zinc-950 px-3 py-2">
            <Barcode />
            <span className="text-sm text-zinc-500">Scan, or search by name or SKU</span>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-zinc-500">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-center font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(([item, qty, amt]) => (
                <tr key={item} className="border-b border-zinc-200">
                  <td className="py-2.5 font-medium text-zinc-950">{item}</td>
                  <td className="py-2.5 text-center text-zinc-700">{qty}</td>
                  <td className="py-2.5 text-right text-zinc-700">{amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-yellow-300 p-5 text-zinc-950">
          <dl className="text-sm">
            {totals.map(([k, v]) => (
              <div key={k} className="flex justify-between py-1">
                <dt>{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-zinc-950 pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-3xl font-bold">PKR 6,794</span>
          </div>
          <dl className="mt-3 text-sm">
            <div className="flex justify-between py-0.5"><dt>Amount paid</dt><dd className="font-medium">PKR 7,000</dd></div>
            <div className="flex justify-between py-0.5"><dt>Change</dt><dd className="font-medium">PKR 206</dd></div>
          </dl>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-zinc-400">Sample sale with made-up items and prices, shown for illustration.</figcaption>
    </figure>
  )
}

export default function RetailPosPage() {
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

      {/* Hero: centred, the checkout screen sits underneath */}
      <section className="border-b-4 border-yellow-300 bg-white pb-16 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <p className="inline-block bg-yellow-300 px-3 py-1 text-sm font-semibold text-zinc-950">{page.eyebrow}</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-zinc-950 sm:text-6xl">
            {page.headlineBefore}
            {page.headlineHighlight}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600">{page.description}</p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">
            Start with a 1-month free trial, choose Basic after the trial, then upgrade to Standard when your users, records and reports need more room.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link to="/signup" className={ctaPrimary}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaOutline}>
              Book Demo
              <HiOutlinePlayCircle className="text-xl" />
            </a>
          </div>
          <CounterScreen />
        </div>
      </section>

      <ModuleIntroSection key={SLUG} solutionSlug={SLUG} />

      <ProductVideoSection solutionSlug={SLUG} />

      {/* Features as shelf labels */}
      <section className="bg-zinc-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Key features for {page.productName}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">{page.featuresIntro}</p>
          <ul className="mt-12 border-t-2 border-zinc-950">
            {page.features.map(([title, text, FeatureIcon]) => (
              <li key={title} className="grid items-start gap-3 border-b border-zinc-300 py-5 md:grid-cols-[18rem_1fr] md:gap-10">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-zinc-950">
                  <span className="grid h-9 w-9 shrink-0 place-items-center bg-yellow-300"><FeatureIcon className="text-xl" aria-hidden="true" /></span>
                  {title}
                </h3>
                <p className="text-base leading-7 text-zinc-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Supporting pages */}
      {supportingPages.length > 0 ? (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Explore {page.productName} in depth</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">A closer look at how each part of {page.productName} actually works.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {supportingPages.map((sp) => (
                <Link key={sp.key} to={`/${sp.key}`} className="group flex items-center justify-between gap-3 border-2 border-zinc-950 p-4 hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950">
                  <span>
                    <h3 className="text-base font-semibold text-zinc-950">{sp.badge}</h3>
                    <span className="mt-0.5 block text-sm text-zinc-600 group-hover:text-zinc-900">{sp.title}</span>
                  </span>
                  <HiOutlineArrowRight className="shrink-0 text-lg text-zinc-950" />
                </Link>
              ))}
            </div>
            {compareLinks.length > 0 ? (
              <p className="mt-8 text-sm leading-7 text-zinc-600">
                <span className="font-semibold text-zinc-950">Comparing your options? </span>
                {compareLinks.map((l, i) => (
                  <span key={l.to}>{i > 0 ? ', ' : null}<Link to={l.to} className={linkClass}>{l.text}</Link></span>
                ))}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Guide: boxed tiles, two across */}
      <section className="bg-zinc-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-6 md:grid-cols-2 lg:px-8">
          {sections.map((s) => (
            <article key={s.heading} className="border-2 border-zinc-950 bg-white">
              <h2 className="bg-yellow-300 px-5 py-3 text-xl font-semibold text-zinc-950">{s.heading}</h2>
              <div className="p-5">
                <p className="text-base leading-7 text-zinc-700">{s.body}</p>
                {s.links?.length ? (
                  <p className="mt-4 grid gap-1.5 text-sm">
                    {s.links.map((l) => <Link key={l.to} to={l.to} className={linkClass}>{l.label}</Link>)}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Benefits and use cases */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Better operations, faster teams and clearer ROI.</h2>
            <p className="mt-4 text-base leading-8 text-zinc-600">Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.</p>
            <ul className="mt-6 grid gap-3">
              {page.benefits.map((b) => (
                <li key={b} className="flex items-center gap-3 border-l-8 border-yellow-300 bg-zinc-50 px-4 py-3 text-lg font-medium text-zinc-900">{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Industry use cases</h2>
            <p className="mt-4 text-base leading-8 text-zinc-600">Flexible enough for modern service, sales, education, property, retail and operations teams.</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {page.useCases.map((u) => (
                <li key={u} className="border-2 border-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-950">{u}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Related */}
      {relatedSolutions.length > 0 ? (
        <section className="bg-yellow-300 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Software that works with {page.productName}</h2>
              <Link to="/pricing" className={ctaOnYellow}>Compare Pricing</Link>
            </div>
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {relatedSolutions.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className="group block h-full border-2 border-zinc-950 bg-white p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950">
                    <p className="text-lg font-semibold text-zinc-950">{item.label}</p>
                    <p className="mt-2 text-base leading-7 text-zinc-600">{item.text}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950">
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

      {/* FAQ: two columns of disclosures */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 grid items-start gap-3 md:grid-cols-2">
            {faqs.map(([q, a]) => (
              <details key={q} className="group border-2 border-zinc-950 p-4 open:bg-zinc-50">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-950 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base font-semibold text-zinc-950">{q}</h3>
                  <span className="shrink-0 bg-yellow-300 px-2 text-lg leading-6 text-zinc-950 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-base leading-7 text-zinc-700">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <RelatedBlogSection topics={SOLUTION_BLOG_TOPICS[SLUG] || []} intro={`Practical guides for ${page.productName} users and owners.`} />

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 bg-zinc-950 p-8 sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ready to see {page.productName} in action?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className={`${ctaBase} bg-yellow-300 text-zinc-950 hover:bg-yellow-200`}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={`${ctaBase} border-2 border-zinc-500 text-white hover:bg-zinc-800`}>Book Demo</a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
