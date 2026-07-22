import { useEffect, useMemo, useState } from 'react'
import { HiOutlineMagnifyingGlass, HiOutlineStar, HiOutlineFunnel } from 'react-icons/hi2'
import ReviewCard from './ReviewCard.jsx'
import ReviewForm from './ReviewForm.jsx'
import { getPublishedReviews, getReviewStats } from '../lib/reviews.js'

const fallbackReviews = [
  { id: 'fb1', name: 'Ahmed Khan', businessName: 'Al-Haram Restaurant', country: 'Pakistan', rating: 5, review: 'Nexora Restaurant POS transformed our operations. Table management and KOT system saved us hours daily.', verified: true, helpful: 24, businessType: 'Restaurant', images: [], createdAt: new Date('2026-06-15') },
  { id: 'fb2', name: 'Fatima Shah', businessName: 'Bright Future School', country: 'Pakistan', rating: 5, review: 'School ERP made fee collection and attendance tracking effortless. Parents love the portal.', verified: true, helpful: 18, businessType: 'Education', images: [], createdAt: new Date('2026-06-10') },
  { id: 'fb3', name: 'Usman Ali', businessName: 'MediCare Pharmacy', country: 'Pakistan', rating: 4, review: 'Medical Store POS with batch tracking and expiry alerts is exactly what we needed. Great support team.', verified: true, helpful: 12, businessType: 'Healthcare', images: [], createdAt: new Date('2026-05-28') },
  { id: 'fb4', name: 'Zainab Noor', businessName: 'Karachi Transport', country: 'Pakistan', rating: 5, review: 'Fleet management and booking system streamlined our entire operation. From 4 hours of paperwork to 30 minutes.', verified: true, helpful: 8, businessType: 'Transport', images: [], createdAt: new Date('2026-05-20') },
  { id: 'fb5', name: 'Bilal Mahmood', businessName: 'StyleMart Retail', country: 'Pakistan', rating: 4, review: 'Retail POS with barcode scanning and inventory management made our store 3x faster at checkout.', verified: false, helpful: 15, businessType: 'Retail', images: [], createdAt: new Date('2026-06-01') },
  { id: 'fb6', name: 'Sana Tariq', businessName: 'Greenfield Properties', country: 'Pakistan', rating: 5, review: 'Property ERP helped us manage 200+ tenants effortlessly. Rent collection automated!', verified: true, helpful: 21, businessType: 'Real Estate', images: [], createdAt: new Date('2026-05-15') },
]

const PAGE_SIZE = 6

export default function ReviewsSection() {
  const [reviews, setReviews] = useState(fallbackReviews)
  const [stats, setStats] = useState({ average: 4.7, total: 6, distribution: { 5: 4, 4: 2, 3: 0, 2: 0, 1: 0 } })
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('newest')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getPublishedReviews({ limit: 50 }), getReviewStats()])
      .then(([r, s]) => {
        if (cancelled) return
        const revs = r.length ? r.map((rev) => ({ ...rev, createdAt: rev.createdAt?.toDate?.() || new Date() })) : fallbackReviews
        setReviews(revs)
        if (s.total) {
          const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          revs.forEach((rev) => { if (dist[rev.rating] !== undefined) dist[rev.rating]++ })
          setStats({ ...s, distribution: dist })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const businessTypes = useMemo(() => [...new Set(reviews.map((r) => r.businessType).filter(Boolean))], [reviews])

  const filtered = useMemo(() => {
    let list = [...reviews]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.name?.toLowerCase().includes(q) || r.review?.toLowerCase().includes(q) || r.businessName?.toLowerCase().includes(q))
    }
    switch (filter) {
      case 'highest': list.sort((a, b) => b.rating - a.rating); break
      case 'verified': list = list.filter((r) => r.verified); break
      default: list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break
    }
    return list
  }, [reviews, filter, search])

  const paged = filtered.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = paged.length < filtered.length

  const maxDist = Math.max(...Object.values(stats.distribution), 1)

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            <HiOutlineStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Customer Reviews
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-3xl">
            Trusted by businesses across Pakistan
          </h2>
        </div>

        {/* Stats + Distribution */}
        <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr]">
          <div className="text-center">
            <p className="text-4xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">{stats.average}</p>
            <div className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <HiOutlineStar key={i} className={`h-4 w-4 ${i <= Math.round(stats.average) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
            <p className="mt-1 text-[13px] text-[#86868b]">{stats.total} reviews</p>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 text-right text-[12px] font-medium text-slate-500">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${(stats.distribution[star] / maxDist) * 100}%` }} />
                </div>
                <span className="w-6 text-[11px] text-slate-400">{stats.distribution[star]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xs">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search reviews..."
              className="h-10 w-full rounded-full border border-slate-200/60 bg-slate-50 pl-9 pr-4 text-[13px] font-medium text-[#1d1d1f] outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
          </div>
          <div className="flex gap-1.5">
            {[
              { key: 'newest', label: 'Newest' },
              { key: 'highest', label: 'Highest Rated' },
              { key: 'verified', label: 'Verified' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setPage(0) }}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                  filter === key ? 'bg-[#1d1d1f] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
            {businessTypes.length > 0 && (
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setPage(0) }}
                className="rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1.5 text-[12px] font-medium text-slate-500 outline-none"
              >
                <option value="newest">All Types</option>
                {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Review cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {paged.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white px-6 py-2.5 text-[14px] font-medium text-[#1d1d1f] shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.97]">
              Load More Reviews ({filtered.length - paged.length} remaining)
            </button>
          </div>
        )}

        {/* Write review CTA */}
        <div className="mt-10 text-center">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3] px-6 py-3 text-[14px] font-medium text-white shadow-[0_4px_16px_-6px_rgba(0,113,227,0.3)] transition-all duration-200 hover:shadow-[0_8px_24px_-8px_rgba(0,113,227,0.4)] active:scale-[0.97]">
              <HiOutlineStar className="h-4 w-4" />
              Write a Review
            </button>
          ) : (
            <div className="mx-auto max-w-lg text-left">
              <ReviewForm onSubmitted={() => setShowForm(false)} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
