import { Link } from 'react-router-dom'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineSparkles } from 'react-icons/hi2'
import BusinessServicesSection from '../../components/BusinessServicesSection.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const serviceStats = [
  ['9+', 'Support categories'],
  ['Flexible', 'Monthly or one-time'],
  ['Nexora', 'Managed review'],
]

const relatedServiceLinks = [
  {
    label: 'CRM Software',
    to: '/solutions/crm',
    text: 'Keep leads, customers, tasks and service requests connected in one workspace.',
  },
  {
    label: 'Retail POS',
    to: '/retail-pos',
    text: 'Connect store billing, products and customer records with daily operations.',
  },
  {
    label: 'WhatsApp CRM',
    to: '/whatsapp-crm',
    text: 'Use conversations, follow-ups and campaigns alongside managed services.',
  },
]

export default function PublicBusinessServicesPage() {
  const seo = getSeoForPath('/services')

  return (
    <PublicPageShell>
      <PageSeo
        {...seo}
        softwareApplication={{
          name: 'Nexora Business Services',
          description: seo.description,
          applicationCategory: 'BusinessApplication',
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Business Services</span>
      </nav>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_64%,#eef7ff_100%)] pb-10 pt-12 sm:pb-14 sm:pt-16 lg:pb-16">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute left-[7%] top-12 hidden h-48 w-48 rotate-3 bg-[radial-gradient(circle,#bfdbfe_1px,transparent_1px)] [background-size:17px_17px] opacity-55 lg:block" />
        <div className="pointer-events-none absolute right-[9%] top-28 hidden h-52 w-52 -rotate-6 bg-[radial-gradient(circle,#c7d2fe_1px,transparent_1px)] [background-size:18px_18px] opacity-55 lg:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:px-8">
          <div>
            <Link
              to="/"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 shadow-sm hover:border-blue-200 hover:bg-blue-50"
            >
              <HiOutlineArrowLeft className="h-4 w-4" />
              Back to Website
            </Link>
            <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              <span aria-hidden="true">💼</span>
              Business Services
              <span aria-hidden="true">⚙️</span>
            </p>
            <h1 className="website-hero-heading mt-5 max-w-4xl text-[2.8rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.2rem] lg:text-[5.35rem]">
              Back office help that works with your <span className="marker-highlight marker-highlight-blue">Nexora system.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Request setup, staffing, bookkeeping, customer support, lead generation, social media, website management, or custom development from one clean service window.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#business-services" className="premium-button-primary">
                View Services
                <HiOutlineArrowRight className="h-5 w-5" />
              </a>
              <Link to="/pricing" className="premium-button-secondary">
                See Software Pricing
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-blue-100 bg-white/92 p-5 shadow-[0_34px_100px_-60px_rgba(37,99,235,0.48)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Support Window</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Request, review, approve, activate.</h2>
              </div>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-2xl text-white" aria-hidden="true">🤝</span>
            </div>
            <div className="mt-6 grid gap-3">
              {['Choose the service you need', 'Send company and support details', 'Nexora reviews and shares next steps'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <HiOutlineCheckCircle className="h-5 w-5 shrink-0 text-blue-600" />
                  <p className="text-sm font-black text-slate-800">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {serviceStats.map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-blue-50 p-3 text-center">
                  <p className="text-lg font-black text-blue-700">{value}</p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2">
                <HiOutlineSparkles className="h-5 w-5 text-blue-200" />
                <p className="text-sm font-black">Built for daily operations, not just forms.</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-blue-50/85">Your request can move through review, proposal, approval, active work and closure with timeline updates.</p>
            </div>
          </aside>
        </div>
      </section>

      <BusinessServicesSection />

      <section data-reveal className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                Related Software
              </span>
              <h2 className="website-section-heading mt-5 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Software that supports your service workflow
              </h2>
            </div>
            <Link to="/contact" className="premium-button-secondary w-max">
              Contact Nexora
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {relatedServiceLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="group rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_30px_78px_-48px_rgba(37,99,235,0.46)]"
              >
                <p className="text-lg font-black text-slate-950">{item.label}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700">
                  View solution
                  <HiOutlineArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
