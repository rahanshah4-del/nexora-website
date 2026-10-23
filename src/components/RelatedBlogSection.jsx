import Link from './AppLink.jsx'
import {
  HiOutlineAcademicCap, HiOutlineArrowRight, HiOutlineBanknotes, HiOutlineBeaker, HiOutlineChatBubbleLeftRight,
  HiOutlineCpuChip, HiOutlineShoppingBag, HiOutlineSparkles, HiOutlineTruck, HiOutlineUserGroup,
} from 'react-icons/hi2'
import { GiForkKnifeSpoon } from 'react-icons/gi'
import { pickBlogPosts } from '../lib/relatedBlog.js'

// One calm gradient + glyph per category: the "poster" for every post.
const POSTER = {
  'Restaurant POS': { from: '#f97316', to: '#be123c', Icon: GiForkKnifeSpoon },
  'Retail POS': { from: '#2563eb', to: '#4f46e5', Icon: HiOutlineShoppingBag },
  'Pharmacy POS': { from: '#059669', to: '#0d9488', Icon: HiOutlineBeaker },
  'School ERP': { from: '#7c3aed', to: '#c026d3', Icon: HiOutlineAcademicCap },
  'Transport Software': { from: '#0891b2', to: '#2563eb', Icon: HiOutlineTruck },
  CRM: { from: '#4f46e5', to: '#7c3aed', Icon: HiOutlineUserGroup },
  'WhatsApp CRM': { from: '#16a34a', to: '#15803d', Icon: HiOutlineChatBubbleLeftRight },
  'Business Tips': { from: '#334155', to: '#0f172a', Icon: HiOutlineBanknotes },
  AI: { from: '#6366f1', to: '#0ea5e9', Icon: HiOutlineSparkles },
  Technology: { from: '#0f172a', to: '#1d4ed8', Icon: HiOutlineCpuChip },
}
const FALLBACK = POSTER['Business Tips']

function Poster({ article, large }) {
  const p = POSTER[article.category] || FALLBACK
  const Icon = p.Icon
  return (
    <Link
      to={article.path}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_70px_-26px_rgba(15,23,42,0.6)] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 sm:p-7 ${large ? 'min-h-[22rem] md:col-span-2 md:min-h-[26rem]' : 'min-h-[22rem] md:min-h-[26rem]'}`}
      style={{ background: `linear-gradient(145deg, ${p.from} 0%, ${p.to} 100%)` }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl transition duration-500 group-hover:scale-125" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-black/20 blur-3xl" />
      <Icon aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-4 h-44 w-44 text-white/15 transition duration-500 group-hover:rotate-6 group-hover:scale-110 sm:h-52 sm:w-52" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md">
          <Icon aria-hidden="true" className="h-3.5 w-3.5" /> {article.category}
        </span>
      </div>
      <div className="relative">
        <h3 className={`font-display font-bold leading-[1.12] tracking-tight ${large ? 'text-[1.7rem] sm:text-[2.1rem] md:max-w-[85%]' : 'text-[1.4rem] sm:text-[1.55rem]'}`}>{article.title}</h3>
        <p className="mt-3 line-clamp-2 text-[14.5px] leading-6 text-white/80">{article.excerpt}</p>
        <div className="mt-5 flex items-center justify-between text-[13px] font-medium text-white/85">
          <span>{article.readingTime}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-slate-900 transition group-hover:gap-2.5">
            Read <HiOutlineArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/**
 * "From the Nexora blog": the latest posts for a module or tool, shown as
 * poster cards at the bottom of its landing page. `topics` are blog categories.
 */
export default function RelatedBlogSection({ topics = [], heading = 'From the Nexora blog', intro, limit = 3 }) {
  const posts = pickBlogPosts(topics, limit)
  if (!posts.length) return null
  return (
    <section aria-labelledby="related-blog-heading" className="bg-[linear-gradient(180deg,#ffffff_0%,#f5f5f7_100%)] px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="related-blog-heading" className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.6rem]">{heading}</h2>
            {intro ? <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">{intro}</p> : null}
          </div>
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue-600 hover:text-blue-700">
            View all articles <HiOutlineArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-4">
          {posts.map((post, i) => <Poster key={post.slug} article={post} large={i === 0 && posts.length >= 3} />)}
        </div>
      </div>
    </section>
  )
}
