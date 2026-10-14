import Link from '../../components/AppLink.jsx'
import { useId, useMemo, useState } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import AllProducts from './AllProducts.jsx'
import GeoLintMarketSection from './GeoLintMarketSection.jsx'
import { getCountry } from '../../lib/countries.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS, SITE_PHONE, SITE_WHATSAPP } from '../../lib/seoStructuredData.js'

/**
 * India landing page. The look borrows from across India rather than one
 * state: the rangoli (powder patterns drawn at the doorstep), the jaali (carved
 * lattice screens of North Indian palaces), marigold garlands, and a saffron,
 * indigo and peacock-green palette. Hindi (Devanagari) appears in short
 * greetings and tags only, next to English. All inline SVG/CSS, so it renders
 * on the server and adds no image requests. Page copy comes from the `india`
 * entry in src/lib/countries.js so the SEO text and the FAQ stay in one place.
 */

const C = {
  saffron: '#b04d08',
  saffronDark: '#9a3f05',
  marigold: '#f2a516',
  marigoldSoft: '#fff1cf',
  indigo: '#1d2a66',
  indigoDark: '#121a45',
  peacock: '#0f6b63',
  rose: '#b8245a',
  paper: '#fffaf0',
  ink: '#241d17',
  body: '#4a4036',
}
const SERIF = { fontFamily: "Georgia, 'Noto Serif Devanagari', 'Kokila', 'Devanagari Sangam MN', serif" }
const DEVA = { fontFamily: "'Noto Sans Devanagari', 'Devanagari Sangam MN', 'Kohinoor Devanagari', 'Nirmala UI', 'Mangal', sans-serif" }

const MODULES = [
  { label: 'Restaurant POS', title: 'Restaurants, dhabas, cafes and sweet shops', text: 'KOT and kitchen display, table management, split bills and a POS that keeps billing offline, for dine-in, takeaway and delivery.', to: '/restaurant-pos' },
  { label: 'Retail POS', title: 'Kirana, general stores, marts and showrooms', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and a customer ledger for retail shops.', to: '/retail-pos' },
  { label: 'Pharmacy POS', title: 'Medical stores and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter.', to: '/pharmacy-pos' },
  { label: 'School ERP', title: 'Schools, coaching classes and tuition centres', text: 'Student records, fee collection, attendance, exams, parent portal and staff payroll in one school ERP.', to: '/school-erp' },
  { label: 'CRM', title: 'Sales teams, traders and service businesses', text: 'Track leads, follow-ups and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', to: '/crm' },
]

const POINTS = [
  { title: 'GST invoice in minutes', text: 'GSTIN for you and your client, CGST and SGST or IGST, GST at 18% that you can change per line, and ₹ amounts with lakh and crore grouping.' },
  { title: 'UPI QR on the bill', text: 'Add your UPI ID under How to pay and the invoice prints a UPI QR code, so customers can pay straight from the bill.' },
  { title: 'Works when the internet drops', text: 'The Restaurant POS keeps saving orders at the counter during an outage and syncs to the cloud when the connection returns.' },
  { title: 'Receipts for thermal printers', text: 'Bills and kitchen copies print on 58mm thermal printers, and the free receipt tool also makes 80mm layouts.' },
  { title: 'Roles and permissions', text: 'A cashier sees the billing screen, a manager sees reports, and the owner sees everything. Nobody gets more access than their job needs.' },
  { title: 'Trial first, then decide', text: 'Every plan starts with a 1-month free trial and no credit card. The current plans are on the pricing page.' },
]

const STEPS = [
  { title: 'Make a free GST invoice', text: 'Open the GST invoice generator, add your GSTIN, your client and your items, and download a PDF or Excel file. No signup.' },
  { title: 'Start the free month', text: 'When bills, stock and staff outgrow a template, start the 1-month free trial and set up your menu, items, tables or students.' },
  { title: 'Add modules as you grow', text: 'Every module runs on the same Nexora account, so you can add CRM or a second branch later without starting over.' },
]

/** Rangoli lattice: dots and looping petals, repeated. */
function RangoliPattern({ id, color = C.saffron, accent = C.marigold, opacity = 1 }) {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M32 8 C38 18 46 22 56 32 C46 42 38 46 32 56 C26 46 18 42 8 32 C18 22 26 18 32 8Z" />
            <path d="M32 20 C35 25 39 28 44 32 C39 36 35 39 32 44 C29 39 25 36 20 32 C25 28 29 25 32 20Z" />
          </g>
          <g fill={accent}>
            <circle cx="32" cy="32" r="2.4" />
            <circle cx="0" cy="0" r="2" />
            <circle cx="64" cy="0" r="2" />
            <circle cx="0" cy="64" r="2" />
            <circle cx="64" cy="64" r="2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Mandala medallion for the hero: lotus petals in rings and a dot border. */
function MandalaMedallion() {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5)
  const dots = Array.from({ length: 32 }, (_, i) => i * 11.25)
  return (
    <svg viewBox="-110 -110 220 220" className="mx-auto h-auto w-full max-w-[400px]" role="img" aria-label="Rangoli mandala, a traditional Indian floor pattern">
      <circle r="106" fill={C.marigoldSoft} />
      <circle r="106" fill="none" stroke={C.indigo} strokeWidth="3" />
      <circle r="100" fill="none" stroke={C.indigo} strokeWidth="1" strokeDasharray="2 4" />
      {dots.map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 90} cy={Math.sin((a * Math.PI) / 180) * 90} r="2.4" fill={C.rose} />
      ))}
      <g fill="none" strokeWidth="2.1" strokeLinejoin="round">
        {petals.map((a) => (
          <path key={a} d="M0 -80 C14 -64 14 -44 0 -30 C-14 -44 -14 -64 0 -80Z" stroke={C.saffron} fill={`${C.marigold}33`} transform={`rotate(${a})`} />
        ))}
        {petals.map((a) => (
          <path key={`i${a}`} d="M0 -56 C8 -48 8 -38 0 -30 C-8 -38 -8 -48 0 -56Z" stroke={C.peacock} transform={`rotate(${a + 11.25})`} />
        ))}
        {petals.slice(0, 8).map((a) => (
          <path key={`k${a}`} d="M0 -30 L7 -18 L0 -8 L-7 -18Z" stroke={C.indigo} fill={`${C.indigo}14`} transform={`rotate(${a * 2})`} />
        ))}
      </g>
      <circle r="12" fill={C.rose} />
      <circle r="6.5" fill={C.marigold} />
      <circle r="2.6" fill={C.indigoDark} />
    </svg>
  )
}

/** Jaali band: a carved-lattice strip of stars and arches, used as a divider. */
function JaaliBand({ bg = C.indigo, fg = C.marigold }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg aria-hidden="true" focusable="false" className="block h-9 w-full" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="48" height="36" patternUnits="userSpaceOnUse">
          <rect width="48" height="36" fill={bg} />
          <path d="M24 3 L28 12 L38 13 L30.500 19.500 L33 29 L24 24 L15 29 L17.500 19.500 L10 13 L20 12Z" fill={fg} opacity="0.92" />
          <path d="M0 36 C0 28 6 24 12 24 C18 24 24 28 24 36 M24 36 C24 28 30 24 36 24 C42 24 48 28 48 36" fill="none" stroke={fg} strokeWidth="1.2" opacity="0.55" />
          <circle cx="24" cy="18" r="1.8" fill={C.rose} />
        </pattern>
      </defs>
      <rect width="100%" height="36" fill={`url(#${id})`} />
    </svg>
  )
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-2xl border" style={{ borderColor: `${C.indigo}33`, backgroundColor: '#fff' }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.ink }}>{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color: C.saffron }} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[14px] leading-[1.75]" style={{ color: C.body }}>{faq.a}</p></div>
      </div>
    </article>
  )
}

function Heading({ eyebrow, children, align = 'center', light = false }) {
  const tone = light ? C.marigold : C.saffron
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {eyebrow ? (
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.08em]" style={{ ...DEVA, color: tone }}>
          <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45" style={{ backgroundColor: tone }} />
          {eyebrow}
          <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45" style={{ backgroundColor: tone }} />
        </p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${align === 'center' ? 'mx-auto max-w-3xl' : ''}`} style={{ ...SERIF, color: light ? '#fff' : C.indigoDark }}>{children}</h2>
    </div>
  )
}

export default function IndiaPage() {
  const country = useMemo(() => getCountry('india'), [])
  const [openFaq, setOpenFaq] = useState(0)
  const rangoliA = useId().replace(/:/g, '')
  const rangoliB = `${rangoliA}b`
  if (!country) return null

  const seoData = {
    path: `/${country.slug}`,
    title: country.seoTitle,
    description: country.seoDescription,
    keywords: country.seoKeywords,
    canonical: `https://nexorasolution.online/${country.slug}/`,
    ogTitle: country.seoTitle,
    ogDescription: country.seoDescription,
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
  }

  const btnPrimary = 'inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(217,98,10,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]'
  const btnLine = 'inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 bg-white/70 px-7 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]'

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge={country.name} badgeIcon={HiOutlineMapPin}>
      <PageSeo {...seoData} faqItems={country.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><span aria-current="page">India</span>
      </nav>

      <div className="nx-light-island" style={{ backgroundColor: C.paper, color: C.ink }}>
        {/* Hero */}
        <section className="relative overflow-hidden pb-14 pt-20 sm:pb-16 sm:pt-24 lg:pt-28" style={{ backgroundImage: `linear-gradient(180deg, ${C.marigoldSoft} 0%, ${C.paper} 100%)` }}>
          <RangoliPattern id={rangoliA} opacity={0.1} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,250,240,0.95)_0%,rgba(255,250,240,0.6)_50%,rgba(255,250,240,0)_80%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
            <div className="text-center lg:text-left">
              <p lang="hi" className="text-[2.2rem] font-bold leading-none sm:text-5xl" style={{ ...DEVA, color: C.saffron }}>नमस्ते!</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: `${C.indigo}55`, color: C.indigo, backgroundColor: '#fff' }}>
                <HiOutlineMapPin className="h-4 w-4" style={{ color: C.saffron }} />
                <span lang="hi" style={DEVA}>भारत के व्यापार के लिए</span>
                <span>· For Indian businesses</span>
              </p>
              <h1 className="mt-6 text-[2.3rem] font-bold leading-[1.08] tracking-tight sm:text-[3.3rem] lg:text-[3.8rem]" style={{ ...SERIF, color: C.indigoDark }}>
                {country.heroHeading}{' '}
                <span style={{ color: C.saffron }}>{country.heroHighlight}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[17px] leading-8 lg:mx-0" style={{ color: C.body }}>{country.heroSubtitle}</p>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link to={country.heroCta.to} className={btnPrimary} style={{ backgroundColor: C.saffron }}>
                  {country.heroCta.label} <HiOutlineArrowRight className="text-lg" />
                </Link>
                <Link to="/pricing" className={btnLine} style={{ borderColor: C.indigo, color: C.indigoDark }}>
                  View pricing
                </Link>
              </div>
            </div>
            <MandalaMedallion />
          </div>
        </section>
        <JaaliBand />

        {/* Free tools */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="मुफ़्त टूल · Free tool, no signup">{country.spotlight.heading}</Heading>
            <p className="mt-7 text-[16px] leading-[1.85]" style={{ color: C.body }}>{country.spotlight.body}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {country.spotlight.links.map((link, i) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={i === 0 ? btnPrimary : 'rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-[#fff1cf]'}
                  style={i === 0 ? { backgroundColor: C.saffron } : { borderColor: C.indigo, color: C.indigoDark }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* GST note */}
        <section className="relative overflow-hidden py-14 sm:py-16" style={{ backgroundColor: '#f1f4fb' }}>
          <RangoliPattern id={rangoliB} color={C.indigo} accent={C.saffron} opacity={0.06} />
          <div className="relative mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <div className="rounded-3xl border-2 bg-white p-7 sm:p-9" style={{ borderColor: C.marigold }}>
              <Heading eyebrow="जीएसटी · GST, clearly">What the GST invoice tool does and does not do</Heading>
              <p className="mt-7 text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{country.localEdge}</p>
              <p className="mt-5 text-[15.5px] leading-[1.85]" style={{ color: C.body }}>{country.whyNexora}</p>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="प्रोडक्ट · Products">Which Nexora module fits your business</Heading>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[16px] leading-[1.8]" style={{ color: C.body }}>
              Match your business to a module. Every one of them runs on the same Nexora account, so you can add a second module later without starting over.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-18px_rgba(29,42,102,0.45)]"
                  style={{ borderColor: `${C.indigo}2e` }}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${C.saffron}, ${C.marigold}, ${C.peacock})` }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: C.saffron }}>{item.label}</p>
                  <h3 className="mt-2 text-[17px] font-bold" style={{ ...SERIF, color: C.indigoDark }}>{item.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: C.peacock }}>
                    See {item.label} <HiOutlineArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-8 text-center text-[14.5px]" style={{ color: C.body }}>
              Based in South India? See our local page for{' '}
              <Link to="/coimbatore" className="font-semibold underline underline-offset-2" style={{ color: C.peacock }}>Coimbatore</Link>.
            </p>
          </div>
        </section>
        <JaaliBand bg={C.peacock} />

        {/* Why */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="क्यों Nexora · Why Nexora">Made for the way Indian counters run</Heading>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {POINTS.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border bg-white p-5" style={{ borderColor: `${C.indigo}22` }}>
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.peacock }} />
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ ...SERIF, color: C.indigoDark }}>{item.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-[1.7]" style={{ color: C.body }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16 sm:py-20" style={{ backgroundColor: '#f1f4fb' }}>
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="शुरू करें · Getting started">Start in three steps</Heading>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl bg-white p-6 shadow-[0_8px_24px_-16px_rgba(29,42,102,0.35)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white" style={{ ...SERIF, backgroundColor: C.saffron, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${C.marigold}` }}>{index + 1}</span>
                  <h3 className="mt-5 text-[16px] font-bold" style={{ ...SERIF, color: C.indigoDark }}>{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: C.body }}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <GeoLintMarketSection market="india" />

        <AllProducts theme={{ bg: C.paper, border: `${C.indigo}40`, accent: C.saffron, heading: C.indigoDark, body: C.body, serif: SERIF }} />

        {/* FAQ */}
        <section className="pb-16 pt-4 sm:pb-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <Heading eyebrow="सवाल · FAQ">Questions Indian businesses ask</Heading>
            <div className="mt-10 grid gap-3">
              {country.faqs.map((faq, i) => (
                <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <JaaliBand bg={C.saffron} fg={C.marigoldSoft} />
        <section className="relative overflow-hidden px-5 py-16 text-white sm:px-6 sm:py-20" style={{ backgroundColor: C.indigoDark }}>
          <RangoliPattern id={`${rangoliA}c`} color="#ffffff" accent={C.marigold} opacity={0.08} />
          <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Heading align="left" light eyebrow="शुरू करते हैं · Let’s begin">{country.ctaHeading}</Heading>
              <p className="mt-4 max-w-xl text-[16px] leading-7" style={{ color: '#e6e9f7' }}>{country.ctaSubtext}</p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link to="/signup" className={btnPrimary} style={{ backgroundColor: C.marigold, color: C.indigoDark }}>
                  Start free trial <HiOutlineArrowRight className="text-lg" />
                </Link>
                <a href={SITE_WHATSAPP} target="_blank" rel="noreferrer" className={`${btnLine} !bg-transparent hover:!bg-white/10`} style={{ borderColor: '#ffffff88', color: '#fff' }}>
                  Book a demo on WhatsApp
                </a>
              </div>
            </div>
            <address className="rounded-2xl border-2 border-dashed p-6 text-[14px] not-italic leading-7" style={{ borderColor: `${C.marigold}99`, backgroundColor: 'rgba(255,255,255,0.06)', color: '#e6e9f7' }}>
              <p className="text-base font-bold text-white" style={SERIF}>Nexora Solution</p>
              <p className="mt-1 text-[13px] leading-6">Nexora is cloud software you open in a browser, so you can start from anywhere in India. Our team answers on WhatsApp and email.</p>
              <p className="mt-2 flex items-start gap-2"><HiOutlineMapPin className="mt-1 h-4 w-4 shrink-0" style={{ color: C.marigold }} />Head office: {SITE_ADDRESS_TEXT}</p>
              <p className="mt-1 flex items-center gap-2"><HiOutlinePhone className="h-4 w-4 shrink-0" style={{ color: C.marigold }} /><a href={SITE_WHATSAPP} className="hover:underline">WhatsApp {SITE_PHONE}</a></p>
              <p className="mt-1 pl-6"><a href={`mailto:${SITE_EMAILS.sales}`} className="hover:underline">{SITE_EMAILS.sales}</a></p>
            </address>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
