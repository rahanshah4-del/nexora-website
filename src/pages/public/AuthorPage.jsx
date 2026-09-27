import Link from '../../components/AppLink.jsx'
import AuthorBox from '../../components/AuthorBox.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { AUTHOR_PAGE_PATH, author, isAuthorConfigured } from '../../config/author.js'
import usePublishedBlogArticles from '../../hooks/usePublishedBlogArticles.js'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

// /author/ — the blog's author (src/config/author.js) and their articles.
// Mirrors the prerendered page (scripts/prerender.mjs buildAuthorPage). Stays
// noindex,follow until the config holds a real name, role and bio.
export default function AuthorPage() {
  const { articles } = usePublishedBlogArticles()

  return (
    <PublicPageShell>
      <PageSeo
        title={`${author.name} — Author at Nexora Solution`}
        description={`Articles by ${author.name} on the Nexora Solution blog.`}
        canonical={absoluteUrl(AUTHOR_PAGE_PATH)}
        path={AUTHOR_PAGE_PATH}
        robots={isAuthorConfigured() ? 'index,follow' : 'noindex,follow'}
      />
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">Author</p>
          <div className="mt-4">
            <AuthorBox author={author} linkToProfile={false} as="h1" />
          </div>

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
