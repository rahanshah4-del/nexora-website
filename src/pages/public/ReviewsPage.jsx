import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'
import { lazy, Suspense } from 'react'
import { HiOutlineStar } from 'react-icons/hi2'

const ReviewsSection = lazy(() => import('../../components/ReviewsSection.jsx'))

export default function ReviewsPage() {
  return (
    <PublicPageShell>
      <PageSeo
        title="Customer Reviews | Nexora Solution Pakistan"
        description="Read verified customer reviews and testimonials for Nexora POS, ERP, CRM and business software in Pakistan."
        canonical={absoluteUrl('/reviews')}
        path="/reviews"
        ogTitle="Nexora Customer Reviews"
        ogDescription="See what Pakistani businesses say about Nexora software."
        twitterCard="summary_large_image"
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-8 pt-20 sm:pt-24 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            <HiOutlineStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Customer Reviews
          </span>
          <h1 className="mt-6 text-[2.4rem] font-semibold leading-[1.06] tracking-[-0.02em] text-[#1d1d1f] sm:text-[3.2rem]">
            Trusted by businesses{' '}
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              across Pakistan.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
            Read authentic reviews from restaurant owners, retailers, educators, healthcare providers and transport operators using Nexora daily.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="bg-white py-20 text-center text-slate-400">Loading reviews...</div>}>
        <ReviewsSection />
      </Suspense>
    </PublicPageShell>
  )
}
