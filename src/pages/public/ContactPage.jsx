import { Link } from 'react-router-dom'
import { HiOutlineChatBubbleLeftRight, HiOutlineEnvelope, HiOutlineMapPin, HiOutlinePhone, HiOutlineShieldCheck } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const contactMethods = [
  ['WhatsApp / Phone', '03194329754', 'https://wa.me/923194329754', HiOutlinePhone],
  ['Email', 'rahanshah4@gmail.com', 'mailto:rahanshah4@gmail.com', HiOutlineEnvelope],
  ['Website', 'https://nexorasolution.online', '/', HiOutlineShieldCheck],
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

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">
              Contact Nexora
            </span>
            <h1 className="website-hero-heading mt-6 text-[2.8rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.2rem] lg:text-[5.35rem]">
              Talk to Nexora about your <span className="marker-highlight marker-highlight-blue">business software.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Contact Nexora Solution for POS, ERP, CRM, WhatsApp CRM, transport software, business services, onboarding and pricing questions in Pakistan.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <a href="https://wa.me/923194329754" target="_blank" rel="noreferrer" className="premium-button-primary">
                WhatsApp Nexora
                <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
              </a>
              <Link to="/pricing" className="premium-button-secondary">
                View Pricing
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-blue-100 bg-white/92 p-6 shadow-[0_34px_100px_-60px_rgba(37,99,235,0.48)]">
            <h2 className="text-2xl font-black text-slate-950">Business details</h2>
            <div className="mt-6 grid gap-4">
              {contactMethods.map(([label, value, href, Icon]) => (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 hover:border-blue-200 hover:bg-blue-50">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-slate-950">{label}</span>
                    <span className="mt-1 block text-sm font-bold text-slate-600">{value}</span>
                  </span>
                </a>
              ))}
              <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                  <HiOutlineMapPin className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-black text-slate-950">Area served</span>
                  <span className="mt-1 block text-sm font-bold text-slate-600">Pakistan</span>
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">How we can help</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Send a message with your business type, current workflow and software need. Nexora team can guide you toward the right product or service page.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {supportTopics.map((topic) => (
              <div key={topic} className="rounded-[1.25rem] border border-blue-100 bg-white p-5 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)]">
                <p className="text-sm font-black text-slate-950">{topic}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
