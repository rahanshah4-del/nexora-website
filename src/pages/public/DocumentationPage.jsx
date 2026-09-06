import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const docs = [
  ['Restaurant POS', 'Billing, KOT, tables, cashier flow, and restaurant operations.', '/restaurant-pos'],
  ['Retail POS', 'Products, inventory, receipts, staff permissions, and sales workflow.', '/retail-pos'],
  ['School ERP', 'Students, attendance, fees, exams, parent workflows, and reporting.', '/school-erp'],
  ['WhatsApp CRM', 'Broadcasts, follow-ups, customer tracking, and campaign workflows.', '/whatsapp-crm'],
  ['Blog guides', 'Long-form tutorials and SEO guides for business software.', '/blog'],
  ['HTML sitemap', 'Browse every public Nexora page and content resource.', '/sitemap'],
]

export default function DocumentationPage() {
  const seo = getSeoForPath('/documentation')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">Documentation</p>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Nexora product documentation hub.</h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Use this page as a public documentation index for Nexora POS, ERP, CRM, WhatsApp CRM, blog guides, and support resources.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {docs.map(([title, text, to]) => (
              <Link
                key={title}
                to={to}
                className="group rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)] active:scale-[0.98]"
              >
                <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</h2>
                <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
