import { Link } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineBriefcase,
  HiOutlineCog8Tooth,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import BusinessServicesSection from '../../components/BusinessServicesSection.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const serviceStats = [
  { value: '9+', label: 'Support categories', icon: HiOutlineBriefcase },
  { value: 'Flexible', label: 'Monthly or one-time', icon: HiOutlineCog8Tooth },
  { value: 'Nexora', label: 'Managed review', icon: HiOutlineUserGroup },
]

const relatedServiceLinks = [
  {
    label: 'CRM Software',
    to: '/solutions/crm',
    text: 'Keep leads, customers, tasks and service requests connected in one workspace.',
    tone: 'indigo',
  },
  {
    label: 'Retail POS',
    to: '/retail-pos',
    text: 'Connect store billing, products and customer records with daily operations.',
    tone: 'blue',
  },
  {
    label: 'WhatsApp CRM',
    to: '/whatsapp-crm',
    text: 'Use conversations, follow-ups and campaigns alongside managed services.',
    tone: 'emerald',
  },
]

const toneStyles = {
  indigo: {
    iconBg: 'bg-indigo-100/80',
    text: 'text-indigo-700',
    ring: 'ring-indigo-200/60',
    gradient: 'from-indigo-50 to-blue-50',
  },
  blue: {
    iconBg: 'bg-blue-100/80',
    text: 'text-blue-700',
    ring: 'ring-blue-200/60',
    gradient: 'from-blue-50 to-sky-50',
  },
  emerald: {
    iconBg: 'bg-emerald-100/80',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200/60',
    gradient: 'from-emerald-50 to-teal-50',
  },
}

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

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_64%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute left-[7%] top-12 hidden h-48 w-48 rotate-3 bg-[radial-gradient(circle,#bfdbfe_1px,transparent_1px)] [background-size:17px_17px] opacity-40 lg:block" />
        <div className="pointer-events-none absolute right-[9%] top-28 hidden h-52 w-52 -rotate-6 bg-[radial-gradient(circle,#c7d2fe_1px,transparent_1px)] [background-size:18px_18px] opacity-40 lg:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          {/* Left column */}
          <div>
            <Link
              to="/"
              className="group inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/75 px-4 py-2 text-[13px] font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-px hover:border-slate-300/70 hover:bg-white hover:text-slate-500 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97] sm:min-h-[42px] sm:px-5 sm:text-sm"
            >
              <HiOutlineArrowLeft className="h-[17px] w-[17px] transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to Website
            </Link>

            <p className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineBriefcase className="h-3.5 w-3.5" />
              Business Services
            </p>

            <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
              Back-office help that works with your{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Nexora system.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              Request setup, staffing, bookkeeping, customer support, lead generation, social media,
              website management, or custom development — all from one clean service window.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#business-services"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
              >
                View Services
                <HiOutlineArrowRight className="h-[17px] w-[17px]" />
              </a>
              <Link
                to="/pricing"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
              >
                Software Pricing
              </Link>
            </div>
          </div>

          {/* Right sidebar card */}
          <aside className="rounded-[1.8rem] border border-slate-200/60 bg-white/80 p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  Support Window
                </p>
                <h2 className="mt-2 text-xl font-medium tracking-[-0.01em] text-slate-900 sm:text-2xl">
                  Request, review, approve, activate.
                </h2>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white">
                <HiOutlineSparkles className="h-[22px] w-[22px]" />
              </span>
            </div>

            <div className="mt-5 grid gap-2.5">
              {[
                'Choose the service you need',
                'Send company and support details',
                'Nexora reviews and shares next steps',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  <HiOutlineCheckCircle className="h-[18px] w-[18px] shrink-0 text-emerald-600" />
                  <p className="text-[13px] font-medium tracking-[-0.01em] text-slate-500">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {serviceStats.map(({ value, label, icon: Icon }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3 text-center">
                  <Icon className="mx-auto h-[18px] w-[18px] text-slate-400" />
                  <p className="mt-1 text-base font-medium tracking-[-0.01em] text-slate-900">
                    {value}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <HiOutlineSparkles className="h-[18px] w-[18px] text-amber-400" />
                <p className="text-[13px] font-medium tracking-[-0.01em]">
                  Built for daily operations, not just forms.
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Your request moves through review, proposal, approval, active work and closure with
                timeline updates.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Business Services Section (forms & listing) ── */}
      <BusinessServicesSection />

      {/* ── Related Software ── */}
      <section
        data-reveal
        className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
                Related Software
              </span>
              <h2 className="mt-5 max-w-3xl text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
                Software that supports your service workflow
              </h2>
            </div>
            <Link
              to="/contact"
              className="inline-flex min-h-[42px] w-max items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-5 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
            >
              Contact Nexora
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {relatedServiceLinks.map((item) => {
              const t = toneStyles[item.tone]
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.18)] active:scale-[0.98]`}
                >
                  <div
                    className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${t.gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60`}
                  />
                  <p className="relative text-[17px] font-medium tracking-[-0.01em] text-slate-900">
                    {item.label}
                  </p>
                  <p className="relative mt-2 text-[13px] leading-[1.65] text-slate-500">
                    {item.text}
                  </p>
                  <span
                    className={`relative mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-medium tracking-[-0.01em] ${t.text} transition-all duration-200 group-hover:gap-2`}
                  >
                    View solution
                    <HiOutlineArrowRight className="h-[15px] w-[15px] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
