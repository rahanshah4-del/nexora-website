import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import AllProducts from './AllProducts.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'
import { defaultResolvedPlans } from '../../lib/platformPlans.js'

/**
 * Islamabad landing page. The look borrows from the capital's own setting: the
 * layered pine-green Margalla Hills, topographic contour lines, the lettered
 * sector grid, the Faisal Mosque's angular tent-like prayer hall between four
 * minarets, and the four-petal Pakistan Monument. Urdu appears in short tags
 * and a greeting, next to English. All inline SVG/CSS.
 */

const C = {
  amber: '#b36a1d',
  amberDeep: '#7a4410',
  amberLight: '#d08a3a',
  snow: '#f6f9f7',
  mist: '#e4efe8',
  pine: '#1f6b45',
  pineDeep: '#10351f',
  gold: '#e0b64a',
  goldSoft: '#f6e7b8',
  sky: '#cfe6ee',
  ink: '#18241d',
  body: '#3f4d44',
}
const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" }
const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Geeza Pro', 'Noto Naskh Arabic', 'Arial', serif", lineHeight: 1.9 }

/** Topographic contour lines, like a map of the Margalla Hills. */
function JaliPattern({ id, color = C.pine, opacity = 1 }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="120" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
            <path d="M0 60 C20 50 30 20 60 24 C90 28 100 56 120 46" />
            <path d="M0 70 C24 62 34 34 60 38 C86 42 96 66 120 58" />
            <path d="M0 50 C16 38 28 8 60 10 C92 12 104 44 120 34" />
            <path d="M0 78 C28 74 40 50 60 52 C80 54 92 74 120 70" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Sector grid band: a row of lettered blocks, like the F-, G- and I- sectors. */
function FloralBand({ dark = false }) {
  const id = useId().replace(/:/g, '')
  const bg = dark ? C.pineDeep : C.pine
  return (
    <svg aria-hidden="true" focusable="false" className="block h-10 w-full" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="56" height="40" patternUnits="userSpaceOnUse">
          <rect width="56" height="40" fill={bg} />
          <rect x="4" y="6" width="22" height="28" fill="none" stroke={C.goldSoft} strokeWidth="1.5" />
          <rect x="30" y="6" width="22" height="28" fill="none" stroke={C.goldSoft} strokeWidth="1.5" opacity="0.7" />
          <rect x="4" y="19" width="22" height="1.5" fill={C.gold} opacity="0.8" />
          <circle cx="41" cy="20" r="4" fill={C.gold} />
        </pattern>
      </defs>
      <rect width="100%" height="40" fill={`url(#${id})`} />
    </svg>
  )
}

/** Margalla ridges behind the Faisal Mosque (angular prayer hall, four minarets). */
function MosqueSkyline() {
  const minaret = (x) => (
    <g key={x}>
      <rect x={x - 4} y="52" width="8" height="128" />
      <rect x={x - 6} y="92" width="12" height="3" />
      <rect x={x - 6} y="128" width="12" height="3" />
      <path d={`M${x - 6} 52 L${x} 28 L${x + 6} 52Z`} />
    </g>
  )
  return (
    <svg viewBox="0 0 800 190" preserveAspectRatio="xMidYMax slice" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <path d="M0 150 L70 90 L130 120 L210 60 L290 112 L360 76 L440 118 L520 54 L600 110 L670 80 L740 118 L800 92 V190 H0Z" fill="#8fb9a0" />
      <path d="M0 170 L90 120 L170 148 L260 100 L340 150 L440 112 L540 152 L640 108 L720 148 L800 124 V190 H0Z" fill="#5f9a7a" />
      <g fill={C.pine}>
        {[250, 550].map(minaret)}
        {[320, 480].map(minaret)}
        <path d="M330 170 L400 70 L470 170Z" fill={C.pineDeep} />
        <path d="M356 170 L400 100 L444 170Z" fill={C.snow} opacity="0.9" />
        <path d="M400 70 L400 170" stroke={C.gold} strokeWidth="2" />
        <rect x="300" y="168" width="200" height="12" fill={C.pineDeep} />
      </g>
      <rect y="176" width="800" height="14" fill={C.pineDeep} />
    </svg>
  )
}

const ICONS = {
  home: (
    <>
      <path d="M6 22 24 7l18 15" />
      <path d="M10 20v20h28V20M20 40V28h8v12" />
    </>
  ),
  dish: (
    <>
      <path d="M6 28c0 8 8 14 18 14s18-6 18-14Z" />
      <path d="M10 28c0-8 6-14 14-14s14 6 14 14" />
      <path d="M24 8v6" />
    </>
  ),
  book: (
    <>
      <path d="M8 10c6-3 11-3 16 1 5-4 10-4 16-1v28c-6-3-11-3-16 1-5-4-10-4-16-1Z" />
      <path d="M24 11v28" />
    </>
  ),
  shop: (
    <>
      <path d="M6 18 10 8h28l4 10c0 3-3 5-5 5s-5-2-5-5c0 3-3 5-6 5s-6-2-6-5c0 3-3 5-6 5s-5-2-5-5Z" />
      <path d="M10 25v15h28V25M20 40V31h8v9" />
    </>
  ),
}

/** Four-petal badge (after the Pakistan Monument) for each card icon. */
function ArchIcon({ name }) {
  return (
    <span
      className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center text-white"
      style={{
        backgroundImage: `linear-gradient(180deg, ${C.pine}, ${C.pineDeep})`,
        clipPath: 'polygon(50% 0, 62% 26%, 100% 38%, 74% 50%, 100% 62%, 62% 74%, 50% 100%, 38% 74%, 0 62%, 26% 50%, 0 38%, 38% 26%)',
      }}
    >
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICONS[name]}
      </svg>
    </span>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-2xl border" style={{ borderColor: `${C.amber}40`, backgroundColor: '#fff' }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.ink }}>{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color: C.amber }} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[14px] leading-[1.75]" style={{ color: C.body }}>{faq.a}</p></div>
      </div>
    </article>
  )
}

function Heading({ eyebrow, children, align = 'center', light = false }) {
  const tone = light ? C.goldSoft : C.amber
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {eyebrow ? (
        <p className="inline-flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: tone }}>
          <span aria-hidden="true" className="h-px w-8" style={{ backgroundColor: tone }} />
          <span lang={/[؀-ۿ]/.test(eyebrow) ? 'ur' : undefined}>{eyebrow}</span>
          <span aria-hidden="true" className="h-px w-8" style={{ backgroundColor: tone }} />
        </p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SERIF, color: light ? '#fff' : C.pineDeep }}>{children}</h2>
    </div>
  )
}

const isInternal = (to) => String(to || '').startsWith('/')

export default function IslamabadPage() {
  const city = useMemo(() => getCity('islamabad'), [])
  const [openFaq, setOpenFaq] = useState(0)
  const jaliA = useId().replace(/:/g, '')
  const jaliB = `${jaliA}b`
  const jaliC = `${jaliA}c`
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

  const btnPrimary = 'inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(15,107,74,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 bg-white/80 px-7 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge={city.name} badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><Link to="/pakistan">Pakistan</Link><span> / </span><span aria-current="page">Islamabad</span>
      </nav>

      <div style={{ backgroundColor: C.snow, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundImage: `linear-gradient(180deg, ${C.mist} 0%, ${C.snow} 70%)` }}>
          <JaliPattern id={jaliA} opacity={0.09} />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${C.goldSoft} 0%, rgba(243,228,173,0) 68%)` }} />
          <div className="relative mx-auto max-w-4xl px-5 pb-6 pt-20 text-center sm:px-6 sm:pt-24 lg:pt-28">
            <p lang="ur" dir="rtl" className="text-4xl font-medium sm:text-5xl" style={{ ...URDU, color: C.amber }}>اسلام آباد</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: `${C.amber}66`, color: C.amberDeep, backgroundColor: '#fff' }}>
              <HiOutlineMapPin className="h-4 w-4" style={{ color: C.amber }} />
              Welcome to Islamabad · Pakistan
            </p>
            <h1 className="mt-6 text-[2.4rem] font-bold leading-[1.08] tracking-tight sm:text-[3.5rem] lg:text-[4rem]" style={{ ...SERIF, color: C.pineDeep }}>
              {city.hero.headingA}{' '}
              <span style={{ color: C.amber }}>{city.hero.headingB}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8" style={{ color: C.body }}>{city.hero.subtitle}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to={city.hero.primaryCta.to} className={btnPrimary} style={{ backgroundColor: C.pine }}>
                {city.hero.primaryCta.label} <HiOutlineArrowRight className="text-lg" />
              </Link>
              <Link to={city.hero.secondaryCta.to} className={btnLine} style={{ borderColor: C.amber, color: C.amberDeep }}>
                {city.hero.secondaryCta.label}
              </Link>
            </div>
          </div>
          <div className="relative mt-4">
            <MosqueSkyline />
          </div>
        </section>
        <FloralBand />

        {/* Facts */}
        <section className="py-10">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
            {city.facts.map((fact) => (
              <div key={fact.label} className="rounded-2xl border bg-white p-4 text-center shadow-sm" style={{ borderColor: `${C.gold}88` }}>
                <p className="text-2xl font-bold" style={{ ...SERIF, color: C.amber }}>{fact.value}</p>
                <p className="mt-1 text-[12px] leading-5" style={{ color: C.body }}>{fact.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="pb-16 pt-4 sm:pb-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Who we are">{city.intro.heading}</Heading>
            <div className="mt-8 space-y-5">
              {city.intro.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="text-[16px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* The city */}
        <section className="relative overflow-hidden py-16 sm:py-20" style={{ backgroundColor: C.mist }}>
          <JaliPattern id={jaliB} opacity={0.07} />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="The city we build for">{city.arts.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.arts.intro}</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {city.arts.items.map((item) => (
                <article key={item.key} className="flex gap-5 rounded-2xl border bg-white p-6 shadow-[0_8px_24px_-16px_rgba(94,35,24,0.4)]" style={{ borderColor: `${C.amber}33` }}>
                  <ArchIcon name={item.key} />
                  <div>
                    <h3 className="text-[18px] font-bold" style={{ ...SERIF, color: C.amberDeep }}>{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.75]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <FloralBand dark />

        {/* Modules */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Products">{city.business.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.business.intro}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {city.business.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-18px_rgba(94,35,24,0.5)]"
                  style={{ borderColor: `${C.amber}33` }}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${C.amber}, ${C.gold}, ${C.pine})` }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: C.amber }}>{item.label}</p>
                  <h3 className="mt-2 text-[17px] font-bold" style={{ ...SERIF, color: C.pineDeep }}>{item.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: C.pine }}>
                    {item.cta || `See ${item.label}`} <HiOutlineArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
            {city.business.footer ? (
              <p className="mt-8 text-center text-[14.5px]" style={{ color: C.body }}>
                {city.business.footer.text}{' '}
                {city.business.footer.links.map((link, i, all) => (
                  <span key={link.to}>
                    <Link to={link.to} className="font-semibold underline underline-offset-2" style={{ color: C.pine }}>{link.label}</Link>
                    {i < all.length - 2 ? ', ' : i === all.length - 2 ? ' and ' : '.'}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>

        {/* Tax note */}
        {(city.extraSections || []).map((section) => (
          <section key={section.heading} className="py-14 sm:py-16" style={{ backgroundColor: C.goldSoft }}>
            <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
              <div className="rounded-3xl border-2 bg-white p-7 sm:p-9" style={{ borderColor: C.gold }}>
                <Heading eyebrow={section.eyebrow}>{section.heading}</Heading>
                <div className="mt-7 space-y-5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)} className="text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
                  ))}
                </div>
                {section.links ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {section.links.map((link) => {
                      const cls = 'rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-[#f4ecdc]'
                      return isInternal(link.to) ? (
                        <Link key={link.to} to={link.to} className={cls} style={{ borderColor: C.pine, color: C.pineDeep }}>{link.label}</Link>
                      ) : (
                        <a key={link.to} href={link.to} target="_blank" rel="noopener noreferrer" className={cls} style={{ borderColor: C.pine, color: C.pineDeep }}>{link.label}</a>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ))}

        {/* Why */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Why Nexora">{city.why.heading}</Heading>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {city.why.items.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border bg-white p-5" style={{ borderColor: `${C.amber}26` }}>
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.pine }} />
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.pineDeep }}>{item.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="relative overflow-hidden py-16 sm:py-20" style={{ backgroundColor: C.pineDeep }}>
          <JaliPattern id={jaliC} color="#ffffff" opacity={0.06} />
          <div className="relative mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Heading light eyebrow="Pricing">{city.pricingHeading}</Heading>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border-2 p-6 text-center" style={{ borderColor: `${C.gold}99`, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-semibold" style={{ color: C.goldSoft }}>{plan.name}</p>
                  <p className="mt-2 text-3xl font-bold text-white" style={SERIF}>
                    {typeof plan.monthlyPrice === 'number' ? `Rs. ${plan.monthlyPrice.toLocaleString('en-PK')}` : 'Custom'}
                    {typeof plan.monthlyPrice === 'number' ? <span className="text-[12px] font-normal text-emerald-100"> / month</span> : null}
                  </p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-[14px] leading-7 text-emerald-50">
              {city.pricingNote}{' '}
              <Link to="/pricing" className="font-semibold underline underline-offset-2" style={{ color: C.goldSoft }}>See all plans</Link>
            </p>
          </div>
        </section>

        {/* Areas */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
            <div className="rounded-3xl border p-7 sm:p-9" style={{ borderColor: `${C.amber}40`, backgroundColor: C.mist }}>
              <h2 className="text-2xl font-bold" style={{ ...SERIF, color: C.amberDeep }}>{city.areas.heading}</h2>
              <p className="mt-4 text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{city.areas.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {city.areas.list.map((area) => (
                  <li key={area} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderColor: C.amber, color: C.amberDeep, backgroundColor: '#fff' }}>{area}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        <FloralBand />

        {/* Steps */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: C.mist }}>
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Getting started">{city.stepsHeading}</Heading>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {city.steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl bg-white p-6 shadow-[0_8px_24px_-16px_rgba(94,35,24,0.4)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white" style={{ ...SERIF, backgroundColor: C.pine, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.gold}` }}>{index + 1}</span>
                  <h3 className="mt-5 text-[16px] font-bold" style={{ ...SERIF, color: C.pineDeep }}>{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: C.body }}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <AllProducts theme={{ bg: C.snow, border: `${C.amber}33`, accent: C.pine, heading: C.pineDeep, body: C.body, serif: SERIF }} />

        {/* FAQ */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="FAQ">{city.faqHeading}</Heading>
            <div className="mt-10 grid gap-3">
              {city.faqs.map((faq, i) => (
                <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <FloralBand dark />
        <section className="px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.amberDeep }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow="Let’s begin">{city.ctaHeading}</Heading>
              <p className="mt-4 max-w-xl text-[16px] leading-7" style={{ color: '#f3e1d6' }}>{city.ctaSubtext}</p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link to={city.cta.primary.to} className={btnPrimary} style={{ backgroundColor: C.gold, color: C.amberDeep }}>
                  {city.cta.primary.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className={`${btnLine} !bg-transparent hover:!bg-white/10`} style={{ borderColor: '#ffffff88', color: '#fff' }}>
                  {city.cta.secondary.label}
                </a>
              </div>
            </div>
            <address className="rounded-2xl border-2 border-dashed p-6 text-[14px] not-italic leading-7" style={{ borderColor: `${C.gold}99`, backgroundColor: 'rgba(255,255,255,0.06)', color: '#f3e1d6' }}>
              <p className="text-base font-bold text-white" style={SERIF}>Nexora Solution</p>
              <p className="mt-1 text-[13px] leading-6">{city.contactNote}</p>
              <p className="mt-2 flex items-start gap-2"><HiOutlineMapPin className="mt-1 h-4 w-4 shrink-0" style={{ color: C.gold }} />Head office: {SITE_ADDRESS_TEXT}</p>
              <p className="mt-1 flex items-center gap-2"><HiOutlinePhone className="h-4 w-4 shrink-0" style={{ color: C.gold }} /><a href={SITE_WHATSAPP} className="hover:underline">WhatsApp {SITE_PHONE}</a></p>
              <p className="mt-1 pl-6"><a href={`mailto:${SITE_EMAILS.sales}`} className="hover:underline">{SITE_EMAILS.sales}</a></p>
            </address>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
