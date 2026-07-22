import { useState } from 'react'
import { HiOutlineStar, HiOutlineHandThumbUp, HiOutlineCheckBadge, HiOutlineShare, HiOutlineFlag } from 'react-icons/hi2'
import { markHelpful } from '../lib/reviews.js'

function Stars({ rating, size = 'md' }) {
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <HiOutlineStar key={i} className={`${sz} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </span>
  )
}

export default function ReviewCard({ review }) {
  const [helpful, setHelpful] = useState(review.helpful || 0)
  const [clicked, setClicked] = useState(false)
  const [reported, setReported] = useState(false)
  const [shared, setShared] = useState(false)

  const onHelpful = async () => {
    if (clicked) return
    setClicked(true)
    setHelpful((h) => h + 1)
    try { await markHelpful(review.id) } catch {}
  }

  const onShare = async () => {
    const text = `${review.name} reviewed Nexora: "${review.review?.slice(0, 100)}" — ${review.rating}★`
    if (navigator.share) {
      try { await navigator.share({ title: 'Nexora Review', text, url: window.location.href }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const onReport = () => setReported(true)

  const initial = (review.name || '?')[0].toUpperCase()
  const date = review.createdAt?.toDate?.() || review.createdAt || new Date()

  return (
    <div className="rounded-[1.2rem] border border-slate-200/60 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-300 hover:shadow-[0_8px_28px_-12px_rgba(15,23,42,0.1)]">
      <div className="flex items-start gap-4">
        {review.photo ? (
          <img src={review.photo} alt={review.name} className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-100" loading="lazy" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-sm font-semibold text-blue-600 ring-2 ring-slate-100">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-[#1d1d1f]">{review.name}</p>
            {review.verified && <HiOutlineCheckBadge className="h-4 w-4 shrink-0 text-blue-500" title="Verified Customer" />}
          </div>
          <p className="text-[12px] text-[#86868b]">{review.businessName && `${review.businessName} · `}{review.country || 'Pakistan'}{review.businessType && ` · ${review.businessType}`}</p>
        </div>
        <Stars rating={review.rating} />
      </div>

      {review.review && <p className="mt-3 text-[14px] leading-[1.6] text-slate-500">{review.review}</p>}

      {/* Review images */}
      {review.images?.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.images.map((img, i) => (
            <img key={i} src={img} alt={`Review ${i + 1}`} className="h-20 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
          ))}
        </div>
      )}

      {/* Video testimonial */}
      {review.videoUrl && (
        <div className="mt-3">
          <video src={review.videoUrl} controls preload="metadata" className="w-full rounded-lg" style={{ maxHeight: 200 }} />
        </div>
      )}

      {review.reply && (
        <div className="mt-3 rounded-lg bg-blue-50/60 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-blue-600">Nexora Team replied:</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-slate-500">{review.reply}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#86868b]">
        <span>{new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        <button onClick={onHelpful} className={`flex items-center gap-1 transition-colors ${clicked ? 'text-blue-500' : 'hover:text-slate-500'}`}>
          <HiOutlineHandThumbUp className="h-3.5 w-3.5" /> Helpful ({helpful})
        </button>
        <button onClick={onShare} className={`flex items-center gap-1 transition-colors ${shared ? 'text-emerald-500' : 'hover:text-slate-500'}`}>
          <HiOutlineShare className="h-3.5 w-3.5" /> {shared ? 'Copied!' : 'Share'}
        </button>
        {!reported ? (
          <button onClick={onReport} className="flex items-center gap-1 transition-colors hover:text-rose-500">
            <HiOutlineFlag className="h-3.5 w-3.5" /> Report
          </button>
        ) : (
          <span className="text-rose-500 text-[11px]">Reported — Thank you</span>
        )}
      </div>
    </div>
  )
}

export { Stars }
