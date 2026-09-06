import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import CopyEmailButton from '../../components/CopyEmailButton.jsx'
import PublicPageShell from './PublicPageShell.jsx'

const faqItems = [
  { q: 'What is Nexora Solution?', a: 'Nexora is a business software platform for Restaurants, Retail, Schools, Transport, Medical Stores and Enterprises. It includes CRM, POS, ERP, and operations tools in one dashboard.' },
  { q: 'How do I start using Nexora?', a: 'Sign up for a free account at nexorasolution.online, select your business module, and start exploring your workspace. No credit card is required for the free trial.' },
  { q: 'Is there a free plan?', a: 'Yes. After the free trial, you can continue with Free Forever — 1 workspace, 1 user, 50 customers, 20 leads, 10 invoices per month, and basic CRM tools.' },
  { q: 'Can I upgrade later?', a: 'Yes. The Standard plan at Rs 3,000/month (50% OFF for new users) adds unlimited users, records, reports, analytics, team management, and support tickets.' },
  { q: 'What modules does Nexora offer?', a: 'Nexora CRM, Restaurant POS, Retail POS, Medical Store POS, School ERP, Transport Management, WhatsApp CRM, and Property ERP.' },
  { q: 'Can my team use Nexora together?', a: 'Yes. Nexora supports multi-user access with role-based permissions so owners, managers, cashiers, and staff see only what they need.' },
  { q: 'Do you provide support?', a: 'Yes. Contact us via WhatsApp at +92 319 432 9754 or email ', email: 'support@nexorasolution.online', b: ' for guidance, setup help, and support.' },
  { q: 'Is my data secure?', a: 'Yes. Nexora uses secure cloud infrastructure with role-based access control and data sync across devices.' },
]

export default function FaqPage() {
  const seo = getSeoForPath('/faq')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              FAQ
            </span>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Frequently Asked Questions</h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Quick answers to common questions about Nexora Solution.
            </p>
          </div>

          <div className="mt-12 grid gap-3">
            {faqItems.map(({ q, a, email, b }) => (
              <article key={q} className="rounded-[1.2rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] sm:p-6">
                <h2 className="text-[15px] font-medium tracking-[-0.01em] text-slate-900">{q}</h2>
                <p className="mt-2 text-[14px] leading-[1.7] text-slate-500">
                  {a}
                  {email ? <span className="inline-flex items-center"><a href={`mailto:${email}`} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">{email}</a><CopyEmailButton email={email} /></span> : null}
                  {b || ''}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500">
              Still have questions?{' '}
              <Link to="/contact" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-black hover:decoration-slate-900">
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
