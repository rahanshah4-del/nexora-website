import { useEffect, useState } from 'react'
import Link from './AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineGift, HiOutlineXMark } from 'react-icons/hi2'

// localStorage (not sessionStorage) so the offer stays dismissed across
// browser sessions, not just the current tab. Value is the dismissal
// timestamp (ms) — re-eligible once it's more than 30 days old.
const STORAGE_KEY = 'nexora_offer_dismissed_at'
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const DELAY_MS = 9000 // 8-10s window
const SCROLL_TRIGGER_RATIO = 0.45 // 40-50% of the page

function wasRecentlyDismissed() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const dismissedAt = Number(raw)
    if (!Number.isFinite(dismissedAt)) return false
    return Date.now() - dismissedAt < DISMISS_TTL_MS
  } catch {
    return false // storage unavailable (private mode, quota) — fail open
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* storage unavailable — nothing to persist, popup may reappear */
  }
}

export default function NewUserOfferPopup() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Mounted once at the app root (see AppRouter.jsx) so this effect runs
  // once per browser load — not once per page navigation. Fires on
  // whichever comes first: an 8-10s delay, or the visitor scrolling past
  // 40-50% of the page (real engagement), and only when there's no recent
  // dismissal on record.
  useEffect(() => {
    if (typeof window === 'undefined' || wasRecentlyDismissed()) return undefined

    let triggered = false
    const trigger = () => {
      if (triggered) return
      triggered = true
      setVisible(true)
      cleanup()
    }

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      if (window.scrollY / scrollable >= SCROLL_TRIGGER_RATIO) trigger()
    }

    const timer = setTimeout(trigger, DELAY_MS)
    window.addEventListener('scroll', onScroll, { passive: true })

    function cleanup() {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
    return cleanup
  }, [])

  const dismiss = () => {
    markDismissed()
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      setExiting(false)
    }, 250)
  }

  if (!visible) return null

  return (
    // Non-blocking corner card — no backdrop, no overlay, page stays fully
    // interactive underneath. bottom-center on mobile, bottom-right on
    // desktop (sm+); positioned above StickyCTA's bottom-6 row.
    <div
      className={`fixed bottom-24 left-1/2 z-[9990] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 ${exiting ? 'pointer-events-none' : ''}`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        animation: !exiting ? 'offerSlideIn 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards' : undefined,
        transition: exiting ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
        opacity: exiting ? 0 : undefined,
        transform: exiting ? 'translate(-50%, 12px)' : undefined,
      }}
      role="dialog"
      aria-label="New user offer"
    >
      <style>{`
        @keyframes offerSlideIn {
          from { opacity: 0; transform: translate(-50%, 24px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (min-width: 640px) {
          @keyframes offerSlideIn {
            from { opacity: 0; transform: translate(0, 24px); }
            to { opacity: 1; transform: translate(0, 0); }
          }
        }
      `}</style>
      <div
        className="relative overflow-hidden rounded-[1.35rem] border border-black/5 bg-white/95 shadow-2xl shadow-black/20"
        style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
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

          {/* CTA — converting is as good as dismissing, so this also marks it seen */}
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
