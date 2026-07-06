import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { blogArticles } from '../../lib/blogData.js'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const sitemapGroups = [
  {
    title: 'Main Pages',
    links: [
      ['Home', '/'],
      ['About', '/about'],
      ['Contact', '/contact'],
      ['Pricing', '/pricing'],
      ['Business Services', '/services'],
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
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">HTML Sitemap</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Find every public Nexora page.</h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              Browse Nexora Solution pages, software products, blog guides, trust pages and SEO feeds from one place.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {sitemapGroups.map((group) => (
              <section key={group.title} className="rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)]">
                <h2 className="text-xl font-black text-slate-950">{group.title}</h2>
                <div className="mt-5 grid gap-3">
                  {group.links.map(([label, to]) => (
                    to.startsWith('/sitemap') || to.startsWith('/blog-sitemap') || to.startsWith('/rss')
                      ? <a key={label} href={to} className="text-sm font-bold text-blue-700 hover:text-blue-900">{label}</a>
                      : <Link key={label} to={to} className="text-sm font-bold text-blue-700 hover:text-blue-900">{label}</Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)]">
            <h2 className="text-xl font-black text-slate-950">Latest Blog Articles</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {blogArticles.map((article) => (
                <Link key={article.slug} to={`/blog/${article.slug}`} className="text-sm font-bold leading-6 text-blue-700 hover:text-blue-900">
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
