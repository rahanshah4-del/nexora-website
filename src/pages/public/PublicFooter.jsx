import { useState } from 'react'
import Link from '../../components/AppLink.jsx'
import {
  HiOutlineDocumentChartBar,
  HiOutlineMapPin,
} from 'react-icons/hi2'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaWhatsapp,
} from 'react-icons/fa6'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import { footerColumns } from '../../lib/footerColumns.js'
import { SITE_ADDRESS_TEXT, SITE_EMAILS } from '../../lib/seoStructuredData.js'

const whatsappNumberDisplay = '+92 319 432 9754'
const whatsappLink = 'https://wa.me/923194329754'
const contactEmail = SITE_EMAILS.sales

const socialLinks = [
  { icon: FaFacebook, href: 'https://facebook.com/nexorasolution', label: 'Facebook' },
  { icon: FaInstagram, href: 'https://instagram.com/nexorasolution19', label: 'Instagram' },
  { icon: FaLinkedin, href: 'https://www.linkedin.com/in/rahan-shah-8b658a159/', label: 'LinkedIn' },
  { icon: FaYoutube, href: 'https://www.youtube.com/@nexorasolution', label: 'YouTube' },
  { icon: FaWhatsapp, href: whatsappLink, label: 'WhatsApp' },
]

function FooterHeading({ children }) {
  return (
    <h3 className="relative inline-flex flex-col text-[12px] font-semibold uppercase tracking-[0.16em] text-white/90">
      {children}
      <span className="mt-2 h-[2px] w-6 rounded-full bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400" />
    </h3>
  )
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center text-[13.5px] font-normal leading-[1.85] text-white/55 transition-all duration-200 hover:text-white"
    >
      <span className="transition-transform duration-200 group-hover:translate-x-[3px]">{children}</span>
    </Link>
  )
}

function FooterColumn({ heading, links }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.08] lg:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left lg:pointer-events-none lg:py-0"
      >
        <FooterHeading>{heading}</FooterHeading>
        <span className={`text-white/50 transition-transform lg:hidden ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div className={`grid gap-2 overflow-hidden transition-all lg:mt-5 lg:max-h-none lg:pb-0 ${open ? 'max-h-96 pb-4' : 'max-h-0'}`}>
        {links.map(([label, to]) => (
          <FooterLink key={label} to={to}>{label}</FooterLink>
        ))}
      </div>
    </div>
  )
}

export default function PublicFooter() {
  return (
    <footer className="footer-glass text-white">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:gap-10">
          <div>
            <NexoraLogo compact invert />
            <p className="mt-4 max-w-xs text-[14px] leading-[1.7] text-white/50">
              Business software for restaurants, retail, pharmacies, schools and transport — plus free tools for everyday paperwork.
            </p>
            <div className="mt-5 space-y-2 text-[13px] text-white/60">
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><FaWhatsapp className="text-emerald-400" /> {whatsappNumberDisplay}</a>
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 hover:text-white"><HiOutlineDocumentChartBar /> {contactEmail}</a>
              <p className="flex items-center gap-2"><HiOutlineMapPin className="text-rose-400" /> {SITE_ADDRESS_TEXT} · Serving clients worldwide</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[12px] text-white/70 transition hover:bg-white/[0.14] hover:text-white">
                  <Icon />
                </a>
              ))}
            </div>
          </div>
          <div className="lg:contents">
            {footerColumns().map((col) => <FooterColumn key={col.heading} {...col} />)}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] pb-20 pt-6 text-[12.5px] text-white/55 sm:flex-row sm:pb-4">
          <p>&copy; 2019–2026 Nexora Solution. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/refund-policy" className="hover:text-white">Refund Policy</Link>
            <Link to="/cookie-policy" className="hover:text-white">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
