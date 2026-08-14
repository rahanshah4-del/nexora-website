import { Link } from 'react-router-dom'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentChartBar,
  HiOutlineMapPin,
  HiOutlineGlobeAlt,
} from 'react-icons/hi2'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaWhatsapp,
} from 'react-icons/fa6'
import { SiUpwork, SiFiverr } from 'react-icons/si'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import CopyEmailButton from '../../components/CopyEmailButton.jsx'

const whatsappNumberDisplay = '+92 319 432 9754'
const whatsappLink = 'https://wa.me/923194329754'
const contactEmail = 'hello@nexorasolution.online'
const websiteUrl = 'https://nexorasolution.online'

const socialLinks = [
  { icon: FaFacebook, href: 'https://facebook.com/nexorasolution', label: 'Facebook' },
  { icon: FaInstagram, href: 'https://instagram.com/nexorasolution', label: 'Instagram' },
  { icon: FaLinkedin, href: 'https://linkedin.com/company/nexorasolution', label: 'LinkedIn' },
  { icon: FaYoutube, href: '#TODO-youtube', label: 'YouTube' },
  { icon: FaWhatsapp, href: whatsappLink, label: 'WhatsApp' },
  { icon: SiUpwork, href: 'https://www.upwork.com/freelancers/~01790bd4aa14480855?mp_source=share', label: 'Upwork' },
  { icon: SiFiverr, href: 'https://pro.fiverr.com/s/gDReXba', label: 'Fiverr' },
]

const productLinks = [
  ['Nexora CRM', '/solutions/crm'],
  ['Restaurant POS', '/restaurant-pos'],
  ['Retail POS', '/retail-pos'],
  ['Medical Store POS', '/solutions/medical-store-pos'],
  ['School ERP', '/school-erp'],
  ['Transport Management', '/transport'],
  ['WhatsApp CRM', '/whatsapp-crm'],
  ['Property ERP', '/solutions/property-erp'],
]

const companyLinks = [
  ['Home', '/'],
  ['About', '/about'],
  ['Pricing', '/pricing'],
  ['Software Development', '/software-development'],
  ['Industries', '/industries'],
  ['Blog', '/blog'],
  ['Contact', '/contact'],
]

const resourceLinks = [
  ['Documentation', '/documentation'],
  ['Help Center', '/help-center'],
  ['FAQ', '/faq'],
  ['Privacy Policy', '/privacy-policy'],
  ['Terms & Conditions', '/terms'],
  ['Refund Policy', '/refund-policy'],
  ['Support Center', '/support-center'],
]

export default function PublicFooter() {
  return (
    <footer className="footer-glass text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_0.9fr_1fr_1.1fr]">

          {/* Column 1 — Company */}
          <div>
            <NexoraLogo compact textClassName="[&>p]:text-white" />
            <p className="mt-5 text-sm leading-7 text-white/60">
              Business software platform for Restaurants, Retail, Schools, Transport, Medical Stores and Enterprises.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/25 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — Products */}
          <div>
            <h3 className="text-sm font-medium tracking-[0.08em] text-white/80">Products</h3>
            <div className="mt-5 grid gap-3 text-sm">
              {productLinks.map(([label, to]) => (
                <Link key={label} to={to} className="font-light text-white/55 transition-colors duration-200 hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3 — Company */}
          <div>
            <h3 className="text-sm font-medium tracking-[0.08em] text-white/80">Company</h3>
            <div className="mt-5 grid gap-3 text-sm">
              {companyLinks.map(([label, to]) => (
                <Link key={label} to={to} className="font-light text-white/55 transition-colors duration-200 hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4 — Resources */}
          <div>
            <h3 className="text-sm font-medium tracking-[0.08em] text-white/80">Resources</h3>
            <div className="mt-5 grid gap-3 text-sm">
              {resourceLinks.map(([label, to]) => (
                <Link key={label} to={to} className="font-light text-white/55 transition-colors duration-200 hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 5 — Contact */}
          <div>
            <h3 className="text-sm font-medium tracking-[0.08em] text-white/80">Contact</h3>
            <div className="mt-5 grid gap-4 text-sm">
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(15,40,66,0.5)] px-3.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30 hover:text-white">
                <FaWhatsapp className="text-sm text-emerald-400" />
                <span>{whatsappNumberDisplay}</span>
              </a>
              <div className="flex items-center gap-3">
                <a href={`mailto:${contactEmail}`} className="flex gap-3 font-light text-white/55 transition-colors duration-200 hover:text-white">
                  <HiOutlineDocumentChartBar className="mt-0.5 shrink-0 text-lg" />
                  <span>{contactEmail}</span>
                </a>
                <CopyEmailButton email={contactEmail} />
              </div>
              <a href={websiteUrl} target="_blank" rel="noreferrer" className="flex gap-3 font-light text-white/55 transition-colors duration-200 hover:text-white">
                <HiOutlineGlobeAlt className="mt-0.5 shrink-0 text-lg" />
                <span>nexorasolution.online</span>
              </a>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(15,40,66,0.5)] px-3.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-md">
                <HiOutlineMapPin className="text-sm text-rose-400" />
                Pakistan &amp; Dubai
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(15,40,66,0.5)] px-3.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30">
                <HiOutlineGlobeAlt className="text-sm" />
                Available Worldwide
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-8 text-sm text-white/60 sm:flex-row">
          <p>&copy; 2019–2026 Nexora Solution. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="font-light transition-colors duration-200 hover:text-white">Privacy</Link>
            <Link to="/terms" className="font-light transition-colors duration-200 hover:text-white">Terms</Link>
            <Link to="/privacy-policy" className="font-light transition-colors duration-200 hover:text-white">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
