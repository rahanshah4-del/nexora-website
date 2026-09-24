import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { refundPolicy } from '../../lib/legalContent.js'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const sections = refundPolicy.sections.map(({ heading, paragraphs }) => [heading, paragraphs.join(' ')])

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
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">Refund Policy</p>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Refund and service review policy.</h1>
            <p className="mt-4 text-sm text-slate-500">Last updated: {refundPolicy.lastUpdated}</p>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">{refundPolicy.intro}</p>
            <div className="mt-10 space-y-4">
              {sections.map(([title, text]) => (
                <section key={title} className="rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)]">
                  <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</h2>
                  <p className="mt-2 text-[14px] leading-[1.7] text-slate-500">{text}</p>
                </section>
              ))}
            </div>
            <div className="mt-8 rounded-[1.2rem] border border-slate-200/60 bg-slate-50/70 p-6">
              <h2 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">Need help?</h2>
              <p className="mt-2 text-[14px] leading-[1.7] text-slate-500">WhatsApp Nexora at 03194329754 or use the contact page to request a billing or service review.</p>
              <Link to="/contact" className="mt-4 inline-flex min-h-[40px] items-center rounded-full bg-slate-900 px-5 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]">
                Contact Nexora
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
