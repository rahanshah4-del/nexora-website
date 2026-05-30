import { useEffect, useState } from 'react'
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
  },
  {
    title: 'School ERP',
    text: 'Manage students, fees, attendance, exams, parents and staff.',
    icon: HiOutlineAcademicCap,
    tone: 'green',
  },
  {
    title: 'Property ERP',
    text: 'Manage properties, tenants, rent collection, maintenance and owners.',
    icon: HiOutlineBuildingOffice2,
    tone: 'purple',
  },
  {
    title: 'POS',
    text: 'Point of sale, stock management, billing and sales reports.',
    icon: HiOutlineShoppingCart,
    tone: 'orange',
  },
  {
    title: 'WhatsApp CRM',
    text: 'Capture leads, auto reply, team inbox and close more deals faster.',
    icon: HiOutlineChatBubbleLeftRight,
    tone: 'emerald',
  },
  {
    title: 'Reports',
    text: 'Advanced reports and analytics to grow your business with data.',
    icon: HiOutlineChartBarSquare,
    tone: 'sky',
  },
]

const stats = [
  { value: '500+', label: 'Happy Clients' },
  { value: '50,000+', label: 'Users' },
  { value: '25+', label: 'Business Modules' },
  { value: '99.9%', label: 'Uptime' },
]

const partners = ['Al-Haram Estate', 'Bright Future School', 'Mega Mart', 'Sunrise Solar', 'TechSoft Solutions']

const reasons = [
  {
    title: 'All-in-One Solution',
    text: 'CRM, School, Property, POS and more, all in one platform.',
  },
  {
    title: 'Access Anywhere',
    text: 'Use on any device, anytime, anywhere with internet.',
  },
  {
    title: 'Secure & Reliable',
    text: 'Your data is safe with enterprise grade security.',
  },
  {
    title: 'Easy to Use',
    text: 'User-friendly interface with simple navigation.',
  },
]

const pricingPlans = [
  {
    name: 'Basic',
    monthly: 2999,
    description: 'Perfect for small businesses',
    features: ['CRM Module', 'Up to 2 Users', '5GB Storage', 'Email Support'],
  },
  {
    name: 'Standard',
    monthly: 5999,
    description: 'For growing businesses',
    features: ['All Basic Features', 'School OR Property ERP', 'Up to 5 Users', '20GB Storage', 'Priority Support'],
    featured: true,
  },
  {
    name: 'Premium',
    monthly: 9999,
    description: 'For established businesses',
    features: ['All Standard Features', 'All Modules Access', 'Up to 10 Users', '50GB Storage', 'Priority Support'],
  },
  {
    name: 'Enterprise',
    custom: true,
    description: 'For large organizations',
    features: ['All Premium Features', 'Unlimited Users', 'Custom Integrations', 'Dedicated Support', 'Custom Development'],
  },
]

const footerGroups = {
  quickLinks: [
    ['Home', '#hero'],
    ['Solutions', '#services'],
    ['Pricing', '#pricing'],
    ['About Us', '#about'],
    ['Contact Us', '#contact'],
  ],
  modules: ['CRM', 'School ERP', 'Property ERP', 'POS', 'WhatsApp CRM'],
  resources: ['Blog', 'Help Center', 'Documentation', 'Privacy Policy', 'Terms & Conditions'],
}

const yearlyDiscount = 0.8

function formatPrice(amount) {
  return new Intl.NumberFormat('en-PK').format(amount)
}

function getPrice(plan, billingCycle) {
  if (plan.custom) return 'Custom Pricing'
  if (billingCycle === 'yearly') return `PKR ${formatPrice(Math.round(plan.monthly * 12 * yearlyDiscount))}`
  return `PKR ${formatPrice(plan.monthly)}`
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
    <div className="relative mx-auto w-full max-w-[43rem] lg:mx-0 lg:ml-auto">
      <div className="absolute -left-9 top-16 hidden space-y-5 2xl:block">
        {[
          ['bg-blue-50 text-blue-600', HiOutlineUserGroup],
          ['bg-emerald-50 text-emerald-600', HiOutlineAcademicCap],
          ['bg-violet-50 text-violet-600', HiOutlineBuildingOffice2],
        ].map(([style, Icon], index) => (
          <div
            key={style}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white shadow-lg shadow-blue-950/10 ${style}`}
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
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white shadow-lg shadow-blue-950/10 ${style}`}
            style={{ animationDelay: `${index * 0.7}s` }}
          >
            <Icon className="text-3xl" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-blue-950/10">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
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

        <div className="grid min-h-[20rem] grid-cols-[6.4rem_1fr] sm:grid-cols-[8rem_1fr]">
          <aside className="border-r border-slate-100 bg-slate-50/70 px-2 py-3">
            <div className="grid gap-1">
              {sideItems.map((item, index) => (
                <div
                  key={item}
                  className={`truncate rounded-md px-2 py-2 text-[0.56rem] font-semibold sm:text-[0.65rem] ${
                    index === 0 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
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
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
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
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[0.68rem] font-extrabold text-slate-900">Revenue Overview</p>
                  <span className="rounded-md border border-slate-200 px-2 py-1 text-[0.55rem] text-slate-500">This Month</span>
                </div>
                <svg viewBox="0 0 360 135" className="h-32 w-full text-blue-600" fill="none" aria-hidden="true">
                  <path d="M8 118 L42 82 L76 96 L110 60 L144 84 L178 44 L212 92 L246 50 L280 72 L316 40 L352 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path d="M8 118 L42 82 L76 96 L110 60 L144 84 L178 44 L212 92 L246 50 L280 72 L316 40 L352 18 L352 135 L8 135 Z" fill="currentColor" opacity="0.08" />
                </svg>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
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

function App({ initialSectionId = '' }) {
  const [billingCycle, setBillingCycle] = useState('monthly')

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
        <section id="hero" className="hero-enter relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_92%)] py-14 sm:py-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_12%,rgba(37,99,235,0.09),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(14,165,233,0.11),transparent_30%)]" />
          <div className="pointer-events-none absolute left-[30%] top-6 hidden h-72 w-56 bg-[radial-gradient(circle,#dbeafe_1px,transparent_1px)] [background-size:18px_18px] opacity-75 lg:block" />
          <div className="pointer-events-none absolute bottom-6 right-0 hidden h-56 w-64 bg-[radial-gradient(circle,#bfdbfe_1px,transparent_1px)] [background-size:18px_18px] opacity-80 lg:block" />

          <div className="relative mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8 lg:pb-16">
            <div className="grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
              <div className="text-center lg:text-left">
                <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:mx-0 lg:text-[3.8rem]">
                  One Platform for <span className="text-blue-600">All Your Business</span> Management
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg lg:mx-0">
                  Nexora Business Suite helps you manage customers, students, tenants, sales, invoices, reports and team access from one secure dashboard.
                </p>

                <div className="mt-7 flex flex-col justify-center gap-3 min-[390px]:flex-row lg:justify-start">
                  <Link
                    to="/signup"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-blue-600 px-6 text-sm font-bold text-white shadow-[0_18px_38px_-22px_rgba(37,99,235,0.9)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    Start Free Trial
                    <HiOutlineArrowRight className="text-lg" />
                  </Link>
                  <a
                    href="#contact"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-6 text-sm font-bold text-slate-950 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-500 hover:text-blue-600"
                  >
                    Book a Demo
                    <HiOutlinePlayCircle className="text-xl text-blue-600" />
                  </a>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4 text-left sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {trustBadges.map((badge) => (
                    <div key={badge.title} className="flex min-w-0 items-start gap-2">
                      <badge.icon className="mt-0.5 shrink-0 text-xl text-blue-600" />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold leading-4 text-slate-900">{badge.title}</p>
                        <p className="text-[0.68rem] leading-4 text-slate-500">{badge.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DashboardPreview />
            </div>
          </div>
        </section>

        <section id="services" data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                All Modules. One Platform. Unlimited Possibilities.
              </h2>
              <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-blue-600" />
              <p className="mt-5 text-base leading-7 text-slate-600">
                Powerful modules to run every part of your business efficiently.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {moduleCards.map((card) => (
                <article
                  key={card.title}
                  className="group flex h-full min-h-[16.5rem] flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-lg shadow-slate-950/5 transition duration-200 ease-out hover:-translate-y-1 hover:border-blue-200 hover:shadow-blue-950/10"
                >
                  <ModuleIcon icon={card.icon} tone={card.tone} />
                  <h3 className="mt-4 text-lg font-extrabold text-slate-950">{card.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{card.text}</p>
                  <a href="#contact" className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-blue-600">
                    Learn More <HiOutlineArrowRight className="transition group-hover:translate-x-0.5" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" data-reveal className="bg-white px-5 pb-16 pt-2 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-2xl border border-blue-100 bg-blue-50/35 p-4 shadow-lg shadow-blue-950/5 lg:grid-cols-[1.1fr_1fr] lg:p-5">
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
              <p className="text-base font-extrabold text-slate-950">Trusted by 500+ Businesses</p>
              <p className="mt-2 text-sm text-slate-600">Across Pakistan</p>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
                {partners.map((partner) => (
                  <div key={partner} className="flex min-h-14 items-center justify-center rounded-md bg-slate-50 px-3 text-center text-[0.62rem] font-extrabold uppercase tracking-wide text-slate-500">
                    {partner}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-blue-100 bg-white p-5 text-center shadow-sm">
                  <p className="text-2xl font-extrabold text-blue-600 sm:text-3xl">{stat.value}</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="products" data-reveal className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="relative mx-auto grid w-full max-w-xl gap-5 sm:grid-cols-[0.38fr_0.62fr] sm:items-end">
              <div className="hidden min-h-[19rem] rounded-[1.8rem] border-[7px] border-slate-950 bg-white shadow-xl shadow-slate-950/10 sm:block">
                <div className="h-full rounded-[1.25rem] bg-[linear-gradient(180deg,#eef6ff,#ffffff)] p-4">
                  <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-800" />
                  <p className="text-[0.55rem] font-extrabold text-slate-500">Dashboard</p>
                  <p className="mt-2 text-sm font-extrabold text-slate-950">Welcome Back!</p>
                  <div className="mt-5 rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-[0.55rem] text-slate-500">Total Revenue</p>
                    <p className="mt-1 text-sm font-extrabold">PKR 2,406,640</p>
                    <svg viewBox="0 0 120 48" className="mt-2 h-10 w-full text-blue-600" fill="none" aria-hidden="true">
                      <path d="M4 36 L22 24 L40 30 L58 14 L76 22 L94 10 L116 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 sm:p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-950">Students</h3>
                  <span className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-white">+ Add Student</span>
                </div>
                <div className="mt-5 overflow-hidden rounded-lg border border-slate-100">
                  {[
                    ['Ali Raza', 'Grade 8', 'Paid', '96%'],
                    ['Umar Farooq', 'Grade 7', 'Pending', '90%'],
                    ['Sara Khan', 'Grade 6', 'Paid', '98%'],
                    ['Hassan Ali', 'Grade 8', 'Paid', '92%'],
                  ].map(([name, grade, status, percent]) => (
                    <div key={name} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.6fr] items-center gap-2 border-b border-slate-100 px-3 py-3 text-xs last:border-0">
                      <span className="font-bold text-slate-800">{name}</span>
                      <span className="text-slate-500">{grade}</span>
                      <span className={status === 'Paid' ? 'font-bold text-emerald-600' : 'font-bold text-orange-500'}>{status}</span>
                      <span className="text-right text-slate-500">{percent}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div id="features" className="mx-auto max-w-xl lg:mx-0">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                Why Businesses Choose Nexora
              </h2>
              <div className="mt-3 h-1 w-24 rounded-full bg-blue-600" />
              <div className="mt-7 space-y-5">
                {reasons.map((reason) => (
                  <div key={reason.title} className="flex gap-4">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <HiOutlineCheckCircle className="text-base" />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-950">{reason.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{reason.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-blue-600" />
              <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                {['monthly', 'yearly'].map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`min-h-9 rounded-md px-5 text-sm font-bold transition duration-200 ease-out ${
                      billingCycle === cycle ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    {cycle === 'monthly' ? 'Monthly' : 'Yearly (Save 20%)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative flex h-full min-h-[25rem] flex-col rounded-xl border bg-white p-6 shadow-lg shadow-slate-950/5 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-blue-950/10 ${
                    plan.featured ? 'border-blue-300 bg-blue-50/35 ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div className="mb-3 flex min-h-7 justify-center">
                    {plan.featured && (
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-[0.68rem] font-extrabold text-white">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <h3 className={`text-center text-xl font-extrabold ${plan.featured ? 'text-blue-600' : 'text-slate-950'}`}>{plan.name}</h3>
                  <p className="mt-2 text-center text-sm text-slate-500">{plan.description}</p>
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-extrabold text-slate-950">{getPrice(plan, billingCycle)}</p>
                    {!plan.custom && <p className="text-sm text-slate-500">/{billingCycle === 'monthly' ? 'month' : 'year'}</p>}
                  </div>

                  <div className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                        <HiOutlineCheckCircle className="mt-0.5 shrink-0 text-blue-600" />
                        <span className="leading-6">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to={plan.custom ? '/contact' : '/signup'}
                    className={`mt-7 inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-extrabold transition duration-200 ease-out hover:-translate-y-0.5 ${
                      plan.featured
                        ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                        : 'border-slate-200 bg-white text-slate-950 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {plan.custom ? 'Contact Sales' : 'Start Free Trial'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_100%)] p-6 shadow-lg shadow-blue-950/5 sm:p-8 lg:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-5">
              <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-white sm:flex">
                <HiOutlineChatBubbleLeftRight className="text-5xl" />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold text-blue-600">Want to See Nexora in Action?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Book a free live demo with our experts and see how Nexora can transform your business.
                </p>
              </div>
            </div>
            <a
              href={whatsappLeadLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-blue-600 px-8 text-sm font-extrabold text-white shadow-[0_18px_38px_-22px_rgba(37,99,235,0.9)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-700"
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
                {footerGroups.modules.map((module) => (
                  <span key={module}>{module}</span>
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
    </div>
  )
}

export default App
