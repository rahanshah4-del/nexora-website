import Link from '../../components/AppLink.jsx'
import { useState, useMemo } from 'react'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineGlobeAlt, HiOutlineChevronDown, HiOutlineSparkles } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import { getCountry } from '../../lib/countries.js'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const globalServices = [
  { label: 'Restaurant POS', desc: 'AI-powered KOT, table management, billing & kitchen display for restaurants and cafes.' },
  { label: 'Retail POS', desc: 'Multi-counter billing, barcode, inventory, GST/VAT receipts & customer ledger.' },
  { label: 'School ERP', desc: 'Student records, fees, attendance, exams, parent portal & staff payroll.' },
  { label: 'WhatsApp CRM', desc: 'Automated messaging, lead capture, campaigns & multi-agent support via WhatsApp.' },
  { label: 'AI Solutions', desc: 'DeepSeek & Gemini-powered chatbots, predictive analytics & image recognition.' },
  { label: 'Custom CRM', desc: 'Tailored CRM with sales pipeline, lead scoring, automation & mobile access.' },
  { label: 'ERP Solutions', desc: 'Unified finance, HR, inventory & procurement — one real-time platform.' },
  { label: 'Mobile Apps', desc: 'iOS & Android apps with Flutter, offline support & AI-powered features.' },
  { label: 'Cloud Solutions', desc: 'Cloud migration, serverless architecture, CI/CD & managed hosting.' },
]

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[13px] leading-[1.7] text-slate-500">{faq.a}</p></div>
      </div>
    </article>
  )
}

export default function CountryPage({ slug }) {
  const country = useMemo(() => getCountry(slug), [slug])
  const [openFaq, setOpenFaq] = useState(0)

  if (!country) {
    return (
      <PublicPageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl">{country?.flag || '🌍'}</p>
            <h1 className="mt-4 text-2xl font-semibold text-slate-900">Country not found</h1>
            <Link to="/" className="mt-4 inline-flex items-center gap-2 text-blue-600">← Back to Home</Link>
          </div>
        </div>
      </PublicPageShell>
    )
  }

  const seoData = {
    path: `/${country.slug}`,
    title: country.seoTitle,
    description: country.seoDescription,
    keywords: country.seoKeywords,
    canonical: `https://nexorasolution.online/${country.slug}/`,
    ogTitle: country.seoTitle,
    ogDescription: country.seoDescription,
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
  }

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge={country.name} badgeIcon={HiOutlineGlobeAlt}>
      <PageSeo {...seoData} faqItems={country.faqs.map(f => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span><span aria-current="page">{country.name}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_64%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-700 shadow-sm backdrop-blur-xl">
            {country.flag} {country.region} · {country.currency} · {country.population}
          </p>
          <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
            {country.heroHeading}{' '}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{country.heroHighlight}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">{country.heroSubtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]">
              Start Free Trial <HiOutlineArrowRight className="text-lg" />
            </a>
            <Link to="/pricing" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium text-slate-500 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Why Nexora */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Why {country.name} <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">chooses Nexora</span>
            </h2>
          </div>
          <div className="mt-8 rounded-[1.8rem] border border-slate-200/60 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 sm:p-8">
            <p className="text-[15px] leading-[1.75] text-slate-600">{country.whyNexora}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: `${country.currency} Pricing`, desc: `All plans in ${country.currency}. Localized pricing for ${country.name} businesses.` },
              { label: `${country.timezone} Support`, desc: `Support coverage aligned with ${country.name} business hours.` },
              { label: 'Global Cloud', desc: `Cloudflare edge network ensures sub-50ms latency for ${country.name} users.` },
              { label: 'AI-Powered', desc: 'DeepSeek & Gemini AI built into every product — smarter automation.' },
              { label: 'Enterprise Security', desc: 'AES-256 encryption, SOC 2 infrastructure, role-based access control.' },
              { label: '30-Day Guarantee', desc: 'Full refund if not satisfied. No questions asked. Cancel anytime.' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white p-4">
                <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{item.label}</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Local Edge */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="rounded-[1.8rem] border border-slate-200/60 bg-white p-6 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{country.flag}</span>
              <h2 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">Built for {country.name}</h2>
            </div>
            <p className="mt-4 text-[15px] leading-[1.75] text-slate-600">{country.localEdge}</p>
          </div>
        </div>
      </section>

      {/* Global Services */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              Solutions for <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{country.name}</span>
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {globalServices.map(s => (
              <Link
                key={s.label}
                to={s.label === 'Restaurant POS' ? '/restaurant-pos' :
                    s.label === 'Retail POS' ? '/retail-pos' :
                    s.label === 'School ERP' ? '/school-erp' :
                    s.label === 'WhatsApp CRM' ? '/whatsapp-crm' :
                    s.label === 'AI Solutions' ? '/ai' :
                    s.label === 'Custom CRM' ? '/crm-development' :
                    s.label === 'ERP Solutions' ? '/erp-development' :
                    s.label === 'Mobile Apps' ? '/mobile-app-development' :
                    s.label === 'Cloud Solutions' ? '/cloud-solutions' :
                    '/software-development'}
                className="group flex flex-col rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_-16px_rgba(15,23,42,0.16)]"
              >
                <h3 className="text-[15px] font-semibold text-slate-900">{s.label}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-[1.6] text-slate-500">{s.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:gap-1.5">
                  Learn More <HiOutlineArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Internal links */}
      <section data-reveal className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'CRM', to: '/solutions/crm/' },
              { label: 'POS Solutions', to: '/restaurant-pos' },
              { label: 'ERP', to: '/erp-development' },
              { label: 'AI Solutions', to: '/ai' },
              { label: 'Software Dev', to: '/software-development' },
              { label: 'Contact', to: '/contact' },
              { label: 'Pricing', to: '/pricing' },
            ].map(link => (
              <Link key={link.label} to={link.to} className="rounded-full border border-slate-200/60 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:text-slate-900 hover:shadow-md">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">
              {country.name} <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">FAQs</span>
            </h2>
          </div>
          <div className="mt-10 grid gap-3">
            {country.faqs.map((faq, i) => (
              <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-reveal className="px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-slate-200/60 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{country.ctaHeading}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">{country.ctaSubtext}</p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]">
              Start Free Trial <HiOutlineArrowRight className="text-lg" />
            </a>
            <Link to="/contact" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium text-slate-500 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
