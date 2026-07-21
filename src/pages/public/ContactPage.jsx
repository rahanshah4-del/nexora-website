import { Link } from 'react-router-dom'
import { HiOutlineSparkles, HiOutlineChatBubbleLeftRight, HiOutlineEnvelope, HiOutlineMapPin, HiOutlinePhone, HiOutlineShieldCheck } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const contactMethods = [
  { label: 'WhatsApp / Phone', value: '03194329754', href: 'https://wa.me/923194329754', icon: HiOutlinePhone },
  { label: 'Email', value: 'rahanshah4@gmail.com', href: 'mailto:rahanshah4@gmail.com', icon: HiOutlineEnvelope },
  { label: 'Website', value: 'https://nexorasolution.online', href: '/', icon: HiOutlineShieldCheck },
]

const supportTopics = [
  'POS software demo',
  'School ERP consultation',
  'CRM and WhatsApp CRM setup',
  'Transport software workflow',
  'Business services request',
  'Pricing and onboarding',
]

export default function ContactPage() {
  const seo = getSeoForPath('/contact')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Contact</span>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_64%,#f1f5f9_100%)] py-16 pt-20 sm:py-20 sm:pt-24 lg:py-24 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Contact Nexora
            </span>
            <h1 className="mt-6 max-w-4xl text-[2.5rem] font-bold leading-[1.06] tracking-[-0.02em] text-slate-950 sm:text-[3.5rem] lg:text-[4.2rem]">
              Talk to Nexora about your{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                business software.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              Contact Nexora Solution for POS, ERP, CRM, WhatsApp CRM, transport software, business services, onboarding and pricing questions in Pakistan.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <a
                href="https://wa.me/923194329754"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
              >
                WhatsApp Nexora
                <HiOutlineChatBubbleLeftRight className="h-[17px] w-[17px]" />
              </a>
              <Link
                to="/pricing"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-semibold tracking-[-0.01em] text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="rounded-[1.8rem] border border-slate-200/60 bg-white/80 p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-slate-900">Business details</h2>
            <div className="mt-5 grid gap-3">
              {contactMethods.map(({ label, value, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noreferrer' : undefined}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-slate-200 hover:bg-white"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold tracking-[-0.01em] text-slate-900">{label}</span>
                    <span className="mt-0.5 block text-[13px] text-slate-500">{value}</span>
                  </span>
                </a>
              ))}
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-700">
                  <HiOutlineMapPin className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold tracking-[-0.01em] text-slate-900">Area served</span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">Pakistan</span>
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── How we can help ── */}
      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-slate-950 sm:text-4xl">
              How we can help
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Send a message with your business type, current workflow and software need. Nexora team can guide you toward the right product or service page.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supportTopics.map((topic) => (
              <div key={topic} className="rounded-[1.2rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)]">
                <p className="text-[14px] font-semibold tracking-[-0.01em] text-slate-700">{topic}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
