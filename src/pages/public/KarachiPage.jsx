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
 * Karachi landing page. The look borrows from the port city: Arabian Sea teal
 * and navy, the white marble dome and arches of the Quaid's Mausoleum, waves,
 * and Pakistani truck art (red, marigold, parrot green and pink, with floral
 * and chamak-patti diamond borders). Urdu appears in short tags and a
 * greeting, next to English. All inline SVG/CSS.
 */

const C = {
  red: '#d7263d',
  redDeep: '#8f1226',
  redLight: '#ef5367',
  snow: '#fffaf0',
  mist: '#e3f1f5',
  sea: '#0b6e8a',
  navy: '#0a2a43',
  gold: '#f4b400',
  goldSoft: '#fde9a6',
  green: '#2e9e4f',
  pink: '#e8478b',
  ink: '#14232e',
  body: '#40505c',
}
const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" }
const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Geeza Pro', 'Noto Naskh Arabic', 'Arial', serif", lineHeight: 1.9 }

/** Wave pattern, like the sea off Clifton. */
function JaliPattern({ id, color = C.sea, opacity = 1 }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="64" height="32" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round">
            <path d="M0 10 q8 -8 16 0 t16 0 t16 0 t16 0" />
            <path d="M-16 26 q8 -8 16 0 t16 0 t16 0 t16 0 t16 0" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Truck-art border: alternating chamak-patti diamonds and small flowers. */
function FloralBand({ dark = false }) {
  const id = useId().replace(/:/g, '')
  const bg = dark ? C.navy : C.red
  return (
    <svg aria-hidden="true" focusable="false" className="block h-10 w-full" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="60" height="40" patternUnits="userSpaceOnUse">
          <rect width="60" height="40" fill={bg} />
          <path d="M15 6 L24 20 L15 34 L6 20Z" fill={C.gold} />
          <path d="M15 12 L20 20 L15 28 L10 20Z" fill={C.green} />
          <g transform="translate(45 20)">
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx="0" cy="-7" r="4" fill={C.pink} transform={`rotate(${a})`} />
            ))}
            <circle r="3.5" fill={C.gold} />
          </g>
          <rect y="2" width="60" height="1.5" fill="#fff" opacity="0.8" />
          <rect y="36.500" width="60" height="1.5" fill="#fff" opacity="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="40" fill={`url(#${id})`} />
    </svg>
  )
}

/** The Quaid's Mausoleum (white dome on arched walls), the sea, and a painted truck. */
function MosqueSkyline() {
  const arch = (x) => <path key={x} d={`M${x - 14} 150 V126 Q${x} 106 ${x + 14} 126 V150Z`} />
  return (
    <svg viewBox="0 0 800 190" preserveAspectRatio="xMidYMax slice" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <g fill="#fff" stroke={C.navy} strokeWidth="2">
        <rect x="290" y="96" width="220" height="62" />
        <path d="M340 96 C340 62 366 46 400 28 C434 46 460 62 460 96Z" />
        <rect x="396" y="14" width="8" height="16" stroke="none" fill={C.gold} />
        <rect x="270" y="150" width="260" height="10" />
      </g>
      <g fill={C.sea} opacity="0.9">
        {[320, 360, 400, 440, 480].map(arch)}
      </g>
      <g fill={C.navy}>
        <rect x="262" y="78" width="12" height="82" />
        <rect x="526" y="78" width="12" height="82" />
      </g>
      <g fill={C.gold}>
        <circle cx="268" cy="74" r="6" />
        <circle cx="532" cy="74" r="6" />
      </g>
      <rect y="160" width="800" height="30" fill={C.sea} />
      <g fill="none" stroke="#bfe6ef" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        {[0, 70, 140, 210, 280, 350, 420, 490, 560, 630, 700, 770].map((x, i) => (
          <path key={x} d={`M${x + 8} ${172 + (i % 2) * 8} q8 -7 16 0 t16 0`} />
        ))}
      </g>
      <g transform="translate(560 112)">
        <rect x="0" y="12" width="110" height="38" rx="4" fill={C.red} />
        <rect x="4" y="16" width="102" height="6" fill={C.gold} />
        <rect x="70" y="0" width="38" height="24" rx="4" fill={C.green} />
        <rect x="76" y="5" width="26" height="12" fill="#cfeaf2" />
        <rect x="8" y="26" width="56" height="4" fill="#fff" opacity="0.8" />
        <circle cx="22" cy="52" r="9" fill={C.navy} />
        <circle cx="22" cy="52" r="3.500" fill={C.gold} />
        <circle cx="84" cy="52" r="9" fill={C.navy} />
        <circle cx="84" cy="52" r="3.500" fill={C.gold} />
        <circle cx="14" cy="40" r="3" fill={C.pink} />
        <circle cx="30" cy="40" r="3" fill={C.pink} />
        <circle cx="46" cy="40" r="3" fill={C.pink} />
      </g>
    </svg>
  )
}

const ICONS = {
  truck: (
    <>
      <path d="M4 14h26v18H4ZM30 20h8l6 6v6H30Z" />
      <circle cx="12" cy="35" r="3.500" />
      <circle cx="36" cy="35" r="3.500" />
    </>
  ),
  dish: (
    <>
      <path d="M6 28c0 8 8 14 18 14s18-6 18-14Z" />
      <path d="M10 28c0-8 6-14 14-14s14 6 14 14" />
      <path d="M24 8v6" />
    </>
  ),
  shop: (
    <>
      <path d="M6 18 10 8h28l4 10c0 3-3 5-5 5s-5-2-5-5c0 3-3 5-6 5s-6-2-6-5c0 3-3 5-6 5s-5-2-5-5Z" />
      <path d="M10 25v15h28V25M20 40V31h8v9" />
    </>
  ),
  pill: (
    <>
      <rect x="6" y="17" width="36" height="14" rx="7" transform="rotate(-35 24 24)" />
      <path d="M17 13l14 22" />
    </>
  ),
}

/** Round truck-art badge with a gold ring for each card icon. */
function ArchIcon({ name }) {
  return (
    <span
      className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundImage: `linear-gradient(180deg, ${C.red}, ${C.redDeep})`, boxShadow: `0 0 0 3px #fff, 0 0 0 6px ${C.gold}` }}
    >
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICONS[name]}
      </svg>
    </span>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-2xl border" style={{ borderColor: `${C.red}40`, backgroundColor: '#fff' }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.ink }}>{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color: C.red }} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[14px] leading-[1.75]" style={{ color: C.body }}>{faq.a}</p></div>
      </div>
    </article>
  )
}

function Heading({ eyebrow, children, align = 'center', light = false }) {
  const tone = light ? C.goldSoft : C.red
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {eyebrow ? (
        <p className="inline-flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: tone }}>
          <span aria-hidden="true" className="h-px w-8" style={{ backgroundColor: tone }} />
          <span lang={/[؀-ۿ]/.test(eyebrow) ? 'ur' : undefined}>{eyebrow}</span>
          <span aria-hidden="true" className="h-px w-8" style={{ backgroundColor: tone }} />
        </p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SERIF, color: light ? '#fff' : C.navy }}>{children}</h2>
    </div>
  )
}

const isInternal = (to) => String(to || '').startsWith('/')

export default function KarachiPage() {
  const city = useMemo(() => getCity('karachi'), [])
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
        <Link to="/">Home</Link><span> / </span><Link to="/pakistan">Pakistan</Link><span> / </span><span aria-current="page">Karachi</span>
      </nav>

      <div style={{ backgroundColor: C.snow, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundImage: `linear-gradient(180deg, ${C.mist} 0%, ${C.snow} 70%)` }}>
          <JaliPattern id={jaliA} opacity={0.09} />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${C.goldSoft} 0%, rgba(243,228,173,0) 68%)` }} />
          <div className="relative mx-auto max-w-4xl px-5 pb-6 pt-20 text-center sm:px-6 sm:pt-24 lg:pt-28">
            <p lang="ur" dir="rtl" className="text-4xl font-medium sm:text-5xl" style={{ ...URDU, color: C.red }}>کراچی</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: `${C.red}66`, color: C.redDeep, backgroundColor: '#fff' }}>
              <HiOutlineMapPin className="h-4 w-4" style={{ color: C.red }} />
              Welcome to Karachi · Pakistan
            </p>
            <h1 className="mt-6 text-[2.4rem] font-bold leading-[1.08] tracking-tight sm:text-[3.5rem] lg:text-[4rem]" style={{ ...SERIF, color: C.navy }}>
              {city.hero.headingA}{' '}
              <span style={{ color: C.red }}>{city.hero.headingB}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8" style={{ color: C.body }}>{city.hero.subtitle}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to={city.hero.primaryCta.to} className={btnPrimary} style={{ backgroundColor: C.sea }}>
                {city.hero.primaryCta.label} <HiOutlineArrowRight className="text-lg" />
              </Link>
              <Link to={city.hero.secondaryCta.to} className={btnLine} style={{ borderColor: C.red, color: C.redDeep }}>
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
                <p className="text-2xl font-bold" style={{ ...SERIF, color: C.red }}>{fact.value}</p>
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
                <article key={item.key} className="flex gap-5 rounded-2xl border bg-white p-6 shadow-[0_8px_24px_-16px_rgba(94,35,24,0.4)]" style={{ borderColor: `${C.red}33` }}>
                  <ArchIcon name={item.key} />
                  <div>
                    <h3 className="text-[18px] font-bold" style={{ ...SERIF, color: C.redDeep }}>{item.title}</h3>
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
                  style={{ borderColor: `${C.red}33` }}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${C.red}, ${C.gold}, ${C.sea})` }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: C.red }}>{item.label}</p>
                  <h3 className="mt-2 text-[17px] font-bold" style={{ ...SERIF, color: C.navy }}>{item.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: C.sea }}>
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
                    <Link to={link.to} className="font-semibold underline underline-offset-2" style={{ color: C.sea }}>{link.label}</Link>
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
                        <Link key={link.to} to={link.to} className={cls} style={{ borderColor: C.sea, color: C.navy }}>{link.label}</Link>
                      ) : (
                        <a key={link.to} href={link.to} target="_blank" rel="noopener noreferrer" className={cls} style={{ borderColor: C.sea, color: C.navy }}>{link.label}</a>
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
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border bg-white p-5" style={{ borderColor: `${C.red}26` }}>
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.sea }} />
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.navy }}>{item.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="relative overflow-hidden py-16 sm:py-20" style={{ backgroundColor: C.navy }}>
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
            <div className="rounded-3xl border p-7 sm:p-9" style={{ borderColor: `${C.red}40`, backgroundColor: C.mist }}>
              <h2 className="text-2xl font-bold" style={{ ...SERIF, color: C.redDeep }}>{city.areas.heading}</h2>
              <p className="mt-4 text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{city.areas.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {city.areas.list.map((area) => (
                  <li key={area} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderColor: C.red, color: C.redDeep, backgroundColor: '#fff' }}>{area}</li>
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
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white" style={{ ...SERIF, backgroundColor: C.sea, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.gold}` }}>{index + 1}</span>
                  <h3 className="mt-5 text-[16px] font-bold" style={{ ...SERIF, color: C.navy }}>{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: C.body }}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <AllProducts theme={{ bg: C.snow, border: `${C.red}33`, accent: C.sea, heading: C.navy, body: C.body, serif: SERIF }} />

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
        <section className="px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.redDeep }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow="Let’s begin">{city.ctaHeading}</Heading>
              <p className="mt-4 max-w-xl text-[16px] leading-7" style={{ color: '#f3e1d6' }}>{city.ctaSubtext}</p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link to={city.cta.primary.to} className={btnPrimary} style={{ backgroundColor: C.gold, color: C.redDeep }}>
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
