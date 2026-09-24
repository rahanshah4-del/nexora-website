import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import { companyCards, team, trustSignals } from '../../lib/aboutContent.js'

export default function AboutPage() {
  const seo = getSeoForPath('/about')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      {/* ── Hero ── */}
      <section className="relative bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] py-16 sm:py-20 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              About Us
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Nexora Solution is Pakistan's software partner for POS, ERP and CRM teams.
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              We build modern business software that helps restaurants, retail stores, schools, transport operations and sales teams move faster with fewer manual tasks.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {companyCards.map(({ title, text }) => (
              <article key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-8 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</h2>
                <p className="mt-3 text-[14px] leading-[1.7] text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ── */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              Why Choose Nexora
            </span>
            <h2 className="mt-5 text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Built around real business operations.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-500">
              Nexora focuses on practical workflows: billing, inventory, leads, customers, staff permissions, service requests and reporting. Our goal is to help owners run one shared workspace instead of disconnected files and manual updates.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {trustSignals.map(({ value, label }) => (
              <div key={label} className="rounded-[1.2rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)]">
                <p className="text-2xl font-medium tracking-[-0.02em] text-slate-900">{value}</p>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              Team & Experience
            </span>
            <h2 className="mt-5 text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
              People behind the platform.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-500">
              Nexora combines product engineering, implementation support and business operations experience to help teams launch software with clarity.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {team.map(({ title, text }) => (
              <article key={title} className="rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)]">
                <h3 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[1.8rem] border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">
              Contact Nexora Solution
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-slate-500">
              Website: https://nexorasolution.online · WhatsApp: 03194329754 · Area served: Pakistan.
            </p>
          </div>
          <a
            href="https://wa.me/923194329754"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] w-max items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
          >
            WhatsApp Nexora
          </a>
        </div>
      </section>
    </PublicPageShell>
  )
}
