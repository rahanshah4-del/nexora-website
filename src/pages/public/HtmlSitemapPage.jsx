import { useMemo, useState } from 'react'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { blogArticles } from '../../lib/blogData.js'
import { RETIRED_POST_SLUGS } from '../../config/retiredPosts.js'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { FOOTER_REGIONS } from '../../lib/footerRegions.js'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineHome,
  HiOutlineCube,
  HiOutlineWrenchScrewdriver,
  HiOutlineBriefcase,
  HiOutlineGlobeAlt,
  HiOutlineNewspaper,
  HiOutlineShieldCheck,
  HiOutlineArrowUpRight,
  HiOutlineXMark,
} from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import { hasCustomerReviews } from '../../lib/buildData.js'
import { toolsFooterGroup } from '../../lib/toolsLaunch.js'

// "Free Tools" group: null until the tools launch (src/lib/toolsLaunch.js).
const toolsGroup = toolsFooterGroup()

// Every page stays in the server-rendered HTML (the search only hides rows with
// the `hidden` attribute), so crawlers see all links whatever the visitor types.
const sitemapGroups = [
  {
    id: 'main',
    title: 'Main pages',
    blurb: 'Start here.',
    icon: HiOutlineHome,
    tint: 'from-sky-500 to-blue-600',
    links: [
      ['Home', '/'],
      ['About', '/about'],
      ['Contact', '/contact'],
      ['Pricing', '/pricing'],
      ['Software Development', '/software-development'],
      ['Help Center', '/help-center'],
      ['Projects', '/projects'],
      ['Blog', '/blog'],
      ['AI', '/ai'],
      ...(hasCustomerReviews() ? [['Reviews', '/reviews']] : []),
      ['FAQ', '/faq'],
      ['Industries', '/industries'],
      ['Download Restaurant POS', '/download/restaurant-pos'],
    ],
  },
  {
    id: 'solutions',
    title: 'Software solutions',
    blurb: 'POS, ERP and CRM for every counter.',
    icon: HiOutlineCube,
    tint: 'from-violet-500 to-fuchsia-600',
    links: [
      ['Restaurant POS', '/restaurant-pos'],
      ['Retail POS', '/retail-pos'],
      ['School ERP', '/school-erp'],
      ['Fleet Management', '/transport-fleet'],
      ['WhatsApp CRM', '/whatsapp-crm'],
      ['CRM Software', '/crm'],
      ['Property ERP', '/property-erp'],
      ['Pharmacy POS', '/pharmacy-pos'],
      ['Business Reports', '/solutions/reports'],
      ['Email Marketing', '/solutions/email-marketing'],
      ['Inventory Management', '/solutions/inventory-management'],
      ['Team & Permissions', '/solutions/team-permissions'],
      ['Reports & Analytics', '/solutions/reports-analytics'],
    ],
  },
  ...(toolsGroup
    ? [{
        id: 'tools',
        title: toolsGroup.heading,
        blurb: 'No signup, no watermark.',
        icon: HiOutlineWrenchScrewdriver,
        tint: 'from-emerald-500 to-teal-600',
        links: toolsGroup.links,
      }]
    : []),
  {
    id: 'services',
    title: 'Business services',
    blurb: 'Built by our team, for your business.',
    icon: HiOutlineBriefcase,
    tint: 'from-amber-500 to-orange-600',
    links: [
      ['SEO Services', '/seo-services'],
      ['Mobile App Development', '/mobile-app-development'],
      ['Ecommerce Development', '/ecommerce-development'],
      ['CRM Development', '/crm-development'],
      ['ERP Development', '/erp-development'],
      ['Cloud Solutions', '/cloud-solutions'],
      ['API Integration', '/api-integration'],
    ],
  },
  {
    id: 'legal',
    title: 'Trust & legal',
    blurb: 'Policies and feeds.',
    icon: HiOutlineShieldCheck,
    tint: 'from-slate-500 to-slate-700',
    links: [
      ['Privacy Policy', '/privacy-policy'],
      ['Terms of Service', '/terms'],
      ['Refund Policy', '/refund-policy'],
      ['Cookie Policy', '/cookie-policy'],
      ['XML Sitemap', '/sitemap.xml'],
      ['RSS Feed', '/rss.xml'],
    ],
  },
]

const isPlainHref = (to) => to.startsWith('/sitemap') || to.startsWith('/blog-sitemap') || to.startsWith('/rss')

const articles = blogArticles.filter((article) => !RETIRED_POST_SLUGS.has(article.slug))

const NAV = [
  ...sitemapGroups.slice(0, sitemapGroups.findIndex((g) => g.id === 'legal')).map((g) => [g.id, g.title]),
  ['countries', 'Countries'],
  ['blog', 'Blog'],
  ['legal', 'Legal'],
]

const sectionTitle = 'text-[28px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[34px]'

function PageLink({ to, children }) {
  const cls = 'group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100/80 hover:text-slate-900'
  const arrow = <HiOutlineArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500" aria-hidden="true" />
  return isPlainHref(to) ? (
    <a href={to} className={cls}><span>{children}</span>{arrow}</a>
  ) : (
    <Link to={to} className={cls}><span>{children}</span>{arrow}</Link>
  )
}

export default function HtmlSitemapPage() {
  const seo = getSeoForPath('/sitemap')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const match = (label) => !q || label.toLowerCase().includes(q)

  const total = useMemo(
    () => sitemapGroups.reduce((n, g) => n + g.links.length, 0)
      + FOOTER_REGIONS.reduce((n, r) => n + r.links.length, 0)
      + articles.length,
    [],
  )

  // How many rows match, per section, so empty sections can fold away.
  const counts = {}
  sitemapGroups.forEach((g) => { counts[g.id] = g.links.filter(([label]) => match(label)).length })
  counts.countries = FOOTER_REGIONS.reduce((n, r) => n + r.links.filter((l) => match(l.label)).length, 0)
  counts.blog = articles.filter((a) => match(a.title)).length
  const shown = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Sitemap</span>
      </nav>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.10),transparent_70%)]" />

        <header className="relative mx-auto max-w-4xl px-5 pb-10 pt-16 text-center sm:px-6 sm:pb-14 sm:pt-24">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sitemap</p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-slate-900 sm:text-6xl">
            Everything on Nexora,
            <span className="block bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">in one place.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-7 text-slate-500 sm:text-lg sm:leading-8">
            {total} pages across our products, free tools, services, countries and guides. Search, or jump to a section.
          </p>

          <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mx-auto mt-9 max-w-xl">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, tools, countries"
              aria-label="Search the sitemap"
              className="h-14 w-full rounded-full border border-slate-200/80 bg-white/90 pl-14 pr-12 text-[16px] text-slate-900 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] outline-none backdrop-blur-xl transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200/80 text-slate-600 transition hover:bg-slate-300">
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            ) : null}
          </form>
          {q ? <p className="mt-4 text-sm text-slate-500" role="status">{shown} {shown === 1 ? 'page matches' : 'pages match'} “{query.trim()}”</p> : null}
        </header>

        <nav aria-label="Sitemap sections" className="sticky top-14 z-20 border-y border-slate-200/60 bg-white/80 backdrop-blur-xl" style={{ WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}>
          <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3 sm:justify-center sm:px-6 [scrollbar-width:none]">
            {NAV.map(([id, label]) => (
              <li key={id} className="shrink-0">
                <a href={`#${id}`} className="inline-flex rounded-full px-4 py-1.5 text-[13.5px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="relative mx-auto max-w-6xl space-y-20 px-5 py-14 sm:px-6 sm:py-20">
          {q && shown === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center text-slate-500">
              Nothing matches “{query.trim()}”. Try a product, tool or country name.
            </p>
          ) : null}

          {sitemapGroups.filter((g) => g.id !== 'legal').map((group) => {
            const Icon = group.icon
            return (
              <section key={group.id} id={group.id} hidden={counts[group.id] === 0} className="scroll-mt-32">
                <div className="flex items-center gap-4">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${group.tint} text-white shadow-lg shadow-slate-900/10`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className={sectionTitle}>{group.title}</h2>
                    <p className="mt-1 text-[15px] text-slate-500">{group.blurb}</p>
                  </div>
                </div>
                <ul className="mt-7 grid gap-x-3 gap-y-1 rounded-[28px] border border-slate-200/70 bg-white p-3 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)] sm:grid-cols-2 lg:grid-cols-3">
                  {group.links.map(([label, to]) => (
                    <li key={label} hidden={!match(label)}><PageLink to={to}>{label}</PageLink></li>
                  ))}
                </ul>
              </section>
            )
          })}

          <section id="countries" hidden={counts.countries === 0} className="scroll-mt-32">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-slate-900/10">
                <HiOutlineGlobeAlt className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className={sectionTitle}>Countries we serve</h2>
                <p className="mt-1 text-[15px] text-slate-500">Based in Multan, working with clients worldwide.</p>
              </div>
            </div>
            <div className="mt-7 grid gap-x-10 gap-y-8 rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)] sm:p-8 md:grid-cols-2 lg:grid-cols-3">
              {FOOTER_REGIONS.map((region) => (
                <div key={region.heading} hidden={!region.links.some((l) => match(l.label))}>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">{region.heading}</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {region.links.map((l) => (
                      <li key={l.to} hidden={!match(l.label)}>
                        <Link to={l.to} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[14px] font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md">
                          <span aria-hidden="true">{l.icon}</span>{l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="blog" hidden={counts.blog === 0} className="scroll-mt-32">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-lg shadow-slate-900/10">
                <HiOutlineNewspaper className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className={sectionTitle}>Guides &amp; articles</h2>
                <p className="mt-1 text-[15px] text-slate-500">{articles.length} articles on POS, ERP, CRM and AI.</p>
              </div>
            </div>
            <ul className="mt-7 grid gap-x-3 gap-y-1 rounded-[28px] border border-slate-200/70 bg-white p-3 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)] md:grid-cols-2">
              {articles.map((article) => (
                <li key={article.slug} hidden={!match(article.title)}>
                  <PageLink to={`/blog/${article.slug}`}>{article.title}</PageLink>
                </li>
              ))}
            </ul>
          </section>

          {(() => {
            const group = sitemapGroups.find((g) => g.id === 'legal')
            const Icon = group.icon
            return (
              <section id="legal" hidden={counts.legal === 0} className="scroll-mt-32">
                <div className="flex items-center gap-4">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${group.tint} text-white shadow-lg shadow-slate-900/10`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className={sectionTitle}>{group.title}</h2>
                    <p className="mt-1 text-[15px] text-slate-500">{group.blurb}</p>
                  </div>
                </div>
                <ul className="mt-7 grid gap-x-3 gap-y-1 rounded-[28px] border border-slate-200/70 bg-white p-3 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)] sm:grid-cols-2 lg:grid-cols-3">
                  {group.links.map(([label, to]) => (
                    <li key={label} hidden={!match(label)}><PageLink to={to}>{label}</PageLink></li>
                  ))}
                </ul>
              </section>
            )
          })()}
        </div>
      </div>
    </PublicPageShell>
  )
}
