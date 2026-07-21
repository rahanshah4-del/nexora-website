import { Link } from 'react-router-dom'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDevicePhoneMobile,
  HiOutlineShoppingCart,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineTruck,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

const industries = [
  {
    title: 'Restaurant',
    subtitle: 'POS & Management',
    description:
      'Streamline dine-in, takeaway and delivery with table management, KOT, inventory and real‑time reporting — built for busy kitchens.',
    icon: HiOutlineShoppingCart,
    tone: 'amber',
    route: '/restaurant-pos',
    features: ['Table & KOT management', 'Menu & recipe costing', 'Delivery integration', 'Real-time analytics'],
  },
  {
    title: 'Retail',
    subtitle: 'Point of Sale',
    description:
      'Barcode-ready billing, multi‑store inventory, customer loyalty and cashier controls — everything a modern shop needs to run smoothly.',
    icon: HiOutlineShoppingCart,
    tone: 'blue',
    route: '/retail-pos',
    features: ['Barcode billing', 'Multi-store inventory', 'Customer loyalty', 'Cashier role control'],
  },
  {
    title: 'Education',
    subtitle: 'School ERP',
    description:
      'Manage admissions, fees, attendance, exams and parent communication from one dashboard — purpose‑built for Pakistani schools.',
    icon: HiOutlineAcademicCap,
    tone: 'emerald',
    route: '/school-erp',
    features: ['Student & staff management', 'Fee & payroll tracking', 'Exam & grade reports', 'Parent portal'],
  },
  {
    title: 'Healthcare',
    subtitle: 'Medical Store POS',
    description:
      'Pharmacy billing with batch‑aware inventory, expiry alerts, alternative medicine suggestions and compliance reporting.',
    icon: HiOutlineShieldCheck,
    tone: 'rose',
    route: '/solutions/medical-store-pos',
    features: ['Batch & expiry tracking', 'Alternative suggestions', 'Pharmacy compliance', 'Sales performance'],
  },
  {
    title: 'Transport',
    subtitle: 'Fleet & Rentals',
    description:
      'Ticketing, route billing, vehicle tracking and customer ledgers — a complete operations suite for transport businesses.',
    icon: HiOutlineTruck,
    tone: 'cyan',
    route: '/transport',
    features: ['Fleet management', 'Route & trip billing', 'Customer ledger', 'Maintenance tracking'],
  },
  {
    title: 'Real Estate',
    subtitle: 'Property ERP',
    description:
      'Manage properties, tenants, rent collection and maintenance in one place — built for developers and rental agencies.',
    icon: HiOutlineBuildingOffice2,
    tone: 'violet',
    route: '/solutions/property-erp',
    features: ['Tenant & lease management', 'Rent collection', 'Maintenance requests', 'Owner reporting'],
  },
  {
    title: 'CRM & Sales',
    subtitle: 'Customer Relationship',
    description:
      'Track leads, automate follow‑ups, manage pipelines and close more deals — the central nervous system for your sales team.',
    icon: HiOutlineChatBubbleLeftRight,
    tone: 'indigo',
    route: '/solutions/crm',
    features: ['Lead & pipeline tracking', 'Automated follow-ups', 'Team collaboration', 'Sales analytics'],
  },
  {
    title: 'WhatsApp Commerce',
    subtitle: 'Chat & Convert',
    description:
      'Send catalogues, take orders and support customers right inside WhatsApp — turn conversations into conversions.',
    icon: HiOutlineDevicePhoneMobile,
    tone: 'green',
    route: '/whatsapp-crm',
    features: ['WhatsApp catalogues', 'Order via chat', 'Bulk messaging', 'Customer support'],
  },
]

const toneMap = {
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200/60',
    gradient: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100/80',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-200/60',
    gradient: 'from-blue-50 to-sky-50',
    iconBg: 'bg-blue-100/80',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200/60',
    gradient: 'from-emerald-50 to-teal-50',
    iconBg: 'bg-emerald-100/80',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200/60',
    gradient: 'from-rose-50 to-pink-50',
    iconBg: 'bg-rose-100/80',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    ring: 'ring-cyan-200/60',
    gradient: 'from-cyan-50 to-sky-50',
    iconBg: 'bg-cyan-100/80',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200/60',
    gradient: 'from-violet-50 to-purple-50',
    iconBg: 'bg-violet-100/80',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-200/60',
    gradient: 'from-indigo-50 to-blue-50',
    iconBg: 'bg-indigo-100/80',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-200/60',
    gradient: 'from-green-50 to-emerald-50',
    iconBg: 'bg-green-100/80',
  },
}

export default function IndustriesPage() {
  return (
    <PublicPageShell>
      <PageSeo
        title="Industry Software Solutions Pakistan | Nexora"
        description="See how Nexora serves restaurants, retail, schools, transport and service teams with tailored software workflows and cloud management."
        canonical={absoluteUrl('/industries')}
        path="/industries"
        ogTitle="Industry Solutions — Nexora"
        ogDescription="Tailored software for restaurants, retail, education, healthcare, transport and more."
        twitterCard="summary_large_image"
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Tailored by industry
            </span>
            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
              Software built for{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                your industry.
              </span>
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Every industry runs differently. Nexora gives you tools shaped to your workflow — not a
              one‑size‑fits‑all template. Choose your vertical and see what's possible.
            </p>
          </div>
        </div>
      </section>

      {/* ── Industries Grid ── */}
      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {industries.map((industry) => {
              const t = toneMap[industry.tone]
              const Icon = industry.icon
              return (
                <Link
                  key={industry.route}
                  to={industry.route}
                  className={`group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.18)] active:scale-[0.98]`}
                >
                  {/* Subtle gradient glow on hover */}
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${t.gradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60`}
                  />

                  {/* Icon */}
                  <span
                    className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl ${t.iconBg} ${t.text} ring-1 ${t.ring}`}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                  </span>

                  {/* Title */}
                  <h2 className="mt-4 text-[17px] font-medium tracking-[-0.01em] text-slate-900">
                    {industry.title}
                  </h2>
                  <p className="text-[13px] font-medium tracking-[-0.01em] text-slate-400">
                    {industry.subtitle}
                  </p>

                  {/* Description */}
                  <p className="mt-3 text-[13px] leading-[1.65] text-slate-500">
                    {industry.description}
                  </p>

                  {/* Feature pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {industry.features.map((feat) => (
                      <span
                        key={feat}
                        className="inline-flex rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1 text-[0.65rem] font-medium text-slate-500"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <span
                    className={`mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-medium tracking-[-0.01em] ${t.text} transition-all duration-200 group-hover:gap-2`}
                  >
                    Explore {industry.title}
                    <HiOutlineArrowRight className="h-[15px] w-[15px] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>

          {/* ── Bottom CTA banner ── */}
          <div className="mt-14 overflow-hidden rounded-[1.8rem] border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-[1px] shadow-[0_8px_40px_-16px_rgba(15,23,42,0.1)]">
            <div className="rounded-[1.75rem] bg-white/60 px-6 py-10 text-center backdrop-blur-xl sm:px-10 sm:py-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50/80 px-4 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200/50">
                <HiOutlineSparkles className="h-3.5 w-3.5" />
                Not sure which fits?
              </span>
              <h2 className="mt-5 text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">
                We'll help you find the right solution.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[15px] leading-7 text-slate-500">
                Tell us about your business and our team will recommend the best setup — no sales
                pitch, just practical advice.
              </p>
              <Link
                to="/contact"
                className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
              >
                Talk to our team
                <HiOutlineArrowRight className="h-[17px] w-[17px]" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
