import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { blogArticles } from '../../lib/blogData.js'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'

const sitemapGroups = [
  {
    title: 'Main Pages',
    links: [
      ['Home', '/'],
      ['About', '/about'],
      ['Contact', '/contact'],
      ['Pricing', '/pricing'],
      ['Software Development', '/software-development'],
      ['Help Center', '/help-center'],
      ['Documentation', '/documentation'],
      ['Projects', '/projects'],
      ['Blog', '/blog'],
    ],
  },
  {
    title: 'Software Solutions',
    links: [
      ['Restaurant POS', '/restaurant-pos'],
      ['Retail POS', '/retail-pos'],
      ['School ERP', '/school-erp'],
      ['Transport Software', '/transport'],
      ['WhatsApp CRM', '/whatsapp-crm'],
      ['CRM Software', '/solutions/crm'],
    ],
  },
  {
    title: 'Trust & Legal',
    links: [
      ['Privacy Policy', '/privacy-policy'],
      ['Terms of Service', '/terms'],
      ['Refund Policy', '/refund-policy'],
      ['XML Sitemap', '/sitemap.xml'],
      ['Blog Sitemap', '/blog-sitemap.xml'],
      ['RSS Feed', '/rss.xml'],
    ],
  },
]

export default function HtmlSitemapPage() {
  const seo = getSeoForPath('/sitemap')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Sitemap</span>
      </nav>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              HTML Sitemap
            </span>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Find every public Nexora page.</h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Browse Nexora Solution pages, software products, blog guides, trust pages and SEO feeds from one place.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {sitemapGroups.map((group) => (
              <section key={group.title} className="rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)]">
                <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{group.title}</h2>
                <div className="mt-4 grid gap-2.5">
                  {group.links.map(([label, to]) =>
                    to.startsWith('/sitemap') || to.startsWith('/blog-sitemap') || to.startsWith('/rss') ? (
                      <a key={label} href={to} className="text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900">
                        {label}
                      </a>
                    ) : (
                      <Link key={label} to={to} className="text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900">
                        {label}
                      </Link>
                    )
                  )}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)]">
            <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">Latest Blog Articles</h2>
            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              {blogArticles.map((article) => (
                <Link key={article.slug} to={`/blog/${article.slug}`} className="text-[13px] font-medium leading-6 text-slate-500 transition-colors hover:text-slate-900">
                  {article.title}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </PublicPageShell>
  )
}
