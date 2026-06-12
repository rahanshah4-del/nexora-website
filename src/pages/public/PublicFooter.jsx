import { Link } from 'react-router-dom'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentChartBar,
  HiOutlineMapPin,
} from 'react-icons/hi2'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'

const whatsappNumberDisplay = '+92 319 432 9754'
const whatsappLink = 'https://wa.me/923194329754'
const contactEmail = 'rahanshah4@gmail.com'

const solutionLinks = [
  ['CRM', '/solutions/crm'],
  ['School ERP', '/solutions/school-erp'],
  ['Property ERP', '/solutions/property-erp'],
  ['POS', '/solutions/pos'],
  ['WhatsApp CRM', '/solutions/whatsapp-crm'],
  ['Reports', '/solutions/reports'],
]

const quickLinks = [
  ['Home', '/'],
  ['Pricing', '/pricing'],
  ['Industries', '/industries'],
  ['About Us', '/#about'],
  ['Contact Us', '/contact'],
]

export default function PublicFooter() {
  return (
    <footer className="bg-[linear-gradient(135deg,#071d35_0%,#062b52_100%)] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_0.95fr_1fr]">
          <div>
            <NexoraLogo compact textClassName="[&>p]:text-white" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-blue-100">
              Nexora Business Suite is an all-in-one platform to manage operations, customers, sales, teams, billing and reporting from one secure dashboard.
            </p>
            <div className="mt-6 flex gap-3">
              {['f', 'ig', 'in', 'yt'].map((item) => (
                <span key={item} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold text-white">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold">Quick Links</h3>
            <div className="mt-5 grid gap-3 text-sm text-blue-100">
              {quickLinks.map(([label, href]) => (
                <a key={label} href={href} className="transition hover:text-white">
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold">Solutions</h3>
            <div className="mt-5 grid gap-3 text-sm text-blue-100">
              {solutionLinks.map(([label, to]) => (
                <Link key={label} to={to} className="transition hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold">Contact Us</h3>
            <div className="mt-5 grid gap-4 text-sm text-blue-100">
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex gap-3 transition hover:text-white">
                <HiOutlineChatBubbleLeftRight className="mt-0.5 shrink-0 text-lg" />
                <span>{whatsappNumberDisplay}</span>
              </a>
              <a href={`mailto:${contactEmail}`} className="flex gap-3 transition hover:text-white">
                <HiOutlineDocumentChartBar className="mt-0.5 shrink-0 text-lg" />
                <span>{contactEmail}</span>
              </a>
              <div className="flex gap-3">
                <HiOutlineMapPin className="mt-0.5 shrink-0 text-lg" />
                <span>123, Business Avenue, Lahore, Pakistan</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-blue-100">
          NEXORA SOLUTION — All rights reserved 2019-2026.
        </p>
      </div>
    </footer>
  )
}
