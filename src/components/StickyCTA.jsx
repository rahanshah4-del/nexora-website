import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlineCalendarDays, HiOutlinePlayCircle } from 'react-icons/hi2'
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
        className={`fixed bottom-6 right-6 z-[55] hidden flex-col gap-2.5 transition-all duration-300 sm:flex ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
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
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <HiOutlinePlayCircle className="h-5 w-5" />
          Start Free Trial
          <HiOutlineArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Mobile: bottom sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[55] border-t border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur-xl sm:hidden"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2.5">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white active:scale-95"
            aria-label="WhatsApp"
          >
            <FaWhatsapp className="text-lg" />
          </a>
          <Link
            to="/signup"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0071e3] py-2.5 text-sm font-medium text-white active:scale-[0.98]"
          >
            Start Free Trial — 50% OFF
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-white active:scale-95"
            aria-label="Book Demo"
          >
            <HiOutlineCalendarDays className="h-5 w-5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </>
  )
}
