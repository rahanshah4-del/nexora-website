import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlineGift, HiOutlineXMark } from 'react-icons/hi2'

const STORAGE_KEY = 'nexora-offer-popup-shown'

export default function NewUserOfferPopup() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Show once per session
    if (sessionStorage.getItem(STORAGE_KEY)) return
    const timer = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true')
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      setExiting(false)
    }, 250)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
        style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-[1.35rem] bg-white/95 shadow-2xl shadow-black/20 transition-all duration-300 ${exiting ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          animation: !exiting ? 'applePopIn 0.45s cubic-bezier(0.32, 0.72, 0, 1) forwards' : undefined,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-[#86868b] transition-all duration-200 hover:bg-black/10 hover:text-[#1d1d1f] active:scale-90"
          aria-label="Close popup"
        >
          <HiOutlineXMark className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Gradient top bar */}
        <div className="h-[3px] bg-gradient-to-r from-rose-400 via-violet-500 to-fuchsia-500" />

        {/* Content */}
        <div className="px-5 pb-5 pt-5 text-center">
          {/* Icon */}
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 via-violet-100 to-fuchsia-100 ring-1 ring-rose-200/40">
            <HiOutlineGift className="h-5 w-5 text-rose-500" strokeWidth={1.5} />
          </span>

          {/* Heading */}
          <h2 className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            50% OFF — New User Offer
          </h2>

          {/* Steps */}
          <div className="mt-3 grid gap-2 text-left">
            <div className="flex items-start gap-2.5 rounded-[10px] bg-[#f5f5f7] p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[10px] font-semibold text-white">1</span>
              <p className="text-[13px] leading-[1.4] text-[#1d1d1f]">
                <span className="font-semibold">Start 1-Month Free Trial</span>
                <br />
                <span className="text-[12px] text-[#86868b]">Full access to all modules. No card needed.</span>
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-[10px] bg-[#f5f5f7] p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[10px] font-semibold text-white">2</span>
              <p className="text-[13px] leading-[1.4] text-[#1d1d1f]">
                <span className="font-semibold">Get 50% OFF First Subscription</span>
                <br />
                <span className="text-[12px] text-[#86868b]">PKR 1,000 instead of PKR 2,000. One-time only.</span>
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-[10px] bg-[#f5f5f7] p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[10px] font-semibold text-white">3</span>
              <p className="text-[13px] leading-[1.4] text-[#1d1d1f]">
                <span className="font-semibold">Regular Price After</span>
                <br />
                <span className="text-[12px] text-[#86868b]">Next month returns to standard. Cancel anytime.</span>
              </p>
            </div>
          </div>

          {/* CTA */}
          <Link
            to="/pricing"
            onClick={dismiss}
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1d1d1f] py-3 text-[14px] font-medium text-white shadow-[0_4px_16px_-6px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-black hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] active:scale-[0.97]"
          >
            Start Free Trial — Get 50% OFF
            <HiOutlineArrowRight className="h-[15px] w-[15px]" />
          </Link>

          {/* Dismiss */}
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 text-[12px] font-normal text-[#86868b] transition-colors hover:text-[#1d1d1f]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
