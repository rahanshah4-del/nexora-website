import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'

// The single help page. /support-center/ and /documentation/ were merged in
// here (their URLs 301 to /help-center/): the support contact options and the
// product documentation index below are their content, unchanged.
const helpTopics = [
  { title: 'Start with Nexora', text: 'Create an account, select your module, and open your workspace.', to: '/signup' },
  { title: 'Pricing and plans', text: 'Compare Free Forever, Standard, and Enterprise plans.', to: '/pricing' },
  { title: 'Business services', text: 'Request setup, support, bookkeeping, marketing, or managed operations.', to: '/business-services' },
  { title: 'Contact support', text: 'Reach Nexora through WhatsApp or email for guidance.', to: '/contact' },
  { title: 'FAQ', text: 'Get answers to the most common questions about Nexora.', to: '/faq' },
  { title: 'Contact via WhatsApp', text: 'Reach out directly on WhatsApp for immediate assistance.', to: 'https://wa.me/923194329754' },
  { title: 'Email Support', text: 'Send an email and our team will respond promptly.', to: 'mailto:support@nexorasolution.online' },
]

const docs = [
  ['Restaurant POS', 'Billing, KOT, tables, cashier flow, and restaurant operations.', '/restaurant-pos'],
  ['Retail POS', 'Products, inventory, receipts, staff permissions, and sales workflow.', '/retail-pos'],
  ['School ERP', 'Students, attendance, fees, exams, parent workflows, and reporting.', '/school-erp'],
  ['WhatsApp CRM', 'Broadcasts, follow-ups, customer tracking, and campaign workflows.', '/whatsapp-crm'],
  ['Blog guides', 'Long-form tutorials and SEO guides for business software.', '/blog'],
  ['HTML sitemap', 'Browse every public Nexora page and content resource.', '/sitemap'],
]

const CARD_CLASS = 'group rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)] active:scale-[0.98]'

function TopicCard({ title, text, to }) {
  const isExternal = to.startsWith('http') || to.startsWith('mailto')
  const Component = isExternal ? 'a' : Link
  const linkProps = isExternal ? { href: to, target: '_blank', rel: 'noreferrer' } : { to }
  return (
    <Component {...linkProps} className={CARD_CLASS}>
      <h3 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
      <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{text}</p>
    </Component>
  )
}

export default function HelpCenterPage() {
  const seo = getSeoForPath('/help-center')

  return (
    <PublicPageShell>
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] py-16 sm:py-20 lg:py-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Help Center
            </span>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-slate-900 sm:text-5xl">Get help with Nexora Solution.</h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Find quick links for starting your workspace, reviewing pricing, requesting business services, and contacting Nexora support.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {helpTopics.map((topic) => <TopicCard key={topic.title} {...topic} />)}
          </div>

          <div className="mx-auto mt-20 max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-slate-900">Documentation</h2>
            <p className="mt-4 text-base leading-8 text-slate-500">
              Use this page as a public documentation index for Nexora POS, ERP, CRM, WhatsApp CRM, blog guides, and support resources.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {docs.map(([title, text, to]) => <TopicCard key={title} title={title} text={text} to={to} />)}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
