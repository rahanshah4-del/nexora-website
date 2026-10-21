import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import AllProducts from './AllProducts.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'

/**
 * Germany landing page, written in German (formal "Sie") for German searches.
 * The look is calm and precise: navy and brick red with a warm gold, a fine
 * graph-paper grid, a ribbon of timber-frame gables and a skyline with a
 * TV tower, a church spire and gabled roofs. All inline SVG/CSS, so it
 * renders on the server and adds no image requests.
 */

const C = {
  cream: '#f6f3ee',
  paper: '#fbfaf7',
  blue: '#1d3557',
  blueDeep: '#14243d',
  red: '#b8402f',
  redDeep: '#7d2a1d',
  albero: '#e3b23c',
  alberoSoft: '#f1e6c9',
  ink: '#1b2230',
  body: '#434a58',
}
const SERIF = { fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }

/** Fine graph-paper grid with a gold dot at every crossing. */
function Gitter({ id, opacity = 0.1, color = C.blue }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke={color} strokeWidth="1" />
          <path d="M24 0V48M0 24H48" fill="none" stroke={color} strokeWidth="0.5" opacity="0.6" />
          <circle cx="0" cy="0" r="2" fill={C.albero} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** A ribbon of timber-frame gables in navy, brick and gold. */
function GiebelBand({ height = 'h-8' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg aria-hidden="true" focusable="false" className={`block w-full ${height}`} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="72" height="34" patternUnits="userSpaceOnUse">
          <rect width="72" height="34" fill={C.blueDeep} />
          <rect y="2" width="72" height="1.8" fill={C.albero} />
          <path d="M6 31V16L24 5l18 11v15Z" fill={C.red} />
          <path d="M6 16 24 5l18 11" fill="none" stroke={C.alberoSoft} strokeWidth="1.6" />
          <path d="M6 31 42 16M42 31 6 16M24 31V16" stroke={C.alberoSoft} strokeWidth="1" opacity="0.7" />
          <rect x="52" y="14" width="14" height="17" fill={C.blue} />
          <path d="M52 14 59 8l7 6" fill="none" stroke={C.albero} strokeWidth="1.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** A small gold compass-rose mark. */
function Mark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path d="M24 2 29 19 46 24 29 29 24 46 19 29 2 24 19 19Z" fill="#e3b23c" />
      <circle cx="24" cy="24" r="5" fill="#b8402f" />
    </svg>
  )
}

/** A TV tower and a church spire among gabled roofs and linden trees. */
function Skyline() {
  const house = (x, w, h, fill) => (
    <g key={x}>
      <rect x={x} y={168 - h} width={w} height={h} fill={fill} />
      <path d={`M${x - 6} ${168 - h} L${x + w / 2} ${168 - h - w * 0.55} L${x + w + 6} ${168 - h}Z`} fill={C.redDeep} />
      {[0, 1].map((r) => [0, 1].map((c) => (
        <rect key={`${r}${c}`} x={x + 10 + c * (w / 2 - 6)} y={168 - h + 12 + r * 24} width="9" height="13" fill={C.alberoSoft} opacity="0.85" />
      )))}
    </g>
  )
  const tree = (x) => (
    <g key={x}>
      <rect x={x - 3} y="138" width="6" height="30" fill="#5b4636" />
      <circle cx={x} cy="126" r="19" fill="#3f7a52" />
      <circle cx={x - 12} cy="136" r="12" fill="#336a45" />
      <circle cx={x + 12} cy="136" r="12" fill="#336a45" />
    </g>
  )
  return (
    <svg viewBox="0 0 800 190" preserveAspectRatio="xMidYMax slice" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <rect y="168" width="800" height="22" fill={C.albero} />
      {house(70, 70, 52, '#d9cdb6')}
      {house(160, 62, 70, '#e4d9c3')}
      {house(560, 66, 62, '#d9cdb6')}
      {house(640, 74, 48, '#e4d9c3')}
      {/* church spire */}
      <rect x="236" y="92" width="38" height="76" fill="#cfc3aa" />
      <path d="M230 92 255 10 280 92Z" fill={C.blue} />
      <rect x="254" y="2" width="2" height="12" fill={C.albero} />
      <path d="M246 130a9 9 0 0 1 18 0v38h-18Z" fill={C.blueDeep} opacity="0.75" />
      {/* TV tower */}
      <rect x="397" y="30" width="6" height="138" fill="#9aa3b4" />
      <path d="M388 100h24l-4 8h-16Z" fill="#7d8799" />
      <circle cx="400" cy="72" r="15" fill={C.blue} />
      <circle cx="400" cy="72" r="15" fill="none" stroke={C.albero} strokeWidth="2" />
      <rect x="399" y="4" width="2" height="30" fill={C.red} />
      <path d="M390 168 400 108 410 168Z" fill="#8691a5" />
      {/* modern block */}
      <rect x="320" y="104" width="46" height="64" fill={C.blue} />
      {[116, 132, 148].map((y) => <rect key={y} x="326" y={y} width="34" height="5" fill={C.alberoSoft} opacity="0.55" />)}
      <rect x="440" y="96" width="52" height="72" fill={C.blueDeep} />
      {[108, 124, 140].map((y) => <rect key={y} x="446" y={y} width="40" height="5" fill={C.alberoSoft} opacity="0.5" />)}
      {[30, 120, 520, 740, 780].map(tree)}
      <rect y="166" width="800" height="3" fill={C.redDeep} />
    </svg>
  )
}

const ICONS = {
  tool: (
    <>
      <path d="M10 40 26 24" />
      <path d="M22 10l6-4 14 14-4 6-6-2-6 6-8-8 6-6Z" />
    </>
  ),
  dish: (
    <>
      <path d="M6 28c0 8 8 14 18 14s18-6 18-14Z" />
      <path d="M10 28c0-8 6-14 14-14s14 6 14 14" />
      <path d="M24 8v6" />
    </>
  ),
  pen: (
    <>
      <path d="M8 40l4-12L34 6l8 8-22 22Z" />
      <path d="M30 10l8 8M12 28l8 8" />
    </>
  ),
  shop: (
    <>
      <path d="M6 18 10 8h28l4 10c0 3-3 5-5 5s-5-2-5-5c0 3-3 5-6 5s-6-2-6-5c0 3-3 5-6 5s-5-2-5-5Z" />
      <path d="M10 25v15h28V25M20 40V31h8v9" />
    </>
  ),
  book: (
    <>
      <path d="M8 10c6-3 11-3 16 1 5-4 10-4 16-1v28c-6-3-11-3-16 1-5-4-10-4-16-1Z" />
      <path d="M24 11v28" />
    </>
  ),
}

/** Navy roundel for each card icon. */
function TileIcon({ name }) {
  return (
    <span
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-white"
      style={{ backgroundColor: C.blue, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.albero}` }}
    >
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICONS[name]}
      </svg>
    </span>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-xl border bg-white" style={{ borderColor: `${C.blue}33` }}>
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
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: light ? C.alberoSoft : C.redDeep }}>{eyebrow}</p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SERIF, color: light ? '#fff' : C.blueDeep }}>{children}</h2>
      <span aria-hidden="true" className={`mt-4 block h-[3px] w-14 ${align === 'center' ? 'mx-auto' : ''}`} style={{ backgroundColor: light ? C.alberoSoft : C.albero }} />
    </div>
  )
}

const isInternal = (to) => String(to || '').startsWith('/')

const UI = {
  back: 'Zurück zur Website',
  home: 'Startseite',
  who: 'Wer wir sind',
  why: 'Warum Nexora',
  start: 'Erste Schritte',
  faq: 'Häufige Fragen',
  letsBegin: 'Los geht’s',
  head: 'Zentrale',
  seePlans: 'Pläne ansehen',
}

export default function GermanyPage() {
  const city = useMemo(() => getCity('germany'), [])
  const [openFaq, setOpenFaq] = useState(0)
  const idA = useId().replace(/:/g, '')
  const idB = `${idA}b`
  if (!city) return null

  const seoData = {
    path: `/${city.slug}`,
    title: city.seoTitle,
    description: city.seoDescription,
    keywords: city.seoKeywords,
    canonical: `https://nexorasolution.us/${city.slug}/`,
    ogTitle: city.seoTitle,
    ogDescription: city.seoDescription,
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
  }

  const btnPrimary = 'inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(184,64,47,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 bg-white/80 px-7 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel={UI.back} badge="Deutschland" badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">{UI.home}</Link><span> / </span><span aria-current="page">Deutschland</span>
      </nav>

      <div lang="de" className="nx-light-island" style={{ backgroundColor: C.cream, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundImage: `linear-gradient(180deg, ${C.cream} 0%, ${C.paper} 100%)` }}>
          <Gitter id={idA} opacity={0.09} />
          <div className="relative mx-auto max-w-4xl px-5 pb-6 pt-20 text-center sm:px-6 sm:pt-24 lg:pt-28">
            <p className="inline-flex items-center gap-2 border-y-2 px-5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ borderColor: C.blue, color: C.blueDeep }}>
              <Mark className="h-4 w-4" />
              {city.hero.eyebrow}
            </p>
            <h1 className="mt-6 text-[2.3rem] font-bold leading-[1.1] tracking-tight sm:text-[3.3rem] lg:text-[3.8rem]" style={{ ...SERIF, color: C.blueDeep }}>
              {city.hero.headingA}{' '}
              <span style={{ color: C.red }}>{city.hero.headingB}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8" style={{ color: C.body }}>{city.hero.subtitle}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to={city.hero.primaryCta.to} className={btnPrimary} style={{ backgroundColor: C.red }}>
                {city.hero.primaryCta.label} <HiOutlineArrowRight className="text-lg" />
              </Link>
              <Link to={city.hero.secondaryCta.to} className={btnLine} style={{ borderColor: C.blue, color: C.blueDeep }}>
                {city.hero.secondaryCta.label}
              </Link>
            </div>
          </div>
          <div className="relative mt-6">
            <Skyline />
          </div>
        </section>
        <GiebelBand />

        {/* Facts */}
        <section className="py-12">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-5 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
            {city.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col items-center justify-center rounded-2xl p-4 text-center text-white" style={{ backgroundColor: C.blue, boxShadow: `inset 0 0 0 3px ${C.blue}, inset 0 0 0 5px ${C.albero}, 0 10px 24px -14px rgba(20,36,61,0.7)` }}>
                <p className="text-xl font-bold sm:text-2xl" style={SERIF}>{fact.value}</p>
                <p className="mt-1.5 text-[12px] leading-5 text-blue-50">{fact.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="pb-16 pt-2 sm:pb-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={UI.who}>{city.intro.heading}</Heading>
            <div className="mt-8 space-y-5">
              {city.intro.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="text-[16px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* The city */}
        <section className="relative overflow-hidden py-16 sm:py-20" style={{ backgroundColor: C.alberoSoft }}>
          <Gitter id={idB} opacity={0.07} />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.arts.eyebrow}>{city.arts.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.arts.intro}</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {city.arts.items.map((item) => (
                <article key={item.key} className="flex gap-5 rounded-xl border bg-white p-6 shadow-[0_8px_24px_-16px_rgba(20,36,61,0.5)]" style={{ borderColor: `${C.blue}26` }}>
                  <TileIcon name={item.key} />
                  <div>
                    <h3 className="text-[18px] font-bold" style={{ ...SERIF, color: C.blueDeep }}>{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.75]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <GiebelBand height="h-6" />

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
                  className="group relative flex flex-col overflow-hidden rounded-xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-18px_rgba(20,36,61,0.5)]"
                  style={{ borderColor: `${C.blue}26` }}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${C.blue}, ${C.albero}, ${C.red})` }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: C.red }}>{item.label}</p>
                  <h3 className="mt-2 text-[17px] font-bold" style={{ ...SERIF, color: C.blueDeep }}>{item.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: C.blue }}>
                    {item.cta} <HiOutlineArrowRight className="h-3.5 w-3.5" />
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
                    {i < all.length - 2 ? ', ' : i === all.length - 2 ? ' und ' : '.'}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>

        {/* Honest notes */}
        {(city.extraSections || []).map((section) => (
          <section key={section.heading} className="py-14 sm:py-16" style={{ backgroundColor: C.alberoSoft }}>
            <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
              <div className="rounded-xl border-2 bg-white p-7 sm:p-9" style={{ borderColor: C.albero }}>
                <Heading eyebrow={section.eyebrow}>{section.heading}</Heading>
                <div className="mt-7 space-y-5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)} className="text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{p}</p>
                  ))}
                </div>
                {section.links ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {section.links.map((link) => {
                      const cls = 'rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-[#f6f3ee]'
                      return isInternal(link.to) ? (
                        <Link key={link.to} to={link.to} className={cls} style={{ borderColor: C.blue, color: C.blueDeep }}>{link.label}</Link>
                      ) : (
                        <a key={link.to} href={link.to} target="_blank" rel="noopener noreferrer" className={cls} style={{ borderColor: C.blue, color: C.blueDeep }}>{link.label}</a>
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
            <Heading eyebrow={UI.why}>{city.why.heading}</Heading>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {city.why.items.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-xl border bg-white p-5" style={{ borderColor: `${C.blue}22` }}>
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.red }} />
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.blueDeep }}>{item.title}</h3>
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
            <div className="rounded-xl border p-7 sm:p-9" style={{ borderColor: `${C.blue}33`, backgroundColor: C.alberoSoft }}>
              <h2 className="text-2xl font-bold" style={{ ...SERIF, color: C.blueDeep }}>{city.areas.heading}</h2>
              <p className="mt-4 text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{city.areas.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {city.areas.list.map((area) => (
                  <li key={area} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderColor: C.blue, color: C.blueDeep, backgroundColor: '#fff' }}>{area}</li>
                ))}
              </ul>
              <p className="mt-5 text-[13.5px] leading-7" style={{ color: C.body }}>{city.pricingNote} <Link to="/pricing" className="font-semibold underline underline-offset-2" style={{ color: C.redDeep }}>{UI.seePlans}</Link></p>
            </div>
          </div>
        </section>
        <GiebelBand height="h-6" />

        {/* Steps */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: C.paper }}>
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={UI.start}>{city.stepsHeading}</Heading>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {city.steps.map((step, index) => (
                <li key={step.title} className="rounded-xl border bg-white p-6" style={{ borderColor: `${C.blue}26` }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white" style={{ ...SERIF, backgroundColor: C.red, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.albero}` }}>{index + 1}</span>
                  <h3 className="mt-5 text-[16px] font-bold" style={{ ...SERIF, color: C.blueDeep }}>{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: C.body }}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <AllProducts
          lang="de"
          theme={{ bg: C.cream, card: C.paper, border: `${C.blue}33`, accent: C.red, heading: C.blueDeep, body: C.body, serif: SERIF }}
        />

        {/* FAQ */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: C.paper }}>
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={UI.faq}>{city.faqHeading}</Heading>
            <div className="mt-10 grid gap-3">
              {city.faqs.map((faq, i) => (
                <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <GiebelBand />
        <section className="px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.blueDeep }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow={UI.letsBegin}>{city.ctaHeading}</Heading>
              <p className="mt-4 max-w-xl text-[16px] leading-7 text-blue-50">{city.ctaSubtext}</p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link to={city.cta.primary.to} className={btnPrimary} style={{ backgroundColor: C.red }}>
                  {city.cta.primary.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className={`${btnLine} !bg-transparent hover:!bg-white/10`} style={{ borderColor: '#ffffff88', color: '#fff' }}>
                  {city.cta.secondary.label}
                </a>
              </div>
            </div>
            <address className="rounded-xl border-2 border-dashed p-6 text-[14px] not-italic leading-7 text-blue-50" style={{ borderColor: `${C.albero}aa`, backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-base font-bold text-white" style={SERIF}>Nexora Solution</p>
              <p className="mt-1 text-[13px] leading-6">{city.contactNote}</p>
              <p className="mt-2 flex items-start gap-2"><HiOutlineMapPin className="mt-1 h-4 w-4 shrink-0" style={{ color: C.alberoSoft }} />{UI.head}: {SITE_ADDRESS_TEXT}</p>
              <p className="mt-1 flex items-center gap-2"><HiOutlinePhone className="h-4 w-4 shrink-0" style={{ color: C.alberoSoft }} /><a href={SITE_WHATSAPP} className="hover:underline">WhatsApp {SITE_PHONE}</a></p>
              <p className="mt-1 pl-6"><a href={`mailto:${SITE_EMAILS.sales}`} className="hover:underline">{SITE_EMAILS.sales}</a></p>
            </address>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
