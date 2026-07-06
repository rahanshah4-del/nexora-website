import { Link } from 'react-router-dom'
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
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Documentation</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Nexora product documentation hub.</h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              Use this page as a public documentation index for Nexora POS, ERP, CRM, WhatsApp CRM, blog guides, and support resources.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {docs.map(([title, text, to]) => (
              <Link key={title} to={to} className="rounded-[1.35rem] border border-blue-100 bg-slate-50 p-6 shadow-sm hover:border-blue-200 hover:bg-blue-50">
                <h2 className="text-lg font-black text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
