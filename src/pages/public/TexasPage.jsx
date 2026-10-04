import Link from '../../components/AppLink.jsx'
import { useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import { getCity } from '../../lib/cities.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'

/**
 * Texas landing page. Where /multan/ borrows from blue-tile geometry, this one
 * borrows from Texas itself: cream "ranch paper" and saddle-brown stitching,
 * navy and Texas red, a slab-serif voice, the Lone Star, and the state outline
 * with its big cities. Everything is inline SVG/CSS, so it renders on the
 * server and adds no image requests.
 */

const C = {
  cream: '#fbf3e4',
  sand: '#f1e2c4',
  brown: '#7c4a21',
  navy: '#0b2a5b',
  red: '#b91c1c',
  ink: '#2b2118',
  bluebonnet: '#5b6bd0',
}
const SLAB = { fontFamily: "Rockwell, 'Rockwell Nova', 'Roboto Slab', Arvo, Georgia, 'Times New Roman', serif" }

const STATE_PATH = 'M30 3 H55 V21 H66 L72 20 L84 24 L85 34 L83 42 L88 50 L85 58 L77 70 L67 82 L58 92 L51 99 L45 91 L40 81 L31 73 L24 65 L14 60 L7 51 L4 46 L30 44 Z'
const MAP_CITIES = [
  { name: 'El Paso', x: 8, y: 50, side: 'right' },
  { name: 'Lubbock', x: 40, y: 27, side: 'right' },
  { name: 'Dallas', x: 69, y: 32, side: 'right' },
  { name: 'Austin', x: 62, y: 60, side: 'left' },
  { name: 'San Antonio', x: 54, y: 72, side: 'right' },
  { name: 'Houston', x: 79, y: 60, side: 'right' },
]

function starPoints(cx, cy, outer, inner) {
  const pts = []
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner
    const angle = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function LoneStar({ className = '', fill = '#fff', size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <polygon points={starPoints(12, 12.6, 11, 4.4)} fill={fill} />
    </svg>
  )
}

function TexasMap() {
  return (
    <svg viewBox="-4 -2 118 108" className="mx-auto h-auto w-full max-w-[420px]" role="img" aria-label="Map of Texas showing El Paso, Lubbock, Dallas, Austin, San Antonio and Houston">
      <path d={STATE_PATH} fill={C.navy} stroke={C.red} strokeWidth="2.2" strokeLinejoin="round" transform="translate(2 2)" opacity="0.18" />
      <path d={STATE_PATH} fill={C.navy} stroke={C.cream} strokeWidth="1.6" strokeLinejoin="round" />
      <polygon points={starPoints(52, 48, 12, 4.8)} fill="#fff" />
      {MAP_CITIES.map((city) => (
        <g key={city.name}>
          <circle cx={city.x} cy={city.y} r="2.6" fill={C.red} stroke="#fff" strokeWidth="1" />
          <text
            x={city.side === 'right' ? city.x + 4.5 : city.x - 4.5}
            y={city.y + 1.4}
            textAnchor={city.side === 'right' ? 'start' : 'end'}
            fontSize="4.6"
            fontWeight="700"
            fill="#fff"
            stroke={C.navy}
            strokeWidth="1.3"
            paintOrder="stroke"
            strokeLinejoin="round"
            style={SLAB}
          >
            {city.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** A line of leather stitching. */
function Stitch({ className = '' }) {
  return <div aria-hidden="true" className={`h-0 w-full border-t-2 border-dashed ${className}`} style={{ borderColor: C.brown, opacity: 0.55 }} />
}

/** A strip of Lone Stars between sections. */
function StarBand({ dark = false }) {
  return (
    <div aria-hidden="true" className="flex w-full items-center justify-center gap-5 overflow-hidden py-3" style={{ backgroundColor: dark ? C.red : C.navy }}>
      {Array.from({ length: 21 }).map((_, i) => (
        <LoneStar key={i} size={14} fill={dark ? '#fff' : C.cream} />
      ))}
    </div>
  )
}

const ICONS = {
  wrench: <path d="M30 8a9 9 0 0 0-8.500 12L8 33.500 14.500 40 28 26.500A9 9 0 0 0 40 18l-6 6-5-1-1-5 6-6Z" />,
  truck: (
    <>
      <path d="M5 13h22v18H5ZM27 19h8l6 6v6H27Z" />
      <circle cx="14" cy="34" r="4" />
      <circle cx="34" cy="34" r="4" />
    </>
  ),
  fork: <path d="M14 6v12a4 4 0 0 0 4 4v20M10 6v10M18 6v10M14 6v10M34 6c-4 3-5 9-5 16h5v20" />,
  home: <path d="M6 22 24 7l18 15M11 19v22h26V19M20 41V29h8v12" />,
}

function BadgeIcon({ name }) {
  return (
    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] text-white" style={{ backgroundColor: C.navy, borderColor: C.brown, boxShadow: `inset 0 0 0 3px ${C.cream}` }}>
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICONS[name]}
      </svg>
    </span>
  )
}

/** Ranch-sign card: cream board, brown border, stitched inner line, rivets. */
function SignCard({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`relative rounded-xl border-[3px] p-6 ${className}`} style={{ borderColor: C.brown, backgroundColor: C.cream }} {...rest}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-1.5 rounded-lg border border-dashed" style={{ borderColor: `${C.brown}66` }} />
      {['left-2 top-2', 'right-2 top-2', 'left-2 bottom-2', 'right-2 bottom-2'].map((pos) => (
        <span key={pos} aria-hidden="true" className={`absolute ${pos} h-1.5 w-1.5 rounded-full`} style={{ backgroundColor: C.brown }} />
      ))}
      <div className="relative">{children}</div>
    </Tag>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-xl border-2" style={{ borderColor: `${C.brown}88`, backgroundColor: '#fffaf0' }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[15px] font-bold" style={{ ...SLAB, color: C.ink }}>{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color: C.brown }} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[14px] leading-[1.75]" style={{ color: '#4b3b2c' }}>{faq.a}</p></div>
      </div>
    </article>
  )
}

function Heading({ eyebrow, children, align = 'center', light = false }) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {eyebrow ? (
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: light ? '#fecaca' : C.red }}>
          <LoneStar size={12} fill={light ? '#fecaca' : C.red} />{eyebrow}<LoneStar size={12} fill={light ? '#fecaca' : C.red} />
        </p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SLAB, color: light ? '#fff' : C.navy }}>{children}</h2>
    </div>
  )
}

const isInternal = (to) => String(to || '').startsWith('/')

export default function TexasPage() {
  const city = useMemo(() => getCity('texas'), [])
  const [openFaq, setOpenFaq] = useState(0)
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

  const btnRed = 'inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-bold uppercase tracking-wide text-white shadow-[0_6px_0_0_#7f1212] transition-all duration-150 hover:translate-y-[2px] hover:shadow-[0_4px_0_0_#7f1212] active:translate-y-[5px] active:shadow-[0_1px_0_0_#7f1212]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-full border-[3px] bg-transparent px-7 text-sm font-bold uppercase tracking-wide transition-all duration-150 hover:bg-white/60'

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge={city.name} badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={city.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><Link to="/usa">United States</Link><span> / </span><span aria-current="page">Texas</span>
      </nav>

      <div style={{ backgroundColor: C.cream, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden pb-14 pt-20 sm:pb-16 sm:pt-24 lg:pt-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: `radial-gradient(${C.brown}22 1px, transparent 1px)`, backgroundSize: '22px 22px' }} />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em]" style={{ borderColor: C.brown, color: C.brown, backgroundColor: '#fffaf0' }}>
                <LoneStar size={13} fill={C.red} />{city.hero.eyebrow}
              </p>
              <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.6rem] lg:text-[4.2rem]" style={{ ...SLAB, color: C.navy }}>
                {city.hero.headingA}{' '}
                <span style={{ color: C.red }}>{city.hero.headingB}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[17px] leading-8 lg:mx-0" style={{ color: '#4b3b2c' }}>{city.hero.subtitle}</p>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link to={city.hero.primaryCta.to} className={btnRed} style={{ backgroundColor: C.red }}>
                  {city.hero.primaryCta.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <Link to={city.hero.secondaryCta.to} className={btnLine} style={{ borderColor: C.navy, color: C.navy }}>
                  {city.hero.secondaryCta.label}
                </Link>
              </div>
            </div>
            <div className="relative">
              <TexasMap />
            </div>
          </div>
        </section>
        <StarBand />

        {/* Facts */}
        <section className="py-10">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
            {city.facts.map((fact) => (
              <div key={fact.label} className="rounded-xl border-2 border-dashed p-4 text-center" style={{ borderColor: C.brown, backgroundColor: '#fffaf0' }}>
                <p className="text-2xl font-extrabold" style={{ ...SLAB, color: C.red }}>{fact.value}</p>
                <p className="mt-1 text-[12px] leading-5" style={{ color: '#4b3b2c' }}>{fact.label}</p>
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
                <p key={p.slice(0, 40)} className="text-[16px] leading-[1.85]" style={{ color: '#3d2f22' }}>{p}</p>
              ))}
            </div>
          </div>
        </section>
        <Stitch />

        {/* Trades */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: C.sand }}>
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.arts.eyebrow}>{city.arts.heading}</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: '#4b3b2c' }}>{city.arts.intro}</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {city.arts.items.map((item) => (
                <SignCard key={item.key} className="flex gap-5">
                  <BadgeIcon name={item.key} />
                  <div>
                    <h3 className="text-[18px] font-extrabold" style={{ ...SLAB, color: C.navy }}>{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.75]" style={{ color: '#4b3b2c' }}>{item.text}</p>
                  </div>
                </SignCard>
              ))}
            </div>
          </div>
        </section>
        <StarBand dark />

        {/* Tools: a menu board */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow={city.business.eyebrow}>{city.business.heading}</Heading>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[16px] leading-[1.8]" style={{ color: '#4b3b2c' }}>{city.business.intro}</p>
            <ul className="mt-10 overflow-hidden rounded-2xl border-[3px]" style={{ borderColor: C.navy, backgroundColor: '#fffaf0' }}>
              {city.business.items.map((item, index) => (
                <li key={item.to} className={index ? 'border-t-2 border-dashed' : ''} style={{ borderColor: `${C.brown}66` }}>
                  <Link to={item.to} className="group flex items-center gap-4 p-5 transition-colors duration-200 hover:bg-white sm:gap-6">
                    <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full sm:flex" style={{ backgroundColor: C.navy }}>
                      <LoneStar size={18} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: C.red }}>{item.label}</span>
                      <span className="mt-0.5 block text-[17px] font-extrabold" style={{ ...SLAB, color: C.navy }}>{item.title}</span>
                      <span className="mt-1 block text-[13.5px] leading-[1.65]" style={{ color: '#4b3b2c' }}>{item.text}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold transition-all duration-200 group-hover:gap-2" style={{ color: C.red }}>
                      <span className="hidden sm:inline">{item.cta || `Open ${item.label}`}</span> <HiOutlineArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {city.business.footer ? (
              <p className="mt-8 text-center text-[14.5px]" style={{ color: '#4b3b2c' }}>
                {city.business.footer.text}{' '}
                {city.business.footer.links.map((link, i, all) => (
                  <span key={link.to}>
                    <Link to={link.to} className="font-bold underline underline-offset-2" style={{ color: C.navy }}>{link.label}</Link>
                    {i < all.length - 2 ? ', ' : i === all.length - 2 ? ' and ' : '.'}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>
        <Stitch />

        {/* Tax + product note */}
        {(city.extraSections || []).map((section, index) => (
          <section key={section.heading} className="py-14 sm:py-16" style={{ backgroundColor: index % 2 === 0 ? '#fffaf0' : C.cream }}>
            <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
              <SignCard>
                <Heading eyebrow={section.eyebrow}>{section.heading}</Heading>
                <div className="mt-7 space-y-5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)} className="text-[15.5px] leading-[1.85]" style={{ color: '#3d2f22' }}>{p}</p>
                  ))}
                </div>
                {section.links ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {section.links.map((link) => {
                      const cls = 'rounded-full border-2 px-4 py-2 text-[13px] font-bold transition-colors hover:bg-white'
                      return isInternal(link.to) ? (
                        <Link key={link.to} to={link.to} className={cls} style={{ borderColor: C.navy, color: C.navy }}>{link.label}</Link>
                      ) : (
                        <a key={link.to} href={link.to} target="_blank" rel="noopener noreferrer" className={cls} style={{ borderColor: C.navy, color: C.navy }}>{link.label}</a>
                      )
                    })}
                  </div>
                ) : null}
              </SignCard>
            </div>
          </section>
        ))}
        <StarBand />

        {/* Why */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Why Nexora">{city.why.heading}</Heading>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {city.why.items.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-xl border-2 p-5" style={{ borderColor: `${C.brown}55`, backgroundColor: '#fffaf0' }}>
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.red }} />
                  <div>
                    <h3 className="text-[15px] font-extrabold" style={{ ...SLAB, color: C.navy }}>{item.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.7]" style={{ color: '#4b3b2c' }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cities */}
        <section className="pb-16">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
            <SignCard>
              <h2 className="text-2xl font-extrabold" style={{ ...SLAB, color: C.navy }}>{city.areas.heading}</h2>
              <p className="mt-4 text-[15.5px] leading-[1.85]" style={{ color: '#3d2f22' }}>{city.areas.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {city.areas.list.map((area) => (
                  <li key={area} className="inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-[12.5px] font-bold" style={{ borderColor: C.navy, color: C.navy, backgroundColor: '#fffaf0' }}>
                    <LoneStar size={11} fill={C.red} />{area}
                  </li>
                ))}
              </ul>
            </SignCard>
          </div>
        </section>
        <Stitch />

        {/* Steps */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: C.sand }}>
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="Getting started">{city.stepsHeading}</Heading>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {city.steps.map((step, index) => (
                <li key={step.title}>
                  <SignCard as="div" className="h-full">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-extrabold text-white" style={{ ...SLAB, backgroundColor: C.red }}>{index + 1}</span>
                    <h3 className="mt-4 text-[16px] font-extrabold" style={{ ...SLAB, color: C.navy }}>{step.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: '#4b3b2c' }}>{step.text}</p>
                  </SignCard>
                </li>
              ))}
            </ol>
          </div>
        </section>

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
        <StarBand dark />
        <section className="px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.navy }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow="Let’s go">{city.ctaHeading}</Heading>
              <p className="mt-4 max-w-xl text-[16px] leading-7 text-blue-100">{city.ctaSubtext}</p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link to={city.cta.primary.to} className={btnRed} style={{ backgroundColor: C.red }}>
                  {city.cta.primary.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className={btnLine} style={{ borderColor: C.cream, color: C.cream }}>
                  {city.cta.secondary.label}
                </a>
              </div>
            </div>
            <address className="relative rounded-xl border-[3px] border-dashed p-6 text-[14px] not-italic leading-7" style={{ borderColor: `${C.cream}88`, backgroundColor: 'rgba(255,255,255,0.05)', color: '#e7eefc' }}>
              <p className="text-base font-extrabold text-white" style={SLAB}>Nexora Solution</p>
              <p className="mt-1 text-[13px] leading-6 text-blue-100">{city.contactNote}</p>
              <p className="mt-2 flex items-start gap-2"><HiOutlineMapPin className="mt-1 h-4 w-4 shrink-0" style={{ color: '#fecaca' }} />Head office: {SITE_ADDRESS_TEXT}</p>
              <p className="mt-1 flex items-center gap-2"><HiOutlinePhone className="h-4 w-4 shrink-0" style={{ color: '#fecaca' }} /><a href={SITE_WHATSAPP} className="hover:underline">WhatsApp {SITE_PHONE}</a></p>
              <p className="mt-1 pl-6"><a href={`mailto:${SITE_EMAILS.sales}`} className="hover:underline">{SITE_EMAILS.sales}</a></p>
            </address>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
