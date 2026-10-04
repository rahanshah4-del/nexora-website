import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import AllProducts from './AllProducts.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'

/**
 * Coimbatore (Kovai) landing page. The look borrows from Tamil Nadu: the
 * kolam (dot-and-loop floor patterns drawn at the doorstep), the stepped
 * gopuram of a South Indian temple, a banana-leaf green, turmeric yellow and
 * kumkum red. Tamil appears in short greetings and tags only, next to English.
 * All inline SVG/CSS, so it renders on the server and adds no image requests.
 */

const C = {
  leaf: '#166534',
  leafDark: '#0f3d22',
  turmeric: '#e0a100',
  turmericSoft: '#fdf1c7',
  kumkum: '#b3121e',
  stone: '#5b1a18',
  paper: '#fffdf5',
  ink: '#25201a',
  body: '#48402f',
}
const SERIF = { fontFamily: "Georgia, 'Noto Serif Tamil', 'Latha', 'Tamil MN', serif" }
const TAMIL = { fontFamily: "'Noto Sans Tamil', 'Tamil Sangam MN', 'Tamil MN', 'Latha', 'Nirmala UI', sans-serif" }

/** Kolam lattice: dots joined by looping diamonds. */
function KolamPattern({ id, color = C.leaf, accent = C.turmeric, opacity = 1 }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
            <path d="M28 6 C40 14 50 16 50 28 C50 40 40 42 28 50 C16 42 6 40 6 28 C6 16 16 14 28 6Z" />
            <path d="M28 18 C34 22 38 24 38 28 C38 32 34 34 28 38 C22 34 18 32 18 28 C18 24 22 22 28 18Z" />
          </g>
          <g fill={accent}>
            <circle cx="28" cy="28" r="2.4" />
            <circle cx="0" cy="0" r="2" />
            <circle cx="56" cy="0" r="2" />
            <circle cx="0" cy="56" r="2" />
            <circle cx="56" cy="56" r="2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Big kolam medallion for the hero: concentric lotus petals and a dot ring. */
function KolamMedallion() {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30)
  const dots = Array.from({ length: 24 }, (_, i) => i * 15)
  return (
    <svg viewBox="-110 -110 220 220" className="mx-auto h-auto w-full max-w-[400px]" role="img" aria-label="Kolam, a traditional Tamil floor pattern">
      <circle r="104" fill={C.turmericSoft} />
      <circle r="104" fill="none" stroke={C.stone} strokeWidth="3" />
      <circle r="98" fill="none" stroke={C.stone} strokeWidth="1" strokeDasharray="2 4" />
      {dots.map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 88} cy={Math.sin((a * Math.PI) / 180) * 88} r="2.6" fill={C.kumkum} />
      ))}
      <g fill="none" strokeWidth="2.2" strokeLinejoin="round">
        {petals.map((a) => (
          <path key={a} d="M0 -76 C16 -58 16 -36 0 -22 C-16 -36 -16 -58 0 -76Z" stroke={C.leaf} transform={`rotate(${a})`} />
        ))}
        {petals.map((a) => (
          <path key={`i${a}`} d="M0 -50 C9 -40 9 -30 0 -22 C-9 -30 -9 -40 0 -50Z" stroke={C.kumkum} transform={`rotate(${a + 15})`} />
        ))}
      </g>
      <circle r="17" fill={C.kumkum} />
      <circle r="9" fill={C.turmeric} />
      <circle r="3.5" fill={C.stone} />
    </svg>
  )
}

/** Stepped gopuram tiers, repeated as a divider. */
function GopuramBand({ bg = C.stone, fg = C.turmeric }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg aria-hidden="true" focusable="false" className="block h-9 w-full" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="60" height="36" patternUnits="userSpaceOnUse">
          <rect width="60" height="36" fill={bg} />
          <path d="M6 36 V28 H12 V22 H18 V16 H24 V10 H30 V4 L30 2 L30 4 V10 H36 V16 H42 V22 H48 V28 H54 V36 Z" fill={fg} opacity="0.92" />
          <circle cx="30" cy="3" r="2" fill={C.kumkum} />
        </pattern>
      </defs>
      <rect width="100%" height="36" fill={`url(#${id})`} />
    </svg>
  )
}

const ICONS = {
  meal: (
    <>
      <path d="M6 28c0 8 8 14 18 14s18-6 18-14Z" />
      <path d="M10 28c0-8 6-14 14-14s14 6 14 14" />
      <path d="M18 8c0 3 3 3 3 6M26 6c0 3 3 3 3 6" />
    </>
  ),
  cart: (
    <>
      <path d="M5 9h6l4 20h20l4-14H13" />
      <circle cx="19" cy="37" r="3" />
      <circle cx="33" cy="37" r="3" />
    </>
  ),
  cog: (
    <>
      <circle cx="24" cy="24" r="7" />
      <path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.500 10.500l4.200 4.200M33.300 33.300l4.200 4.200M10.500 37.500l4.200-4.200M33.300 14.700l4.200-4.200" />
    </>
  ),
  cloth: (
    <>
      <path d="M8 8h32v32H8Z" />
      <path d="M8 16h32M8 24h32M8 32h32M16 8v32M24 8v32M32 8v32" />
    </>
  ),
}

function LeafIcon({ name }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center text-white" style={{ backgroundColor: C.leaf, borderRadius: '0 70% 0 70%', boxShadow: `0 0 0 3px ${C.paper}, 0 0 0 5px ${C.turmeric}` }}>
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICONS[name]}
      </svg>
    </span>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-2xl border" style={{ borderColor: `${C.stone}33`, backgroundColor: '#fff' }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.ink }}>{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color: C.kumkum }} />
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
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.08em]" style={{ ...TAMIL, color: light ? C.turmeric : C.kumkum }}>
          <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45" style={{ backgroundColor: light ? C.turmeric : C.kumkum }} />
          {eyebrow}
          <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45" style={{ backgroundColor: light ? C.turmeric : C.kumkum }} />
        </p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SERIF, color: light ? '#fff' : C.leafDark }}>{children}</h2>
    </div>
  )
}

const isInternal = (to) => String(to || '').startsWith('/')

export default function CoimbatorePage() {
  const city = useMemo(() => getCity('coimbatore'), [])
  const [openFaq, setOpenFaq] = useState(0)
  const kolamA = useId().replace(/:/g, '')
  const kolamB = `${kolamA}b`
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

  const btnPrimary = 'inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(179,18,30,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 bg-white/70 px-7 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge={city.name} badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><Link to="/india">India</Link><span> / </span><span aria-current="page">Coimbatore</span>
      </nav>

      <div style={{ backgroundColor: C.paper, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden pb-14 pt-20 sm:pb-16 sm:pt-24 lg:pt-28" style={{ backgroundImage: `linear-gradient(180deg, ${C.turmericSoft} 0%, ${C.paper} 100%)` }}>
          <KolamPattern id={kolamA} opacity={0.1} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,253,245,0.95)_0%,rgba(255,253,245,0.6)_50%,rgba(255,253,245,0)_80%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
            <div className="text-center lg:text-left">
              <p lang="ta" className="text-[2.2rem] font-bold leading-none sm:text-5xl" style={{ ...TAMIL, color: C.kumkum }}>வணக்கம்!</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: `${C.stone}55`, color: C.stone, backgroundColor: '#fff' }}>
                <HiOutlineMapPin className="h-4 w-4" style={{ color: C.kumkum }} />
                <span lang="ta" style={TAMIL}>{city.hero.eyebrow}</span>
              </p>
              <h1 className="mt-6 text-[2.3rem] font-bold leading-[1.08] tracking-tight sm:text-[3.3rem] lg:text-[3.8rem]" style={{ ...SERIF, color: C.leafDark }}>
                {city.hero.headingA}{' '}
                <span style={{ color: C.kumkum }}>{city.hero.headingB}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[17px] leading-8 lg:mx-0" style={{ color: C.body }}>{city.hero.subtitle}</p>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link to={city.hero.primaryCta.to} className={btnPrimary} style={{ backgroundColor: C.kumkum }}>
                  {city.hero.primaryCta.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <Link to={city.hero.secondaryCta.to} className={btnLine} style={{ borderColor: C.leaf, color: C.leafDark }}>
                  {city.hero.secondaryCta.label}
                </Link>
              </div>
            </div>
            <KolamMedallion />
          </div>
        </section>
        <GopuramBand />

        {/* Facts */}
        <section className="py-10">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
            {city.facts.map((fact) => (
              <div key={fact.label} className="rounded-2xl border-b-4 bg-white p-4 text-center shadow-sm" style={{ borderColor: C.turmeric }}>
                <p className="text-2xl font-bold" style={{ ...SERIF, color: C.leaf }}>{fact.value}</p>
                <p className="mt-1 text-[12px] leading-5" style={{ color: C.body }}>{fact.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="pb-16 pt-4 sm:pb-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="நாங்கள் யார் · Who we are">{city.intro.heading}</Heading>
            <div className="mt-8 space-y-5">
              {city.intro.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="text-[16px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Kovai */}
        <section className="relative overflow-hidden py-16 sm:py-20" style={{ backgroundColor: '#f2f7ee' }}>
          <KolamPattern id={kolamB} opacity={0.07} />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.arts.eyebrow}>{city.arts.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.arts.intro}</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {city.arts.items.map((item) => (
                <article key={item.key} className="flex gap-5 rounded-2xl border-l-[6px] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(15,61,34,0.35)]" style={{ borderColor: C.leaf }}>
                  <LeafIcon name={item.key} />
                  <div>
                    <h3 className="text-[18px] font-bold" style={{ ...SERIF, color: C.leafDark }}>{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.75]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <GopuramBand bg={C.leafDark} />

        {/* Modules */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="தயாரிப்புகள் · Products">{city.business.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.business.intro}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {city.business.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-18px_rgba(15,61,34,0.45)]"
                  style={{ borderColor: `${C.stone}2e` }}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${C.leaf}, ${C.turmeric}, ${C.kumkum})` }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: C.kumkum }}>{item.label}</p>
                  <h3 className="mt-2 text-[17px] font-bold" style={{ ...SERIF, color: C.leafDark }}>{item.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: C.leaf }}>
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
                    <Link to={link.to} className="font-semibold underline underline-offset-2" style={{ color: C.leaf }}>{link.label}</Link>
                    {i < all.length - 2 ? ', ' : i === all.length - 2 ? ' and ' : '.'}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>

        {/* GST note */}
        {(city.extraSections || []).map((section) => (
          <section key={section.heading} className="py-14 sm:py-16" style={{ backgroundColor: C.turmericSoft }}>
            <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
              <div className="rounded-3xl border-2 bg-white p-7 sm:p-9" style={{ borderColor: C.turmeric }}>
                <Heading eyebrow={section.eyebrow}>{section.heading}</Heading>
                <div className="mt-7 space-y-5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)} className="text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
                  ))}
                </div>
                {section.links ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {section.links.map((link) => {
                      const cls = 'rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-[#f2f7ee]'
                      return isInternal(link.to) ? (
                        <Link key={link.to} to={link.to} className={cls} style={{ borderColor: C.leaf, color: C.leafDark }}>{link.label}</Link>
                      ) : (
                        <a key={link.to} href={link.to} target="_blank" rel="noopener noreferrer" className={cls} style={{ borderColor: C.leaf, color: C.leafDark }}>{link.label}</a>
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
            <Heading eyebrow="ஏன் Nexora · Why Nexora">{city.why.heading}</Heading>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {city.why.items.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border bg-white p-5" style={{ borderColor: `${C.stone}22` }}>
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.leaf }} />
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.leafDark }}>{item.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Areas + pricing note */}
        <section className="pb-16">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
            <div className="rounded-3xl p-7 sm:p-9" style={{ backgroundColor: C.leafDark, color: '#e8f3ea' }}>
              <h2 className="text-2xl font-bold text-white" style={SERIF}>{city.areas.heading}</h2>
              <p className="mt-4 text-[15.5px] leading-[1.85]">{city.areas.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {city.areas.list.map((area) => (
                  <li key={area} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderColor: `${C.turmeric}99`, color: C.turmericSoft }}>{area}</li>
                ))}
              </ul>
              <p className="mt-6 border-t pt-5 text-[14px] leading-7" style={{ borderColor: '#ffffff26' }}>
                {city.pricingNote}{' '}
                <Link to="/pricing" className="font-semibold underline underline-offset-2" style={{ color: C.turmeric }}>See the pricing page</Link>
              </p>
            </div>
          </div>
        </section>
        <GopuramBand />

        {/* Steps */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: '#f2f7ee' }}>
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="தொடங்குவது எப்படி · Getting started">{city.stepsHeading}</Heading>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {city.steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl bg-white p-6 shadow-[0_8px_24px_-16px_rgba(15,61,34,0.35)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white" style={{ ...SERIF, backgroundColor: C.kumkum, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.turmeric}` }}>{index + 1}</span>
                  <h3 className="mt-5 text-[16px] font-bold" style={{ ...SERIF, color: C.leafDark }}>{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: C.body }}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <AllProducts theme={{ bg: C.paper, border: `${C.leaf}40`, accent: C.leaf, heading: C.leafDark, body: C.body, serif: SERIF }} />

        {/* FAQ */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="கேள்விகள் · FAQ">{city.faqHeading}</Heading>
            <div className="mt-10 grid gap-3">
              {city.faqs.map((faq, i) => (
                <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <GopuramBand bg={C.kumkum} fg={C.turmericSoft} />
        <section className="relative overflow-hidden px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.stone }}>
          <KolamPattern id={`${kolamA}c`} color="#ffffff" accent={C.turmeric} opacity={0.08} />
          <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow="தொடங்கலாம் · Let’s begin">{city.ctaHeading}</Heading>
              <p className="mt-4 max-w-xl text-[16px] leading-7" style={{ color: '#f6e7d8' }}>{city.ctaSubtext}</p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link to={city.cta.primary.to} className={btnPrimary} style={{ backgroundColor: C.turmeric, color: C.stone }}>
                  {city.cta.primary.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className={`${btnLine} !bg-transparent hover:!bg-white/10`} style={{ borderColor: '#ffffff88', color: '#fff' }}>
                  {city.cta.secondary.label}
                </a>
              </div>
            </div>
            <address className="rounded-2xl border-2 border-dashed p-6 text-[14px] not-italic leading-7" style={{ borderColor: `${C.turmeric}99`, backgroundColor: 'rgba(255,255,255,0.06)', color: '#f6e7d8' }}>
              <p className="text-base font-bold text-white" style={SERIF}>Nexora Solution</p>
              <p className="mt-1 text-[13px] leading-6">{city.contactNote}</p>
              <p className="mt-2 flex items-start gap-2"><HiOutlineMapPin className="mt-1 h-4 w-4 shrink-0" style={{ color: C.turmeric }} />Head office: {SITE_ADDRESS_TEXT}</p>
              <p className="mt-1 flex items-center gap-2"><HiOutlinePhone className="h-4 w-4 shrink-0" style={{ color: C.turmeric }} /><a href={SITE_WHATSAPP} className="hover:underline">WhatsApp {SITE_PHONE}</a></p>
              <p className="mt-1 pl-6"><a href={`mailto:${SITE_EMAILS.sales}`} className="hover:underline">{SITE_EMAILS.sales}</a></p>
            </address>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
