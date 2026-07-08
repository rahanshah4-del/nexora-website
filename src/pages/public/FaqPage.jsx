import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const faqItems = [
  {
    q: 'What is Nexora Solution?',
    a: 'Nexora is a business software platform for Restaurants, Retail, Schools, Transport, Medical Stores and Enterprises. It includes CRM, POS, ERP, and operations tools in one dashboard.',
  },
  {
    q: 'How do I start using Nexora?',
    a: 'Sign up for a free account at nexorasolution.online, select your business module, and start exploring your workspace. No credit card is required for the free trial.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. After the free trial, you can continue with Free Forever — 1 workspace, 1 user, 50 customers, 20 leads, 10 invoices per month, and basic CRM tools.',
  },
  {
    q: 'Can I upgrade later?',
    a: 'Yes. The Standard plan at Rs 5,999/month adds unlimited users, records, reports, analytics, team management, and support tickets.',
  },
  {
    q: 'What modules does Nexora offer?',
    a: 'Nexora CRM, Restaurant POS, Retail POS, Medical Store POS, School ERP, Transport Management, WhatsApp CRM, and Property ERP.',
  },
  {
    q: 'Can my team use Nexora together?',
    a: 'Yes. Nexora supports multi-user access with role-based permissions so owners, managers, cashiers, and staff see only what they need.',
  },
  {
    q: 'Do you provide support?',
    a: 'Yes. Contact us via WhatsApp at +92 319 432 9754 or email rahanshah4@gmail.com for guidance, setup help, and support.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Nexora uses secure cloud infrastructure with role-based access control and data sync across devices.',
  },
]

export default function FaqPage() {
  const seo = getSeoForPath('/faq')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">FAQ</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Frequently Asked Questions</h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              Quick answers to common questions about Nexora Solution.
            </p>
          </div>

          <div className="mt-12 grid gap-4">
            {faqItems.map(({ q, a }) => (
              <article key={q} className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_18px_54px_-42px_rgba(15,23,42,0.36)]">
                <h2 className="text-base font-black text-slate-950">{q}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{a}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-slate-600">
              Still have questions?{' '}
              <Link to="/contact" className="font-extrabold text-blue-600 hover:text-blue-700">Contact us</Link>
            </p>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
