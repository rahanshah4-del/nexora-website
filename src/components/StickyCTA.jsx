import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlineCalendarDays, HiOutlinePlayCircle, HiOutlineStar } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'

const whatsappLink = 'https://wa.me/923194329754?text=Assalam%20o%20Alaikum%2C%20I%20want%20to%20know%20more%20about%20Nexora.'

export default function StickyCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* Desktop: floating buttons bottom-right */}
      <div
        className={`fixed bottom-6 right-6 z-[55] hidden flex-col items-end gap-3 transition-all duration-300 sm:flex ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {/* Icon-only buttons row */}
        <div className="flex items-center gap-2.5">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/25 transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95"
            aria-label="WhatsApp"
          >
            <FaWhatsapp className="text-xl" />
          </a>
          <Link
            to="/contact"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1d1d1f] text-white shadow-lg shadow-black/20 transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95"
            aria-label="Book Demo"
          >
            <HiOutlineCalendarDays className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-[13px] font-medium tracking-[-0.01em] text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
          >
            <HiOutlinePlayCircle className="h-5 w-5" />
            Start Free Trial
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Customer Reviews — separate pill button */}
        <Link
          to="/reviews"
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-[#1d1d1f] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.16)] active:scale-[0.97]"
          style={{ animation: 'featurePulse 3s ease-in-out infinite' }}
        >
          <HiOutlineStar className="h-[18px] w-[18px] fill-amber-400 text-amber-400" strokeWidth={1.5} />
          Customer Reviews
          <HiOutlineArrowRight className="h-[14px] w-[14px] text-slate-400" />
        </Link>
      </div>

      {/* Mobile: floating buttons bottom-right */}
      <div
        className={`fixed bottom-4 right-3 z-[55] flex flex-col items-end gap-2.5 transition-all duration-300 sm:hidden ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Icon-only row */}
        <div className="flex items-center gap-2">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/25 active:scale-95"
            aria-label="WhatsApp"
          >
            <FaWhatsapp className="text-lg" />
          </a>
          <Link
            to="/contact"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-white shadow-lg shadow-black/20 active:scale-95"
            aria-label="Book Demo"
          >
            <HiOutlineCalendarDays className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#0071e3] px-4 text-[12px] font-medium tracking-[-0.01em] text-white shadow-lg shadow-blue-500/25 active:scale-95"
          >
            <HiOutlinePlayCircle className="h-[18px] w-[18px]" />
            Start Free
            <HiOutlineArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Customer Reviews — separate pill */}
        <Link
          to="/reviews"
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-[12px] font-medium tracking-[-0.01em] text-[#1d1d1f] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl active:scale-[0.97]"
          style={{ animation: 'featurePulse 3s ease-in-out infinite' }}
        >
          <HiOutlineStar className="h-[16px] w-[16px] fill-amber-400 text-amber-400" strokeWidth={1.5} />
          Customer Reviews
          <HiOutlineArrowRight className="h-[13px] w-[13px] text-slate-400" />
        </Link>
      </div>
    </>
  )
}
