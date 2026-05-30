import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineCheckBadge,
  HiOutlineChatBubbleLeftRight,
  HiOutlineShieldCheck,
} from 'react-icons/hi2'
import Header from './components/Header'
import NexoraLogo from './components/brand/NexoraLogo'

const whatsappNumberDisplay = '03194329754'
const whatsappLink = 'https://wa.me/923194329754'
const whatsappLeadLink = `${whatsappLink}?text=${encodeURIComponent(
  'Assalam o Alaikum, I want a free demo of Nexora Business Suite.',
)}`
const contactEmail = 'rahanshah4@gmail.com'

const moduleCards = [
  {
    title: 'CRM',
    text: 'Lead tracking, follow-ups, customer history, and activity visibility in one clean workspace.',
    accent: 'from-sky-500 to-cyan-400',
  },
  {
    title: 'School ERP',
    text: 'Admissions, attendance, fees, timetables, staff management, and reporting for schools.',
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Property ERP',
    text: 'Units, tenants, collections, maintenance, and property operations without spreadsheet chaos.',
    accent: 'from-cyan-500 to-sky-500',
  },
  {
    title: 'POS',
    text: 'Billing, stock visibility, cashier flow, and daily sales summaries for retail and hospitality.',
    accent: 'from-indigo-500 to-sky-500',
  },
  {
    title: 'WhatsApp CRM',
    text: 'Chat-driven lead handling, follow-ups, and customer communication that keeps teams moving.',
    accent: 'from-sky-500 to-blue-500',
  },
  {
    title: 'Reports',
    text: 'Readable dashboards, performance snapshots, and business metrics built for faster decisions.',
    accent: 'from-blue-600 to-cyan-500',
  },
]

const trustStats = [
  { value: '500+', label: 'Happy Clients' },
  { value: '50,000+', label: 'Users' },
  { value: '25+', label: 'Business Modules' },
  { value: '99.9%', label: 'Uptime' },
]

const reasons = [
  {
    title: 'All-in-One Solution',
    text: 'Run sales, operations, communication, and reporting from a single modern platform.',
  },
  {
    title: 'Access Anywhere',
    text: 'Open Nexora from desktop, tablet, or mobile with a responsive UI that stays fast.',
  },
  {
    title: 'Secure & Reliable',
    text: 'Built with structured access and a clean architecture that supports business stability.',
  },
  {
    title: 'Easy to Use',
    text: 'Designed for owners and staff who want clear screens, simple actions, and less training.',
  },
]

const industries = [
  'Retail',
  'Education',
  'Property',
  'Hospitality',
  'Services',
  'Trading',
]

const pricingPlans = [
  {
    name: 'Basic',
    monthly: 2999,
    description: 'Essential business management for small teams and startups.',
    features: ['Core modules', 'Responsive dashboard', 'Email support', 'Starter reports'],
  },
  {
    name: 'Standard',
    monthly: 5999,
    description: 'Best for growing businesses that need more visibility and control.',
    features: ['Extended modules', 'Priority onboarding', 'Advanced reports', 'Team workflows'],
    featured: true,
  },
  {
    name: 'Premium',
    monthly: 9999,
    description: 'For businesses that want premium automation and deeper oversight.',
    features: ['Premium modules', 'Custom dashboard views', 'WhatsApp support', 'Analytics'],
  },
  {
    name: 'Enterprise',
    custom: true,
    description: 'Custom pricing for multi-branch or specialized implementations.',
    features: ['Tailored scope', 'Dedicated planning', 'Custom integrations', 'Deployment support'],
  },
]

const footerGroups = {
  quickLinks: [
    ['Home', '#hero'],
    ['Solutions', '#services'],
    ['Pricing', '#pricing'],
    ['Industries', '#products'],
  ],
  modules: ['CRM', 'School ERP', 'Property ERP', 'POS', 'WhatsApp CRM', 'Reports'],
  resources: [
    ['About Us', '#about'],
    ['Book a Demo', '#contact'],
    ['Login', '/login'],
    ['Get Started Free', '/signup'],
  ],
}

const yearlyDiscount = 0.85

function formatPrice(amount) {
  return new Intl.NumberFormat('en-PK').format(amount)
}

function getPricingLabel(plan, billingCycle) {
  if (plan.custom) return 'Custom Pricing'
  if (billingCycle === 'yearly') {
    return `PKR ${formatPrice(Math.round(plan.monthly * 12 * yearlyDiscount))}/year`
  }
  return `PKR ${formatPrice(plan.monthly)}/month`
}

function getBillingNote(plan, billingCycle) {
  if (plan.custom) return 'Tailored to your rollout'
  if (billingCycle === 'yearly') return 'Billed yearly with savings'
  return 'Billed monthly'
}

function App({ initialSectionId = '' }) {
  const [billingCycle, setBillingCycle] = useState('monthly')

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const elements = Array.from(document.querySelectorAll('[data-reveal]'))

    if (prefersReducedMotion || elements.length === 0) {
      elements.forEach((element) => element.classList.add('is-revealed'))
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
      { threshold: 0.18, rootMargin: '0px 0px -10% 0px' },
    )

    elements.forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${Math.min(index * 40, 240)}ms`)
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!initialSectionId) return undefined
    const handle = window.requestAnimationFrame(() => {
      const target = document.getElementById(initialSectionId)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(handle)
  }, [initialSectionId])

  return (
    <div className="page-enter relative overflow-x-hidden bg-[#f6f9ff] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(96,165,250,0.18),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.88),_rgba(246,249,255,0))]" />
        <div className="absolute left-0 top-28 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute right-0 top-80 h-80 w-80 rounded-full bg-blue-300/15 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(246,249,255,0),rgba(235,243,255,0.72))]" />
      </div>

      <Header />

      <main className="relative">
        <section id="hero" className="relative pt-10 sm:pt-14 lg:pt-16" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
              <div className="relative space-y-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/85 px-4 py-2 text-xs font-semibold text-sky-700 shadow-[0_16px_40px_-26px_rgba(14,165,233,0.45)] backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  Premium SaaS platform for modern businesses
                </div>

                <div className="space-y-5">
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-[4.4rem] lg:leading-[1.02]">
                    One Platform for All Your Business Management
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                    Nexora Business Suite brings CRM, ERP, POS, reporting, and communication into one premium workspace
                    so your team can move faster with less friction.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_24px_60px_-28px_rgba(37,99,235,0.7)] transition duration-300 hover:-translate-y-0.5 hover:from-sky-500 hover:to-blue-500"
                  >
                    Start Free Trial
                    <HiOutlineArrowRight className="ml-2 text-lg" />
                  </Link>
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.35)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
                  >
                    Book a Demo
                  </a>
                </div>

                <div className="flex flex-wrap gap-3">
                  {['Blue-first UI', 'Fast deployment', 'Responsive screens', 'Business-ready modules'].map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-[0_12px_30px_-20px_rgba(14,165,233,0.45)] backdrop-blur"
                    >
                      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-sky-500" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 rounded-[2.4rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(224,242,254,0.7)_60%,_rgba(191,219,254,0.25))] blur-2xl" />

                <div className="relative rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_30px_100px_-44px_rgba(37,99,235,0.35)] backdrop-blur-xl sm:p-5">
                  <div className="absolute left-4 right-4 top-4 rounded-[1.35rem] border border-slate-200/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Live dashboard preview
                      </span>
                    </div>
                  </div>

                  <div className="hero-float relative overflow-hidden rounded-[1.7rem] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 pt-20 sm:p-6 sm:pt-20">
                    <div className="pointer-events-none absolute -left-6 top-20 flex flex-col gap-3">
                      {[
                        ['CRM', 'bg-sky-500 text-white'],
                        ['ERP', 'bg-blue-100 text-blue-700'],
                        ['POS', 'bg-white text-slate-700'],
                      ].map(([label, style]) => (
                        <span
                          key={label}
                          className={`rounded-full px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] shadow-[0_14px_30px_-20px_rgba(15,23,42,0.4)] ${style}`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="pointer-events-none absolute -right-4 top-24 flex flex-col gap-3">
                      {[
                        ['Reports', 'bg-white text-slate-700'],
                        ['WhatsApp', 'bg-sky-50 text-sky-700'],
                        ['School ERP', 'bg-blue-600 text-white'],
                      ].map(([label, style]) => (
                        <span
                          key={label}
                          className={`rounded-full px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] shadow-[0_14px_30px_-20px_rgba(15,23,42,0.4)] ${style}`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                      <div className="rounded-[1.4rem] border border-sky-100 bg-gradient-to-br from-sky-600 to-blue-600 p-4 text-white shadow-[0_24px_60px_-30px_rgba(37,99,235,0.65)]">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[0.7rem] uppercase tracking-[0.28em] text-white/75">Business overview</p>
                            <p className="mt-2 text-2xl font-semibold">Rs 1.28M</p>
                          </div>
                          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em]">
                            +14.8%
                          </span>
                        </div>

                        <div className="mt-6 space-y-3">
                          {[
                            ['Sales', 84],
                            ['Collections', 72],
                            ['Growth', 91],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <div className="flex items-center justify-between text-xs font-medium text-white/75">
                                <span>{label}</span>
                                <span>{value}%</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-white/15">
                                <div className="h-2 rounded-full bg-white" style={{ width: `${value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          {[
                            ['Clients', '500+'],
                            ['Users', '50K+'],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-[1.1rem] bg-white/10 p-3 backdrop-blur">
                              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/70">{label}</p>
                              <p className="mt-2 text-lg font-semibold">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {[
                            {
                              label: 'Active modules',
                              value: '25+',
                              helper: 'CRM, ERP, POS, reports',
                            },
                            {
                              label: 'Uptime',
                              value: '99.9%',
                              helper: 'Reliable and secure',
                            },
                          ].map((card) => (
                            <div
                              key={card.label}
                              className="rounded-[1.4rem] border border-slate-200/70 bg-white p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]"
                            >
                              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
                              <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{card.helper}</p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-[1.4rem] border border-slate-200/70 bg-white p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Operations snapshot
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-950">Activity feed</p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              Live
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            {[
                              ['Invoices processed', '128 today', 'bg-sky-50 text-sky-700'],
                              ['WhatsApp replies', '34 pending', 'bg-blue-50 text-blue-700'],
                              ['Reports generated', '18 ready', 'bg-slate-100 text-slate-700'],
                            ].map(([title, value, style]) => (
                              <div
                                key={title}
                                className="flex items-center justify-between rounded-[1rem] border border-slate-100 bg-slate-50/80 px-4 py-3"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                                  <p className="mt-1 text-xs text-slate-500">Updated a few minutes ago</p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="pt-20 sm:pt-24 lg:pt-28" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="inline-flex rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
                Solutions
              </p>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Modular tools built into one polished platform
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Nexora keeps your core workflows in one place, from sales and communication to reporting and business
                operations.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {moduleCards.map((card) => (
                <article
                  key={card.title}
                  className="group rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_90px_-44px_rgba(37,99,235,0.32)]"
                >
                  <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${card.accent}`} />
                  <div className="mt-5 flex items-center gap-3">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.8)]`}>
                      {card.title.slice(0, 2)}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="pt-20 sm:pt-24 lg:pt-28" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.8rem] border border-slate-200/70 bg-white p-5 shadow-[0_22px_70px_-44px_rgba(15,23,42,0.32)] sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Trusted by 500+ Businesses</p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Premium software that feels calm, modern, and dependable.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  Businesses choose Nexora when they want one platform for smoother operations, clearer reporting, and a
                  better daily experience for the whole team.
                </p>
              </div>

              {trustStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.8rem] border border-slate-200/70 bg-white p-5 shadow-[0_22px_70px_-44px_rgba(15,23,42,0.32)]"
                >
                  <p className="text-3xl font-semibold text-slate-950">{stat.value}</p>
                  <p className="mt-3 text-sm font-medium uppercase tracking-[0.24em] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="products" className="pt-20 sm:pt-24 lg:pt-28" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="inline-flex rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
                Industries
              </p>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Built for industries that need clarity at scale
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Nexora adapts to different business models with the same premium interface and structured workflow.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {industries.map((industry, index) => (
                <div
                  key={industry}
                  className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.28)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-950">{industry}</p>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sm font-semibold text-sky-700">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Tailored workflows, dashboard views, and reporting can be aligned to this business category.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="pt-20 sm:pt-24 lg:pt-28" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="inline-flex rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
                Why Choose Nexora
              </p>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Everything the team needs, without the clutter
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {reasons.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.28)]"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.7)]">
                    <HiOutlineCheckBadge className="text-xl" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="pt-20 sm:pt-24 lg:pt-28" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
                  Pricing
                </p>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Flexible plans for every stage of growth
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  Switch between monthly and yearly billing to compare plans with a clean, premium UI.
                </p>
              </div>

              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.35)]">
                {['monthly', 'yearly'].map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      billingCycle === cycle
                        ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-[0_16px_36px_-24px_rgba(37,99,235,0.7)]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-5 xl:grid-cols-4">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-[1.85rem] border p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.28)] ${
                    plan.featured
                      ? 'border-sky-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.92))]'
                      : 'border-slate-200/70 bg-white/90'
                  }`}
                >
                  {plan.featured && (
                    <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                      Most Popular
                    </span>
                  )}
                  <h3 className="mt-4 text-xl font-semibold text-slate-950">{plan.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{plan.description}</p>

                  <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                    {plan.custom ? 'Custom' : getPricingLabel(plan, billingCycle)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-500">{getBillingNote(plan, billingCycle)}</p>

                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[0.7rem] font-bold text-sky-700">
                          ✓
                        </span>
                        <span className="leading-6">{feature}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="pt-20 sm:pt-24 lg:pt-28" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] px-6 py-10 shadow-[0_30px_100px_-50px_rgba(37,99,235,0.4)] sm:px-8 sm:py-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.2),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.14),_transparent_32%)]" />
              <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <p className="inline-flex rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
                    CTA
                  </p>
                  <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Want to See Nexora in Action?
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                    Get a guided walkthrough of the platform and see how the modules fit your business workflow.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
                  <a
                    href={whatsappLeadLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_24px_60px_-28px_rgba(37,99,235,0.7)] transition duration-300 hover:-translate-y-0.5 hover:from-sky-500 hover:to-blue-500"
                  >
                    Book Free Demo
                    <HiOutlineArrowRight className="ml-2 text-lg" />
                  </a>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.35)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="footer" className="mt-20 border-t border-slate-200/70 bg-white/80 backdrop-blur" data-reveal>
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.8fr_1fr]">
            <div className="space-y-5">
              <NexoraLogo compact />
              <p className="max-w-md text-sm leading-7 text-slate-600">
                Nexora Business Suite delivers a premium SaaS experience for teams that want cleaner operations and
                better control across every module.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Blue UI', 'Fast', 'Responsive'].map((item) => (
                  <span key={item} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Quick Links</h3>
              <div className="mt-5 grid gap-3 text-sm">
                {footerGroups.quickLinks.map(([label, href]) => (
                  <a key={label} href={href} className="text-slate-600 transition hover:text-sky-700">
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Modules</h3>
              <div className="mt-5 grid gap-3 text-sm">
                {footerGroups.modules.map((module) => (
                  <span key={module} className="text-slate-600">
                    {module}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Resources</h3>
              <div className="mt-5 grid gap-3 text-sm">
                {footerGroups.resources.map(([label, href]) => (
                  <a key={label} href={href} className="text-slate-600 transition hover:text-sky-700">
                    {label}
                  </a>
                ))}
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-slate-200/70 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Contact Us</h4>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="block transition hover:text-sky-700">
                    WhatsApp: {whatsappNumberDisplay}
                  </a>
                  <a href={`mailto:${contactEmail}`} className="block transition hover:text-sky-700">
                    {contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-slate-200/70 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Nexora Business Suite. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <HiOutlineShieldCheck className="text-lg text-sky-600" />
              <span>Premium SaaS experience</span>
            </div>
          </div>
        </div>
      </footer>

      <a
        href={whatsappLeadLink}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Nexora on WhatsApp"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full bg-[#25d366] px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_-28px_rgba(37,211,102,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1fbe5c] sm:px-5"
      >
        <HiOutlineChatBubbleLeftRight className="text-lg" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  )
}

export default App
