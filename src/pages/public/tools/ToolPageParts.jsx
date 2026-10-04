/**
 * Building blocks shared by the tools hub and the four tool landing pages.
 * Everything here renders on the server (src/entry-server.jsx), so headings,
 * tables, FAQ answers and internal links are all in the prerendered HTML.
 * Icons are inline SVG (no react-icons) to keep these pages' chunk small.
 */
import { Fragment, lazy, Suspense, useSyncExternalStore } from 'react'
import Link from '../../../components/AppLink.jsx'
import ToolIcon from './ToolIcon.jsx'
import { TOOL_CARDS, TOOLS_HUB_CONTENT, TOOLS_LAST_UPDATED, TOOLS_PAGES, TRUST_CHIPS } from '../../../lib/toolsPagesData.js'

// The whole editor (engine, Dexie, UI) is one lazy chunk, loaded only in the
// browser after hydration: see useIsClient below.
const Studio = lazy(() => import('../../../tools/docs-studio/components/Studio.jsx'))

const subscribeNever = () => () => {}

/**
 * false on the server and during hydration, true right after. The React-
 * endorsed equivalent of a `useEffect(() => setMounted(true))` mount check,
 * without the extra effect-driven render.
 */
function useIsClient() {
  return useSyncExternalStore(subscribeNever, () => true, () => false)
}

/* ── Inline text ───────────────────────────────────────────────────────── */

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g
const LINK_CLASS = 'font-semibold text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4 transition-colors hover:text-blue-800 hover:decoration-blue-600'

/** Text with [label](/path/) links; internal paths become router links. */
export function RichText({ text }) {
  const parts = []
  let last = 0
  for (const match of String(text).matchAll(LINK_PATTERN)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const [, label, href] = match
    parts.push(href.startsWith('#')
      ? <a key={match.index} href={href} className={LINK_CLASS}>{label}</a>
      : <Link key={match.index} to={href} className={LINK_CLASS}>{label}</Link>)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>)
}

/* ── Hero pieces ───────────────────────────────────────────────────────── */

export function TrustChips({ className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="What you get">
      {TRUST_CHIPS.map((chip) => (
        <li key={chip} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3.5 text-[13px] font-semibold text-emerald-800">
          <ToolIcon name="check" className="h-4 w-4 text-emerald-600" />
          {chip}
        </li>
      ))}
    </ul>
  )
}

/** Visible breadcrumb, matching the BreadcrumbList JSON-LD (src/lib/toolPages.js). */
export function Breadcrumbs({ path }) {
  const isHub = path === TOOLS_HUB_CONTENT.path
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link to="/" className="rounded hover:text-slate-900">Home</Link></li>
        <li aria-hidden="true">›</li>
        <li>
          {isHub
            ? <span aria-current="page" className="font-medium text-slate-700">{TOOLS_HUB_CONTENT.breadcrumbName}</span>
            : <Link to={TOOLS_HUB_CONTENT.path} className="rounded hover:text-slate-900">{TOOLS_HUB_CONTENT.breadcrumbName}</Link>}
        </li>
        {isHub ? null : (
          <>
            <li aria-hidden="true">›</li>
            <li><span aria-current="page" className="font-medium text-slate-700">{TOOLS_PAGES[path].breadcrumbName}</span></li>
          </>
        )}
      </ol>
    </nav>
  )
}

/** E-E-A-T line: who built it, where to read about them, when it last changed. */
export function Byline({ className = '' }) {
  const date = new Date(`${TOOLS_LAST_UPDATED}T12:00:00Z`)
  const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500 ${className}`}>
      <span className="inline-flex items-center gap-1.5"><ToolIcon name="building" className="h-4 w-4 text-slate-400" />Built by Nexora Solution</span>
      <Link to="/about" className={LINK_CLASS}>About us</Link>
      <span>Last updated <time dateTime={TOOLS_LAST_UPDATED}>{label}</time></span>
    </p>
  )
}

/* ── The tool ──────────────────────────────────────────────────────────── */

/**
 * Same footprint as the wizard's first screen (progress row + step card), so
 * swapping the editor in does not shift the page. The wrapper keeps that height
 * reserved even while the editor boots.
 */
function StudioPlaceholder({ label }) {
  return (
    <div className="px-4 pb-10 pt-6 sm:pt-8" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="mx-auto max-w-3xl">
        <div className="flex h-11 items-center gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-slate-200/70 motion-reduce:animate-none" />)}
        </div>
        <div className="mt-5 h-[640px] animate-pulse rounded-3xl border border-slate-200/80 bg-white motion-reduce:animate-none sm:mt-6" />
      </div>
    </div>
  )
}

// Height the editor's first screen takes once it boots (measured at 360, 390
// and 1440 px wide), reserved up front so mounting it shifts nothing. The
// letterhead page opens on the taller letterhead upload step.
const TOOL_MIN_HEIGHT = {
  default: 'min-h-[1000px] lg:min-h-[920px]',
  letterhead: 'min-h-[1125px] lg:min-h-[1050px]',
}

/** The editor in its elevated card; client-only, with a height-reserving placeholder. */
export function ToolCard({ label, preset, paperSize, onPaperSizeChange }) {
  const isClient = useIsClient()
  const placeholder = <StudioPlaceholder label={label} />
  return (
    <div id="tool" className="tool-card relative scroll-mt-20 overflow-hidden supports-[overflow:clip]:overflow-clip rounded-[2rem] border border-slate-200/80 bg-slate-50 shadow-[0_40px_100px_-48px_rgba(15,23,42,0.45)] ring-1 ring-white/60">
      <div className={preset?.brandMode === 'letterhead' ? TOOL_MIN_HEIGHT.letterhead : TOOL_MIN_HEIGHT.default}>
        {isClient ? (
          <Suspense fallback={placeholder}>
            <Studio fallback={placeholder} preset={preset} paperSize={paperSize} onPaperSizeChange={onPaperSizeChange} />
          </Suspense>
        ) : placeholder}
      </div>
    </div>
  )
}

/* ── Content blocks ────────────────────────────────────────────────────── */

function Steps({ items }) {
  return (
    <ol className="mt-6 grid gap-4 sm:grid-cols-2">
      {items.map((step, i) => (
        <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 font-display text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.8)]" aria-hidden="true">{i + 1}</span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1.5 text-[15px] leading-7 text-slate-600"><RichText text={step.text} /></p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function BulletList({ items }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-600">
          <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ToolIcon name="check" className="h-3.5 w-3.5" /></span>
          <span className="min-w-0">
            {typeof item === 'string'
              ? <RichText text={item} />
              : <><strong className="font-semibold text-slate-900"><RichText text={item.title} /></strong> <RichText text={item.text} /></>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * A comparison table. From md up it is a normal table; below md each row
 * becomes a card, and each cell shows its column name (data-label) before it.
 */
function ComparisonTable({ table }) {
  const [corner, ...headers] = table.columns
  return (
    <div className="mt-6 md:overflow-hidden md:rounded-2xl md:border md:border-slate-200 md:bg-white md:shadow-sm">
      <table className="w-full border-collapse text-left text-[15px] max-md:block">
        <caption className="sr-only">{table.caption}</caption>
        <thead className="bg-slate-100/80 max-md:hidden">
          <tr>
            <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{corner || <span className="sr-only">Compared</span>}</th>
            {headers.map((h) => <th key={h} scope="col" className="px-4 py-3 font-display text-sm font-semibold text-slate-900">{h}</th>)}
          </tr>
        </thead>
        <tbody className="max-md:block max-md:space-y-3">
          {table.rows.map(([rowHead, ...cells]) => (
            <tr key={rowHead} className="border-t border-slate-200/80 bg-white align-top max-md:block max-md:rounded-2xl max-md:border max-md:p-4 max-md:shadow-sm">
              <th scope="row" className="px-4 py-3 font-semibold text-slate-900 max-md:block max-md:p-0 max-md:pb-2 max-md:font-display">{rowHead}</th>
              {cells.map((cell, i) => (
                <td
                  key={i}
                  data-label={headers[i]}
                  className="px-4 py-3 leading-6 text-slate-600 max-md:flex max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:w-[38%] max-md:before:shrink-0 max-md:before:text-[13px] max-md:before:font-semibold before:text-slate-500 max-md:before:content-[attr(data-label)]"
                >
                  <span className="min-w-0">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The letterhead safe area: a sheet with header and footer bands, the four
 * margins dimensioned, and the invoice text inside. Pure SVG with text, so it
 * reads without CSS and is described for screen readers.
 */
export function SafeAreaDiagram() {
  return (
    <figure className="mx-auto mt-6 max-w-md">
      <svg viewBox="0 0 320 400" className="h-auto w-full" role="img" aria-labelledby="safe-area-title safe-area-desc" width="320" height="400">
        <title id="safe-area-title">Letterhead safe area</title>
        <desc id="safe-area-desc">An A4 sheet: the letterhead header at the top and footer at the bottom, side margins left and right, and the invoice text inside the dashed safe area between them.</desc>
        <rect x="40" y="16" width="240" height="340" rx="6" fill="#ffffff" stroke="#cbd5e1" />
        <rect x="40" y="16" width="240" height="62" rx="6" fill="#dbeafe" />
        <rect x="58" y="34" width="26" height="26" rx="5" fill="#2563eb" />
        <rect x="94" y="38" width="80" height="7" rx="3.5" fill="#1e3a8a" />
        <rect x="94" y="50" width="56" height="5" rx="2.5" fill="#60a5fa" />
        <rect x="40" y="316" width="240" height="40" fill="#dbeafe" />
        <rect x="58" y="330" width="120" height="5" rx="2.5" fill="#60a5fa" />
        <rect x="64" y="92" width="192" height="210" rx="3" fill="#f0fdf4" stroke="#16a34a" strokeDasharray="5 4" />
        <text x="160" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="#15803d" fontFamily="Inter, sans-serif">Safe area: the invoice goes here</text>
        {[128, 142, 156].map((y) => <rect key={y} x="76" y={y} width={y === 156 ? 90 : 150} height="5" rx="2.5" fill="#94a3b8" />)}
        <rect x="76" y="178" width="168" height="1" fill="#cbd5e1" />
        {[190, 206, 222].map((y) => <g key={y}><rect x="76" y={y} width="96" height="5" rx="2.5" fill="#cbd5e1" /><rect x="212" y={y} width="32" height="5" rx="2.5" fill="#cbd5e1" /></g>)}
        <rect x="182" y="252" width="62" height="8" rx="3" fill="#2563eb" />
        <g fill="#0f172a" fontFamily="Inter, sans-serif" fontSize="10.5" fontWeight="600">
          <path d="M20 16v76" stroke="#2563eb" strokeWidth="1.5" /><path d="M16 16h8M16 92h8" stroke="#2563eb" strokeWidth="1.5" />
          <text x="14" y="58" textAnchor="middle" transform="rotate(-90 14 58)">Top</text>
          <path d="M20 302v54" stroke="#2563eb" strokeWidth="1.5" /><path d="M16 302h8M16 356h8" stroke="#2563eb" strokeWidth="1.5" />
          <text x="14" y="330" textAnchor="middle" transform="rotate(-90 14 330)">Bottom</text>
          <path d="M40 376h24M256 376h24" stroke="#2563eb" strokeWidth="1.5" /><path d="M40 372v8M64 372v8M256 372v8M280 372v8" stroke="#2563eb" strokeWidth="1.5" />
          <text x="52" y="394" textAnchor="middle">Left</text>
          <text x="268" y="394" textAnchor="middle">Right</text>
          <text x="160" y="92" textAnchor="middle" fontSize="9" fill="#1d4ed8">▲ header ends</text>
          <text x="160" y="312" textAnchor="middle" fontSize="9" fill="#1d4ed8">▼ footer starts</text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-[13px] text-slate-500">The blue guides in the editor mark these four distances.</figcaption>
    </figure>
  )
}

export function Blocks({ blocks }) {
  return blocks.map((block, i) => {
    if (block.p) return <p key={i} className="mt-5 text-[16px] leading-8 text-slate-600"><RichText text={block.p} /></p>
    if (block.h3) return <h3 key={i} className="mt-8 font-display text-lg font-semibold text-slate-900">{block.h3}</h3>
    if (block.steps) return <Steps key={i} items={block.steps} />
    if (block.list) return <BulletList key={i} items={block.list} />
    if (block.table) return <ComparisonTable key={i} table={block.table} />
    if (block.callout) {
      return (
        <p key={i} className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[15px] leading-7 text-amber-900">
          <ToolIcon name="sparkle" className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
          <span><RichText text={block.callout} /></span>
        </p>
      )
    }
    if (block.diagram === 'safe-area') return <SafeAreaDiagram key={i} />
    return null
  })
}

/** One content section; tone "alt" alternates the background. */
export function ContentSection({ section }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-heading`} className={`scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16 lg:py-20 ${section.tone === 'alt' ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-[70ch]">
        <h2 id={`${section.id}-heading`} className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{section.heading}</h2>
        <Blocks blocks={section.blocks} />
      </div>
    </section>
  )
}

/** FAQ as native <details>: works without JS, and every answer is in the HTML. */
export function FaqSection({ heading, faqs, tone = 'white' }) {
  return (
    <section id="faq" aria-labelledby="faq-heading" className={`scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16 lg:py-20 ${tone === 'alt' ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-[70ch]">
        <h2 id="faq-heading" className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{heading}</h2>
        <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-[15px] font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
                <h3 className="text-[15px] font-semibold">{faq.question}</h3>
                <ToolIcon name="chevron" className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Tool cards: the hub grid, the homepage section and "Related Free Tools". */
export function ToolCardGrid({ paths = TOOL_CARDS.map((c) => c.path), headingLevel = 'h3', columns = 'sm:grid-cols-2 lg:grid-cols-4' }) {
  const Heading = headingLevel
  const cards = paths.map((p) => TOOL_CARDS.find((c) => c.path === p)).filter(Boolean)
  return (
    <ul className={`grid gap-5 ${columns}`}>
      {cards.map((card) => (
        <li key={card.key} className="group relative flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_28px_70px_-36px_rgba(37,99,235,0.45)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 ring-1 ring-blue-100"><ToolIcon name={card.key} className="h-6 w-6" /></span>
          <Heading className="mt-5 font-display text-lg font-semibold text-slate-950">{card.title}</Heading>
          <p className="mt-2 flex-1 text-[15px] leading-7 text-slate-600">{card.text}</p>
          <Link to={card.path} className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-full text-[15px] font-semibold text-blue-700 after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Open tool<span className="sr-only">: {card.title}</span>
            <ToolIcon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function RelatedTools({ paths }) {
  return (
    <section aria-labelledby="related-heading" className="bg-slate-50 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 id="related-heading" className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Related Free Tools</h2>
        <div className="mt-6">
          <ToolCardGrid paths={paths} columns={paths.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} />
        </div>
        <p className="mt-6 text-[15px] text-slate-600">
          <Link to={TOOLS_HUB_CONTENT.path} className={LINK_CLASS}>See all free business tools</Link>
        </p>
      </div>
    </section>
  )
}

/** The closing call to action (Nexora's paid products). */
export function CtaPanel({ cta }) {
  return (
    <section aria-labelledby="cta-heading" className="bg-white px-4 py-14 sm:px-6 sm:py-16">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0b1f3a_0%,#10306b_55%,#312e81_100%)] p-8 text-white shadow-[0_40px_100px_-50px_rgba(30,64,175,0.8)] sm:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <h2 id="cta-heading" className="relative font-display text-2xl font-bold tracking-tight sm:text-3xl">{cta.heading}</h2>
        <p className="relative mt-3 max-w-2xl text-[16px] leading-8 text-blue-100">{cta.text}</p>
        <div className="relative mt-7 flex flex-wrap gap-3">
          {cta.links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={link.primary
                ? 'inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-slate-950 shadow-sm transition hover:bg-blue-50'
                : 'inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/30 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10'}
            >
              {link.label}
              {link.primary ? <ToolIcon name="arrow" className="h-4 w-4" /> : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
