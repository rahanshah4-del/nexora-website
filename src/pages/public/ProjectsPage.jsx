import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import Link from '../../components/AppLink.jsx'

const stories = [
  { title: 'Restaurant rollout', text: 'A restaurant chain improved order accuracy, inventory control, and online takeaway performance.' },
  { title: 'Retail expansion', text: 'A small retail group replaced spreadsheets with automated sales, stock, and customer tracking.' },
  { title: 'School automation', text: 'A private school digitized fees, attendance, and academic workflows in one system.' },
]

const products = [
  { to: '/restaurant-pos', title: 'Restaurant POS', text: 'Billing, KOT and kitchen display, table management, menu and food stock for restaurants and cafes, with billing that keeps working when the internet drops.' },
  { to: '/retail-pos', title: 'Retail POS', text: 'Barcode billing, inventory control, discounts, customer records and daily store reports for shops, grocery stores and supermarkets.' },
  { to: '/pharmacy-pos', title: 'Pharmacy POS', text: 'Medicine billing, batch and expiry tracking, supplier purchases and daily reports for pharmacies and medical stores.' },
  { to: '/school-erp', title: 'School management software', text: 'Admissions, attendance, fee management, payroll and parent communication for schools, academies and coaching centres.' },
  { to: '/transport-fleet', title: 'Car rental and fleet software', text: 'Vehicle records, rental bookings, customer ledgers and payment dues for fleet and rental businesses.' },
  { to: '/whatsapp-crm', title: 'WhatsApp CRM', text: 'Turn WhatsApp conversations into leads, broadcasts, follow-ups and sales workflows.' },
  { to: '/crm', title: 'CRM software', text: 'Track leads, customers, invoices, tasks and sales teams from one cloud dashboard.' },
  { to: '/property-erp', title: 'Property management software', text: 'Tenants, rent collection, leases, maintenance and owner reporting for property teams.' },
]

export default function ProjectsPage() {
  const seo = getSeoForPath('/projects')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 lg:py-24 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-300 backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-cyan-400" />
              Our Work
            </span>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-white sm:text-5xl">Implementation stories from teams using Nexora products.</h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              Discover how local restaurants, retail businesses, schools, transport operators, and sales teams drive efficiency with integrated POS, ERP, CRM and customer communication tools.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {stories.map(({ title, text }) => (
              <article key={title} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)] backdrop-blur-xl">
                <h2 className="text-lg font-medium tracking-[-0.01em] text-white">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">Software you can put to work today</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-slate-400">
              Every Nexora product starts with a free 1-month trial. Pick the one that matches how your business runs, and see exactly what it does before you commit.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {products.map(({ to, title, text }) => (
                <Link key={to} to={to} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
                  <h3 className="text-base font-medium text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{text}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
