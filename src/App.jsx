import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const whatsappNumberDisplay = '03194329754'
const whatsappLink = 'https://wa.me/923194329754'
const fiverrLink = 'https://pro.fiverr.com/s/o85L4R4'
const contactEmail = 'rahanshah4@gmail.com'
const defaultLeadMessage = `Assalam o Alaikum, mujhe Nexora POS Solutions ka software demo chahiye.

Business Type:
Software Required For:
City:
Contact Name:
Details:`
const whatsappLeadLink = `${whatsappLink}?text=${encodeURIComponent(defaultLeadMessage)}`

const products = [
  {
    title: 'Nexora POS',
    text: 'Fast billing, stock sync, and business operations in one counter-ready platform.',
  },
  {
    title: 'Hospital Dashboard',
    text: 'Live OPD, pharmacy, and department reporting for daily hospital decisions.',
  },
  {
    title: 'Medical Store System',
    text: 'Batch tracking, expiry alerts, pharmacy billing, and medicine inventory control.',
  },
  {
    title: 'Parking Stand System',
    text: 'Ticketing, gate activity, and shift-wise collection tracking for parking operations.',
  },
  {
    title: 'Canteen Management',
    text: 'Meal billing, token flow, and category-wise sales reporting for canteen teams.',
  },
  {
    title: 'Transport Accounting',
    text: 'Trip income, fuel expense, and route-level profitability for transport operations.',
  },
]

const services = [
  {
    title: 'Restaurant POS Software',
    text: 'Fast billing, table orders, kitchen tickets, inventory, expenses, and owner dashboards for food businesses.',
  },
  {
    title: 'POS Billing and Receipts',
    text: 'Barcode billing, receipt printing, return handling, and customer transaction history.',
  },
  {
    title: 'Accounting and Profit Control',
    text: 'Centralized revenue, expense, and branch-wise profit visibility with clean reports.',
  },
  {
    title: 'Inventory and Alerts',
    text: 'Low stock, expiry, and reorder alerts to prevent stockouts and wastage.',
  },
  {
    title: 'Hospital and Pharmacy Flow',
    text: 'OPD collection, pharmacy sales, patient stats, and daily hospital financial tracking.',
  },
  {
    title: 'Transport and Fleet Monitoring',
    text: 'Trip income, fuel records, driver records, and daily profit snapshots in one system.',
  },
  {
    title: 'Business Automation',
    text: 'Automated summaries and role-based dashboards for management and operational teams.',
  },
]

const pricingPlans = [
  {
    name: 'Starter Package',
    installationFee: 'Rs 15,000',
    monthlyFee: 'Rs 3,000/month',
    popular: true,
    points: [
      'POS Billing System',
      'Expense Tracking',
      'Daily Sales Reports',
      'Receipt Printing',
      'Staff Login',
      'Basic Dashboard',
      'Mobile + Desktop Support',
      'WhatsApp Support',
    ],
  },
  {
    name: 'Growth',
    price: 'Rs 27,000',
    period: '/month',
    points: [
      'Multi-branch dashboard',
      'Hospital + Medical Store modules',
      'Accounting + expense flow',
      'Parking and canteen integration',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    points: [
      'Transport, parking, canteen integration',
      'Advanced operational analytics',
      'Custom reports and workflow',
      'Owner dashboards and API options',
      'Dedicated account manager',
    ],
  },
]

const branchOffices = [
  {
    name: 'Lahore Office',
    address: '08 Jade Park View City, Lahore',
  },
  {
    name: 'Multan Office',
    address: 'T Chowk, Shahrukn-e-Alam Colony, Multan',
  },
]

function FiverrIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 1.8C6.37 1.8 1.8 6.37 1.8 12S6.37 22.2 12 22.2 22.2 17.63 22.2 12 17.63 1.8 12 1.8Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M10.06 16.9V10.3H8.7V8.7h1.36V8.1c0-2.01 1.17-3.2 3.3-3.2.78 0 1.43.12 1.92.3v1.6c-.44-.14-.9-.2-1.4-.2-1.11 0-1.56.57-1.56 1.64v.46h2.78v1.6h-2.78v6.6h-2.9Z"
        fill="white"
      />
      <path d="M15.82 16.9a1.65 1.65 0 1 0 0-3.3 1.65 1.65 0 0 0 0 3.3Z" fill="white" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HeadsetIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 12a8 8 0 0 1 16 0v7a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 12v5a2 2 0 0 0 2 2h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 21h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UserIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M20 21a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RocketIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M14 4c3.2 0 6 2.8 6 6 0 4.2-4.6 9.2-9.6 9.2H8.8l-4.1 1.6 1.6-4.1V13.6C6.3 8.6 11.3 4 14 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 13.5l-3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CalendarIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M8 2v3M16 2v3M4 8h16M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function App({ initialSectionId = '' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [useImageLogo, setUseImageLogo] = useState(true)
  const logoSrc = '/nexora-logo.jpg'

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!initialSectionId) return
    const handle = window.requestAnimationFrame(() => {
      const el = document.getElementById(initialSectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
    return () => window.cancelAnimationFrame(handle)
  }, [initialSectionId])

  const handleDemoSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const fullName = formData.get('fullName')?.toString().trim() || 'Not provided'
    const phoneNumber = formData.get('phoneNumber')?.toString().trim() || 'Not provided'
    const emailAddress = formData.get('emailAddress')?.toString().trim() || 'Not provided'
    const city = formData.get('city')?.toString().trim() || 'Not provided'
    const businessType = formData.get('businessType')?.toString().trim() || 'Not provided'
    const softwareRequiredFor = formData.get('softwareRequiredFor')?.toString().trim() || 'Not provided'
    const details = formData.get('message')?.toString().trim() || 'Not provided'

    const whatsappMessage = `Assalam o Alaikum, mujhe Nexora POS Solutions ka software demo chahiye.\n\nBusiness Type: ${businessType}\nSoftware Required For: ${softwareRequiredFor}\nCity: ${city}\nContact Name: ${fullName}\nPhone Number: ${phoneNumber}\nEmail Address: ${emailAddress}\nDetails: ${details}`

    const mailSubject = encodeURIComponent('Nexora POS Solutions - Software Requirement')
    const mailBody = encodeURIComponent(
      `Assalam o Alaikum,\n\nBusiness Type: ${businessType}\nSoftware Required For: ${softwareRequiredFor}\nCity: ${city}\nContact Name: ${fullName}\nPhone Number: ${phoneNumber}\nEmail Address: ${emailAddress}\nDetails: ${details}`,
    )
    const mailtoLink = `mailto:${contactEmail}?subject=${mailSubject}&body=${mailBody}`

    const waWindow = window.open(
      `${whatsappLink}?text=${encodeURIComponent(whatsappMessage)}`,
      '_blank',
      'noopener,noreferrer',
    )

    if (!waWindow || waWindow.closed || typeof waWindow.closed === 'undefined') {
      window.location.href = mailtoLink
    }

    event.currentTarget.reset()
  }

  return (
    <div className="page-enter relative overflow-x-hidden bg-slate-50 text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_20%,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(168,85,247,0.16),_transparent_26%)] opacity-90" />

      <header className="sticky top-0 z-50">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600" />
        <div className="relative mx-auto w-full max-w-[1600px] px-6 pb-3 pt-5 lg:px-8 lg:pb-4">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 shadow-[0_30px_90px_-60px_rgba(2,6,23,0.38)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,_rgba(56,189,248,0.22),_transparent_45%),radial-gradient(circle_at_88%_15%,_rgba(168,85,247,0.18),_transparent_44%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/75 via-sky-50/55 to-white/70" />

            <div
              className={[
                'relative grid min-h-[120px] items-center gap-8 px-8 py-6',
                'grid-cols-[360px_1fr_600px]',
                'xl:grid-cols-[300px_1fr_500px] xl:gap-6',
                'lg:px-10',
              ].join(' ')}
            >
              <a href="#hero" className="group flex w-[360px] shrink-0 items-center gap-5 text-slate-950 xl:w-[300px]">
                <div className="relative rounded-3xl bg-gradient-to-br from-sky-500/40 via-indigo-500/25 to-violet-500/35 p-[1px]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/80 shadow-sm backdrop-blur">
                {useImageLogo ? (
                  <img
                    src={logoSrc}
                    alt="Nexora logo"
                    className="h-12 w-12 rounded-2xl object-contain object-center"
                    loading="eager"
                    decoding="async"
                    onError={() => setUseImageLogo(false)}
                  />
                ) : (
                  <div className="relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-400 to-violet-500 opacity-95" />
                    <svg
                      className="relative h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 18V6h2.7l6.6 8.4V6H18v12h-2.7L8.7 9.6V18H6Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                )}
                  </div>
                </div>
                <div className="hidden h-12 w-px bg-slate-200/80 sm:block" aria-hidden="true" />
                <div className="min-w-0 leading-tight">
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">NEXORA</p>
                  <p className="mt-1 text-[0.78rem] font-medium uppercase tracking-[0.18em] text-slate-600">
                    SOFTWARE &amp; SYSTEMS STUDIO
                  </p>
                </div>
              </a>

              <nav className="hidden min-w-0 items-center justify-center gap-7 whitespace-nowrap text-[0.95rem] font-medium text-slate-700 lg:flex">
                <a href="#hero" className="relative font-semibold text-sky-600">
                  Home
                  <span className="absolute -bottom-3 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-sky-500" />
                </a>
                <a href="#services" className="inline-flex items-center gap-1.5 hover:text-slate-950">
                  Services <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                </a>
                <a href="#restaurant-pos" className="inline-flex items-center gap-2 hover:text-slate-950">
                  Restaurant POS
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.7rem] font-semibold text-sky-700">New</span>
                </a>
                <a href="#dashboards" className="inline-flex items-center gap-1.5 hover:text-slate-950">
                  Dashboards <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                </a>
                <a href="#case-studies" className="hover:text-slate-950">
                  Projects
                </a>
                <a href="#contact" className="hover:text-slate-950">
                  Contact
                </a>
              </nav>

              <div className="hidden flex-col items-end gap-3 lg:flex">
                <div className="inline-flex h-10 items-center gap-3 rounded-2xl border border-white/70 bg-white/75 px-4 text-sm font-semibold text-slate-800 shadow-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-sky-600">
                        <HeadsetIcon className="h-4 w-4" />
                      </span>
                      Support
                    </span>
                    <span className="h-5 w-px bg-slate-200/80" aria-hidden="true" />
                    <span className="inline-flex items-center gap-2">
                      Live Chat <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    </span>
                  </div>

                <div className="flex flex-nowrap items-center justify-end gap-3">
                    <Link
                      to="/login"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/80 px-[22px] text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-white"
                    >
                      <UserIcon className="h-4 w-4 text-slate-700" />
                      Login
                    </Link>
                    <Link
                      to="/login?mode=signup"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-[22px] text-sm font-semibold text-white shadow-[0_18px_50px_-30px_rgba(79,70,229,0.75)] transition hover:brightness-110"
                    >
                      <RocketIcon className="h-4 w-4" />
                      Start Free Trial
                    </Link>
                    <a
                      href={fiverrLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/80 px-[22px] text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-white"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <FiverrIcon className="h-3.5 w-3.5" />
                      </span>
                      Hire on Fiverr
                    </a>
                    <a
                      href="#contact"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-[22px] text-sm font-semibold text-white shadow-[0_18px_50px_-30px_rgba(79,70,229,0.75)] transition hover:brightness-110"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      Book Demo
                    </a>
                  </div>
              </div>

              <div className="flex items-center justify-end lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                  aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileMenuOpen}
                >
                  <span className="sr-only">Menu</span>
                  <span className="pointer-events-none relative h-5 w-5">
                    <span
                      className={`absolute left-0 top-1 block h-0.5 w-5 rounded-full bg-slate-700 transition duration-200 ${
                        mobileMenuOpen ? 'translate-y-1.5 rotate-45' : ''
                      }`}
                    />
                    <span
                      className={`absolute left-0 top-2.5 block h-0.5 w-5 rounded-full bg-slate-700 transition duration-200 ${
                        mobileMenuOpen ? 'opacity-0' : ''
                      }`}
                    />
                    <span
                      className={`absolute left-0 top-4 block h-0.5 w-5 rounded-full bg-slate-700 transition duration-200 ${
                        mobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-white/60 bg-white/75 backdrop-blur-2xl lg:hidden">
              <div className="space-y-3 px-6 py-5">
                <div className="grid gap-2">
                  <div className="inline-flex h-11 items-center justify-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-sky-600">
                        <HeadsetIcon className="h-4 w-4" />
                      </span>
                      Support
                    </span>
                    <span className="h-5 w-px bg-slate-200/80" aria-hidden="true" />
                    <span className="inline-flex items-center gap-2">
                      Live Chat <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    </span>
                  </div>
                  <Link
                    to="/login"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserIcon className="h-4 w-4 text-slate-700" />
                    Login
                  </Link>
                  <Link
                    to="/login?mode=signup"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <RocketIcon className="h-4 w-4" />
                    Start Free Trial
                  </Link>
                  <a
                    href={fiverrLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <FiverrIcon className="h-3.5 w-3.5" />
                    </span>
                    Hire on Fiverr
                  </a>
                  <a
                    href="#contact"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Book Demo
                  </a>
                </div>

                <div className="grid gap-2 pt-1">
                  <a
                    href="#hero"
                    className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-sky-700 shadow-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </a>
                  <a
                    href="#services"
                    className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Services
                  </a>
                  <a
                    href="#restaurant-pos"
                    className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Restaurant POS
                  </a>
                  <a
                    href="#dashboards"
                    className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboards
                  </a>
                  <a
                    href="#case-studies"
                    className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Projects
                  </a>
                  <a
                    href="#contact"
                    className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        <section id="hero" className="relative overflow-hidden pb-10 pt-8 sm:py-20 lg:py-24" data-reveal>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-sparkle-grid opacity-90" />
            <div className="glow-blob absolute -top-28 left-1/2 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-400/25 via-cyan-300/20 to-violet-400/25 blur-3xl" />
            <div className="glow-blob absolute -bottom-40 right-[-8rem] h-72 w-72 rounded-full bg-sky-400/15 blur-3xl [animation-delay:1.2s]" />
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
              <div className="relative hero-enter [--delay:0ms] space-y-6 sm:space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm backdrop-blur sm:px-4 sm:py-2 sm:text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                  Premium software & dashboards
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-sky-700 sm:text-sm">NEXORA Solutions</p>
                  <h1 className="max-w-2xl font-semibold tracking-tight text-slate-950">
                    <span className="block text-[1.85rem] leading-[1.12] sm:hidden">
                      Premium Software, POS &amp; Dashboard Systems
                    </span>
                    <span className="hidden text-4xl sm:block sm:text-5xl">
                      Modern SaaS, ERP, CRM, POS and dashboard software for growing businesses
                    </span>
                  </h1>
                  <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                    Nexora builds custom software, POS systems, and real-time dashboards so teams run operations faster and
                    make confident decisions.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['POS Systems', 'ERP', 'CRM', 'Dashboards'].map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                      {item}
                    </span>
                  ))}
                </div>

                <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-700/20 transition hover:bg-sky-800"
                  >
                    Book Demo
                  </a>
                  <a
                    href="#services"
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                  >
                    View Services
                  </a>
                  <a
                    href={fiverrLink}
                    target="_blank"
                    rel="noreferrer"
                    className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md hover:shadow-emerald-600/10"
                  >
                    <span className="text-emerald-600">
                      <FiverrIcon className="h-4 w-4" />
                    </span>
                    Hire on Fiverr
                  </a>
                  <a
                    href={whatsappLeadLink}
                    target="_blank"
                    rel="noreferrer"
                    className="sm:col-span-2 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                  >
                    WhatsApp demo request
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
                  {[
                    { title: 'Fast Delivery', subtitle: 'Clear timelines' },
                    { title: 'Custom Software', subtitle: 'Built for you' },
                    { title: 'Automation', subtitle: 'Save hours/day' },
                  ].map((stat) => (
                    <div
                      key={stat.title}
                      className="rounded-[1.25rem] border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur"
                    >
                      <p className="text-xs font-semibold text-slate-950">{stat.title}</p>
                      <p className="mt-1 text-[0.72rem] leading-5 text-slate-600">{stat.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative hero-enter [--delay:120ms]">
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-sky-100/80 via-cyan-100/70 to-violet-100 blur-3xl" />
                <div className="glass-card relative overflow-hidden px-4 pb-4 pt-14 sm:px-6 sm:pb-6 sm:pt-16 hero-float">
                  <div className="pointer-events-none absolute inset-x-4 top-4 h-10 rounded-2xl border border-white/70 bg-white/60 backdrop-blur">
                    <div className="flex h-full items-center gap-2 px-4">
                      <span className="h-2 w-2 rounded-full bg-rose-400/90" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/90" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
                      <span className="ml-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                        Dashboard
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-sm">Live dashboard</p>
                      <h2 className="mt-2 text-lg font-semibold text-slate-950 sm:mt-3 sm:text-2xl">Nexora Business Cloud</h2>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                      Active
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                    <div className="rounded-3xl bg-slate-950/5 p-3 sm:p-4">
                      <p className="text-[0.7rem] uppercase tracking-[0.24em] text-slate-500 sm:text-xs">Revenue</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950 sm:mt-3 sm:text-2xl">Rs 458,200</p>
                    </div>
                    <div className="rounded-3xl bg-white p-3 shadow-sm sm:p-4">
                      <p className="text-[0.7rem] uppercase tracking-[0.24em] text-slate-500 sm:text-xs">Orders</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950 sm:mt-3 sm:text-2xl">128</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:mt-6">
                    <div className="flex items-center justify-between text-xs text-slate-500 sm:text-sm">
                      <span>Sales overview</span>
                      <span>Updated now</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:mt-5">
                      {[82, 68, 91].map((value, index) => (
                        <div key={index} className="grid gap-2">
                          <div className="flex items-center justify-between text-xs text-slate-600 sm:text-sm">
                            <span>{['Billing', 'Inventory', 'Reports'][index]}</span>
                            <span>{value}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="bg-slate-50 py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="space-y-6">
                <p className="text-sm uppercase tracking-[0.28em] text-sky-700">About Nexora</p>
                <h2 className="section-heading">A premium software partner for POS, healthcare, transport, and business operations</h2>
                <p className="section-copy">
                  Nexora provides practical software for billing, accounting, pharmacy, hospital, and transport workflows with clean dashboards and faster decision-making.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Tailored software</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">POS, ERP, CRM, and analytics in one place.</p>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Reliable delivery</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">Clear timelines, practical support, and fast onboarding.</p>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Expert support</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">WhatsApp and email support for every deployment.</p>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Scalable teams</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">From small shops to hospitals and transport hubs.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="feature-pill">Our service coverage</p>
              <h2 className="section-heading mt-6">Software services built for growing operations</h2>
              <p className="section-copy">
                From POS billing and inventory alerts to hospital workflows and transport dashboards, Nexora helps your team make decisions with clarity.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <div key={service.title} className="glass-panel">
                  <h3 className="text-lg font-semibold text-slate-950">{service.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{service.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="restaurant-pos" className="bg-slate-50 py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="space-y-6">
                <p className="feature-pill">Restaurant POS</p>
                <h2 className="section-heading">Restaurant POS Dashboard System</h2>
                <p className="text-sm font-semibold text-sky-700">Smart POS Software for Restaurants</p>
                <p className="section-copy">
                  Smart POS Software for Restaurants with table flow, KOT screens, cashier billing, inventory tracking, and
                  daily reporting — all in one premium dashboard.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { title: 'Order management dashboard', text: 'Track dine-in, takeaway, delivery, and pending bills in real time.' },
                    { title: 'Table management', text: 'Live table status, split bills, and fast table turnover.' },
                    { title: 'Kitchen order screen (KOT)', text: 'Auto-send tickets to kitchen with clear queue priority.' },
                    { title: 'Cashier billing dashboard', text: 'Speed billing with discounts, returns, and receipt print flow.' },
                    { title: 'Sales analytics', text: 'Daily/weekly trends, top items, and peak-hours insights.' },
                    { title: 'Inventory + menu management', text: 'Stock sync, low-stock alerts, recipe costs, and menu updates.' },
                    { title: 'Daily reports', text: 'Sales, expenses, profit, and cashier closing summaries.' },
                    { title: 'Staff/user roles', text: 'Role-based access for cashier, manager, and owner dashboards.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.75rem] border border-sky-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-slate-950">Complete Restaurant Management Dashboard</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Automate daily restaurant operations: order flow, kitchen workflow, inventory, and owner reports — with
                    a modern SaaS-style experience.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 rounded-[2.25rem] bg-gradient-to-br from-sky-200/60 via-cyan-100/60 to-violet-200/60 blur-3xl" />
                <div className="glass-card relative overflow-hidden px-4 pb-4 pt-14 sm:px-6 sm:pb-6 sm:pt-16 hero-float">
                  <div className="pointer-events-none absolute inset-x-4 top-4 h-10 rounded-2xl border border-white/70 bg-white/60 backdrop-blur">
                    <div className="flex h-full items-center gap-2 px-4">
                      <span className="h-2 w-2 rounded-full bg-rose-400/90" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/90" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
                      <span className="ml-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                        POS Screen
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Live POS screen</p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">Restaurant POS Dashboard</h3>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                      Active
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
                    {[
                      { label: 'Today Sales', value: 'Rs 214,900' },
                      { label: 'Open Tables', value: '12' },
                      { label: 'KOT Queue', value: '7' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-3xl bg-slate-950/5 p-4">
                        <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">{stat.label}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        <span>Tables</span>
                        <span className="text-sky-700">Live</span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                          { name: 'T1', state: 'busy' },
                          { name: 'T2', state: 'free' },
                          { name: 'T3', state: 'busy' },
                          { name: 'T4', state: 'reserved' },
                          { name: 'T5', state: 'free' },
                          { name: 'T6', state: 'busy' },
                        ].map((table) => (
                          <div
                            key={table.name}
                            className={`rounded-2xl border px-3 py-3 text-center text-xs font-semibold ${
                              table.state === 'free'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : table.state === 'reserved'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-sky-200 bg-sky-50 text-sky-700'
                            }`}
                          >
                            <div className="text-[0.7rem]">{table.name}</div>
                            <div className="mt-1 text-[0.68rem] font-medium opacity-80">{table.state}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        <span>Kitchen (KOT)</span>
                        <span className="text-sky-700">Queue</span>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {[
                          { item: 'Zinger Burger', table: 'T3', time: '03m' },
                          { item: 'Chicken Karahi', table: 'T1', time: '06m' },
                          { item: 'Club Sandwich', table: 'T6', time: '09m' },
                        ].map((row) => (
                          <div key={row.item} className="rounded-2xl border border-slate-200/70 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{row.item}</p>
                                <p className="mt-1 text-xs text-slate-600">Table {row.table}</p>
                              </div>
                              <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-semibold text-slate-700">
                                {row.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 rounded-2xl bg-slate-950/5 p-3 text-xs text-slate-600">
                        Restaurant business automation: auto KOT, bill print, and daily close reports.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="case-studies" className="py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl sm:mb-10">
              <p className="feature-pill">Demo case studies</p>
              <h2 className="section-heading mt-6">Demo Projects / Case Studies</h2>
              <p className="section-copy">
                Sample project breakdowns based on real business workflows. Available for custom client projects and tailored implementations.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'Restaurant POS Dashboard',
                  badge: 'Demo case study',
                  description: 'Order management, kitchen screen, billing, inventory, and reporting dashboard for restaurants.',
                  features: ['Order management', 'Kitchen screen (KOT)', 'Billing', 'Inventory', 'Reports'],
                },
                {
                  title: 'CRM & Admin Dashboard',
                  badge: 'Sample project',
                  description: 'Leads, customers, analytics, and role-based access for internal teams.',
                  features: ['Leads', 'Customers', 'Analytics', 'Staff roles'],
                },
                {
                  title: 'ERP Business Panel',
                  badge: 'Demo case study',
                  description: 'Finance, inventory and reporting dashboard for business operations.',
                  features: ['Finance', 'Inventory', 'Reports', 'Operations'],
                },
                {
                  title: 'SaaS Landing Website',
                  badge: 'Sample project',
                  description: 'Modern UI, responsive layout, contact flow, and fast deployment-ready landing pages.',
                  features: ['Modern UI', 'Responsive design', 'Contact form', 'Fast deployment'],
                },
              ].map((project) => (
                <div
                  key={project.title}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.22)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white sm:p-6"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500/70 via-cyan-400/60 to-violet-500/60 opacity-80" />
                  <div className="inline-flex">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[0.72rem] font-semibold text-slate-700 shadow-sm backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                      {project.badge}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950 sm:text-lg sm:leading-7">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{project.description}</p>

                  <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs font-semibold text-slate-500">Features</p>
                    <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                      {project.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                            ✓
                          </span>
                          <span className="leading-6">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="flex flex-wrap gap-2">
                    {['Custom Build', 'Responsive UI', 'Clean Reporting'].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
                      >
                        {tag}
                      </span>
                    ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fiverr" className="py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="space-y-6">
                <p className="feature-pill">Available on Fiverr</p>
                <h2 className="section-heading">Available for Freelance Projects</h2>
                <p className="section-copy">
                  Custom Software &amp; Dashboard Development delivered with premium UI, responsive screens, and clean business workflows.
                </p>
                <p className="text-sm leading-7 text-slate-600">
                  Hire me for custom POS, CRM, ERP, SaaS and dashboard development — scoped to your exact requirements.
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur">
                  <span className="text-emerald-600">
                    <FiverrIcon className="h-4 w-4" />
                  </span>
                  Available on Fiverr
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {['SaaS Development', 'Restaurant POS Systems', 'CRM & ERP Dashboards', 'Admin Panels', 'Custom Business Software'].map(
                    (item) => (
                      <div
                        key={item}
                        className="rounded-[1.5rem] border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur"
                      >
                        <p className="text-sm font-semibold text-slate-950">{item}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          Premium delivery with scalable structure and clean reporting.
                        </p>
                      </div>
                    ),
                  )}
                </div>
                <a
                  href={fiverrLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-emerald-600/25"
                >
                  <FiverrIcon className="h-4 w-4 text-white" />
                  Hire Me on Fiverr
                </a>
              </div>

              <div className="glass-panel">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">Fiverr availability</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Online
                  </span>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    { title: 'Fast Delivery', subtitle: 'Clear milestones' },
                    { title: 'Custom Development', subtitle: 'Built for your flow' },
                    { title: 'Responsive Design', subtitle: 'Mobile-first UI' },
                    { title: 'Business Automation', subtitle: 'Save time daily' },
                  ].map((badge) => (
                    <div key={badge.title} className="rounded-3xl bg-slate-950/5 p-4">
                      <p className="text-sm font-semibold text-slate-950">{badge.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{badge.subtitle}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm text-slate-600">
                    Prefer Fiverr? Start your project there — keep everything tracked with milestones, requirements, and delivery notes.
                  </p>
                  <a
                    href={fiverrLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 hover:shadow-md hover:shadow-emerald-600/10"
                  >
                    <span className="text-emerald-600">
                      <FiverrIcon className="h-4 w-4" />
                    </span>
                    Start Your Project
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="bg-slate-50 py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="feature-pill">Portfolio</p>
              <h2 className="section-heading mt-6">Projects and product experiences</h2>
              <p className="section-copy">
                Highlighting the software systems and dashboards Nexora delivers for retail, healthcare, parking, canteens, and transport businesses.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <div key={product.title} className="glass-panel">
                  <h3 className="text-lg font-semibold text-slate-950">{product.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{product.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="dashboards" className="py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="feature-pill">Insights</p>
              <h2 className="section-heading mt-6">Readable metrics, not empty placeholders</h2>
              <p className="section-copy">
                Real dashboards make action easier. Here are the key live metrics offered in Nexora insights and reporting.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="glass-panel">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">Nexora POS Dashboard</h3>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Retail</span>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Revenue</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">Rs 458,200</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Orders</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">128</p>
                  </div>
                </div>
                <div className="mt-5 rounded-3xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Live updates</p>
                </div>
              </div>
              <div className="glass-panel">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">Nexora Hospital Dashboard</h3>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Healthcare</span>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Today Patients</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">86</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">OPD Collection</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">Rs 92,500</p>
                  </div>
                </div>
                <div className="mt-5 rounded-3xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Pharmacy and inventory health at a glance.</p>
                </div>
              </div>
              <div className="glass-panel">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">Transport + Fleet Dashboard</h3>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Logistics</span>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Trips</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">24</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Fuel Expense</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">Rs 18,600</p>
                  </div>
                </div>
                <div className="mt-5 rounded-3xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Trip income and fleet profit tracking.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-slate-50 py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="feature-pill">Pricing packages</p>
              <h2 className="section-heading mt-6">Flexible plans for growing teams</h2>
              <p className="section-copy">
                Choose a package that fits your business size, operational needs, and need for automation and reporting.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`glass-panel ${plan.popular ? 'border-sky-300/90 bg-sky-50/80' : ''}`}
                >
                  {plan.popular && (
                    <span className="mb-4 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl font-semibold text-slate-950">{plan.name}</h3>
                  {plan.installationFee ? (
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-3xl bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Installation fee</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{plan.installationFee}</p>
                      </div>
                      <div className="rounded-3xl bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Monthly fee</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{plan.monthlyFee}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-3xl font-semibold text-slate-950">{plan.price} <span className="text-base font-medium text-slate-600">{plan.period}</span></p>
                  )}
                  <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                    {plan.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700">✓</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
                  >
                    Start a conversation
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="space-y-6">
                <p className="feature-pill">Contact</p>
                <h2 className="section-heading">Tell us your requirement and get a guided setup plan</h2>
                <p className="section-copy">
                  Share your business type and required software. Our team will guide you with the best POS, accounting or dashboard solution.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-950">WhatsApp Support</h3>
                    <p className="mt-3 text-sm text-slate-600">Send your requirement and get quick demo consultation.</p>
                    <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800">
                      Send Requirement
                    </a>
                  </div>
                  <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-950">Email Support</h3>
                    <p className="mt-3 text-sm text-slate-600">Share documents or requirements directly by email.</p>
                    <a href={`mailto:${contactEmail}`} className="mt-5 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50">
                      Email Us
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-slate-950">Requirement Form</h3>
                  <a
                    href={fiverrLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur transition hover:bg-emerald-50 hover:shadow-md hover:shadow-emerald-600/10"
                  >
                    <span className="text-emerald-600">
                      <FiverrIcon className="h-4 w-4" />
                    </span>
                    Contact on Fiverr
                  </a>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Tell us your business type and required software. Our team will guide you with the best POS, accounting or dashboard solution.
                </p>
                <form className="mt-6 grid gap-3 sm:mt-8 sm:gap-4" onSubmit={handleDemoSubmit}>
                  <label className="space-y-2 text-sm font-medium text-slate-900" htmlFor="fullName">
                    <span>Full Name</span>
                    <input id="fullName" name="fullName" type="text" placeholder="Your full name" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-900" htmlFor="phoneNumber">
                    <span>Phone Number</span>
                    <input id="phoneNumber" name="phoneNumber" type="tel" placeholder="03XXXXXXXXX" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-900" htmlFor="emailAddress">
                    <span>Email Address</span>
                    <input id="emailAddress" name="emailAddress" type="email" placeholder="you@example.com" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-900" htmlFor="city">
                    <span>City</span>
                    <input id="city" name="city" type="text" placeholder="Your city" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-900" htmlFor="businessType">
                    <span>Business Type</span>
                    <select id="businessType" name="businessType" defaultValue="" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 appearance-none">
                      <option value="" disabled>Select business type</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Canteen">Canteen</option>
                      <option value="Medical Store">Medical Store</option>
                      <option value="Hospital">Hospital</option>
                      <option value="Parking / Bike Stand">Parking / Bike Stand</option>
                      <option value="Transport / Rent Car">Transport / Rent Car</option>
                      <option value="Retail Shop">Retail Shop</option>
                      <option value="Inventory / Warehouse">Inventory / Warehouse</option>
                      <option value="Other Business">Other Business</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-900" htmlFor="softwareRequiredFor">
                    <span>Software Required For</span>
                    <select id="softwareRequiredFor" name="softwareRequiredFor" defaultValue="" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 appearance-none">
                      <option value="" disabled>Select required software</option>
                      <option value="POS Billing">POS Billing</option>
                      <option value="Accounting Dashboard">Accounting Dashboard</option>
                      <option value="Inventory Management">Inventory Management</option>
                      <option value="Hospital Dashboard">Hospital Dashboard</option>
                      <option value="Medical Store System">Medical Store System</option>
                      <option value="Transport Accounting">Transport Accounting</option>
                      <option value="Parking Stand System">Parking Stand System</option>
                      <option value="Custom Software">Custom Software</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-900" htmlFor="message">
                    <span>Message / Requirements</span>
                    <textarea id="message" name="message" placeholder="Describe your requirements, branches, and expected timeline." className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 min-h-[110px] resize-vertical" />
                  </label>
                  <button type="submit" className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800">
                    Send Requirement on WhatsApp
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section id="branches" className="bg-slate-50 py-14 sm:py-20 lg:py-24" data-reveal>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="feature-pill">Locations</p>
              <h2 className="section-heading mt-6">Our branch offices</h2>
              <p className="section-copy">
                Local offices and contact channels for Nexora support, demos and implementation guidance.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {branchOffices.map((office) => (
                <div key={office.name} className="glass-panel">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-700">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                        <path d="M12 2.8c-4.06 0-7.34 3.2-7.34 7.17 0 4.97 5.98 10.52 6.23 10.76a1.63 1.63 0 0 0 2.22 0c.26-.24 6.23-5.79 6.23-10.76 0-3.97-3.28-7.17-7.34-7.17Zm0 9.95a2.79 2.79 0 1 1 0-5.57 2.79 2.79 0 0 1 0 5.57Z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{office.name}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{office.address}</p>
                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <a href={whatsappLink} className="inline-flex text-sky-700 hover:text-sky-900">Phone: {whatsappNumberDisplay}</a>
                        <a href={`mailto:${contactEmail}`} className="inline-flex text-sky-700 hover:text-sky-900">Email: {contactEmail}</a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/90 py-12" data-reveal>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="logo-shell inline-flex items-center justify-center rounded-2xl bg-slate-950/95 p-1.5 shadow-sm ring-1 ring-slate-200/60 backdrop-blur">
                  {useImageLogo ? (
                    <img
                      src={logoSrc}
                      alt="Nexora logo"
                      className="h-10 w-auto rounded-xl object-contain"
                      loading="lazy"
                      decoding="async"
                      onError={() => setUseImageLogo(false)}
                    />
                  ) : (
                    <div className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white">
                      <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-400 to-violet-500 opacity-95" />
                      <svg
                        className="relative h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 18V6h2.7l6.6 8.4V6H18v12h-2.7L8.7 9.6V18H6Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-sky-700">NEXORA</p>
                  <h2 className="text-2xl font-semibold text-slate-950">Nexora Solutions</h2>
                </div>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600">
                Premium business software for POS, hospitals, medical stores, transport operations, and live dashboards.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={fiverrLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-emerald-600/25"
                >
                  <FiverrIcon className="h-4 w-4 text-white" />
                  Hire on Fiverr
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-50"
                >
                  Book Demo
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-950">Services</h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li>POS software</li>
                <li>ERP & CRM</li>
                <li>Healthcare dashboards</li>
                <li>Inventory & accounting</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-950">Contact</h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li>Phone: {whatsappNumberDisplay}</li>
                <li>Email: {contactEmail}</li>
                <li>Address: 08 Jade Park View City Lahore</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200/70 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>© 2026 Nexora Solutions. All rights reserved.</div>
            <div className="flex w-full justify-center sm:w-auto sm:justify-end">
              <a
                href={fiverrLink}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex w-full max-w-[36rem] items-center justify-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md sm:w-auto sm:justify-start sm:text-sm"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200/70 shadow-sm sm:h-8 sm:w-8">
                  {useImageLogo ? (
                    <img
                      src={logoSrc}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                      onError={() => setUseImageLogo(false)}
                    />
                  ) : (
                    <span className="h-full w-full rounded-full bg-gradient-to-br from-sky-500 via-cyan-400 to-violet-500" />
                  )}
                </span>

                <span className="text-slate-500">
                  Powered by <span className="font-semibold text-sky-700">Nexora Solutions</span>
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />

                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <FiverrIcon className="h-4 w-4 text-emerald-600" />
                  Available on Fiverr
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
