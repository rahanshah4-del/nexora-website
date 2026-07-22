import { useState } from 'react'
import { HiOutlineStar, HiOutlinePaperAirplane } from 'react-icons/hi2'
import { submitReview } from '../lib/reviews.js'

export default function ReviewForm({ onSubmitted }) {
  const [form, setForm] = useState({ name: '', businessName: '', businessType: 'Restaurant', country: 'Pakistan', rating: 5, review: '', imageUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.review.trim()) {
      setError('Name and review are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitReview({ ...form, photo: form.imageUrl })
      setDone(true)
      onSubmitted?.()
    } catch (err) {
      setError(err.message || 'Failed to submit. Try again.')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="rounded-[1.2rem] border border-emerald-200/60 bg-emerald-50/60 p-6 text-center">
        <p className="text-[17px] font-semibold text-emerald-700">Thank you for your review!</p>
        <p className="mt-1 text-[14px] text-emerald-600">Your review will be visible after approval.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)]">
      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Write a Review</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[12px] font-medium text-slate-500 mb-1">Name *</label>
          <input value={form.name} onChange={set('name')} placeholder="Your name" className="h-11 w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-slate-500 mb-1">Business Name</label>
          <input value={form.businessName} onChange={set('businessName')} placeholder="Your business" className="h-11 w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-slate-500 mb-1">Business Type</label>
          <select value={form.businessType} onChange={set('businessType')} className="h-11 w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white">
            {['Restaurant','Retail','Education','Healthcare','Transport','Real Estate','Services','Other'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-slate-500 mb-1">Country</label>
          <input value={form.country} onChange={set('country')} placeholder="Pakistan" className="h-11 w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-slate-500 mb-1">Photo/Image URL (optional)</label>
          <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." className="h-11 w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-slate-500 mb-1">Rating</label>
          <div className="flex gap-1 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setForm((p) => ({ ...p, rating: i }))} className="transition-transform hover:scale-110">
                <HiOutlineStar className={`h-6 w-6 ${i <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-[12px] font-medium text-slate-500 mb-1">Your Review *</label>
        <textarea value={form.review} onChange={set('review')} rows={3} placeholder="Share your experience with Nexora..." className="w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white resize-none" />
      </div>
      {error && <p className="mt-2 text-[12px] text-rose-500">{error}</p>}
      <button type="submit" disabled={submitting} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-6 py-2.5 text-[14px] font-medium text-white transition-all duration-200 hover:bg-black active:scale-[0.97] disabled:opacity-50">
        Submit Review
        <HiOutlinePaperAirplane className="h-4 w-4" />
      </button>
    </form>
  )
}
