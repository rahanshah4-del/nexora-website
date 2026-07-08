import { lazy, Suspense, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineCloud,
  HiOutlineDevicePhoneMobile,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi2'
import Header from './components/Header'
import NexoraLogo from './components/brand/NexoraLogo'

const TawkChat = lazy(() => import('./pages/public/TawkChat.jsx'))
const HomepageSections = lazy(() => import('./sections/HomepageSections.jsx'))

const trustBadges = [
  { title: 'Cloud Based', text: 'Secure & reliable', icon: HiOutlineCloud },
  { title: 'Secure & Reliable', text: 'Protected access', icon: HiOutlineShieldCheck },
  { title: 'Multi Device', text: 'Access anywhere', icon: HiOutlineDevicePhoneMobile },
  { title: 'Easy To Use', text: 'No heavy training', icon: HiOutlineCheckCircle },
]

function DashboardPreview() {
  const sideItems = ['Dashboard', 'CRM', 'School ERP', 'Property ERP', 'POS', 'WhatsApp CRM', 'Reports', 'Accounting', 'Settings']
  const miniStats = [
    ['Total Revenue', 'PKR 2,458,640', '+18.4%', 'text-blue-600', 'M18 46 C34 34 45 38 60 25 C72 14 86 20 104 10'],
    ['Total Receivables', 'PKR 1,245,000', '+10.3%', 'text-orange-500', 'M18 35 C31 18 42 31 52 22 C67 8 77 42 104 22'],
    ['Total Customers', '1,324', '+12.5%', 'text-emerald-600', 'M18 40 C32 37 38 16 51 30 C63 43 72 24 82 31 C92 40 96 20 104 28'],
    ['Total Properties', '58', '+7.4%', 'text-violet-600', 'M18 36 C30 24 42 41 54 27 C66 12 76 36 88 22 C95 14 101 24 104 19'],
  ]

  return (
    <div className="relative mx-auto w-full max-w-[58rem]">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_40px_120px_-62px_rgba(15,23,42,0.58)] ring-1 ring-white/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5">
          <NexoraLogo compact iconClassName="rounded-xl" textClassName="[&>p:first-child]:text-[0.62rem] [&>p:last-child]:text-[0.45rem]" />
          <div className="hidden h-8 w-48 items-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-[0.68rem] text-slate-400 sm:flex">Search anything...</div>
          <div className="flex items-center gap-2"><span className="h-8 w-8 rounded-full bg-orange-100" /><div className="hidden sm:block"><p className="text-[0.68rem] font-bold text-slate-900">Admin User</p><p className="text-[0.58rem] text-slate-500">Administrator</p></div></div>
        </div>
        <div className="grid min-h-[20rem] grid-cols-[6.4rem_1fr] sm:grid-cols-[8rem_1fr] lg:min-h-[24rem]">
          <aside className="border-r border-slate-100 bg-slate-50/70 px-2 py-3"><div className="grid gap-1">{sideItems.map((item, i) => (<div key={item} className={`truncate rounded-lg px-2 py-2 text-[0.56rem] font-semibold sm:text-[0.65rem] ${i === 0 ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'}`}>{item}</div>))}</div></aside>
          <div className="min-w-0 bg-white p-3 sm:p-5">
            <h3 className="text-sm font-extrabold text-slate-950 sm:text-base">Dashboard</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {miniStats.map(([label, value, delta, tone, path]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.45)]"><p className="truncate text-[0.55rem] font-semibold text-slate-500">{label}</p><p className="mt-1 truncate text-xs font-extrabold text-slate-950 sm:text-sm">{value}</p><p className={`mt-1 text-[0.58rem] font-bold ${tone}`}>{delta} vs last month</p><svg viewBox="0 0 118 55" className={`mt-2 h-9 w-full ${tone}`} fill="none" aria-hidden="true"><path d={path} stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.45)]">
                <div className="mb-3 flex items-center justify-between"><p className="text-[0.68rem] font-extrabold text-slate-900">Revenue Overview</p><span className="rounded-full border border-slate-200 px-2 py-1 text-[0.55rem] text-slate-500">This Month</span></div>
                <svg viewBox="0 0 360 135" className="h-32 w-full text-blue-600" fill="none" aria-hidden="true"><path d="M8 118 L42 82 L76 96 L110 60 L144 84 L178 44 L212 92 L246 50 L280 72 L316 40 L352 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /><path d="M8 118 L42 82 L76 96 L110 60 L144 84 L178 44 L212 92 L246 50 L280 72 L316 40 L352 18 L352 135 L8 135 Z" fill="currentColor" opacity="0.08" /></svg>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.45)]">
                <p className="text-[0.68rem] font-extrabold text-slate-900">Recent Activities</p>
                <div className="mt-3 space-y-2">
                  {[['New student admitted', '10:30 AM', 'bg-emerald-50 text-emerald-600'], ['Rent received', '09:45 AM', 'bg-orange-50 text-orange-500'], ['Invoice created', 'Yesterday', 'bg-blue-50 text-blue-600'], ['WhatsApp message', '21 May', 'bg-green-50 text-green-600']].map(([title, time, style]) => (
                    <div key={title} className="flex items-center gap-2 rounded-md bg-slate-50 p-2"><span className={`h-7 w-7 rounded-lg ${style}`} /><div className="min-w-0 flex-1"><p className="truncate text-[0.62rem] font-bold text-slate-800">{title}</p><p className="text-[0.55rem] text-slate-500">Activity updated</p></div><span className="text-[0.52rem] text-slate-400">{time}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App({ initialSectionId = '' }) {
  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')
    return () => { document.documentElement.classList.remove('public-website'); document.body.classList.remove('public-website') }
  }, [])

  useEffect(() => {
    if (!initialSectionId) return undefined
    const handle = window.requestAnimationFrame(() => { document.getElementById(initialSectionId)?.scrollIntoView({ behavior: 'auto', block: 'start' }) })
    return () => window.cancelAnimationFrame(handle)
  }, [initialSectionId])

  return (
    <div className="marketing-page min-h-screen overflow-x-hidden bg-white text-slate-950">
      <Header />
      <main>
        <section id="hero" className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-14 pt-12 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
          <div className="soft-arc-bg pointer-events-none" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="pointer-events-none absolute left-[12%] top-9 hidden h-52 w-52 rotate-3 bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] opacity-50 lg:block" />
          <div className="pointer-events-none absolute right-[11%] top-28 hidden h-48 w-48 -rotate-6 bg-[radial-gradient(circle,#bae6fd_1px,transparent_1px)] [background-size:18px_18px] opacity-60 lg:block" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">Nexora Business Suite</span>
              <h1 className="website-hero-heading mx-auto mt-6 max-w-5xl text-[2.85rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.4rem] lg:text-[5.7rem]">All your business on <span className="marker-highlight">one platform.</span></h1>
              <p className="hero-script-line mx-auto mt-5 max-w-3xl text-3xl leading-tight text-slate-900 sm:text-4xl">Simple, efficient, yet powerful.</p>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">Nexora Business Suite helps you manage customers, students, tenants, sales, invoices, reports and team access from one secure dashboard.</p>
              <div className="mt-7 flex flex-col justify-center gap-3 min-[390px]:flex-row">
                <Link to="/signup" className="premium-button-primary">Start Free Trial <HiOutlineArrowRight className="text-lg" /></Link>
                <a href="#contact" className="premium-button-secondary">Book a Demo <HiOutlinePlayCircle className="text-xl text-blue-600" /></a>
              </div>
              <div className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
                {trustBadges.map((badge) => (
                  <div key={badge.title} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.5)] backdrop-blur"><badge.icon className="text-2xl text-blue-600" /><div className="mt-3 min-w-0"><p className="text-xs font-extrabold leading-4 text-slate-900">{badge.title}</p><p className="mt-1 text-[0.68rem] leading-4 text-slate-500">{badge.text}</p></div></div>
                ))}
              </div>
              <div className="mt-12 sm:mt-14"><DashboardPreview /></div>
            </div>
          </div>
        </section>
      </main>

      {/* Anchor-link targets: ensure #services, #about, #products, #pricing, #contact
          always exist before the lazy sections load, so hash navigation works */}
      <div id="services" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="about" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="products" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="pricing" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="contact" style={{ scrollMarginTop: '5.5rem' }} />

      <Suspense fallback={null}>
        <HomepageSections />
      </Suspense>

      <Suspense fallback={null}><TawkChat /></Suspense>
    </div>
  )
}

export default App
