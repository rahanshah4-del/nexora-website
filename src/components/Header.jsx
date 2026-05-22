import { useState } from 'react'
import { Link } from 'react-router-dom'
import NexoraLogo from './brand/NexoraLogo.jsx'

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

  return (
    <header className="sticky top-0 z-50">
      {/* Gradient line at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600" />

      {/* Main header container */}
      <div className="relative bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Desktop layout */}
          <div className="flex items-center justify-between gap-4 py-4 sm:gap-6">
            {/* Logo section - compact */}
            <a href="#hero" className="group flex shrink-0 items-center gap-3 min-w-fit">
              <NexoraLogo compact />
            </a>

            {/* Center navigation - hidden on tablet and mobile */}
            <nav className="hidden flex-1 items-center justify-center gap-5 whitespace-nowrap text-xs font-medium text-slate-700 xl:flex">
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
                    <ChevronDownIcon className="h-3 w-3 text-slate-400" />
                  ) : null}
                  {link.label === 'Restaurant POS' ? (
                    <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-sky-700">
                      New
                    </span>
                  ) : null}
                </a>
              ))}
            </nav>

            {/* Right buttons - compact on larger screens */}
            <div className="hidden flex-shrink-0 items-center gap-2 xl:flex">
              {/* Login button - icon only on XL */}
              <Link
                to="/login"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white"
                title="Login"
              >
                <UserIcon className="h-4 w-4" />
              </Link>

              {/* Primary CTA - Start Free Trial */}
              <Link
                to="/signup"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:brightness-110"
              >
                <RocketIcon className="h-3.5 w-3.5" />
                Free Trial
              </Link>

              {/* Secondary CTA - Hire on Fiverr */}
              <a
                href={fiverrLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-4 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-white"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <FiverrIcon className="h-3 w-3" />
                </span>
                Fiverr
              </a>
            </div>

            {/* Tablet menu button - shown on lg and hidden on xl */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white active:scale-[0.98] xl:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              <span className="pointer-events-none relative h-5 w-5">
                <span
                  className={`absolute left-0 top-1.5 block h-0.5 w-5 rounded-full bg-slate-700 transition duration-200 ${
                    mobileMenuOpen ? 'translate-y-1.5 rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-2.5 block h-0.5 w-5 rounded-full bg-slate-700 transition duration-200 ${
                    mobileMenuOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-3.5 block h-0.5 w-5 rounded-full bg-slate-700 transition duration-200 ${
                    mobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Mobile/Tablet menu */}
          {mobileMenuOpen && (
            <div className="border-t border-white/60 bg-white/75 backdrop-blur-2xl xl:hidden">
              <div className="space-y-3 px-2 py-4 sm:px-4">
                {/* Navigation links */}
                <div className="grid gap-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>

                {/* CTA buttons section */}
                <div className="border-t border-white/60 pt-3">
                  <div className="grid gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/80 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-white"
                    >
                      <UserIcon className="h-4 w-4" />
                      Login
                    </Link>

                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:brightness-110"
                    >
                      <RocketIcon className="h-4 w-4" />
                      Start Free Trial
                    </Link>

                    <a
                      href={fiverrLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/80 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-white"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <FiverrIcon className="h-3.5 w-3.5" />
                      </span>
                      Hire on Fiverr
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
