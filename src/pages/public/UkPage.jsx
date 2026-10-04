import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import AllProducts from './AllProducts.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'

/**
 * United Kingdom landing page. The look borrows from British print and street
 * furniture: a cream paper background, navy and post-box red, brass accents,
 * a tartan and houndstooth band, blue-plaque style fact roundels, and a row of
 * terraced houses with chimney pots. British spelling throughout. All inline
 * SVG/CSS, so it renders on the server and adds no image requests.
 */

const C = {
  cream: '#f7f1e3',
  paper: '#fffdf7',
  navy: '#14213d',
  navyDeep: '#0b1428',
  red: '#c8102e',
  redDeep: '#8f0b21',
  brass: '#b8860b',
  brassSoft: '#efe0b0',
  plaque: '#1f3a6e',
  ink: '#1c1b1a',
  body: '#46433d',
}
const SERIF = { fontFamily: "'Baskerville', 'Libre Baskerville', Georgia, 'Times New Roman', serif" }

/** Tartan-style band: crossed navy, red and brass stripes over a navy ground. */
function TartanBand({ height = 'h-8' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg aria-hidden="true" focusable="false" className={`block w-full ${height}`} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill={C.navy} />
          <g opacity="0.85">
            <rect x="6" width="10" height="48" fill={C.red} opacity="0.75" />
            <rect y="6" width="48" height="10" fill={C.red} opacity="0.75" />
            <rect x="28" width="2" height="48" fill={C.brass} />
            <rect y="28" width="48" height="2" fill={C.brass} />
            <rect x="36" width="4" height="48" fill="#ffffff" opacity="0.5" />
            <rect y="36" width="48" height="4" fill="#ffffff" opacity="0.5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Houndstooth wash for section backgrounds. */
function Houndstooth({ id, color = C.navy, opacity = 0.06 }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="32" height="32" patternUnits="userSpaceOnUse">
          <path fill={color} d="M0 0h8v8H0zM16 0h8v8h-8zM8 8h8v8H8zM24 8h8v8h-8zM0 16h8v8H0zM16 16h8v8h-8zM8 24h8v8H8zM24 24h8v8h-8z" />
          <path fill={color} d="M8 0l8 8H8zM24 0l8 8h-8zM0 8l8 8H0zM16 8l8 8h-8z" opacity="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** A terrace of houses with chimney pots, a post box and a lamp. */
function Terrace() {
  const house = (x, w, h, tone, i) => (
    <g key={x}>
      <rect x={x} y={170 - h} width={w} height={h} fill={tone} />
      <path d={`M${x - 3} ${170 - h} L${x + w / 2} ${170 - h - 22} L${x + w + 3} ${170 - h}Z`} fill={C.navyDeep} />
      <rect x={x + w * 0.62} y={170 - h - 34} width="9" height="22" fill={C.redDeep} />
      <rect x={x + w * 0.62 - 1.5} y={170 - h - 38} width="12" height="5" fill={C.redDeep} />
      <rect x={x + w * 0.62 + 1.5} y={170 - h - 46} width="6" height="8" rx="1" fill={C.brass} />
      {[0, 1].map((r) => [0, 1].map((c) => (
        <rect key={`${r}${c}`} x={x + 10 + c * (w / 2 - 6)} y={170 - h + 14 + r * 34} width={w / 2 - 16} height="22" fill={C.cream} opacity={i % 2 ? 0.9 : 0.75} />
      )))}
      <rect x={x + w / 2 - 8} y="140" width="16" height="30" fill={C.redDeep} />
    </g>
  )
  const tones = [C.navy, '#5b3a2a', C.navy, '#6b2a33', C.navy, '#5b3a2a']
  const xs = [30, 150, 270, 390, 510, 630]
  const hs = [96, 108, 92, 110, 100, 94]
  return (
    <svg viewBox="0 0 800 170" preserveAspectRatio="xMidYMax slice" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <rect y="168" width="800" height="2" fill={C.navyDeep} />
      {xs.map((x, i) => house(x, 112, hs[i], tones[i], i))}
      <g>
        <rect x="764" y="116" width="22" height="54" rx="5" fill={C.red} />
        <rect x="764" y="116" width="22" height="7" rx="3" fill={C.redDeep} />
        <rect x="769" y="132" width="12" height="3" fill={C.navyDeep} />
        <circle cx="775" cy="116" r="0" />
      </g>
      <g fill={C.navyDeep}>
        <rect x="12" y="92" width="3" height="78" />
        <path d="M5 92h17l-3 -12h-11z" />
      </g>
    </svg>
  )
}

const ICONS = {
  trade: (
    <>
      <path d="M8 30a16 16 0 0 1 32 0Z" />
      <path d="M6 30h36v5H6ZM24 14v16" />
    </>
  ),
  cafe: (
    <>
      <path d="M8 18h26v14a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8Z" />
      <path d="M34 22h4a4 4 0 0 1 0 10h-4M14 8c0 4 4 4 0 8M22 8c0 4 4 4 0 8" />
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

/** Blue-plaque style roundel for each card icon. */
function PlaqueIcon({ name }) {
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

export default function UkPage() {
  const city = useMemo(() => getCity('uk'), [])
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

  const btnPrimary = 'inline-flex min-h-[48px] items-center gap-2 rounded-md px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(200,16,46,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-md border-2 bg-white/80 px-7 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge="United Kingdom" badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><span aria-current="page">United Kingdom</span>
      </nav>

      <div style={{ backgroundColor: C.cream, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundImage: `linear-gradient(180deg, ${C.cream} 0%, ${C.paper} 100%)` }}>
          <Houndstooth id={hA} opacity={0.05} />
          <div className="relative mx-auto max-w-4xl px-5 pb-6 pt-20 text-center sm:px-6 sm:pt-24 lg:pt-28">
            <p className="inline-flex items-center gap-2 border-y-2 px-5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ borderColor: C.navy, color: C.navy }}>
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
            <Terrace />
          </div>
        </section>
        <TartanBand />

        {/* Facts as blue plaques */}
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
          <Houndstooth id={hB} opacity={0.045} />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.arts.eyebrow}>{city.arts.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.arts.intro}</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {city.arts.items.map((item) => (
                <article key={item.key} className="flex gap-5 rounded-xl border bg-white p-6 shadow-[0_8px_24px_-16px_rgba(20,33,61,0.5)]" style={{ borderColor: `${C.navy}24` }}>
                  <PlaqueIcon name={item.key} />
                  <div>
                    <h3 className="text-[18px] font-bold" style={{ ...SERIF, color: C.navy }}>{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.75]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <TartanBand height="h-6" />

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
                      const cls = 'rounded-md border-2 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-[#f7f1e3]'
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
                  <li key={area} className="rounded-md border px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderColor: C.navy, color: C.navy, backgroundColor: '#fff' }}>{area}</li>
                ))}
              </ul>
              <p className="mt-5 text-[13.5px] leading-7" style={{ color: C.body }}>{city.pricingNote} <Link to="/pricing" className="font-semibold underline underline-offset-2" style={{ color: C.red }}>See plans</Link></p>
            </div>
          </div>
        </section>
        <TartanBand height="h-6" />

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
        <TartanBand />
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
