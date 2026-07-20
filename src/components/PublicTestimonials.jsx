import { useEffect, useState } from 'react'
import { loadPublicReviews } from '../crm/data/reviewStorage.js'

function starRating(rating) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-sm ${star <= rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
    </span>
  )
}

export default function PublicTestimonials() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    loadPublicReviews(12).then(setReviews).catch(() => setReviews([]))
  }, [])

  if (!reviews.length) return null

  return (
    <section data-reveal className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur">
            Client Reviews
          </span>
          <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Loved by <span className="marker-highlight">businesses</span> across Pakistan.
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-base leading-7 text-slate-500">
            Real feedback from Nexora users who manage their restaurants, retail stores, schools and businesses with our platform.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <div
              key={review.id}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-amber-200 hover:shadow-[0_20px_50px_-20px_rgba(251,191,36,0.18)] hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                {starRating(review.rating || 5)}
                <span className="text-[11px] font-medium text-slate-400">
                  {review.workspaceName || 'Nexora Client'}
                </span>
              </div>
              {review.comment ? (
                <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-4">
                  &ldquo;{review.comment}&rdquo;
                </p>
              ) : null}
              <div className="mt-3 flex items-center gap-2.5 border-t border-slate-50 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white shadow-sm">
                  {(review.userName || 'N')[0].toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{review.userName || 'Nexora User'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{review.module || 'Nexora'} user</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
