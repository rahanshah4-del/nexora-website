import Link from '../../components/AppLink.jsx'
import {
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
import { COUNTRIES } from '../../lib/countries.js'

const whatsappNumberDisplay = '+92 319 432 9754'
const whatsappLink = 'https://wa.me/923194329754'
const contactEmail = 'hello@nexorasolution.online'
const websiteUrl = 'https://nexorasolution.online'

const socialLinks = [
  { icon: FaFacebook, href: 'https://facebook.com/nexorasolution', label: 'Facebook' },
  { icon: FaInstagram, href: 'https://instagram.com/nexorasolution', label: 'Instagram' },
  { icon: FaLinkedin, href: 'https://linkedin.com/company/nexorasolution', label: 'LinkedIn' },
  { icon: FaYoutube, href: 'https://www.youtube.com/@nexorasolution', label: 'YouTube' },
  { icon: FaWhatsapp, href: whatsappLink, label: 'WhatsApp' },
  { icon: SiUpwork, href: 'https://www.upwork.com/freelancers/~01790bd4aa14480855?mp_source=share', label: 'Upwork' },
  { icon: SiFiverr, href: 'https://pro.fiverr.com/s/gDReXba', label: 'Fiverr' },
]

const productLinks = [
  ['Nexora CRM', '/crm'],
  ['Restaurant POS', '/restaurant-pos'],
  ['Retail POS', '/retail-pos'],
  ['Pharmacy POS', '/pharmacy-pos'],
  ['School ERP', '/school-erp'],
  ['Fleet Management', '/transport-fleet'],
  ['WhatsApp CRM', '/whatsapp-crm'],
  ['Nexora AI', '/ai'],
  ['Property ERP', '/solutions/property-erp'],
  ['Email Marketing', '/solutions/email-marketing'],
  ['Inventory Management', '/solutions/inventory-management'],
  ['Reports & Analytics', '/solutions/reports-analytics'],
  ['Business Reports', '/solutions/reports'],
  ['Team & Permissions', '/solutions/team-permissions'],
  ['Download Restaurant POS', '/download/restaurant-pos'],
]

const companyLinks = [
  ['Home', '/'],
  ['About', '/about'],
  ['Pricing', '/pricing'],
  ['Software Development', '/software-development'],
  ['SEO Services', '/seo-services'],
  ['Custom CRM Development', '/crm-development'],
  ['ERP Solutions', '/erp-development'],
  ['Cloud Solutions', '/cloud-solutions'],
  ['API Integration', '/api-integration'],
  ['Mobile App Development', '/mobile-app-development'],
  ['E-commerce Development', '/ecommerce-development'],
  ['Industries', '/industries'],
  ['Projects', '/projects'],
  ['Reviews', '/reviews'],
  ['Blog', '/blog'],
  ['Contact', '/contact'],
]

const resourceLinks = [
  ['Documentation', '/documentation'],
  ['Help Center', '/help-center'],
  ['FAQ', '/faq'],
  ['Sitemap', '/sitemap'],
  ['Privacy Policy', '/privacy-policy'],
  ['Terms & Conditions', '/terms'],
  ['Refund Policy', '/refund-policy'],
  ['Support Center', '/support-center'],
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

export default function PublicFooter() {
  return (
    <footer className="footer-glass text-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.9fr_1fr_1.1fr] lg:gap-8">

          {/* Column 1 — Brand */}
          <div>
            <NexoraLogo compact invert />
            <p className="mt-6 max-w-xs text-[14px] leading-[1.8] text-white/50">
              Business software platform for Restaurants, Retail, Schools, Transport, Medical Stores and Enterprises.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[13px] text-white/70 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.14] hover:text-white hover:shadow-[0_8px_24px_-8px_rgba(255,255,255,0.18)] active:scale-95"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — Products */}
          <div>
            <FooterHeading>Products</FooterHeading>
            <div className="mt-6 grid gap-3">
              {productLinks.map(([label, to]) => (
                <FooterLink key={label} to={to}>{label}</FooterLink>
              ))}
            </div>
          </div>

          {/* Column 3 — Company */}
          <div>
            <FooterHeading>Company</FooterHeading>
            <div className="mt-6 grid gap-3">
              {companyLinks.map(([label, to]) => (
                <FooterLink key={label} to={to}>{label}</FooterLink>
              ))}
            </div>
          </div>

          {/* Column 4 — Resources */}
          <div>
            <FooterHeading>Resources</FooterHeading>
            <div className="mt-6 grid gap-3">
              {resourceLinks.map(([label, to]) => (
                <FooterLink key={label} to={to}>{label}</FooterLink>
              ))}
            </div>
          </div>

          {/* Column 5 — Contact */}
          <div>
            <FooterHeading>Contact</FooterHeading>
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5 text-[13.5px] font-medium text-white/80 transition-colors duration-200 hover:bg-white/[0.05] hover:text-white"
              >
                <FaWhatsapp className="shrink-0 text-base text-emerald-400" />
                <span>{whatsappNumberDisplay}</span>
              </a>
              <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex min-w-0 flex-1 items-center gap-3 text-[13px] font-normal text-white/55 transition-colors duration-200 hover:text-white"
                >
                  <HiOutlineDocumentChartBar className="shrink-0 text-base" />
                  <span className="truncate">{contactEmail}</span>
                </a>
                <CopyEmailButton email={contactEmail} />
              </div>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5 text-[13px] font-normal text-white/55 transition-colors duration-200 hover:bg-white/[0.05] hover:text-white"
              >
                <HiOutlineGlobeAlt className="shrink-0 text-base" />
                <span>nexorasolution.online</span>
              </a>
              <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5 text-[13px] font-normal text-white/55">
                <HiOutlineMapPin className="shrink-0 text-base text-rose-400" />
                <span>Pakistan &amp; Dubai</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5 text-[13px] font-normal text-white/55">
                <HiOutlineGlobeAlt className="shrink-0 text-base text-sky-400" />
                <span>Available Worldwide</span>
              </div>
            </div>
          </div>
        </div>

        {/* Countries We Serve — every country landing page needs at least one
            crawlable internal link; this is the only place that lists all of them. */}
        <div className="mt-14 border-t border-white/[0.08] pt-10">
          <FooterHeading>Countries We Serve</FooterHeading>
          <div className="mt-5 flex flex-wrap gap-2">
            {COUNTRIES.map((country) => (
              <Link
                key={country.slug}
                to={`/${country.slug}`}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-normal text-white/55 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
              >
                {country.flag} {country.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.08] pt-8 text-[13px] text-white/45 sm:flex-row">
          <p>&copy; 2019–2026 Nexora Solution. All Rights Reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="transition-colors duration-200 hover:text-white">Privacy</Link>
            <Link to="/terms" className="transition-colors duration-200 hover:text-white">Terms</Link>
            <Link to="/privacy-policy" className="transition-colors duration-200 hover:text-white">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
