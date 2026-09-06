import { useEffect, useState } from 'react'
import Link from './AppLink.jsx'
import { HiOutlineArrowRight, HiOutlinePlayCircle, HiOutlineStar } from 'react-icons/hi2'
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
    <div
      className={`fixed bottom-6 right-6 z-[55] flex items-center gap-2.5 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* WhatsApp */}
      <a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/25 transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95"
        aria-label="WhatsApp"
      >
        <FaWhatsapp className="text-xl" />
      </a>

      {/* Customer Reviews */}
      <Link
        to="/reviews"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg shadow-amber-400/25 transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95"
        aria-label="Customer Reviews"
      >
        <HiOutlineStar className="h-5 w-5 fill-white" strokeWidth={1.5} />
      </Link>

      {/* Start Free Trial */}
      <Link
        to="/signup"
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-[13px] font-medium tracking-[-0.01em] text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <HiOutlinePlayCircle className="h-5 w-5" />
        Start Free Trial
        <HiOutlineArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
