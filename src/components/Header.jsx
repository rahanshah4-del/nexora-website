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
  { label: 'CRM', href: '#services' },
  { label: 'School ERP', href: '#services' },
  { label: 'Property ERP', href: '#services' },
  { label: 'POS', href: '#services' },
  { label: 'WhatsApp CRM', href: '#services' },
  { label: 'Reports', href: '#services' },
]

const resourceLinks = [
  { label: 'Why Choose Nexora', href: '#features' },
  { label: 'Trusted Businesses', href: '#about' },
  { label: 'Book a Demo', href: '#contact' },
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
    <header className="site-header sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8">
        <a href="#hero" className="shrink-0" onClick={closeAll}>
          <NexoraLogo compact textClassName="[&>p:first-child]:text-lg [&>p:first-child]:tracking-[0.12em] [&>p:last-child]:text-[0.55rem]" />
        </a>

        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          <a href="#hero" className="nav-link active text-sm font-bold text-blue-600 transition duration-200 ease-out hover:text-blue-700">
            Home
          </a>

          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown('solutions')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              onClick={() => toggleDropdown('solutions')}
              className="nav-link inline-flex items-center gap-1 text-sm font-bold text-slate-900 transition duration-200 ease-out hover:text-blue-600"
              aria-expanded={activeDropdown === 'solutions'}
            >
              Solutions
              <HiOutlineChevronDown className="text-base" />
            </button>

            <div
              className={`absolute left-1/2 top-[calc(100%+1.1rem)] w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.45)] transition duration-150 ${
                activeDropdown === 'solutions' ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
              }`}
            >
              {solutionLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeAll}
                  className="flex items-center justify-between rounded-md px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 ease-out hover:bg-blue-50 hover:text-blue-600"
                >
                  <span>{link.label}</span>
                  <HiOutlineArrowRight className="text-slate-400" />
                </a>
              ))}
            </div>
          </div>

          {mainLinks.slice(1).map((link) => (
            <a key={link.label} href={link.href} className="nav-link text-sm font-bold text-slate-900 transition duration-200 ease-out hover:text-blue-600">
              {link.label}
            </a>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown('resources')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              onClick={() => toggleDropdown('resources')}
              className="nav-link inline-flex items-center gap-1 text-sm font-bold text-slate-900 transition duration-200 ease-out hover:text-blue-600"
              aria-expanded={activeDropdown === 'resources'}
            >
              Resources
              <HiOutlineChevronDown className="text-base" />
            </button>

            <div
              className={`absolute left-1/2 top-[calc(100%+1.1rem)] w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.45)] transition duration-150 ${
                activeDropdown === 'resources' ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
              }`}
            >
              {resourceLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeAll}
                  className="flex items-center justify-between rounded-md px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 ease-out hover:bg-blue-50 hover:text-blue-600"
                >
                  <span>{link.label}</span>
                  <HiOutlineArrowRight className="text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-11 items-center justify-center rounded-md bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_18px_38px_-24px_rgba(37,99,235,0.9)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Get Started Free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-900 transition duration-200 ease-out hover:bg-slate-50 lg:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <HiOutlineXMark className="text-2xl" /> : <HiOutlineBars3 className="text-2xl" />}
        </button>
      </div>

      <div className={`fixed inset-0 z-[60] lg:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-200 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeAll}
          aria-label="Close navigation menu"
          tabIndex={mobileMenuOpen ? 0 : -1}
        />

        <aside
          className={`absolute right-3 top-3 flex h-[calc(100dvh-1.5rem)] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.55)] transition-transform duration-200 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <NexoraLogo compact />
            <button
              type="button"
              onClick={closeAll}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-900"
              aria-label="Close navigation menu"
            >
              <HiOutlineXMark className="text-xl" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid gap-1">
              {mainLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeAll}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold text-slate-800 transition duration-200 ease-out hover:bg-blue-50 hover:text-blue-600"
                >
                  {link.label}
                  <HiOutlineArrowRight className="text-slate-400" />
                </a>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="px-2 pb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Solutions</p>
              <div className="grid gap-1">
                {solutionLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={closeAll}
                    className="flex items-center justify-between rounded-md px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 ease-out hover:bg-white hover:text-blue-600"
                  >
                    {link.label}
                    <HiOutlineArrowRight className="text-slate-400" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="px-2 pb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Resources</p>
              <div className="grid gap-1">
                {resourceLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={closeAll}
                    className="flex items-center justify-between rounded-md px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 ease-out hover:bg-white hover:text-blue-600"
                  >
                    {link.label}
                    <HiOutlineArrowRight className="text-slate-400" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2 min-[390px]:grid-cols-2">
              <Link
                to="/login"
                onClick={closeAll}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900"
              >
                <HiOutlineUserCircle className="text-lg" />
                Login
              </Link>
              <Link
                to="/signup"
                onClick={closeAll}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"
              >
                <HiOutlineSparkles className="text-lg" />
                Get Started Free
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </header>
  )
}

export default Header
