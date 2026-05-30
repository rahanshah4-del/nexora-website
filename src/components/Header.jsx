import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineBars3,
  HiOutlineChevronDown,
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineXMark,
} from 'react-icons/hi2'
import NexoraLogo from './brand/NexoraLogo'

const mainLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Industries', href: '#products' },
  { label: 'About Us', href: '#about' },
]

const solutionLinks = [
  { label: 'Modules', href: '#services' },
  { label: 'Why Choose Nexora', href: '#features' },
  { label: 'Trusted By Businesses', href: '#about' },
]

const resourceLinks = [
  { label: 'Book a Demo', href: '#contact' },
  { label: 'Login', href: '/login' },
  { label: 'Get Started Free', href: '/signup' },
]

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileMenuOpen])

  const closeAll = () => {
    setMobileMenuOpen(false)
    setActiveDropdown(null)
  }

  const toggleDropdown = (key) => {
    setActiveDropdown((current) => (current === key ? null : key))
  }

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative rounded-[1.65rem] border border-white/70 bg-white/88 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-sky-400/0 via-sky-500/70 to-blue-500/0" />

          <div className="flex items-center gap-3 px-3 py-3 sm:px-4 lg:px-5">
            <a href="#hero" className="shrink-0" onClick={closeAll}>
              <NexoraLogo compact />
            </a>

            <nav className="ml-4 hidden flex-1 items-center justify-center gap-1 lg:flex">
              {mainLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition duration-300 hover:bg-slate-50 hover:text-sky-700"
                >
                  {link.label}
                </a>
              ))}

              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown('solutions')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  type="button"
                  onClick={() => toggleDropdown('solutions')}
                  className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition duration-300 hover:bg-slate-50 hover:text-sky-700"
                  aria-expanded={activeDropdown === 'solutions'}
                >
                  Solutions
                  <HiOutlineChevronDown className="text-base" />
                </button>

                <div
                  className={`absolute left-0 top-[calc(100%+0.65rem)] w-64 rounded-[1.4rem] border border-slate-200/70 bg-white p-2 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.25)] transition duration-200 ${
                    activeDropdown === 'solutions' ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                  }`}
                >
                  {solutionLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={closeAll}
                      className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                    >
                      <span>{link.label}</span>
                      <HiOutlineArrowRight className="text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>

              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown('resources')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  type="button"
                  onClick={() => toggleDropdown('resources')}
                  className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition duration-300 hover:bg-slate-50 hover:text-sky-700"
                  aria-expanded={activeDropdown === 'resources'}
                >
                  Resources
                  <HiOutlineChevronDown className="text-base" />
                </button>

                <div
                  className={`absolute left-0 top-[calc(100%+0.65rem)] w-64 rounded-[1.4rem] border border-slate-200/70 bg-white p-2 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.25)] transition duration-200 ${
                    activeDropdown === 'resources' ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                  }`}
                >
                  {resourceLinks.map((link) =>
                    link.href.startsWith('/') ? (
                      <Link
                        key={link.label}
                        to={link.href}
                        onClick={closeAll}
                        className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                      >
                        <span>{link.label}</span>
                        <HiOutlineArrowRight className="text-slate-400" />
                      </Link>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        onClick={closeAll}
                        className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                      >
                        <span>{link.label}</span>
                        <HiOutlineArrowRight className="text-slate-400" />
                      </a>
                    ),
                  )}
                </div>
              </div>
            </nav>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <Link
                to="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
              >
                <HiOutlineUserCircle className="text-lg" />
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_20px_50px_-28px_rgba(37,99,235,0.7)] transition duration-300 hover:-translate-y-0.5 hover:from-sky-500 hover:to-blue-500"
              >
                <HiOutlineSparkles className="text-lg" />
                Get Started Free
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="ml-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] transition hover:bg-slate-50 lg:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <HiOutlineXMark className="text-xl" /> : <HiOutlineBars3 className="text-xl" />}
            </button>
          </div>
        </div>

        <div className={`fixed inset-0 z-[60] lg:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <button
            type="button"
            className={`absolute inset-0 bg-slate-950/30 transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeAll}
            aria-label="Close navigation menu"
            tabIndex={mobileMenuOpen ? 0 : -1}
          />

          <aside
            className={`absolute right-3 top-3 flex h-[calc(100dvh-1.5rem)] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.8rem] border border-white/80 bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.52)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              mobileMenuOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4">
              <NexoraLogo compact />
              <button
                type="button"
                onClick={closeAll}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm"
                aria-label="Close navigation menu"
              >
                <HiOutlineXMark className="text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-1.5">
                {mainLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={closeAll}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                  >
                    {link.label}
                    <HiOutlineArrowRight className="text-slate-400" />
                  </a>
                ))}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200/70 bg-slate-50 p-3">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Solutions</p>
                <div className="grid gap-1">
                  {solutionLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={closeAll}
                      className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-sky-700"
                    >
                      {link.label}
                      <HiOutlineArrowRight className="text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200/70 bg-slate-50 p-3">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Resources</p>
                <div className="grid gap-1">
                  {resourceLinks.map((link) =>
                    link.href.startsWith('/') ? (
                      <Link
                        key={link.label}
                        to={link.href}
                        onClick={closeAll}
                        className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-sky-700"
                      >
                        {link.label}
                        <HiOutlineArrowRight className="text-slate-400" />
                      </Link>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        onClick={closeAll}
                        className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-sky-700"
                      >
                        {link.label}
                        <HiOutlineArrowRight className="text-slate-400" />
                      </a>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-2 min-[390px]:grid-cols-2">
                <Link
                  to="/login"
                  onClick={closeAll}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm"
                >
                  <HiOutlineUserCircle className="text-lg" />
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeAll}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-600/15"
                >
                  <HiOutlineSparkles className="text-lg" />
                  Get Started Free
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </header>
  )
}

export default Header
