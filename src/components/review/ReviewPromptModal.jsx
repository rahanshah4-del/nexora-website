import { useState } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineStar, HiOutlineXMark } from 'react-icons/hi2'

function StarRating({ rating, onChange, size = 'lg' }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || rating
  const sizeClass = size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl'

  return (
    <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => setHovered(star)}
          className={`${sizeClass} transition-all duration-150 hover:scale-110 focus:outline-none ${
            star <= active ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-[#e5e5ea]'
          }`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function ReviewPromptModal({ open, onClose, onSubmit, submitting, submitError, workspaceName = '' }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const canSubmit = rating > 0 && !submitting

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({ rating, comment }, () => {
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        setRating(0)
        setComment('')
        setSubmitted(false)
      }, 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-md" role="dialog" aria-modal="true">
      <motion.section
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.25)]"
      >
        {submitted ? (
          /* ── Thank you state ── */
          <div className="flex flex-col items-center px-8 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-lg shadow-amber-200"
            >
              <HiOutlineStar className="h-10 w-10 text-white" />
            </motion.div>
            <h2 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-[#1d1d1f]">Thank you!</h2>
            <p className="mt-2 text-[15px] leading-6 text-[#86868b]">
              Your review helps us make Nexora better for everyone.
            </p>
            {rating > 0 ? (
              <div className="mt-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-xl ${star <= rating ? 'text-amber-400' : 'text-[#e5e5ea]'}`}>★</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b]">Share your experience</p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[#1d1d1f]">
                  How is {workspaceName || 'Nexora'}?
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f7] text-[#86868b] transition hover:bg-[#e5e5ea] hover:text-[#1d1d1f]"
                aria-label="Close"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>

            {/* Stars */}
            <div className="px-8 py-4">
              <StarRating rating={rating} onChange={setRating} />
              {rating > 0 ? (
                <p className="mt-3 text-center text-[13px] font-medium text-[#86868b]">
                  {rating === 1 ? 'Needs improvement' : rating === 2 ? 'Not great' : rating === 3 ? 'Good' : rating === 4 ? 'Great!' : 'Excellent! 🎉'}
                </p>
              ) : (
                <p className="mt-3 text-center text-[13px] font-medium text-[#86868b]">Tap a star to rate</p>
              )}
            </div>

            {/* Comment */}
            <div className="px-8 py-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you love or what we can improve... (optional)"
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border-0 bg-[#f5f5f7] px-4 py-3 text-[15px] leading-6 text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
              />
              <p className="mt-1 text-right text-[11px] text-[#aeaeb2]">{comment.length}/500</p>
            </div>

            {/* Error */}
            {submitError ? (
              <div className="mx-8 mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">
                {submitError}
              </div>
            ) : null}

            {/* Submit + Skip */}
            <div className="flex flex-col gap-2 px-8 pb-8 pt-1">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all duration-200 ${
                  canSubmit
                    ? 'bg-[#007aff] text-white hover:bg-[#0070e9] active:scale-[0.98] shadow-[0_4px_14px_rgba(0,122,255,0.35)]'
                    : 'cursor-not-allowed bg-[#f5f5f7] text-[#aeaeb2]'
                }`}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium text-[#86868b] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </motion.section>
    </div>
  )
}
