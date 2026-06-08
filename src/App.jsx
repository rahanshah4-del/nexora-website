import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineCloud,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentChartBar,
  HiOutlineMapPin,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import Header from './components/Header'
import NexoraLogo from './components/brand/NexoraLogo'
import TawkChat from './pages/public/TawkChat.jsx'

const whatsappNumberDisplay = '+92 319 432 9754'
const whatsappLink = 'https://wa.me/923194329754'
const whatsappLeadLink = `${whatsappLink}?text=${encodeURIComponent(
  'Assalam o Alaikum, I want a free demo of Nexora Business Suite.',
)}`
const contactEmail = 'rahanshah4@gmail.com'

const trustBadges = [
  { title: 'Cloud Based', text: 'Secure & reliable', icon: HiOutlineCloud },
  { title: 'Secure & Reliable', text: 'Protected access', icon: HiOutlineShieldCheck },
  { title: 'Multi Device', text: 'Access anywhere', icon: HiOutlineDevicePhoneMobile },
  { title: 'Easy To Use', text: 'No heavy training', icon: HiOutlineCheckCircle },
]

const moduleCards = [
  {
    title: 'CRM',
    text: 'Manage leads, customers, deals, follow-ups and invoices in one place.',
    icon: HiOutlineUserGroup,
    tone: 'blue',
    route: '/solutions/crm',
  },
  {
    title: 'School ERP',
    text: 'Manage students, fees, attendance, exams, parents and staff.',
    icon: HiOutlineAcademicCap,
    tone: 'green',
    route: '/solutions/school-erp',
  },
  {
    title: 'Property ERP',
    text: 'Manage properties, tenants, rent collection, maintenance and owners.',
    icon: HiOutlineBuildingOffice2,
    tone: 'purple',
    route: '/solutions/property-erp',
  },
  {
    title: 'POS',
    text: 'Point of sale, stock management, billing and sales reports.',
    icon: HiOutlineShoppingCart,
    tone: 'orange',
    route: '/solutions/pos',
  },
  {
    title: 'WhatsApp CRM',
    text: 'Capture leads, auto reply, team inbox and close more deals faster.',
    icon: HiOutlineChatBubbleLeftRight,
    tone: 'emerald',
    route: '/solutions/whatsapp-crm',
  },
  {
    title: 'Reports',
    text: 'Advanced reports and analytics to grow your business with data.',
    icon: HiOutlineChartBarSquare,
    tone: 'sky',
    route: '/solutions/reports',
  },
]

const stats = [
  { value: '500+', label: 'Happy Clients' },
  { value: '50,000+', label: 'Users' },
  { value: '25+', label: 'Business Modules' },
  { value: '99.9%', label: 'Uptime' },
]

const partners = ['Al-Haram Estate', 'Bright Future School', 'Mega Mart', 'Sunrise Solar', 'TechSoft Solutions']

const posIndustries = [
  {
    title: 'Restaurant POS',
    text: 'Tables, KOT, quick bills, taxes and receipts for dine-in, takeaway and delivery.',
    icon: HiOutlineBuildingOffice2,
  },
  {
    title: 'Retail POS',
    text: 'Barcode-ready billing, stock movement, returns and cashier role control.',
    icon: HiOutlineShoppingCart,
  },
  {
    title: 'Mall POS',
    text: 'Multi-counter sales, branch reporting, daily cash summaries and cloud sync.',
    icon: HiOutlineCloud,
  },
  {
    title: 'Medical Store POS',
    text: 'Fast item search, batch-aware inventory, receipts and sales performance reports.',
    icon: HiOutlineShieldCheck,
  },
  {
    title: 'Transport/Fleet POS',
    text: 'Ticketing, route billing, fleet receipts, staff roles and live business reports.',
    icon: HiOutlineMapPin,
  },
]

const posFeatures = [
  {
    title: 'Fast Billing',
    text: 'Create counter bills, restaurant checks and customer receipts in a clean sales flow.',
    icon: HiOutlineShoppingCart,
  },
  {
    title: 'Inventory Control',
    text: 'Track products, menu items, stock alerts, branch movement and item-level pricing.',
    icon: HiOutlineChartBarSquare,
  },
  {
    title: 'Receipts & Reports',
    text: 'Print receipts, view daily sales, monitor cash, compare staff and export reports.',
    icon: HiOutlineDocumentChartBar,
  },
  {
    title: 'Roles & Permissions',
    text: 'Give owners, managers, cashiers and staff the right access without exposing data.',
    icon: HiOutlineUserGroup,
  },
  {
    title: 'Cloud Sync',
    text: 'Keep web, desktop and mobile-ready views aligned with secure cloud data sync.',
    icon: HiOutlineCloud,
  },
  {
    title: 'Multi-Device Ready',
    text: 'Run the same POS experience from desktop counters, web dashboards and mobile views.',
    icon: HiOutlineDevicePhoneMobile,
  },
]

const footerGroups = {
  quickLinks: [
    ['Home', '/'],
    ['Solutions', '/#services'],
    ['Pricing', '/pricing'],
    ['Industries', '/industries'],
    ['About Us', '/#about'],
    ['Contact Us', '/contact'],
  ],
  modules: [
    ['CRM', '/solutions/crm'],
    ['School ERP', '/solutions/school-erp'],
    ['Property ERP', '/solutions/property-erp'],
    ['POS', '/solutions/pos'],
    ['WhatsApp CRM', '/solutions/whatsapp-crm'],
    ['Reports', '/solutions/reports'],
  ],
  resources: ['Blog', 'Help Center', 'Documentation', 'Privacy Policy', 'Terms & Conditions'],
}

function ModuleIcon({ icon: Icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-500',
    emerald: 'bg-green-50 text-green-600',
    sky: 'bg-sky-50 text-sky-600',
  }

  return (
    <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]}`}>
      <Icon className="text-3xl" />
    </span>
  )
}

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
      <div className="absolute -left-9 top-16 hidden space-y-5 2xl:block">
        {[
          ['bg-blue-50 text-blue-600', HiOutlineUserGroup],
          ['bg-emerald-50 text-emerald-600', HiOutlineAcademicCap],
          ['bg-violet-50 text-violet-600', HiOutlineBuildingOffice2],
        ].map(([style, Icon], index) => (
              <div
                key={style}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white/95 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur ${style}`}
                style={{ animationDelay: `${index * 0.6}s` }}
          >
            <Icon className="text-3xl" />
          </div>
        ))}
      </div>

      <div className="absolute -right-8 top-20 hidden space-y-5 2xl:block">
        {[
          ['bg-orange-50 text-orange-500', HiOutlineShoppingCart],
          ['bg-green-50 text-green-600', HiOutlineChatBubbleLeftRight],
          ['bg-sky-50 text-sky-600', HiOutlineChartBarSquare],
        ].map(([style, Icon], index) => (
              <div
                key={style}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white/95 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur ${style}`}
                style={{ animationDelay: `${index * 0.7}s` }}
          >
            <Icon className="text-3xl" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_40px_120px_-62px_rgba(15,23,42,0.58)] ring-1 ring-white/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5">
          <NexoraLogo compact iconClassName="rounded-xl" textClassName="[&>p:first-child]:text-[0.62rem] [&>p:last-child]:text-[0.45rem]" />
          <div className="hidden h-8 w-48 items-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-[0.68rem] text-slate-400 sm:flex">
            Search anything...
          </div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-orange-100" />
            <div className="hidden sm:block">
              <p className="text-[0.68rem] font-bold text-slate-900">Admin User</p>
              <p className="text-[0.58rem] text-slate-500">Administrator</p>
            </div>
          </div>
        </div>

        <div className="grid min-h-[20rem] grid-cols-[6.4rem_1fr] sm:grid-cols-[8rem_1fr] lg:min-h-[24rem]">
          <aside className="border-r border-slate-100 bg-slate-50/70 px-2 py-3">
            <div className="grid gap-1">
              {sideItems.map((item, index) => (
                <div
                  key={item}
                  className={`truncate rounded-lg px-2 py-2 text-[0.56rem] font-semibold sm:text-[0.65rem] ${
                    index === 0 ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 bg-white p-3 sm:p-5">
            <h3 className="text-sm font-extrabold text-slate-950 sm:text-base">Dashboard</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {miniStats.map(([label, value, delta, tone, path]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.45)]">
                  <p className="truncate text-[0.55rem] font-semibold text-slate-500">{label}</p>
                  <p className="mt-1 truncate text-xs font-extrabold text-slate-950 sm:text-sm">{value}</p>
                  <p className={`mt-1 text-[0.58rem] font-bold ${tone}`}>{delta} vs last month</p>
                  <svg viewBox="0 0 118 55" className={`mt-2 h-9 w-full ${tone}`} fill="none" aria-hidden="true">
                    <path d={path} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.45)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[0.68rem] font-extrabold text-slate-900">Revenue Overview</p>
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-[0.55rem] text-slate-500">This Month</span>
                </div>
                <svg viewBox="0 0 360 135" className="h-32 w-full text-blue-600" fill="none" aria-hidden="true">
                  <path d="M8 118 L42 82 L76 96 L110 60 L144 84 L178 44 L212 92 L246 50 L280 72 L316 40 L352 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path d="M8 118 L42 82 L76 96 L110 60 L144 84 L178 44 L212 92 L246 50 L280 72 L316 40 L352 18 L352 135 L8 135 Z" fill="currentColor" opacity="0.08" />
                </svg>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.45)]">
                <p className="text-[0.68rem] font-extrabold text-slate-900">Recent Activities</p>
                <div className="mt-3 space-y-2">
                  {[
                    ['New student admitted', '10:30 AM', 'bg-emerald-50 text-emerald-600'],
                    ['Rent received', '09:45 AM', 'bg-orange-50 text-orange-500'],
                    ['Invoice created', 'Yesterday', 'bg-blue-50 text-blue-600'],
                    ['WhatsApp message', '21 May', 'bg-green-50 text-green-600'],
                  ].map(([title, time, style]) => (
                    <div key={title} className="flex items-center gap-2 rounded-md bg-slate-50 p-2">
                      <span className={`h-7 w-7 rounded-lg ${style}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.62rem] font-bold text-slate-800">{title}</p>
                        <p className="text-[0.55rem] text-slate-500">Activity updated</p>
                      </div>
                      <span className="text-[0.52rem] text-slate-400">{time}</span>
                    </div>
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

function PosShowcasePreview() {
  const categories = ['All', 'Food', 'Retail', 'Pharma', 'Fleet']
  const products = [
    ['Burger Meal', 'PKR 1,250', 'bg-blue-50 text-blue-600'],
    ['Premium Shirt', 'PKR 3,950', 'bg-emerald-50 text-emerald-600'],
    ['Medicine Pack', 'PKR 820', 'bg-rose-50 text-rose-600'],
    ['Route Ticket', 'PKR 450', 'bg-violet-50 text-violet-600'],
    ['Coffee Combo', 'PKR 680', 'bg-amber-50 text-amber-600'],
    ['Inventory Item', 'PKR 2,100', 'bg-sky-50 text-sky-600'],
  ]
  const order = [
    ['Burger Meal', '2', 'PKR 2,500'],
    ['Coffee Combo', '1', 'PKR 680'],
    ['Service Tax', '5%', 'PKR 134'],
  ]

  return (
    <div className="relative mx-auto w-full max-w-[58rem]">
      <div className="pos-float-card absolute -left-7 top-16 z-10 hidden w-48 rounded-[1.45rem] border border-blue-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.42)] backdrop-blur xl:block">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Today Sales</p>
        <p className="mt-2 text-2xl font-black text-slate-950">PKR 184K</p>
        <p className="mt-1 text-xs font-semibold text-emerald-600">+22% live counter growth</p>
      </div>

      <div className="pos-float-card absolute -right-5 bottom-12 z-10 hidden w-52 rounded-[1.45rem] border border-sky-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.4)] backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <HiOutlineCloud className="text-xl" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-slate-950">Cloud Synced</p>
            <p className="text-xs text-slate-500">Desktop, web, mobile</p>
          </div>
        </div>
      </div>

      <div className="pos-preview-shell overflow-hidden rounded-[2rem] border border-blue-100/90 bg-white shadow-[0_44px_126px_-62px_rgba(15,23,42,0.58)] ring-1 ring-white/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="hidden rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-blue-700 sm:block">
            Nexora POS Live
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] font-bold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </div>
        </div>

        <div className="grid gap-4 bg-[linear-gradient(180deg,#fbfdff_0%,#edf6ff_100%)] p-4 sm:p-5 lg:grid-cols-[1fr_18rem] xl:grid-cols-[1fr_20rem]">
          <div className="min-w-0 rounded-[1.45rem] border border-white bg-white/90 p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Counter Workspace</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Fast POS Billing</h3>
              </div>
              <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-extrabold text-white shadow-[0_16px_38px_-26px_rgba(15,23,42,0.9)]">Shift #A-104</div>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category, index) => (
                <span
                  key={category}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${
                    index === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {category}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map(([name, price, tone]) => (
                <div key={name} className="rounded-[1.2rem] border border-slate-100 bg-white p-3 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.38)] transition duration-200 ease-out hover:-translate-y-0.5">
                  <div className={`grid h-16 place-items-center rounded-xl ${tone}`}>
                    <HiOutlineShoppingCart className="text-2xl" />
                  </div>
                  <p className="mt-3 truncate text-sm font-extrabold text-slate-950">{name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500">{price}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.65rem] font-extrabold text-blue-700">Add</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Current Bill</p>
                <p className="mt-1 text-lg font-extrabold text-slate-950">Table 12</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-600">Paid</span>
            </div>

            <div className="mt-5 space-y-3">
              {order.map(([item, qty, price]) => (
                <div key={item} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="truncate text-xs font-bold text-slate-700">{item}</span>
                  <span className="text-xs text-slate-500">{qty}</span>
                  <span className="text-xs font-extrabold text-slate-950">{price}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.25rem] bg-slate-950 p-4 text-white shadow-[0_22px_56px_-36px_rgba(15,23,42,0.9)]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Total</span>
                <span className="text-xl font-extrabold">PKR 3,314</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <span className="rounded-full bg-white/10 px-3 py-2 text-center text-xs font-bold">Cash</span>
                <span className="rounded-full bg-blue-500 px-3 py-2 text-center text-xs font-bold">Card</span>
              </div>
            </div>

            <div className="mt-4 rounded-[1.15rem] border border-dashed border-blue-200 bg-blue-50/70 p-3">
              <p className="text-xs font-extrabold text-slate-950">Receipt ready</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Print, email, or sync instantly to reports.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function App({ initialSectionId = '' }) {
  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')

    return () => {
      document.documentElement.classList.remove('public-website')
      document.body.classList.remove('public-website')
    }
  }, [])

  useEffect(() => {
    if (!initialSectionId) return undefined
    const handle = window.requestAnimationFrame(() => {
      document.getElementById(initialSectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(handle)
  }, [initialSectionId])

  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll('.marketing-page [data-reveal]'))
    if (!revealTargets.length) return undefined

    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((target) => target.classList.add('is-revealed'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    revealTargets.forEach((target) => observer.observe(target))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="marketing-page page-enter min-h-screen overflow-x-hidden bg-white text-slate-950">
      <Header />

      <main>
        <section id="hero" className="hero-enter relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-14 pt-12 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
          <div className="soft-arc-bg pointer-events-none" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="pointer-events-none absolute left-[12%] top-9 hidden h-52 w-52 rotate-3 bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] opacity-50 lg:block" />
          <div className="pointer-events-none absolute right-[11%] top-28 hidden h-48 w-48 -rotate-6 bg-[radial-gradient(circle,#bae6fd_1px,transparent_1px)] [background-size:18px_18px] opacity-60 lg:block" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                Nexora Business Suite
              </span>
              <h1 className="website-hero-heading mx-auto mt-6 max-w-5xl text-[2.85rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.4rem] lg:text-[5.7rem]">
                All your business on <span className="marker-highlight">one platform.</span>
              </h1>
              <p className="hero-script-line mx-auto mt-5 max-w-3xl text-3xl leading-tight text-slate-900 sm:text-4xl">
                Simple, efficient, yet powerful.
              </p>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                Nexora Business Suite helps you manage customers, students, tenants, sales, invoices, reports and team access from one secure dashboard.
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 min-[390px]:flex-row">
                <Link to="/signup" className="premium-button-primary">
                  Start Free Trial
                  <HiOutlineArrowRight className="text-lg" />
                </Link>
                <a href="#contact" className="premium-button-secondary">
                  Book a Demo
                  <HiOutlinePlayCircle className="text-xl text-blue-600" />
                </a>
              </div>

              <div className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
                {trustBadges.map((badge) => (
                  <div key={badge.title} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
                    <badge.icon className="text-2xl text-blue-600" />
                    <div className="mt-3 min-w-0">
                      <p className="text-xs font-extrabold leading-4 text-slate-900">{badge.title}</p>
                      <p className="mt-1 text-[0.68rem] leading-4 text-slate-500">{badge.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 sm:mt-14">
                <DashboardPreview />
              </div>
            </div>
          </div>
        </section>

        <section id="services" data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                All Modules. <span className="marker-highlight marker-highlight-blue">One Platform.</span> Unlimited Possibilities.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Powerful modules to run every part of your business efficiently.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {moduleCards.map((card) => (
	                <article
	                  key={card.title}
	                  className="premium-card group flex h-full min-h-[16.5rem] flex-col items-center p-6 text-center"
	                >
                  <ModuleIcon icon={card.icon} tone={card.tone} />
                  <h3 className="mt-4 text-lg font-extrabold text-slate-950">{card.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{card.text}</p>
                  <Link to={card.route} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-blue-600">
                    Learn More <HiOutlineArrowRight className="transition group-hover:translate-x-0.5" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" data-reveal className="bg-white px-5 pb-16 pt-2 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_64%,#f8fafc_100%)] p-4 shadow-[0_30px_90px_-62px_rgba(37,99,235,0.42)] lg:p-5">
            <div className="rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-sm">
              <p className="text-xl font-black text-slate-950">Trusted by 500+ Businesses</p>
              <p className="mt-2 text-sm text-slate-600">Across Pakistan</p>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
                {partners.map((partner) => (
                  <div key={partner} className="flex min-h-14 items-center justify-center rounded-xl bg-slate-50 px-3 text-center text-[0.62rem] font-extrabold uppercase tracking-wide text-slate-500">
                    {partner}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-h-32 min-w-0 flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white p-5 text-center shadow-sm"
                >
                  <p className="whitespace-nowrap text-3xl font-black text-blue-600 sm:text-4xl">{stat.value}</p>
                  <p className="mt-2 break-normal text-sm font-medium text-slate-700">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="products" data-reveal className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#eef7ff_100%)] py-16 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
          <div className="pointer-events-none absolute left-[10%] top-16 hidden h-40 w-40 rotate-6 bg-[radial-gradient(circle,#bfdbfe_1px,transparent_1px)] [background-size:16px_16px] opacity-50 lg:block" />

          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
              <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
                <span className="inline-flex rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                  Nexora POS Solution
                </span>
                <h2 className="website-section-heading mt-5 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-[4.4rem]">
                  Modern POS for <span className="marker-highlight marker-highlight-blue">restaurants, retail stores</span> and service counters.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600 lg:mx-0">
                  A premium cloud POS experience for billing, inventory, receipts, reports, staff roles and multi-device business operations.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {['Desktop POS', 'Web Dashboard', 'Mobile-ready', 'Cloud Sync'].map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-col justify-center gap-3 min-[390px]:flex-row lg:justify-start">
                  <a href="#contact" className="premium-button-primary">
                    Book POS Demo
                    <HiOutlineArrowRight className="text-lg" />
                  </a>
                  <Link to="/pricing" className="premium-button-secondary">
                    View Plans
                    <HiOutlinePlayCircle className="text-xl text-blue-600" />
                  </Link>
                </div>
              </div>

              <PosShowcasePreview />
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {posIndustries.map((industry) => (
	                <article
	                  key={industry.title}
	                  className="premium-card pos-reveal-card p-5"
	                >
	                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
	                    <industry.icon className="text-2xl" />
	                  </span>
	                  <h3 className="mt-4 text-lg font-black text-slate-950">{industry.title}</h3>
	                  <p className="mt-2 text-sm leading-6 text-slate-600">{industry.text}</p>
	                </article>
              ))}
            </div>

            <div id="features" className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posFeatures.map((feature) => (
	                <article
	                  key={feature.title}
	                  className="premium-card pos-reveal-card flex min-h-40 gap-4 p-5"
	                >
	                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_38px_-28px_rgba(15,23,42,0.8)]">
	                    <feature.icon className="text-2xl" />
	                  </span>
	                  <div>
	                    <h3 className="text-lg font-black text-slate-950">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" data-reveal className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(37,99,235,0.44)] sm:p-8 lg:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                Dedicated Pricing
              </span>
              <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Simple plans now live on one clear pricing page.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Compare Basic, Business and Enterprise plans with feature details, FAQ and a free trial CTA in one place.
              </p>
            </div>
            <Link to="/pricing" className="premium-button-primary">
              View Pricing
              <HiOutlineArrowRight className="text-lg" />
            </Link>
          </div>
        </section>

        <section id="contact" data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(37,99,235,0.44)] sm:p-8 lg:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-5">
              <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-white sm:flex">
                <HiOutlineChatBubbleLeftRight className="text-5xl" />
              </span>
              <div>
	                <h2 className="text-3xl font-black tracking-tight text-slate-950">Want to See <span className="text-blue-600">Nexora</span> in Action?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Book a free live demo with our experts and see how Nexora can transform your business.
                </p>
              </div>
            </div>
            <a
              href={whatsappLeadLink}
              target="_blank"
              rel="noreferrer"
	              className="premium-button-primary px-8"
            >
              Book Free Demo
              <HiOutlineArrowRight className="text-lg" />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-[linear-gradient(135deg,#071d35_0%,#062b52_100%)] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.25fr_0.7fr_0.7fr_0.8fr_1fr]">
            <div>
              <NexoraLogo compact textClassName="[&>p]:text-white" />
              <p className="mt-5 max-w-sm text-sm leading-7 text-blue-100">
                Nexora Business Suite is an all-in-one platform to manage your entire business from one secure dashboard.
              </p>
              <div className="mt-6 flex gap-3">
                {['f', 'ig', 'in', 'yt'].map((item) => (
                  <span key={item} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold text-white">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold">Quick Links</h3>
              <div className="mt-5 grid gap-3 text-sm text-blue-100">
                {footerGroups.quickLinks.map(([label, href]) => (
                  <a key={label} href={href} className="transition hover:text-white">{label}</a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold">Modules</h3>
              <div className="mt-5 grid gap-3 text-sm text-blue-100">
                {footerGroups.modules.map(([module, to]) => (
                  <Link key={module} to={to} className="transition hover:text-white">
                    {module}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold">Resources</h3>
              <div className="mt-5 grid gap-3 text-sm text-blue-100">
                {footerGroups.resources.map((resource) => (
                  <span key={resource}>{resource}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold">Contact Us</h3>
              <div className="mt-5 grid gap-4 text-sm text-blue-100">
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex gap-3 transition hover:text-white">
                  <HiOutlineChatBubbleLeftRight className="mt-0.5 shrink-0 text-lg" />
                  <span>{whatsappNumberDisplay}</span>
                </a>
                <a href={`mailto:${contactEmail}`} className="flex gap-3 transition hover:text-white">
                  <HiOutlineDocumentChartBar className="mt-0.5 shrink-0 text-lg" />
                  <span>{contactEmail}</span>
                </a>
                <div className="flex gap-3">
                  <HiOutlineMapPin className="mt-0.5 shrink-0 text-lg" />
                  <span>123, Business Avenue, Lahore, Pakistan</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-blue-100">
            © {new Date().getFullYear()} Nexora Solutions. All rights reserved.
          </p>
        </div>
      </footer>

      <a
        href={whatsappLeadLink}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Nexora on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_18px_38px_-22px_rgba(37,211,102,0.9)] transition hover:-translate-y-0.5 hover:bg-[#20bd5a]"
      >
        <HiOutlineChatBubbleLeftRight className="text-3xl" />
      </a>
      <TawkChat />
    </div>
  )
}

export default App
