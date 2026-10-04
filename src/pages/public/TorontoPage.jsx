import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import AllProducts from './AllProducts.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'

/**
 * Toronto landing page. The look borrows from Canadian heritage and the city:
 * maple red and white with a lake-blue accent, Hudson's Bay style point-blanket
 * stripes, buffalo-check plaid, a downtown skyline with a slender observation
 * tower, and a maple leaf mark. Canadian spelling. All inline SVG/CSS.
 */

const C = {
  cream: '#faf6ee',
  paper: '#ffffff',
  navy: '#1b2a3a',
  navyDeep: '#10202e',
  red: '#b3141c',
  redDeep: '#7d0d13',
  brass: '#c9962b',
  brassSoft: '#f3e2b5',
  plaque: '#0e5a8a',
  ink: '#1c1b1a',
  body: '#464a4f',
  green: '#1f6b46',
}
const SERIF = { fontFamily: "'Merriweather', Georgia, 'Times New Roman', serif" }

/** Point-blanket stripes: cream, green, red, yellow and navy bands. */
function StripeBand({ height = 'h-6' }) {
  const bands = [[C.cream, 6], [C.green, 5], [C.red, 5], [C.brass, 5], [C.navy, 5], [C.cream, 6]]
  let y = 0
  return (
    <svg aria-hidden="true" focusable="false" className={`block w-full ${height}`} viewBox="0 0 100 32" preserveAspectRatio="none">
      {bands.map(([fill, h], i) => {
        const el = <rect key={i} y={y} width="100" height={h} fill={fill} />
        y += h
        return el
      })}
    </svg>
  )
}

/** Buffalo-check plaid wash for section backgrounds. */
function Plaid({ id, color = C.red, opacity = 0.06 }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill={color} />
          <rect x="24" y="24" width="24" height="24" fill={color} />
          <rect x="24" width="24" height="24" fill={color} opacity="0.35" />
          <rect y="24" width="24" height="24" fill={color} opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Maple leaf mark (simple eleven-point outline). */
function MapleLeaf({ className = 'h-6 w-6', color = C.red }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill={color} aria-hidden="true" focusable="false">
      <path d="M24 3l4.2 8.6 4.6-2.2-1.6 9.8 7-5.4-1.4 5.2 5.4-.6-3 5.4 3.4 1.6-9.6 6.6 1.4 3.8-9.6-1.8V45h-2.8v-7.4l-9.6 1.8 1.4-3.8-9.6-6.6 3.4-1.6-3-5.4 5.4.6-1.4-5.2 7 5.4-1.6-9.8 4.6 2.2Z" />
    </svg>
  )
}

/** Downtown skyline with a slender observation tower, a streetcar and a maple. */
function Skyline() {
  const towers = [
    [20, 70, 40], [66, 100, 34], [108, 60, 44], [160, 120, 38], [210, 80, 46],
    [520, 90, 40], [566, 124, 36], [610, 74, 48], [664, 108, 38], [708, 66, 44], [756, 92, 36],
  ]
  return (
    <svg viewBox="0 0 800 190" preserveAspectRatio="xMidYMax slice" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <g fill={C.navy}>
        {towers.map(([x, h, w], i) => (
          <g key={x}>
            <rect x={x} y={170 - h} width={w} height={h} opacity={i % 2 ? 0.92 : 1} />
            {Array.from({ length: Math.floor(h / 18) }).map((_, r) => (
              <rect key={r} x={x + 6} y={170 - h + 8 + r * 18} width={w - 12} height="5" fill={C.cream} opacity="0.5" />
            ))}
          </g>
        ))}
        {/* observation tower */}
        <path d="M380 170 L386 70 L388 40 L392 4 L396 40 L398 70 L404 170Z" />
        <ellipse cx="392" cy="82" rx="26" ry="8" />
        <rect x="372" y="78" width="40" height="8" />
        <ellipse cx="392" cy="70" rx="12" ry="5" fill={C.red} />
        <rect x="260" y="130" width="90" height="40" opacity="0.9" />
        <rect x="430" y="118" width="70" height="52" opacity="0.9" />
      </g>
      <g>
        <rect x="270" y="150" width="130" height="18" rx="4" fill={C.red} />
        <rect x="278" y="154" width="22" height="9" fill={C.cream} />
        <rect x="308" y="154" width="22" height="9" fill={C.cream} />
        <rect x="338" y="154" width="22" height="9" fill={C.cream} />
        <rect x="368" y="154" width="22" height="9" fill={C.cream} />
        <rect x="280" y="132" width="2" height="18" fill={C.navyDeep} />
      </g>
      <rect y="168" width="800" height="2" fill={C.navyDeep} />
    </svg>
  )
}

const ICONS = {
  dish: (
    <>
      <path d="M6 28c0 8 8 14 18 14s18-6 18-14Z" />
      <path d="M10 28c0-8 6-14 14-14s14 6 14 14" />
      <path d="M24 8v6" />
    </>
  ),
  hammer: (
    <>
      <path d="M26 8h14v8H26Z" />
      <path d="M26 12H14L8 20l6 4 4-4v22h6V16" />
    </>
  ),
  shop: (
    <>
      <path d="M6 18 10 8h28l4 10c0 3-3 5-5 5s-5-2-5-5c0 3-3 5-6 5s-6-2-6-5c0 3-3 5-6 5s-5-2-5-5Z" />
      <path d="M10 25v15h28V25M20 40V31h8v9" />
    </>
  ),
  school: (
    <>
      <path d="M4 18 24 8l20 10-20 10Z" />
      <path d="M12 23v9c4 4 20 4 24 0v-9M44 18v12" />
    </>
  ),
}

/** Lake-blue roundel for each card icon. */
function RoundelIcon({ name }) {
  return (
    <span
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: C.plaque, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.plaque}` }}
    >
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICONS[name]}
      </svg>
    </span>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-xl border bg-white" style={{ borderColor: `${C.navy}2e` }}>
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
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {eyebrow ? (
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: light ? C.brassSoft : C.red }}>{eyebrow}</p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SERIF, color: light ? '#fff' : C.navy }}>{children}</h2>
      <span aria-hidden="true" className={`mt-4 block h-[3px] w-14 ${align === 'center' ? 'mx-auto' : ''}`} style={{ backgroundColor: light ? C.brassSoft : C.brass }} />
    </div>
  )
}

const isInternal = (to) => String(to || '').startsWith('/')

export default function TorontoPage() {
  const city = useMemo(() => getCity('toronto'), [])
  const [openFaq, setOpenFaq] = useState(0)
  const hA = useId().replace(/:/g, '')
  const hB = `${hA}b`
  if (!city) return null

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

  const btnPrimary = 'inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(200,16,46,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 bg-white/80 px-7 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge="Toronto" badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><Link to="/canada">Canada</Link><span> / </span><span aria-current="page">Toronto</span>
      </nav>

      <div style={{ backgroundColor: C.cream, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundImage: `linear-gradient(180deg, ${C.cream} 0%, ${C.paper} 100%)` }}>
          <Plaid id={hA} opacity={0.05} />
          <div className="relative mx-auto max-w-4xl px-5 pb-6 pt-20 text-center sm:px-6 sm:pt-24 lg:pt-28">
            <p className="inline-flex items-center gap-2 border-y-2 px-5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ borderColor: C.navy, color: C.navy }}>
              <MapleLeaf className="h-4 w-4" />
              {city.hero.eyebrow}
            </p>
            <h1 className="mt-6 text-[2.4rem] font-bold leading-[1.08] tracking-tight sm:text-[3.5rem] lg:text-[4rem]" style={{ ...SERIF, color: C.navy }}>
              {city.hero.headingA}{' '}
              <span style={{ color: C.red }}>{city.hero.headingB}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8" style={{ color: C.body }}>{city.hero.subtitle}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to={city.hero.primaryCta.to} className={btnPrimary} style={{ backgroundColor: C.red }}>
                {city.hero.primaryCta.label} <HiOutlineArrowRight className="text-lg" />
              </Link>
              <Link to={city.hero.secondaryCta.to} className={btnLine} style={{ borderColor: C.navy, color: C.navy }}>
                {city.hero.secondaryCta.label}
              </Link>
            </div>
          </div>
          <div className="relative mt-6">
            <Skyline />
          </div>
        </section>
        <StripeBand />

        {/* Facts */}
        <section className="py-12">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-5 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
            {city.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col items-center justify-center rounded-[1.6rem] p-4 text-center text-white" style={{ backgroundColor: C.plaque, boxShadow: `inset 0 0 0 3px ${C.plaque}, inset 0 0 0 5px #fff, 0 10px 24px -14px rgba(20,33,61,0.7)` }}>
                <p className="text-xl font-bold sm:text-2xl" style={SERIF}>{fact.value}</p>
                <p className="mt-1.5 text-[12px] leading-5 text-blue-100">{fact.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="pb-16 pt-2 sm:pb-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Who we are">{city.intro.heading}</Heading>
            <div className="mt-8 space-y-5">
              {city.intro.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="text-[16px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Britain in brief */}
        <section className="relative overflow-hidden py-16 sm:py-20" style={{ backgroundColor: '#efe7d3' }}>
          <Plaid id={hB} opacity={0.045} />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.arts.eyebrow}>{city.arts.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.arts.intro}</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {city.arts.items.map((item) => (
                <article key={item.key} className="flex gap-5 rounded-xl border bg-white p-6 shadow-[0_8px_24px_-16px_rgba(20,33,61,0.5)]" style={{ borderColor: `${C.navy}24` }}>
                  <RoundelIcon name={item.key} />
                  <div>
                    <h3 className="text-[18px] font-bold" style={{ ...SERIF, color: C.navy }}>{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.75]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <StripeBand height="h-6" />

        {/* Tools and modules */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.business.eyebrow}>{city.business.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.business.intro}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {city.business.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative flex flex-col overflow-hidden rounded-xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-18px_rgba(20,33,61,0.5)]"
                  style={{ borderColor: `${C.navy}24` }}
                >
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: C.red }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: C.red }}>{item.label}</p>
                  <h3 className="mt-2 text-[17px] font-bold" style={{ ...SERIF, color: C.navy }}>{item.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: C.navy }}>
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
                    <Link to={link.to} className="font-semibold underline underline-offset-2" style={{ color: C.red }}>{link.label}</Link>
                    {i < all.length - 2 ? ', ' : i === all.length - 2 ? ' and ' : '.'}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>

        {/* Honest notes */}
        {(city.extraSections || []).map((section) => (
          <section key={section.heading} className="py-14 sm:py-16" style={{ backgroundColor: C.brassSoft }}>
            <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
              <div className="rounded-xl border-2 bg-white p-7 sm:p-9" style={{ borderColor: C.brass }}>
                <Heading eyebrow={section.eyebrow}>{section.heading}</Heading>
                <div className="mt-7 space-y-5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)} className="text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
                  ))}
                </div>
                {section.links ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {section.links.map((link) => {
                      const cls = 'rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-[#f7f1e3]'
                      return isInternal(link.to) ? (
                        <Link key={link.to} to={link.to} className={cls} style={{ borderColor: C.navy, color: C.navy }}>{link.label}</Link>
                      ) : (
                        <a key={link.to} href={link.to} target="_blank" rel="noopener noreferrer" className={cls} style={{ borderColor: C.navy, color: C.navy }}>{link.label}</a>
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
                <div key={item.title} className="flex items-start gap-3 rounded-xl border bg-white p-5" style={{ borderColor: `${C.navy}1f` }}>
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.red }} />
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.navy }}>{item.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Areas */}
        <section className="pb-14 sm:pb-16">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
            <div className="rounded-xl border p-7 sm:p-9" style={{ borderColor: `${C.navy}33`, backgroundColor: '#efe7d3' }}>
              <h2 className="text-2xl font-bold" style={{ ...SERIF, color: C.navy }}>{city.areas.heading}</h2>
              <p className="mt-4 text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{city.areas.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {city.areas.list.map((area) => (
                  <li key={area} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderColor: C.navy, color: C.navy, backgroundColor: '#fff' }}>{area}</li>
                ))}
              </ul>
              <p className="mt-5 text-[13.5px] leading-7" style={{ color: C.body }}>{city.pricingNote} <Link to="/pricing" className="font-semibold underline underline-offset-2" style={{ color: C.red }}>See plans</Link></p>
            </div>
          </div>
        </section>
        <StripeBand height="h-6" />

        {/* Steps */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: C.paper }}>
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Getting started">{city.stepsHeading}</Heading>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {city.steps.map((step, index) => (
                <li key={step.title} className="rounded-xl border bg-white p-6" style={{ borderColor: `${C.navy}24` }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white" style={{ ...SERIF, backgroundColor: C.red, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.brass}` }}>{index + 1}</span>
                  <h3 className="mt-5 text-[16px] font-bold" style={{ ...SERIF, color: C.navy }}>{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: C.body }}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <AllProducts theme={{ bg: C.cream, card: C.paper, border: `${C.navy}2e`, accent: C.red, heading: C.navy, body: C.body, serif: SERIF }} />

        {/* FAQ */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: C.paper }}>
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
        <StripeBand />
        <section className="px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.navyDeep }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow="Let’s begin">{city.ctaHeading}</Heading>
              <p className="mt-4 max-w-xl text-[16px] leading-7 text-blue-100">{city.ctaSubtext}</p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link to={city.cta.primary.to} className={btnPrimary} style={{ backgroundColor: C.red }}>
                  {city.cta.primary.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className={`${btnLine} !bg-transparent hover:!bg-white/10`} style={{ borderColor: '#ffffff88', color: '#fff' }}>
                  {city.cta.secondary.label}
                </a>
              </div>
            </div>
            <address className="rounded-xl border-2 border-dashed p-6 text-[14px] not-italic leading-7 text-blue-100" style={{ borderColor: `${C.brass}aa`, backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-base font-bold text-white" style={SERIF}>Nexora Solution</p>
              <p className="mt-1 text-[13px] leading-6">{city.contactNote}</p>
              <p className="mt-2 flex items-start gap-2"><HiOutlineMapPin className="mt-1 h-4 w-4 shrink-0" style={{ color: C.brassSoft }} />Head office: {SITE_ADDRESS_TEXT}</p>
              <p className="mt-1 flex items-center gap-2"><HiOutlinePhone className="h-4 w-4 shrink-0" style={{ color: C.brassSoft }} /><a href={SITE_WHATSAPP} className="hover:underline">WhatsApp {SITE_PHONE}</a></p>
              <p className="mt-1 pl-6"><a href={`mailto:${SITE_EMAILS.sales}`} className="hover:underline">{SITE_EMAILS.sales}</a></p>
            </address>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
