import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import CopyEmailButton from '../components/CopyEmailButton.jsx'
import AISections from './AISections.jsx'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCloud,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentChartBar,
  HiOutlineGlobeAlt,
  HiOutlineMapPin,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaWhatsapp,
} from 'react-icons/fa6'
import NexoraLogo from '../components/brand/NexoraLogo'
import PublicTestimonials from '../components/PublicTestimonials.jsx'

const whatsappNumberDisplay = '+92 319 432 9754'
const whatsappLink = 'https://wa.me/923194329754'
const whatsappLeadLink = `${whatsappLink}?text=${encodeURIComponent(
  'Assalam o Alaikum, I want a free demo of Nexora Business Suite.',
)}`
const contactEmail = 'hello@nexorasolution.online'

const moduleCards = [
  { title: 'CRM', text: 'Manage leads, customers, deals, follow-ups and invoices in one place.', icon: HiOutlineUserGroup, tone: 'blue', route: '/solutions/crm' },
  { title: 'School ERP', text: 'Manage students, fees, attendance, exams, parents and staff.', icon: HiOutlineAcademicCap, tone: 'green', route: '/solutions/school-erp' },
  { title: 'Property ERP', text: 'Manage properties, tenants, rent collection, maintenance and owners.', icon: HiOutlineBuildingOffice2, tone: 'purple', route: '/solutions/property-erp' },
  { title: 'POS', text: 'Point of sale, stock management, billing and sales reports.', icon: HiOutlineShoppingCart, tone: 'orange', route: '/restaurant-pos' },
  { title: 'Medical Store POS', text: 'Pharmacy billing, medicine inventory, expiry checks, batches and counter reports.', icon: HiOutlineShieldCheck, tone: 'rose', route: '/solutions/medical-store-pos' },
  { title: 'Transport / Rental', text: 'Fleet, rental bookings, customer ledgers, dues and transport reports.', icon: HiOutlineTruck, tone: 'cyan', route: '/solutions/transport-rental' },
  { title: 'WhatsApp CRM', text: 'Capture leads, auto reply, team inbox and close more deals faster.', icon: HiOutlineChatBubbleLeftRight, tone: 'emerald', route: '/solutions/whatsapp-crm' },
  { title: 'Reports', text: 'Advanced reports and analytics to grow your business with data.', icon: HiOutlineChartBarSquare, tone: 'sky', route: '/solutions/reports' },
]

const stats = [
  { value: '500+', label: 'Happy Clients', num: 500, suffix: '+' },
  { value: '50,000+', label: 'Users', num: 50000, suffix: '+' },
  { value: '25+', label: 'Business Modules', num: 25, suffix: '+' },
  { value: '99.9%', label: 'Uptime', num: 99.9, suffix: '%' },
]

const partners = ['Al-Haram Estate', 'Bright Future School', 'Mega Mart', 'Sunrise Solar', 'TechSoft Solutions']

const posIndustries = [
  { title: 'Restaurant POS', text: 'Tables, KOT, quick bills, taxes and receipts for dine-in, takeaway and delivery.', icon: HiOutlineBuildingOffice2 },
  { title: 'Retail POS', text: 'Barcode-ready billing, stock movement, returns and cashier role control.', icon: HiOutlineShoppingCart },
  { title: 'Mall POS', text: 'Multi-counter sales, branch reporting, daily cash summaries and cloud sync.', icon: HiOutlineCloud },
  { title: 'Medical Store POS', text: 'Fast item search, batch-aware inventory, receipts and sales performance reports.', icon: HiOutlineShieldCheck },
  { title: 'Transport/Fleet POS', text: 'Ticketing, route billing, fleet receipts, staff roles and live business reports.', icon: HiOutlineMapPin },
]

const posFeatures = [
  { title: 'Fast Billing', text: 'Create counter bills, restaurant checks and customer receipts in a clean sales flow.', icon: HiOutlineShoppingCart },
  { title: 'Inventory Control', text: 'Track products, menu items, stock alerts, branch movement and item-level pricing.', icon: HiOutlineChartBarSquare },
  { title: 'Receipts & Reports', text: 'Print receipts, view daily sales, monitor cash, compare staff and export reports.', icon: HiOutlineDocumentChartBar },
  { title: 'Roles & Permissions', text: 'Give owners, managers, cashiers and staff the right access without exposing data.', icon: HiOutlineUserGroup },
  { title: 'Cloud Sync', text: 'Keep web, desktop and mobile-ready views aligned with secure cloud data sync.', icon: HiOutlineCloud },
  { title: 'Multi-Device Ready', text: 'Run the same POS experience from desktop counters, web dashboards and mobile views.', icon: HiOutlineDevicePhoneMobile },
]

const socialLinks = [
  { icon: FaFacebook, href: 'https://facebook.com/nexorasolution', label: 'Facebook' },
  { icon: FaInstagram, href: 'https://instagram.com/nexorasolution', label: 'Instagram' },
  { icon: FaLinkedin, href: 'https://linkedin.com/company/nexorasolution', label: 'LinkedIn' },
  { icon: FaYoutube, href: '#TODO-youtube', label: 'YouTube' },
  { icon: FaWhatsapp, href: whatsappLink, label: 'WhatsApp' },
]

const productLinks = [
  ['Nexora CRM', '/solutions/crm'],
  ['Restaurant POS', '/restaurant-pos'],
  ['Retail POS', '/retail-pos'],
  ['Medical Store POS', '/solutions/medical-store-pos'],
  ['School ERP', '/school-erp'],
  ['Transport Management', '/transport'],
  ['WhatsApp CRM', '/whatsapp-crm'],
  ['Property ERP', '/solutions/property-erp'],
]

const companyLinks = [
  ['Home', '/'],
  ['About', '/about'],
  ['Pricing', '/pricing'],
  ['Business Services', '/business-services'],
  ['Industries', '/industries'],
  ['Blog', '/blog'],
  ['Contact', '/contact'],
]

const resourceLinks = [
  ['Documentation', '/documentation'],
  ['Help Center', '/help-center'],
  ['FAQ', '/faq'],
  ['Privacy Policy', '/privacy-policy'],
  ['Terms & Conditions', '/terms'],
  ['Refund Policy', '/refund-policy'],
  ['Support Center', '/support-center'],
]

function ModuleIcon({ icon: Icon, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', purple: 'bg-violet-50 text-violet-600', orange: 'bg-orange-50 text-orange-500', rose: 'bg-rose-50 text-rose-600', cyan: 'bg-cyan-50 text-cyan-600', emerald: 'bg-green-50 text-green-600', sky: 'bg-sky-50 text-sky-600' }
  return <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="text-3xl" /></span>
}

function PosShowcasePreview() {
  const categories = ['All', 'Food', 'Retail', 'Pharma', 'Fleet']
  const products = [['Burger Meal', 'PKR 1,250', 'bg-blue-50 text-blue-600'], ['Premium Shirt', 'PKR 3,950', 'bg-emerald-50 text-emerald-600'], ['Medicine Pack', 'PKR 820', 'bg-rose-50 text-rose-600'], ['Route Ticket', 'PKR 450', 'bg-violet-50 text-violet-600'], ['Coffee Combo', 'PKR 680', 'bg-amber-50 text-amber-600'], ['Inventory Item', 'PKR 2,100', 'bg-sky-50 text-sky-600']]
  const order = [['Burger Meal', '2', 'PKR 2,500'], ['Coffee Combo', '1', 'PKR 680'], ['Service Tax', '5%', 'PKR 134']]
  return (
    <div className="relative mx-auto w-full max-w-[58rem]">
      <div className="pos-float-card absolute -left-7 top-16 z-10 hidden w-48 rounded-[1.45rem] border border-blue-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.42)] backdrop-blur lg:block">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Today Sales</p><p className="mt-2 text-2xl font-black text-slate-950">PKR 184K</p><p className="mt-1 text-xs font-semibold text-emerald-600">+22% live counter growth</p>
      </div>
      <div className="pos-float-card absolute -right-5 bottom-12 z-10 hidden w-52 rounded-[1.45rem] border border-sky-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.4)] backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><HiOutlineCloud className="text-xl" /></span>
          <div><p className="text-sm font-extrabold text-slate-950">Cloud Synced</p><p className="text-xs text-slate-500">Desktop, web, mobile</p></div>
        </div>
      </div>
      <div className="pos-preview-shell overflow-hidden rounded-[2rem] border border-blue-100/90 bg-white shadow-[0_44px_126px_-62px_rgba(15,23,42,0.58)] ring-1 ring-white/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
          <div className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-blue-700">Nexora POS Live</div>
          <div className="flex items-center gap-2 text-[0.65rem] font-bold text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />Online</div>
        </div>
        <div className="grid gap-4 bg-[linear-gradient(180deg,#fbfdff_0%,#edf6ff_100%)] p-4 sm:p-5 lg:grid-cols-[1fr_18rem] xl:grid-cols-[1fr_20rem]">
          <div className="min-w-0 rounded-[1.45rem] border border-white bg-white/90 p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Counter Workspace</p><h3 className="mt-1 text-2xl font-black text-slate-950">Fast POS Billing</h3></div>
              <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-extrabold text-white shadow-[0_16px_38px_-26px_rgba(15,23,42,0.9)]">Shift #A-104</div>
            </div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((c, i) => (<span key={c} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${i === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{c}</span>))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map(([name, price, tone]) => (
                <div key={name} className="rounded-[1.2rem] border border-slate-100 bg-white p-3 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.38)]">
                  <div className={`grid h-16 place-items-center rounded-xl ${tone}`}><HiOutlineShoppingCart className="text-2xl" /></div>
                  <p className="mt-3 truncate text-sm font-extrabold text-slate-950">{name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500">{price}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.65rem] font-extrabold text-blue-700">Add</span></div>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Current Bill</p><p className="mt-1 text-lg font-extrabold text-slate-950">Table 12</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-600">Paid</span></div>
            <div className="mt-5 space-y-3">{order.map(([item, qty, price]) => (<div key={item} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"><span className="truncate text-xs font-bold text-slate-700">{item}</span><span className="text-xs text-slate-500">{qty}</span><span className="text-xs font-extrabold text-slate-950">{price}</span></div>))}</div>
            <div className="mt-5 rounded-[1.25rem] bg-slate-950 p-4 text-white shadow-[0_22px_56px_-36px_rgba(15,23,42,0.9)]"><div className="flex items-center justify-between text-sm"><span className="text-slate-300">Total</span><span className="text-xl font-extrabold">PKR 3,314</span></div><div className="mt-4 grid grid-cols-2 gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-center text-xs font-bold">Cash</span><span className="rounded-full bg-blue-500 px-3 py-2 text-center text-xs font-bold">Card</span></div></div>
            <div className="mt-4 rounded-[1.15rem] border border-dashed border-blue-200 bg-blue-50/70 p-3"><p className="text-xs font-extrabold text-slate-950">Receipt ready</p><p className="mt-1 text-xs leading-5 text-slate-500">Print, email, or sync instantly to reports.</p></div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function HomepageSections() {
  /* Scroll-triggered reveal — this chunk mounts lazily, so the observer must live
     here (a shell-level observer registered before mount would never see these nodes).
     Sections already on screen are revealed immediately; the rest reveal on scroll. */
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll('.marketing-page [data-reveal]:not(.is-revealed)'))
    if (!targets.length) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-revealed'))
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '60px', threshold: 0.05 },
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
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
                <Link to={card.route} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-blue-600">Learn More <HiOutlineArrowRight /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white px-5 pb-16 pt-2 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_64%,#f8fafc_100%)] p-4 shadow-[0_30px_90px_-62px_rgba(37,99,235,0.42)] lg:p-5">
          <div className="rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-xl font-black text-slate-950">Trusted by 500+ Businesses</p>
            <p className="mt-2 text-sm text-slate-600">Across Pakistan</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">{partners.map((p) => (<div key={p} className="flex min-h-14 items-center justify-center rounded-xl bg-slate-50 px-3 text-center text-[0.62rem] font-extrabold uppercase tracking-wide text-slate-500">{p}</div>))}</div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{stats.map((s) => (<div key={s.label} className="flex min-h-32 min-w-0 flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white p-5 text-center shadow-sm"><p className="whitespace-nowrap text-3xl font-black text-blue-600 sm:text-4xl"><span data-ai-counter={s.num} data-ai-suffix={s.suffix}>{s.value}</span></p><p className="mt-2 break-normal text-sm font-medium text-slate-700">{s.label}</p></div>))}</div>
        </div>
      </section>

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
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">Nexora Solution is Pakistan&rsquo;s AI-powered business operating system offering POS, CRM, ERP and automation software for restaurants, retail stores, pharmacies, schools, transport fleets and growing enterprises — all from one unified platform.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">Who is Nexora built for?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">Nexora is built for Pakistani businesses of every size — from a single-counter restaurant or retail shop to multi-branch schools, pharmacy chains and transport fleets. Our modules adapt to your workflow, not the other way around.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">What does Nexora cost?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">Plans start at PKR 1,000/month (50% off for new users). Every plan includes a 7-day free trial, cloud sync, free updates, free data migration, free staff training and a 30-day money-back guarantee. Yearly billing saves 20%. Enterprise plans are custom-priced.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">Does Nexora work offline?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">The POS modules support offline mode so you can keep billing even when the internet is down. Once you reconnect, all data syncs automatically to the cloud.</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <dt className="text-[15px] font-extrabold text-slate-900">How do I get started?</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-slate-600">Sign up for a free 7-day trial at nexorasolution.online/signup — no credit card required. Or book a live demo and our team will walk you through the modules that fit your business.</dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="bg-[linear-gradient(135deg,#071d35_0%,#062b52_100%)] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_0.9fr_1fr_1.1fr]">

            {/* Column 1 — Brand */}
            <div>
              <NexoraLogo compact textClassName="[&>p]:text-white" />
              <p className="mt-5 text-sm leading-7 text-blue-100">
                Business software platform for Restaurants, Retail, Schools, Transport, Medical Stores and Enterprises.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/25 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Column 2 — Products */}
            <div>
              <h3 className="text-sm font-extrabold">Products</h3>
              <div className="mt-5 grid gap-3 text-sm text-blue-100">
                {productLinks.map(([label, to]) => (
                  <Link key={label} to={to} className="hover:text-white">{label}</Link>
                ))}
              </div>
            </div>

            {/* Column 3 — Company */}
            <div>
              <h3 className="text-sm font-extrabold">Company</h3>
              <div className="mt-5 grid gap-3 text-sm text-blue-100">
                {companyLinks.map(([label, to]) => (
                  <Link key={label} to={to} className="hover:text-white">{label}</Link>
                ))}
              </div>
            </div>

            {/* Column 4 — Resources */}
            <div>
              <h3 className="text-sm font-extrabold">Resources</h3>
              <div className="mt-5 grid gap-3 text-sm text-blue-100">
                {resourceLinks.map(([label, to]) => (
                  <Link key={label} to={to} className="hover:text-white">{label}</Link>
                ))}
              </div>
            </div>

            {/* Column 5 — Contact */}
            <div>
              <h3 className="text-sm font-extrabold">Contact</h3>
              <div className="mt-5 grid gap-4 text-sm text-blue-100">
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/20 hover:border-white/30 hover:text-white">
                  <FaWhatsapp className="text-sm text-emerald-400" />
                  <span>{whatsappNumberDisplay}</span>
                </a>
                <div className="flex items-center gap-3">
                  <a href={`mailto:${contactEmail}`} className="flex gap-3 hover:text-white">
                    <HiOutlineDocumentChartBar className="mt-0.5 shrink-0 text-lg" />
                    <span>{contactEmail}</span>
                  </a>
                  <CopyEmailButton email={contactEmail} />
                </div>
                <a href="https://nexorasolution.online" target="_blank" rel="noreferrer" className="flex gap-3 hover:text-white">
                  <HiOutlineGlobeAlt className="mt-0.5 shrink-0 text-lg" />
                  <span>nexorasolution.online</span>
                </a>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
                  <HiOutlineMapPin className="text-sm text-rose-400" />
                  Pakistan &amp; Dubai
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/20 hover:border-white/30">
                  <HiOutlineGlobeAlt className="text-sm" />
                  Available Worldwide
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-blue-100 sm:flex-row">
            <p>&copy; 2019–2026 Nexora Solution. All Rights Reserved.</p>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:text-white">Privacy</Link>
              <Link to="/terms" className="hover:text-white">Terms</Link>
              <Link to="/privacy-policy" className="hover:text-white">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
