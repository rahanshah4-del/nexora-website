import Link from '../components/AppLink.jsx'
import AISections from './AISections.jsx'
import { HiOutlineAcademicCap, HiOutlineArrowRight, HiOutlineBuildingOffice2, HiOutlineChartBarSquare, HiOutlineChatBubbleLeftRight, HiOutlineShieldCheck, HiOutlineShoppingCart, HiOutlineTruck, HiOutlineUserGroup } from 'react-icons/hi2'
import PublicTestimonials from '../components/PublicTestimonials.jsx'
import FreeToolsSection from './FreeToolsSection.jsx'
import NexoraIntroSection from './NexoraIntroSection.jsx'
import PublicFooter from '../pages/public/PublicFooter.jsx'
import { planPriceSentence } from '../lib/platformPlans.js'

const whatsappLink = 'https://wa.me/923194329754'
const whatsappLeadLink = `${whatsappLink}?text=${encodeURIComponent(
  'Assalam o Alaikum, I want a free demo of Nexora Business Suite.',
)}`

const moduleCards = [
  { title: 'CRM', text: 'Manage leads, customers, deals, follow-ups and invoices in one place.', icon: HiOutlineUserGroup, tone: 'blue', route: '/crm' },
  { title: 'School ERP', text: 'Manage students, fees, attendance, exams, parents and staff.', icon: HiOutlineAcademicCap, tone: 'green', route: '/school-erp' },
  { title: 'Property ERP', text: 'Manage properties, tenants, rent collection, maintenance and owners.', icon: HiOutlineBuildingOffice2, tone: 'purple', route: '/property-erp' },
  { title: 'POS', text: 'Point of sale, stock management, billing and sales reports.', icon: HiOutlineShoppingCart, tone: 'orange', route: '/restaurant-pos' },
  { title: 'Pharmacy POS', text: 'Pharmacy billing, medicine inventory, expiry checks, batches and counter reports.', icon: HiOutlineShieldCheck, tone: 'rose', route: '/pharmacy-pos' },
  { title: 'Fleet & Rental', text: 'Fleet, rental bookings, customer ledgers, dues and transport reports.', icon: HiOutlineTruck, tone: 'cyan', route: '/transport-fleet' },
  { title: 'WhatsApp CRM', text: 'Capture leads, auto reply, team inbox and close more deals faster.', icon: HiOutlineChatBubbleLeftRight, tone: 'emerald', route: '/whatsapp-crm' },
  { title: 'Reports', text: 'Advanced reports and analytics to grow your business with data.', icon: HiOutlineChartBarSquare, tone: 'sky', route: '/ai' },
]

const stats = [
  { value: '1 Month', label: 'Free Trial' },
  { value: 'PKR', label: 'Local Billing' },
  { value: 'Urdu + EN', label: 'Bilingual Support' },
  { value: 'Offline', label: 'POS Billing Mode' },
]




function ModuleIcon({ icon: Icon, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', purple: 'bg-violet-50 text-violet-600', orange: 'bg-orange-50 text-orange-500', rose: 'bg-rose-50 text-rose-600', cyan: 'bg-cyan-50 text-cyan-600', emerald: 'bg-green-50 text-green-600', sky: 'bg-sky-50 text-sky-600' }
  return <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="text-3xl" /></span>
}


export default function HomepageSections() {
  /* Sections are always visible — scroll-reveal was removed (see index.css)
     after fast-scroll left [data-reveal] sections stuck at opacity:0. */
  return (
    <>
      <NexoraIntroSection />
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">All Modules. <span className="marker-highlight marker-highlight-blue">One Platform.</span> Unlimited Possibilities.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">Powerful modules to run every part of your business efficiently.</p>
          </div>
          <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {moduleCards.map((card) => (
              <article key={card.title} className="premium-card group flex h-full min-h-[16.5rem] flex-col items-center p-6 text-center">
                <ModuleIcon icon={card.icon} tone={card.tone} />
                <h3 className="mt-4 text-lg font-extrabold text-slate-950">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{card.text}</p>
                <Link to={card.route} aria-label={`Learn more about ${card.title}`} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-blue-600">Learn More <HiOutlineArrowRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white px-5 pb-16 pt-2 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_64%,#f8fafc_100%)] p-4 shadow-[0_30px_90px_-62px_rgba(37,99,235,0.42)] lg:p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{stats.map((s) => (<div key={s.label} className="flex min-h-32 min-w-0 flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white p-5 text-center shadow-sm"><p className="whitespace-nowrap text-3xl font-black text-blue-600 sm:text-4xl"><span data-ai-counter={s.num} data-ai-suffix={s.suffix}>{s.value}</span></p><p className="mt-2 break-normal text-sm font-medium text-slate-700">{s.label}</p></div>))}</div>
        </div>
      </section>

      {/* ── Free tools: moved up (was after Pricing) for visibility — renders nothing until the tools launch ── */}
      <FreeToolsSection />

      {/* ── AI Sections ── */}
      <AISections />

      <section data-reveal data-ai="fade-up" className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(37,99,235,0.44)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">Dedicated Pricing</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Simple plans now live on one clear pricing page.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">Compare Basic, Business and Enterprise plans with feature details, FAQ and a free trial CTA in one place.</p>
          </div>
          <Link to="/pricing" className="premium-button-primary">View Pricing <HiOutlineArrowRight className="text-lg" /></Link>
        </div>
      </section>

      <section data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(37,99,235,0.44)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-4 ring-white sm:h-20 sm:w-20 sm:ring-8"><HiOutlineChatBubbleLeftRight className="text-3xl sm:text-5xl" /></span>
            <div><h2 className="text-3xl font-black tracking-tight text-slate-950">Want to See <span className="text-blue-600">Nexora</span> in Action?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Book a free live demo with our experts and see how Nexora can transform your business.</p></div>
          </div>
          <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className="premium-button-primary px-8">Book Free Demo <HiOutlineArrowRight className="text-lg" /></a>
        </div>
      </section>

      {/* ── Client Reviews / Testimonials ── */}
      <PublicTestimonials />

      {/* ── SEO Content ── */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600 shadow-sm">Why Nexora</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">One Platform for <span className="marker-highlight marker-highlight-blue">POS, ERP and CRM</span></h2>
          </div>
          <div className="mt-10 space-y-8">
            <p className="text-[15px] leading-8 text-slate-600">Nexora Solution is an all-in-one AI-powered business operating system for restaurants, retail stores, pharmacies, schools, transport fleets and growing businesses. Whether you run a single counter or several branches, Nexora gives you the tools to manage operations, staff, customers and finances from one unified platform.</p>
            <div>
              <h3 className="text-lg font-extrabold text-slate-950">Built for Real Counters, Anywhere</h3>
              <p className="mt-3 text-[15px] leading-8 text-slate-600">Nexora runs in a browser, keeps billing going when the internet drops with its offline-capable POS modules, and lets you set your own tax rate for the country you sell in. Plans are priced in PKR, and every plan includes free data migration and free staff training.</p>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-950">One Platform. Every Department.</h3>
              <p className="mt-3 text-[15px] leading-8 text-slate-600">Nexora replaces the disconnected mix of spreadsheets, WhatsApp groups and paper registers that most small businesses still rely on. The Restaurant POS handles orders, kitchen display and billing. The School ERP manages students, attendance and fee collection. The Retail POS covers inventory, sales and supplier management. The WhatsApp CRM automates customer communication. All modules share the same customer database, reports and team access controls — so nothing gets lost between departments.</p>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-950">Start Free — No Credit Card Required</h3>
              <p className="mt-3 text-[15px] leading-8 text-slate-600">Every Nexora plan starts with a free 1-month trial. No credit card required. No complicated setup. Sign up today and your business will be running on Nexora within the same day — with support from our Multan-based team along the way.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600 shadow-sm">FAQ</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Frequently Asked <span className="marker-highlight marker-highlight-blue">Questions</span></h2>
          </div>
          <dl className="mt-10 space-y-5">
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">What is Nexora Solution?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">Nexora Solution is a cloud business software company offering POS, CRM, ERP and automation software for restaurants, retail stores, pharmacies, schools, transport fleets and growing businesses, all from one platform. Our team is based in Multan, Pakistan, and the software runs in a browser, so you can start from anywhere.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">Who is Nexora built for?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">Nexora is built for small and growing businesses, from a single-counter restaurant or retail shop to multi-branch schools, pharmacy chains and transport fleets. Our modules adapt to your workflow, not the other way around, and you set your own tax rate and label so receipts fit the country you sell in.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">What does Nexora cost?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">{planPriceSentence()} Every plan includes a 1-month free trial, cloud sync, free updates, free data migration and free staff training. Yearly billing saves 20%.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">Does Nexora work offline?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">The POS modules support offline mode so you can keep billing even when the internet is down. Once you reconnect, all data syncs automatically to the cloud.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">How do I get started?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">Sign up for a free 1-month trial at nexorasolution.us/signup — no credit card required. Or book a live demo and our team will walk you through the modules that fit your business.</dd>
            </div>
          </dl>
        </div>
      </section>

      <PublicFooter />
    </>
  )
}
