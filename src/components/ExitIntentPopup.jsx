import { useEffect, useState } from 'react'
import Link from './AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineGift, HiOutlineXMark } from 'react-icons/hi2'

const STORAGE_KEY = 'nexora-exit-popup-shown'

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return

    // Desktop: mouse leaves window
    const onMouseLeave = (e) => {
      if (e.clientY <= 0 && !visible) {
        setVisible(true)
        sessionStorage.setItem(STORAGE_KEY, 'true')
      }
    }

    // Mobile: inactivity after 30s
    let idleTimer
    const resetIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        if (!visible && window.innerWidth < 1024) {
          setVisible(true)
          sessionStorage.setItem(STORAGE_KEY, 'true')
        }
      }, 30000)
    }

    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('touchstart', resetIdle, { passive: true })
    document.addEventListener('scroll', resetIdle, { passive: true })
    resetIdle()

    return () => {
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('touchstart', resetIdle)
      document.removeEventListener('scroll', resetIdle)
      clearTimeout(idleTimer)
    }
  }, [visible])

  const dismiss = () => {
    setExiting(true)
    setTimeout(() => { setVisible(false); setExiting(false) }, 250)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
        style={{ backdropFilter: 'blur(6px)' }}
        onClick={dismiss}
      />
      <div className={`relative w-full max-w-sm overflow-hidden rounded-[1.35rem] bg-white shadow-2xl transition-all duration-300 ${exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={{ animation: !exiting ? 'applePopIn 0.4s cubic-bezier(0.32,0.72,0,1) forwards' : undefined }}
      >
        <button onClick={dismiss} className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-[#86868b] hover:bg-black/10 active:scale-90">
          <HiOutlineXMark className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="h-[3px] bg-gradient-to-r from-rose-400 via-violet-500 to-fuchsia-500" />
        <div className="px-5 pb-5 pt-5 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 via-violet-100 to-fuchsia-100 ring-1 ring-rose-200/40">
            <HiOutlineGift className="h-5 w-5 text-rose-500" strokeWidth={1.5} />
          </span>
          <h2 className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Wait! Extra 10% OFF</h2>
          <p className="mt-2 text-[13px] leading-[1.5] text-[#86868b]">
            Before you go — claim an <span className="font-semibold text-[#1d1d1f]">additional 10% OFF</span> on top of the 50% new user discount. Includes free setup, data migration & training.
          </p>
          <Link to="/signup" onClick={dismiss} className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1d1d1f] py-3 text-[14px] font-medium text-white shadow-[0_4px_16px_-6px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-black active:scale-[0.97]">
            Claim 60% OFF — Start Free Trial
            <HiOutlineArrowRight className="h-[15px] w-[15px]" />
          </Link>
          <button onClick={dismiss} className="mt-2 text-[12px] text-[#86868b] hover:text-[#1d1d1f]">No thanks</button>
        </div>
      </div>
    </div>
  )
}
