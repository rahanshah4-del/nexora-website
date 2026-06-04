import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Industries', to: '/industries' },
  { label: 'About Us', href: '/#about' },
  { label: 'Contact', to: '/contact' },
]

const solutionLinks = [
  { label: 'CRM', to: '/solutions/crm' },
  { label: 'School ERP', to: '/solutions/school-erp' },
  { label: 'Property ERP', to: '/solutions/property-erp' },
  { label: 'POS', to: '/solutions/pos' },
  { label: 'WhatsApp CRM', to: '/solutions/whatsapp-crm' },
  { label: 'Reports', to: '/solutions/reports' },
]

function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
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

  const navLinkClass = (link) => {
    const isActive = link.to === '/' ? location.pathname === '/' : link.to && location.pathname === link.to
    return `nav-link text-sm font-bold transition duration-200 ease-out hover:text-blue-600 ${
      isActive ? 'active text-blue-600' : 'text-slate-900'
    }`
  }

  const renderMainLink = (link) => {
    if (link.to) {
      return (
        <Link key={link.label} to={link.to} onClick={closeAll} className={navLinkClass(link)}>
          {link.label}
        </Link>
      )
    }

    return (
      <a key={link.label} href={link.href} onClick={closeAll} className={navLinkClass(link)}>
        {link.label}
      </a>
    )
  }

  return (
    <header className="site-header sticky top-0 z-50 border-b border-slate-100/80 bg-white/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0" onClick={closeAll}>
          <NexoraLogo compact textClassName="[&>p:first-child]:text-lg [&>p:first-child]:tracking-[0.12em] [&>p:last-child]:text-[0.55rem]" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {renderMainLink(mainLinks[0])}

          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown('solutions')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              onClick={() => toggleDropdown('solutions')}
              className={`nav-link inline-flex items-center gap-1 text-sm font-bold transition duration-200 ease-out hover:text-blue-600 ${
                location.pathname.startsWith('/solutions') ? 'active text-blue-600' : 'text-slate-900'
              }`}
              aria-expanded={activeDropdown === 'solutions'}
            >
              Solutions
              <HiOutlineChevronDown className="text-base" />
            </button>

            <div
              className={`absolute left-1/2 top-[calc(100%+1.1rem)] w-64 -translate-x-1/2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl transition duration-150 ${
                activeDropdown === 'solutions' ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
              }`}
            >
              {solutionLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeAll}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 ease-out hover:bg-blue-50 hover:text-blue-600"
                >
                  <span>{link.label}</span>
                  <HiOutlineArrowRight className="text-slate-400" />
                </Link>
              ))}
            </div>
          </div>

          {mainLinks.slice(1).map((link) => renderMainLink(link))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.7)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_18px_40px_-26px_rgba(15,23,42,0.9)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Get Started Free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 transition duration-200 ease-out hover:bg-slate-50 lg:hidden"
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
              {mainLinks.map((link) => {
                const className =
                  'flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold text-slate-800 transition duration-200 ease-out hover:bg-blue-50 hover:text-blue-600'
                if (link.to) {
                  return (
                    <Link key={link.label} to={link.to} onClick={closeAll} className={className}>
                      {link.label}
                      <HiOutlineArrowRight className="text-slate-400" />
                    </Link>
                  )
                }
                return (
                  <a key={link.label} href={link.href} onClick={closeAll} className={className}>
                    {link.label}
                    <HiOutlineArrowRight className="text-slate-400" />
                  </a>
                )
              })}
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="px-2 pb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Solutions</p>
              <div className="grid gap-1">
                {solutionLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={closeAll}
                    className="flex items-center justify-between rounded-md px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 ease-out hover:bg-white hover:text-blue-600"
                  >
                    {link.label}
                    <HiOutlineArrowRight className="text-slate-400" />
                  </Link>
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
