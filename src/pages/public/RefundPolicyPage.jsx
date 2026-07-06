import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const sections = [
  ['Software subscriptions', 'Nexora subscriptions are reviewed based on the plan, activation status, billing cycle and support already delivered. If a refund is applicable, Nexora will confirm the approved amount and timeline after review.'],
  ['Business services', 'Business service payments may include setup, staffing, consultation, managed support or custom work. Refund eligibility depends on whether work has started, scope has been approved or resources have been assigned.'],
  ['Custom development', 'Custom development, implementation, migration and one-time setup work may be non-refundable once approved work has started. Any exception will be reviewed case by case.'],
  ['How to request a review', 'Contact Nexora on WhatsApp or email with your business name, payment details, service name and reason for review. Nexora will respond with next steps.'],
]

export default function RefundPolicyPage() {
  const seo = getSeoForPath('/refund-policy')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Refund Policy</span>
      </nav>
      <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Refund Policy</p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Refund and service review policy.</h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              This page explains how Nexora Solution reviews refund requests for software subscriptions, business services, setup work and custom development.
            </p>
            <div className="mt-10 space-y-6">
              {sections.map(([title, text]) => (
                <section key={title} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-6">
                  <h2 className="text-xl font-black text-slate-950">{title}</h2>
                  <p className="mt-3 leading-7 text-slate-600">{text}</p>
                </section>
              ))}
            </div>
            <div className="mt-10 rounded-[1.35rem] border border-blue-100 bg-blue-50 p-6">
              <h2 className="text-xl font-black text-slate-950">Need help?</h2>
              <p className="mt-3 leading-7 text-slate-600">WhatsApp Nexora at 03194329754 or use the contact page to request a billing or service review.</p>
              <Link to="/contact" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
                Contact Nexora
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
