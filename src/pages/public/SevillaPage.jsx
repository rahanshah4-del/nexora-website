import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import AllProducts from './AllProducts.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'

/**
 * Sevilla landing page, written in Spanish for Spanish searches. The look
 * borrows from Andalusia: azulejo tiles in cobalt, white and yellow, horseshoe
 * arches, the Giralda tower, the ochre "albero" sand of the bullring and the
 * Feria, and the red-and-white lunares (polka dots) of a flamenco dress.
 * All inline SVG/CSS, so it renders on the server and adds no image requests.
 */

const C = {
  cream: '#fbf5e6',
  paper: '#fffdf7',
  blue: '#1d4f91',
  blueDeep: '#0f2f5c',
  red: '#b0123a',
  redDeep: '#7a0c28',
  albero: '#d9a441',
  alberoSoft: '#f4e2b4',
  ink: '#1c1a17',
  body: '#47423a',
}
const SERIF = { fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }

/** Azulejo tile pattern: a cobalt eight-point star and corner leaves on white. */
function Azulejo({ id, opacity = 0.1, color = C.blue }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round">
            <rect x="1" y="1" width="62" height="62" />
            <path d="M32 6 L38 22 L54 16 L42 29 L58 32 L42 35 L54 48 L38 42 L32 58 L26 42 L10 48 L22 35 L6 32 L22 29 L10 16 L26 22Z" />
            <circle cx="32" cy="32" r="5" />
          </g>
          <circle cx="32" cy="32" r="1.8" fill={C.albero} />
          <g fill={C.albero} opacity="0.9">
            <circle cx="4" cy="4" r="2" />
            <circle cx="60" cy="4" r="2" />
            <circle cx="4" cy="60" r="2" />
            <circle cx="60" cy="60" r="2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** A flamenco ruffle band: red with white lunares (polka dots) and a scalloped edge. */
function LunaresBand({ height = 'h-8' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg aria-hidden="true" focusable="false" className={`block w-full ${height}`} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="36" height="32" patternUnits="userSpaceOnUse">
          <rect width="36" height="32" fill={C.red} />
          <circle cx="9" cy="9" r="3.4" fill="#fff" />
          <circle cx="27" cy="19" r="3.4" fill="#fff" />
          <path d="M0 32 Q9 24 18 32 Q27 24 36 32Z" fill={C.redDeep} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Naranjo (orange blossom and fruit) mark. */
function Naranja({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="28" r="14" fill="#e98b1a" />
      <path d="M24 14 C24 8 30 6 34 8 C30 12 28 14 24 14Z" fill="#2f7d3a" />
      <path d="M24 14 C22 9 18 8 14 10 C18 13 21 14 24 14Z" fill="#3f9a4b" />
      <circle cx="18" cy="24" r="3" fill="#fff" opacity="0.35" />
    </svg>
  )
}

/** The Giralda between horseshoe-arched facades, with an orange tree on each side. */
function Skyline() {
  const arch = (cx) => (
    <path key={cx} d={`M${cx - 18} 170 V138 C${cx - 18} 118 ${cx - 6} 110 ${cx} 110 C${cx + 6} 110 ${cx + 18} 118 ${cx + 18} 138 V170Z`} />
  )
  const tree = (x) => (
    <g key={x}>
      <rect x={x - 3} y="132" width="6" height="38" fill="#6b4a2a" />
      <circle cx={x} cy="120" r="22" fill="#2f7d3a" />
      <circle cx={x - 8} cy="124" r="5" fill="#e98b1a" />
      <circle cx={x + 9} cy="114" r="5" fill="#e98b1a" />
      <circle cx={x + 4} cy="130" r="5" fill="#e98b1a" />
    </g>
  )
  return (
    <svg viewBox="0 0 800 190" preserveAspectRatio="xMidYMax slice" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <rect y="168" width="800" height="22" fill={C.albero} />
      <g fill={C.redDeep} opacity="0.92">
        <rect x="120" y="100" width="190" height="70" />
        <rect x="490" y="100" width="190" height="70" />
      </g>
      <g fill={C.cream}>
        {[160, 215, 270].map(arch)}
        {[530, 585, 640].map(arch)}
      </g>
      {/* Giralda */}
      <g>
        <rect x="372" y="62" width="56" height="108" fill={C.red} />
        <rect x="366" y="58" width="68" height="8" fill={C.redDeep} />
        <g fill={C.cream}>
          <rect x="384" y="82" width="10" height="26" rx="5" />
          <rect x="406" y="82" width="10" height="26" rx="5" />
          <rect x="384" y="120" width="10" height="26" rx="5" />
          <rect x="406" y="120" width="10" height="26" rx="5" />
        </g>
        <rect x="378" y="30" width="44" height="30" fill={C.red} />
        <rect x="378" y="28" width="44" height="4" fill={C.redDeep} />
        <path d="M386 30 V42 a5 5 0 0 0 10 0 V30Z M404 30 V42 a5 5 0 0 0 10 0 V30Z" fill={C.cream} />
        <path d="M386 28 Q400 4 414 28Z" fill={C.blue} />
        <rect x="398.500" y="6" width="3" height="10" fill={C.redDeep} />
        <circle cx="400" cy="5" r="3" fill={C.albero} />
      </g>
      {[60, 740].map(tree)}
      <rect y="166" width="800" height="3" fill={C.redDeep} />
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

/** Cobalt roundel, like a tile, for each card icon. */
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
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: light ? C.alberoSoft : C.red }}>{eyebrow}</p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SERIF, color: light ? '#fff' : C.blueDeep }}>{children}</h2>
      <span aria-hidden="true" className={`mt-4 block h-[3px] w-14 ${align === 'center' ? 'mx-auto' : ''}`} style={{ backgroundColor: light ? C.alberoSoft : C.albero }} />
    </div>
  )
}

const isInternal = (to) => String(to || '').startsWith('/')

const UI = {
  back: 'Volver a la web',
  home: 'Inicio',
  who: 'Quiénes somos',
  why: 'Por qué Nexora',
  start: 'Primeros pasos',
  faq: 'Preguntas frecuentes',
  letsBegin: 'Empecemos',
  head: 'Oficina central',
  seePlans: 'Ver planes',
}

export default function SevillaPage() {
  const city = useMemo(() => getCity('sevilla'), [])
  const [openFaq, setOpenFaq] = useState(0)
  const idA = useId().replace(/:/g, '')
  const idB = `${idA}b`
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

  const btnPrimary = 'inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(176,18,58,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 bg-white/80 px-7 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel={UI.back} badge="Sevilla" badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">{UI.home}</Link><span> / </span><span aria-current="page">Sevilla</span>
      </nav>

      <div lang="es" style={{ backgroundColor: C.cream, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundImage: `linear-gradient(180deg, ${C.cream} 0%, ${C.paper} 100%)` }}>
          <Azulejo id={idA} opacity={0.09} />
          <div className="relative mx-auto max-w-4xl px-5 pb-6 pt-20 text-center sm:px-6 sm:pt-24 lg:pt-28">
            <p className="inline-flex items-center gap-2 border-y-2 px-5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ borderColor: C.blue, color: C.blueDeep }}>
              <Naranja className="h-4 w-4" />
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
        <LunaresBand />

        {/* Facts */}
        <section className="py-12">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-5 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
            {city.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col items-center justify-center rounded-2xl p-4 text-center text-white" style={{ backgroundColor: C.blue, boxShadow: `inset 0 0 0 3px ${C.blue}, inset 0 0 0 5px ${C.albero}, 0 10px 24px -14px rgba(15,47,92,0.7)` }}>
                <p className="text-xl font-bold sm:text-2xl" style={SERIF}>{fact.value}</p>
                <p className="mt-1.5 text-[12px] leading-5 text-blue-100">{fact.label}</p>
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
          <Azulejo id={idB} opacity={0.07} />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.arts.eyebrow}>{city.arts.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>{city.arts.intro}</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {city.arts.items.map((item) => (
                <article key={item.key} className="flex gap-5 rounded-xl border bg-white p-6 shadow-[0_8px_24px_-16px_rgba(15,47,92,0.5)]" style={{ borderColor: `${C.blue}26` }}>
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
        <LunaresBand height="h-6" />

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
                  className="group relative flex flex-col overflow-hidden rounded-xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-18px_rgba(15,47,92,0.5)]"
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
                    {i < all.length - 2 ? ', ' : i === all.length - 2 ? ' y ' : '.'}
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
                      const cls = 'rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-[#fbf5e6]'
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
              <p className="mt-5 text-[13.5px] leading-7" style={{ color: C.body }}>{city.pricingNote} <Link to="/pricing" className="font-semibold underline underline-offset-2" style={{ color: C.red }}>{UI.seePlans}</Link></p>
            </div>
          </div>
        </section>
        <LunaresBand height="h-6" />

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
          lang="es"
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
        <LunaresBand />
        <section className="px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.blueDeep }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow={UI.letsBegin}>{city.ctaHeading}</Heading>
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
            <address className="rounded-xl border-2 border-dashed p-6 text-[14px] not-italic leading-7 text-blue-100" style={{ borderColor: `${C.albero}aa`, backgroundColor: 'rgba(255,255,255,0.05)' }}>
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
