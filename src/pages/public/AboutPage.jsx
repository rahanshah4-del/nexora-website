import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const companyCards = [
  ['Software company in Pakistan', 'Nexora Solution builds cloud business software for POS, ERP, CRM, transport, school and WhatsApp-led operations.'],
  ['Business-first product thinking', 'Every module is designed around daily owner visibility, staff access, records, reports and practical workflows.'],
  ['Support for growing teams', 'We help businesses move from scattered manual work into one shared workspace with guided onboarding and support.'],
]

const team = [
  ['Product & Engineering', 'Builds Nexora platform features, security controls, public website systems and business modules.'],
  ['Implementation Support', 'Guides setup, onboarding, data preparation, staff roles and first workflow launch.'],
  ['Business Operations', 'Supports service requests, client communication, reviews, proposals and ongoing coordination.'],
]

const trustSignals = [
  ['2019-2026', 'Business software experience timeline'],
  ['Pakistan', 'Area served and local market focus'],
  ['Multi-module', 'POS, ERP, CRM, transport and WhatsApp workflows'],
  ['Owner-led', 'Built for visibility, permissions and accountability'],
]

export default function AboutPage() {
  const seo = getSeoForPath('/about')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] py-16 sm:py-20 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">About Us</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Nexora Solution is Pakistan’s software partner for POS, ERP and CRM teams.</h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              We build modern business software that helps restaurants, retail stores, schools, transport operations and sales teams move faster with fewer manual tasks.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {companyCards.map(([title, text]) => (
              <article key={title} className="rounded-[1.75rem] border border-blue-100 bg-white p-8 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)]">
                <h2 className="text-lg font-black text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">
              Why Choose Nexora
            </span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Built around real business operations.</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Nexora focuses on practical workflows: billing, inventory, leads, customers, staff permissions, service requests and reporting. Our goal is to help owners run one shared workspace instead of disconnected files and manual updates.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {trustSignals.map(([value, label]) => (
              <div key={label} className="rounded-[1.35rem] border border-blue-100 bg-white p-5 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)]">
                <p className="text-2xl font-black text-blue-700">{value}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              Team & Experience
            </span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">People behind the platform.</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Nexora combines product engineering, implementation support and business operations experience to help teams launch software with clarity.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {team.map(([title, text]) => (
              <article key={title} className="rounded-[1.35rem] border border-blue-100 bg-white p-6 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)]">
                <h3 className="text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(37,99,235,0.44)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Contact Nexora Solution</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Website: https://nexorasolution.online · WhatsApp: 03194329754 · Area served: Pakistan.
            </p>
          </div>
          <a href="https://wa.me/923194329754" target="_blank" rel="noreferrer" className="premium-button-primary">
            WhatsApp Nexora
          </a>
        </div>
      </section>
    </PublicPageShell>
  )
}
