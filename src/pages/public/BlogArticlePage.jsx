import { Link, Navigate, useParams } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineShare,
  HiOutlineTag,
  HiOutlineUserCircle,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import { getBlogArticle } from '../../lib/blogData.js'
import usePublishedBlogArticles from '../../hooks/usePublishedBlogArticles.js'
import { absoluteUrl, createArticleSchema } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

function shareLinks(article) {
  const url = encodeURIComponent(article.canonical)
  const text = encodeURIComponent(article.title)
  return [
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${url}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${url}`],
    ['X', `https://twitter.com/intent/tweet?url=${url}&text=${text}`],
    ['WhatsApp', `https://wa.me/?text=${text}%20${url}`],
  ]
}

function ShareButton({ label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Share on ${label}`}
      className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:scale-[0.96]"
    >
      <span>{label}</span>
    </a>
  )
}

function ArticleCard({ article, label }) {
  if (!article) return null
  return (
    <Link to={`/blog/${article.slug}`} className="block rounded-[1.25rem] border border-blue-100 bg-white p-5 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)] transition hover:border-blue-200 active:scale-[0.98]">
      {label ? <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{label}</p> : null}
      <p className="mt-2 text-lg font-black text-slate-950">{article.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{article.excerpt}</p>
    </Link>
  )
}

export default function BlogArticlePage() {
  const { slug } = useParams()
  const { articles, loading } = usePublishedBlogArticles()
  const article = articles.find((item) => item.slug === slug) || getBlogArticle(slug)

  if (!article && loading) {
    return (
      <PublicPageShell>
        <section className="grid min-h-[50vh] place-items-center bg-white px-5">
          <p className="text-sm font-black text-slate-500">Loading article...</p>
        </section>
      </PublicPageShell>
    )
  }

  if (!article) return <Navigate to="/blog" replace />

  const articleIndex = articles.findIndex((item) => item.slug === article.slug)
  const adjacent = {
    previous: articleIndex > 0 ? articles[articleIndex - 1] : null,
    next: articleIndex >= 0 && articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null,
  }
  const relatedArticles = articles
    .filter((item) => item.slug !== article.slug)
    .map((item) => ({
      item,
      score: (item.category === article.category ? 3 : 0) + item.tags.filter((tag) => article.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || String(b.publishDate || '').localeCompare(String(a.publishDate || '')))
    .slice(0, 3)
    .map(({ item }) => item)
  const articleSchema = createArticleSchema({
    path: article.path,
    headline: article.title,
    description: article.metaDescription,
    image: article.featuredImage,
    authorName: article.author.name,
    authorUrl: article.author.url,
    datePublished: article.publishDate,
    dateModified: article.updatedDate,
    category: article.category,
    tags: article.tags,
    wordCount: article.wordCount,
  })

  return (
    <PublicPageShell>
      <PageSeo
        title={article.seoTitle}
        description={article.metaDescription}
        canonical={article.canonical}
        path={article.path}
        ogTitle={article.title}
        ogDescription={article.metaDescription}
        ogImage={absoluteUrl(article.featuredImage)}
        twitterCard="summary_large_image"
        faqItems={article.faqs}
        structuredData={[articleSchema]}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/blog">Blog</Link>
        <span> / </span>
        <span aria-current="page">{article.title}</span>
      </nav>

      <article>
        <header className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-12 pt-12 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
          <div className="soft-arc-bg pointer-events-none" />
          <div className="relative mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <Link to="/blog" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.97]">
              <HiOutlineArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-black text-blue-700">
              <Link to={`/blog?category=${encodeURIComponent(article.category)}`} className="rounded-full bg-blue-50 px-3 py-1 transition active:scale-[0.96]">
                {article.category}
              </Link>
              <span className="text-slate-400">{article.readingTime}</span>
              <span className="text-slate-400">{article.wordCount.toLocaleString('en-PK')} words</span>
            </div>
            <h1 className="website-hero-heading mt-5 text-[2.55rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4rem] lg:text-[5rem]">
              {article.title}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{article.excerpt}</p>
            <div className="mt-7 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-3">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <HiOutlineUserCircle className="h-5 w-5 text-blue-700" />
                {article.author.name}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <HiOutlineCalendarDays className="h-5 w-5 text-blue-700" />
                Published {article.publishDate}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <HiOutlineClock className="h-5 w-5 text-blue-700" />
                Updated {article.updatedDate}
              </span>
            </div>
          </div>
        </header>

        <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[18rem_1fr] lg:px-8">
            <aside className="h-max rounded-[1.35rem] border border-blue-100 bg-white p-5 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)] lg:sticky lg:top-24">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Table of Contents</p>
              <div className="mt-4 grid max-h-52 gap-2 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
                {article.sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]">
                    {section.heading}
                  </a>
                ))}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <HiOutlineShare className="h-4 w-4" />
                  Share
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {shareLinks(article).map(([label, href]) => (
                    <ShareButton key={label} label={label} href={href} />
                  ))}
                </div>
              </div>
            </aside>

            <div>
              <div className="grid max-h-[260px] place-items-center overflow-hidden rounded-[1.35rem] border border-blue-100 bg-slate-50 shadow-[0_28px_76px_-52px_rgba(37,99,235,0.42)] sm:rounded-[1.6rem] md:max-h-[420px] lg:max-h-[520px]">
                <img
                  src={article.featuredImage}
                  alt={article.featuredImageAlt}
                  width="1200"
                  height="675"
                  decoding="async"
                  className="max-h-[260px] w-full object-contain object-center md:max-h-[420px] lg:max-h-[520px]"
                />
              </div>

              <div className="mt-10 rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_22px_62px_-48px_rgba(15,23,42,0.26)] sm:p-8">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Key takeaways</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {['Keep one shared workspace', 'Use role-based permissions', 'Review reports before scaling'].map((item) => (
                    <div key={item} className="rounded-[1.1rem] bg-slate-50 p-4">
                      <h3 className="text-sm font-black text-slate-950">{item}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-600">A simple operating rule that keeps the article practical for owners and teams.</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="prose prose-slate mt-10 max-w-none">
                {article.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-28">
                    <h2 className="mt-10 text-3xl font-black tracking-tight text-slate-950">{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mt-5 text-base leading-8 text-slate-600">
                        {paragraph}
                      </p>
                    ))}
                  </section>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-2">
                {article.tags.map((item) => (
                  <Link key={item} to={`/blog?tag=${encodeURIComponent(item)}`} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 active:scale-[0.96]">
                    <HiOutlineTag className="h-3.5 w-3.5" />
                    {item}
                  </Link>
                ))}
              </div>

              <section className="mt-14 rounded-[1.8rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 sm:p-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-950">Frequently asked questions</h2>
                <div className="mt-6 grid gap-4">
                  {article.faqs.map(([question, answer]) => (
                    <div key={question} className="rounded-[1.2rem] bg-white p-5 shadow-sm">
                      <h3 className="text-base font-black text-slate-950">{question}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-14 grid gap-4 md:grid-cols-2">
                <ArticleCard article={adjacent.previous} label="Previous Article" />
                <ArticleCard article={adjacent.next} label="Next Article" />
              </section>

              <section className="mt-14">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                      Related Articles
                    </span>
                    <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                      Keep reading
                    </h2>
                  </div>
                  <Link to="/blog" className="premium-button-secondary w-max transition active:scale-[0.97]">
                    View Blog
                    <HiOutlineArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {relatedArticles.map((item) => (
                    <ArticleCard key={item.slug} article={item} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </article>
    </PublicPageShell>
  )
}
