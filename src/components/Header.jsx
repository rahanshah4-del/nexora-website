import { useState } from 'react'
import { Link } from 'react-router-dom'

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

function NexoraMark({ className = 'h-16 w-16' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nexora_grad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C1FF" />
          <stop offset="0.55" stopColor="#2563EB" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        d="M18 50V14h6.2l21.8 26.6V14H52v36h-6.2L24 23.4V50H18Z"
        fill="url(#nexora_grad)"
      />
      <path
        d="M11 8.5A6.5 6.5 0 0 1 17.5 2h29A6.5 6.5 0 0 1 53 8.5v47A6.5 6.5 0 0 1 46.5 62h-29A6.5 6.5 0 0 1 11 55.5v-47Z"
        stroke="url(#nexora_grad)"
        strokeWidth="2"
        opacity="0.35"
      />
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

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fiverrLink = 'https://pro.fiverr.com/s/o85L4R4'

  const navLinks = [
    { href: '#hero', label: 'Home' },
    { href: '#services', label: 'Services' },
    { href: '#restaurant-pos', label: 'Restaurant POS' },
    { href: '#dashboards', label: 'Dashboards' },
    { href: '#case-studies', label: 'Projects' },
    { href: '#contact', label: 'Contact' },
  ]

  const ctaButtons = [
    { to: '/login', label: 'Login', icon: UserIcon, variant: 'secondary' },
    { to: '/login?mode=signup', label: 'Start Free Trial', icon: RocketIcon, variant: 'primary' },
    { href: fiverrLink, label: 'Hire on Fiverr', icon: FiverrIcon, variant: 'fiverr', external: true },
    { href: '#contact', label: 'Book Demo', icon: CalendarIcon, variant: 'primary' },
  ]

  return (
    <header className="sticky top-0 z-50">
      {/* Gradient line at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600" />

      {/* Main header container */}
      <div className="relative bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-[1440px] px-7 py-5">
          {/* Desktop layout */}
          <div className="flex items-center justify-between gap-6 lg:gap-8">
            {/* Logo section - 280px fixed width */}
            <a href="#hero" className="group flex shrink-0 items-center gap-4" style={{ width: '280px' }}>
              <div className="flex h-12 w-12 items-center justify-center">
                <NexoraMark className="h-12 w-12" />
              </div>
              <div className="hidden border-l border-slate-200/60 pl-4 sm:block">
                <p className="text-lg font-bold tracking-tight text-slate-950">NEXORA</p>
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.15em] text-slate-600">
                  Software &amp; Systems Studio
                </p>
              </div>
            </a>

            {/* Center navigation - hidden on mobile */}
            <nav className="hidden flex-1 items-center justify-center gap-7 whitespace-nowrap text-sm font-medium text-slate-700 lg:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 transition hover:text-slate-950 ${
                    link.href === '#hero' ? 'font-bold text-sky-600' : ''
                  }`}
                >
                  {link.label}
                  {link.label === 'Services' || link.label === 'Dashboards' ? (
                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                  ) : null}
                  {link.label === 'Restaurant POS' ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.65rem] font-bold text-sky-700">
                      New
                    </span>
                  ) : null}
                </a>
              ))}
            </nav>

            {/* Right buttons - hidden on mobile */}
            <div className="hidden flex-shrink-0 items-center gap-3 lg:flex">
              {ctaButtons.map((btn) => {
                const Icon = btn.icon
                const baseClasses =
                  'inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition shrink-0'

                const variants = {
                  primary:
                    'bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 hover:brightness-110',
                  secondary:
                    'border border-white/70 bg-white/80 text-slate-950 shadow-sm hover:bg-white',
                  fiverr:
                    'border border-white/70 bg-white/80 text-slate-950 shadow-sm hover:bg-white',
                }

                if (btn.external) {
                  return (
                    <a key={btn.label} href={btn.href} target="_blank" rel="noreferrer" className={baseClasses + ' ' + variants[btn.variant]}>
                      {btn.variant === 'fiverr' ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      {btn.label}
                    </a>
                  )
                }

                return (
                  <Link key={btn.label} to={btn.to} className={baseClasses + ' ' + variants[btn.variant]}>
                    <Icon className="h-4 w-4" />
                    {btn.label}
                  </Link>
                )
              })}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white active:scale-[0.99] lg:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
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

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="border-t border-white/60 bg-white/75 backdrop-blur-2xl lg:hidden">
              <div className="space-y-3 px-4 py-5">
                {/* Mobile buttons section */}
                <div className="grid gap-2">
                  {ctaButtons.map((btn) => {
                    const Icon = btn.icon
                    const baseClasses =
                      'inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition w-full'

                    const variants = {
                      primary:
                        'bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 hover:brightness-110',
                      secondary:
                        'border border-white/70 bg-white/80 text-slate-950 shadow-sm hover:bg-white',
                      fiverr:
                        'border border-white/70 bg-white/80 text-slate-950 shadow-sm hover:bg-white',
                    }

                    if (btn.external) {
                      return (
                        <a
                          key={btn.label}
                          href={btn.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setMobileMenuOpen(false)}
                          className={baseClasses + ' ' + variants[btn.variant]}
                        >
                          {btn.variant === 'fiverr' ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          {btn.label}
                        </a>
                      )
                    }

                    return (
                      <Link
                        key={btn.label}
                        to={btn.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={baseClasses + ' ' + variants[btn.variant]}
                      >
                        <Icon className="h-4 w-4" />
                        {btn.label}
                      </Link>
                    )
                  })}
                </div>

                {/* Mobile nav links */}
                <div className="grid gap-2 border-t border-white/60 pt-3">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
