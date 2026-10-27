import Link from '../../components/AppLink.jsx'
import { HiOutlineSparkles, HiOutlineChatBubbleLeftRight, HiOutlineEnvelope, HiOutlineMapPin, HiOutlinePhone, HiOutlineShieldCheck } from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import CopyEmailButton from '../../components/CopyEmailButton.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'
import ContactLeadForm from '../../components/ContactLeadForm.jsx'
import OfficeMap from '../../components/OfficeMap.jsx'
import { SITE_ADDRESS_TEXT, SITE_EMAILS } from '../../lib/seoStructuredData.js'

const contactMethods = [
  { label: 'WhatsApp / Phone', value: '03194329754', href: 'https://wa.me/923194329754', icon: HiOutlinePhone },
  { label: 'Sales email', value: SITE_EMAILS.sales, href: `mailto:${SITE_EMAILS.sales}`, icon: HiOutlineEnvelope },
  { label: 'Support email', value: SITE_EMAILS.support, href: `mailto:${SITE_EMAILS.support}`, icon: HiOutlineEnvelope },
  { label: 'Website', value: 'https://nexorasolution.us', href: '/', icon: HiOutlineShieldCheck },
]

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-[15px] font-medium tracking-[-0.01em] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] sm:w-auto'
const ctaPrimary = `${ctaBase} bg-slate-900 text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)]`
const ctaSecondary = `${ctaBase} border border-slate-200/70 bg-white/80 text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl hover:border-slate-300/80 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)]`

const steps = [
  { title: 'We read your message.', text: 'Tell us your business type (restaurant, retail shop, pharmacy, school, rental fleet or sales team), how many users and branches you have, and what you do on paper or in spreadsheets today.' },
  { title: 'We reply within one business day', text: 'on WhatsApp or email with the product that fits, a short walkthrough and answers to your pricing questions.' },
  { title: 'You start a free 1-month trial.', text: 'Set up your items, students, vehicles or customers, test the workflow with your own team, then choose a plan only if it works for you.' },
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
      <section className="relative overflow-hidden bg-white pb-14 pt-20 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Contact Nexora
            </span>
            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.03em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
              Talk to Nexora about your{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                business software.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              Contact Nexora Solution for POS, ERP, CRM, WhatsApp CRM, transport software, business services, onboarding and pricing questions in Pakistan.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <a href="https://wa.me/923194329754" target="_blank" rel="noreferrer" className={ctaPrimary}>
                WhatsApp Nexora
                <HiOutlineChatBubbleLeftRight className="h-[18px] w-[18px]" />
              </a>
              <Link to="/pricing" className={ctaSecondary}>
                View Pricing
              </Link>
            </div>
          </div>

          {/* Contact method cards */}
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactMethods.map(({ label, value, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noreferrer' : undefined}
                className="group rounded-[1.35rem] border border-slate-200/60 bg-white/80 p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.14)]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-[14px] font-medium tracking-[-0.01em] text-slate-900">{label}</span>
                <span className="mt-1 inline-flex max-w-full flex-wrap items-center break-all text-[13px] leading-6 text-slate-500">
                  <span>{value}</span>
                  {href.startsWith('mailto:') ? <CopyEmailButton email={value} /> : null}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact form + office ── */}
      <section id="contact-form" className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:px-8">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">Send us a message</h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Tell us about your business and what you need. We reply on WhatsApp or email, usually within one business day.
            </p>
            <div className="mt-8 flex items-start gap-3 rounded-[1.35rem] border border-slate-200/60 bg-slate-50/70 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-200 text-slate-600">
                <HiOutlineMapPin className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[14px] font-medium tracking-[-0.01em] text-slate-900">Head office</span>
                <span className="mt-1 block text-[13px] leading-6 text-slate-500">{SITE_ADDRESS_TEXT}</span>
              </span>
            </div>
            <OfficeMap className="mt-4" />
          </div>
          <div className="rounded-[1.8rem] border border-slate-200/60 bg-white p-5 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.1)] sm:p-8">
            <ContactLeadForm />
          </div>
        </div>
      </section>

      {/* ── What happens next ── */}
      <section className="bg-white pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">What happens after you contact us</h2>
          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {steps.map(({ title, text }, i) => (
              <li key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-7 text-[14px] leading-[1.7] text-slate-500 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-medium text-white">{i + 1}</span>
                <strong className="mt-5 block text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</strong>
                <span className="mt-2 block">{text}</span>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-8 max-w-3xl text-center text-[15px] leading-7 text-slate-500">
            Already a customer? Write to <a className="text-slate-900 underline" href={`mailto:${SITE_EMAILS.support}`}>{SITE_EMAILS.support}</a> for product support. For plans and costs, see <Link className="text-slate-900 underline" to="/pricing">pricing</Link> or browse the <Link className="text-slate-900 underline" to="/help-center">help center</Link>.
          </p>
        </div>
      </section>

      {/* ── How we can help ── */}
      <section className="bg-white py-16 sm:py-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
              How we can help
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              Send a message with your business type, current workflow and software need. Nexora team can guide you toward the right product or service page.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {supportTopics.map((topic) => (
              <span key={topic} className="rounded-full border border-slate-200/70 bg-white px-5 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
