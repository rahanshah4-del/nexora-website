import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import usePublishedBlogArticles from '../../hooks/usePublishedBlogArticles.js'
import { blogAuthor } from '../../lib/blogData.js'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

// Mirrors the prerendered /author/nexora/ page (scripts/prerender.mjs
// buildAuthorPage), which previously had no route here and rendered the 404
// page once the app booted. noindex,follow until the page has a real author
// bio: it lists articles but says little of its own.
const EXPERTISE = [
  'Restaurant POS & KOT Systems',
  'Retail & Inventory Management',
  'School ERP & Fee Management',
  'CRM & WhatsApp CRM',
  'Transport & Fleet Software',
  'Pharmacy & PharmaFlow',
  'AI & Business Automation',
  'Cloud Security & Data Protection',
]

export default function AuthorPage() {
  const { articles } = usePublishedBlogArticles()

  return (
    <PublicPageShell>
      <PageSeo
        title="Nexora Solution Editorial Team — Authors"
        description="Meet the Nexora Solution editorial team, who write guides on POS, ERP and CRM software for Pakistani businesses."
        canonical={absoluteUrl('/author/nexora/')}
        path="/author/nexora/"
        robots="noindex,follow"
      />
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">Author</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">{blogAuthor.name}</h1>
          <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
            Nexora Solution makes POS, ERP and CRM software for restaurants, retail stores, schools, pharmacies and transport businesses. Our editorial team covers practical guides, best practices and industry insights for restaurants, retail stores, schools, pharmacies, transport companies and service businesses.
          </p>

          <h2 className="mt-12 text-xl font-medium text-slate-900">Expertise</h2>
          <ul className="mt-4 grid gap-2 text-[15px] text-slate-600 sm:grid-cols-2">
            {EXPERTISE.map((item) => <li key={item}>{item}</li>)}
          </ul>

          <h2 className="mt-12 text-xl font-medium text-slate-900">Published articles</h2>
          <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
            {articles.map((article) => (
              <li key={article.slug} className="py-3">
                <Link to={`/blog/${article.slug}/`} className="text-[15px] font-medium text-slate-900 hover:text-blue-700">{article.title}</Link>
                {article.publishDate ? <span className="ml-2 text-xs text-slate-400">{article.publishDate}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PublicPageShell>
  )
}
