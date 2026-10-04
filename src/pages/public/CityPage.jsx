import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_PHONE_E164, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'
import { defaultResolvedPlans } from '../../lib/platformPlans.js'

/**
 * City landing page. The look borrows from Multan itself: the cobalt-and-turquoise
 * geometry of kashi-kari (blue glazed) tilework, the pointed arch of the shrines,
 * and clay-terracotta accents. All of it is plain inline SVG/CSS, so it renders
 * the same on the server and adds no image requests.
 */

const CLAY = '#c2410c'
const COBALT = '#1e3a8a'
const TURQUOISE = '#0891b2'

/** Eight-pointed star tile, the building block of kashi-kari geometry. */
function TilePattern({ id, color = COBALT, accent = TURQUOISE, opacity = 1 }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M36 6 L44 22 L62 14 L54 30 L70 36 L54 42 L62 58 L44 50 L36 66 L28 50 L10 58 L18 42 L2 36 L18 30 L10 14 L28 22 Z" stroke={color} />
            <circle cx="36" cy="36" r="7" stroke={accent} />
            <path d="M36 29 L43 36 L36 43 L29 36 Z" stroke={accent} />
          </g>
          <g fill={accent}>
            <circle cx="0" cy="0" r="3" />
            <circle cx="72" cy="0" r="3" />
            <circle cx="0" cy="72" r="3" />
            <circle cx="72" cy="72" r="3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** A thin repeating diamond band, like the border of a block-printed cloth. */
function BorderBand({ className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg aria-hidden="true" focusable="false" className={`block h-4 w-full ${className}`}>
      <defs>
        <pattern id={id} width="32" height="16" patternUnits="userSpaceOnUse">
          <rect width="32" height="16" fill={COBALT} />
          <path d="M8 8 L16 1 L24 8 L16 15 Z" fill="none" stroke="#fff" strokeWidth="1.2" />
          <circle cx="16" cy="8" r="2" fill={CLAY} />
          <circle cx="0" cy="8" r="2" fill={TURQUOISE} />
          <circle cx="32" cy="8" r="2" fill={TURQUOISE} />
        </pattern>
      </defs>
      <rect width="100%" height="16" fill={`url(#${id})`} />
    </svg>
  )
}

const ART_ICONS = {
  pottery: (
    <>
      <path d="M20 8h8M21 8c0 4-6 6-6 14 0 8 4 14 9 14s9-6 9-14c0-8-6-10-6-14" />
      <path d="M17 24h14M16.5 30h15" />
      <path d="M24 17l1.6 3.2 3.4.5-2.5 2.4.6 3.5-3.1-1.7-3.1 1.7.6-3.5-2.5-2.4 3.4-.5Z" />
    </>
  ),
  lamp: (
    <>
      <path d="M24 5v6" />
      <path d="M12 21c0-6 5-10 12-10s12 4 12 10c0 5-5 9-12 9s-12-4-12-9Z" />
      <path d="M24 11v19M18 13.5c-2 4-2 11 0 15M30 13.5c2 4 2 11 0 15" />
      <path d="M20 30v5h8v-5M17 38h14" />
    </>
  ),
  ajrak: (
    <>
      <path d="M24 5l16 19-16 19L8 24Z" />
      <path d="M24 13l9 11-9 11-9-11Z" />
      <circle cx="24" cy="24" r="3" />
    </>
  ),
  mango: (
    <>
      <path d="M26 9c3-1 6 0 8 2-3 0-5 1-7 3" />
      <path d="M24 14c-8 1-14 8-12 16 1.500 6 7 10 13 9 8-1 12-9 9-17-1.500-4.500-5.500-8.500-10-8Z" />
      <path d="M20 22c-2 2-3 5-2.500 8" />
    </>
  ),
}

function ArtIcon({ name }) {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ART_ICONS[name]}
    </svg>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[13px] leading-[1.7] text-slate-600">{faq.a}</p></div>
      </div>
    </article>
  )
}

function SectionHeading({ eyebrow, children }) {
  return (
    <div className="text-center">
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: CLAY }}>{eyebrow}</p>
      ) : null}
      <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-4xl">{children}</h2>
    </div>
  )
}

export default function CityPage({ slug }) {
  const city = useMemo(() => getCity(slug), [slug])
  const [openFaq, setOpenFaq] = useState(0)
  const tileId = useId().replace(/:/g, '')
  const tileId2 = `${tileId}b`

  if (!city) return null

  const plans = defaultResolvedPlans().filter((plan) => plan.active !== false)
  const seoData = {
    path: `/${city.slug}`,
    title: city.seoTitle,
    description: city.seoDescription,
    keywords: city.seoKeywords,
    canonical: `https://nexorasolution.online/${city.slug}/`,
    ogTitle: city.seoTitle,
    ogDescription: city.seoDescription,
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
  }

  const primaryBtn = 'inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]'
  const secondaryBtn = 'inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-6 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge={city.name} badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><Link to="/pakistan">Pakistan</Link><span> / </span><span aria-current="page">{city.name}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <TilePattern id={tileId} opacity={0.1} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.7)_48%,rgba(255,255,255,0)_78%)]" />
        <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-800 shadow-sm backdrop-blur">
            <HiOutlineMapPin className="h-4 w-4" style={{ color: CLAY }} />
            {city.hero.eyebrow}
          </p>
          <p lang="ur" dir="rtl" className="mt-6 text-2xl font-medium text-blue-900/80 sm:text-3xl">{city.nameUrdu}</p>
          <h1 className="mx-auto mt-2 max-w-4xl text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.02em] text-slate-900 sm:text-[3.4rem] lg:text-[4rem]">
            {city.hero.headingA}{' '}
            <span className="bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-800 bg-clip-text text-transparent">{city.hero.headingB}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{city.hero.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className={primaryBtn}>
              Start Free Trial on WhatsApp <HiOutlineArrowRight className="text-lg" />
            </a>
            <a href={`tel:${SITE_PHONE_E164}`} className={secondaryBtn}>
              <HiOutlinePhone className="h-4 w-4" /> Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>
      <BorderBand />

      {/* Facts */}
      <section className="bg-white py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
          {city.facts.map((fact) => (
            <div key={fact.label} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-center">
              <p className="text-2xl font-semibold text-blue-900">{fact.value}</p>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Nexora */}
      <section className="bg-white pb-16 pt-6 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Who we are">{city.intro.heading}</SectionHeading>
          <div className="mt-8 space-y-5">
            {city.intro.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="text-[15px] leading-[1.8] text-slate-600">{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Multan's arts */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef5ff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
        <TilePattern id={tileId2} opacity={0.06} />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow={city.arts.eyebrow}>{city.arts.heading}</SectionHeading>
          <p className="mx-auto mt-5 max-w-3xl text-center text-[15px] leading-[1.8] text-slate-600">{city.arts.intro}</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {city.arts.items.map((item) => (
              <article key={item.key} className="flex flex-col rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_6px_24px_-14px_rgba(30,58,138,0.25)]">
                {/* Pointed-arch frame, after the shrine doorways of old Multan */}
                <span
                  className="flex h-24 w-[4.5rem] items-center justify-center bg-gradient-to-b from-blue-800 to-cyan-700 pt-4 text-white"
                  style={{ borderRadius: '2rem 2rem 0.5rem 0.5rem', clipPath: 'polygon(50% 0, 88% 14%, 100% 40%, 100% 100%, 0 100%, 0 40%, 12% 14%)' }}
                >
                  <ArtIcon name={item.key} />
                </span>
                <h3 className="mt-5 text-[16px] font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <BorderBand />

      {/* Business to module */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Products">{city.business.heading}</SectionHeading>
          <p className="mx-auto mt-5 max-w-3xl text-center text-[15px] leading-[1.8] text-slate-600">{city.business.intro}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {city.business.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex flex-col rounded-[1.35rem] border border-slate-200/70 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_14px_36px_-16px_rgba(30,58,138,0.28)]"
              >
                <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: CLAY }}>{item.label}</p>
                <h3 className="mt-2 text-[16px] font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-[1.7] text-slate-600">{item.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-blue-700 transition-all duration-300 group-hover:gap-2">
                  See {item.label} <HiOutlineArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center text-[14px] text-slate-600">
            Need something that is not on this list? We also build{' '}
            <Link to="/software-development" className="font-medium text-blue-700 underline-offset-2 hover:underline">custom software</Link>,{' '}
            <Link to="/mobile-app-development" className="font-medium text-blue-700 underline-offset-2 hover:underline">mobile apps</Link> and{' '}
            <Link to="/ecommerce-development" className="font-medium text-blue-700 underline-offset-2 hover:underline">online stores</Link>.
          </p>
        </div>
      </section>

      {/* Why */}
      <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why Nexora">{city.why.heading}</SectionHeading>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {city.why.items.map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-5">
                <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-[13px] leading-[1.7] text-slate-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas */}
      <section className="bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="rounded-[1.8rem] border border-blue-100 bg-blue-50/50 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">{city.areas.heading}</h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-slate-600">{city.areas.text}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {city.areas.list.map((area) => (
                <li key={area} className="rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-blue-900">{area}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white pb-16 sm:pb-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Pricing">{city.pricingHeading}</SectionHeading>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-[1.35rem] border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                <p className="mt-2 text-2xl font-semibold text-blue-900">
                  {typeof plan.monthlyPrice === 'number' ? `Rs. ${plan.monthlyPrice.toLocaleString('en-PK')}` : 'Custom'}
                  {typeof plan.monthlyPrice === 'number' ? <span className="text-[12px] font-normal text-slate-500"> / month</span> : null}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[14px] leading-7 text-slate-600">
            {city.pricingNote}{' '}
            <Link to="/pricing" className="font-medium text-blue-700 underline-offset-2 hover:underline">See all plans</Link>
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Getting started">Live in three steps</SectionHeading>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {city.steps.map((step, index) => (
              <li key={step.title} className="rounded-[1.35rem] border border-slate-200 bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white">{index + 1}</span>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ">Questions from Multan businesses</SectionHeading>
          <div className="mt-10 grid gap-3">
            {city.faqs.map((faq, i) => (
              <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact + CTA */}
      <BorderBand />
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0b1f4d_0%,#12306e_55%,#0e4a6b_100%)] px-5 py-16 text-white sm:px-6 sm:py-20">
        <TilePattern id={`${tileId}c`} color="#ffffff" accent="#67e8f9" opacity={0.07} />
        <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{city.ctaHeading}</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-blue-100">{city.ctaSubtext}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-blue-950 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
                Start Free Trial <HiOutlineArrowRight className="text-lg" />
              </a>
              <Link to="/contact" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.97]">
                Contact page
              </Link>
            </div>
          </div>
          <address className="rounded-[1.35rem] border border-white/15 bg-white/[0.06] p-6 text-[14px] not-italic leading-7 text-blue-50">
            <p className="font-semibold text-white">Nexora Solution</p>
            <p className="mt-1 flex items-start gap-2"><HiOutlineMapPin className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />{SITE_ADDRESS_TEXT}</p>
            <p className="mt-1 flex items-center gap-2"><HiOutlinePhone className="h-4 w-4 shrink-0 text-cyan-300" /><a href={`tel:${SITE_PHONE_E164}`} className="hover:underline">{SITE_PHONE}</a></p>
            <p className="mt-1 pl-6"><a href={`mailto:${SITE_EMAILS.sales}`} className="hover:underline">{SITE_EMAILS.sales}</a></p>
          </address>
        </div>
      </section>
    </PublicPageShell>
  )
}
