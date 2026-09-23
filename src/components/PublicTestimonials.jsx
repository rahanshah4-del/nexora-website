import { useEffect, useRef, useState } from 'react'
import Link from './AppLink.jsx'

const MAX_CARDS = 6
// Cards have a fixed height and the grid reserves room for MAX_CARDS of them at every
// breakpoint (6 rows / 3 rows / 2 rows), so swapping skeletons for real reviews never
// changes the section's height.
const GRID_CLASS = 'mt-12 grid auto-rows-[236px] gap-[16px] min-h-[1496px] sm:grid-cols-2 sm:min-h-[740px] lg:grid-cols-3 lg:min-h-[488px]'
const CARD_CLASS = 'flex h-[236px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm'

function starRating(rating) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-sm ${star <= rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className={CARD_CLASS} aria-hidden="true">
      <div className="h-5 w-24 rounded bg-slate-100" />
      <div className="mt-3 space-y-2">
        <div className="h-4 rounded bg-slate-100" />
        <div className="h-4 rounded bg-slate-100" />
        <div className="h-4 w-2/3 rounded bg-slate-100" />
      </div>
      <div className="mt-auto flex items-center gap-2.5 border-t border-slate-50 pt-3">
        <div className="h-8 w-8 rounded-full bg-slate-100" />
        <div className="h-3 w-28 rounded bg-slate-100" />
      </div>
    </div>
  )
}

export default function PublicTestimonials() {
  const sectionRef = useRef(null)
  // null = not fetched yet (skeletons shown); [] = nothing to show.
  const [reviews, setReviews] = useState(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    let observer = null
    let idleId = null
    let timeoutId = null

    // reviewStorage pulls in Firebase + Firestore, so it is only imported once the
    // section is about to be seen, keeping both off the homepage's initial load.
    const load = () => {
      import('../crm/data/reviewStorage.js')
        .then(({ loadPublicReviews }) => loadPublicReviews(12))
        .then((list) => { if (!cancelled) setReviews(Array.isArray(list) ? list : []) })
        .catch(() => { if (!cancelled) setReviews([]) })
    }

    if (typeof IntersectionObserver !== 'undefined' && sectionRef.current) {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        load()
      }, { rootMargin: '200px 0px' })
      observer.observe(sectionRef.current)
    } else if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(load, { timeout: 4000 })
    } else {
      timeoutId = window.setTimeout(load, 2500)
    }

    return () => {
      cancelled = true
      observer?.disconnect()
      if (idleId !== null) window.cancelIdleCallback?.(idleId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [])

  // With no reviews (or Firestore unreachable) the section is removed, but only while it
  // sits entirely below the viewport. Removing it while visible (measured CLS ~0.5) or
  // after the reader has scrolled past it (measured CLS ~0.7) shifts the content in view;
  // below the fold, nothing on screen moves.
  useEffect(() => {
    const node = sectionRef.current
    if (!reviews || reviews.length || !node || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) return
      observer.disconnect()
      setHidden(true)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [reviews])

  if (hidden) return null

  return (
    <section ref={sectionRef} data-reveal className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
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

        <div className={GRID_CLASS} aria-busy={reviews === null}>
          {reviews === null
            ? Array.from({ length: MAX_CARDS }, (_, i) => <SkeletonCard key={i} />)
            : !reviews.length
              ? (
                <div className="col-span-full flex items-center justify-center">
                  <Link to="/reviews" className="text-sm font-bold text-amber-700 underline-offset-4 hover:underline">Read customer reviews →</Link>
                </div>
              )
              : reviews.slice(0, MAX_CARDS).map((review) => (
              <div
                key={review.id}
                className={`group ${CARD_CLASS} transition-all duration-300 hover:border-amber-200 hover:shadow-[0_20px_50px_-20px_rgba(251,191,36,0.18)] hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between gap-2">
                  {starRating(review.rating || 5)}
                  <span className="truncate text-[11px] font-medium text-slate-400">
                    {review.workspaceName || 'Nexora Client'}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-4">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                ) : null}
                <div className="mt-auto flex items-center gap-2.5 border-t border-slate-50 pt-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white shadow-sm">
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
