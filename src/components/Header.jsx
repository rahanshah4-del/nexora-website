import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBars3,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronDown,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentChartBar,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineSparkles,
  HiOutlineTruck,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
  HiOutlineXMark,
} from 'react-icons/hi2'
import NexoraLogo from './brand/NexoraLogo'

const mainLinks = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Business Services', to: '/business-services' },
  { label: 'Industries', to: '/industries' },
  { label: 'Blog', to: '/blog' },
]

const solutionIconMap = {
  CRM: HiOutlineUserGroup,
  'Restaurant POS': HiOutlineShoppingCart,
  'Retail POS': HiOutlineShoppingCart,
  'School ERP': HiOutlineAcademicCap,
  'Property ERP': HiOutlineBuildingOffice2,
  'Medical Store POS': HiOutlineShieldCheck,
  'Transport / Rental': HiOutlineTruck,
  'WhatsApp CRM': HiOutlineChatBubbleLeftRight,
  'Email Marketing': HiOutlineDevicePhoneMobile,
  'Reports & Analytics': HiOutlineChartBarSquare,
  'Inventory Management': HiOutlineDocumentChartBar,
  'Team & Permissions': HiOutlineUserGroup,
}

const solutionLinks = [
  { label: 'CRM', to: '/solutions/crm' },
  { label: 'Restaurant POS', to: '/restaurant-pos' },
  { label: 'Retail POS', to: '/retail-pos' },
  { label: 'School ERP', to: '/school-erp' },
  { label: 'Property ERP', to: '/solutions/property-erp' },
  { label: 'Medical Store POS', to: '/solutions/medical-store-pos' },
  { label: 'Transport / Rental', to: '/transport' },
  { label: 'WhatsApp CRM', to: '/whatsapp-crm' },
  { label: 'Email Marketing', to: '/solutions/email-marketing' },
  { label: 'Reports & Analytics', to: '/solutions/reports-analytics' },
  { label: 'Inventory Management', to: '/solutions/inventory-management' },
  { label: 'Team & Permissions', to: '/solutions/team-permissions' },
]

function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const dropdownCloseTimer = useRef(null)

  /* ── Escape / click-outside ── */
  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setActiveDropdown(null)
      }
    }

    const onClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown-wrapper]') && !event.target.closest('[data-solutions-button]')) {
        setActiveDropdown(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('click', onClickOutside, true)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('click', onClickOutside, true)
    }
  }, [mobileMenuOpen])

  /* Close dropdown on route change */
  useEffect(() => {
    setActiveDropdown(null)
  }, [location.pathname])

  useEffect(() => () => {
    if (dropdownCloseTimer.current) window.clearTimeout(dropdownCloseTimer.current)
  }, [])

  const closeAll = () => {
    if (dropdownCloseTimer.current) window.clearTimeout(dropdownCloseTimer.current)
    setMobileMenuOpen(false)
    setActiveDropdown(null)
  }

  const openDropdown = (key) => {
    if (dropdownCloseTimer.current) window.clearTimeout(dropdownCloseTimer.current)
    setActiveDropdown(key)
  }

  const scheduleDropdownClose = () => {
    if (dropdownCloseTimer.current) window.clearTimeout(dropdownCloseTimer.current)
    dropdownCloseTimer.current = window.setTimeout(() => setActiveDropdown(null), 160)
  }

  const toggleDropdown = (key) => {
    setActiveDropdown((current) => (current === key ? null : key))
  }

  const isActiveLink = (link) => {
    if (link.to === '/') return location.pathname === '/'
    if (link.to === '/blog') return location.pathname.startsWith('/blog')
    return link.to && location.pathname === link.to
  }

  const isSolutionsActive = location.pathname.startsWith('/solutions')
    || ['/restaurant-pos', '/retail-pos', '/school-erp', '/transport', '/whatsapp-crm'].includes(location.pathname)

  const navLinkClass = (link) =>
    `nav-link relative inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors duration-200 ${
      isActiveLink(link)
        ? 'text-slate-900 bg-slate-100'
        : 'text-slate-500 hover:text-slate-900'
    }`

  return (
    <header
      className="site-header fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-white/75 backdrop-blur-2xl"
      style={{ WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* ── Logo ── */}
        <Link to="/" className="shrink-0" onClick={closeAll}>
          <NexoraLogo compact textClassName="[&>p:first-child]:text-sm [&>p:first-child]:tracking-[0.1em] [&>p:last-child]:text-[0.45rem]" />
        </Link>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {/* Home — first link */}
          <Link to="/" onClick={closeAll} className={navLinkClass(mainLinks[0])}>Home</Link>

          {/* Solutions — right after Home */}
          <div className="relative" data-dropdown-wrapper>
            <button
              type="button"
              data-solutions-button
              onClick={() => toggleDropdown('solutions')}
              onMouseEnter={() => openDropdown('solutions')}
              className={`nav-link relative inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors duration-200 ${
                isSolutionsActive
                  ? 'text-slate-900 bg-slate-100'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              aria-expanded={activeDropdown === 'solutions'}
            >
              Solutions
              <HiOutlineChevronDown className={`text-sm transition-transform duration-200 ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown bridge + panel */}
            <div className="absolute left-1/2 top-full h-3 w-[34rem] -translate-x-1/2" aria-hidden="true" />
            <div
              onMouseEnter={() => openDropdown('solutions')}
              onMouseLeave={scheduleDropdownClose}
              className={`absolute left-1/2 top-[calc(100%+0.5rem)] w-[34rem] -translate-x-1/2 rounded-2xl border border-slate-200/60 bg-white/95 p-2.5 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-all duration-200 ${
                activeDropdown === 'solutions'
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-1.5 opacity-0'
              }`}
            >
              <div className="grid grid-cols-2 gap-0.5">
                {solutionLinks.map((link) => {
                  const Icon = solutionIconMap[link.label]
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={closeAll}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      {Icon && (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                          <Icon className="text-base" />
                        </span>
                      )}
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Pricing + rest — center position (skip Home) */}
          {mainLinks.slice(1).map((link) => (
            <Link key={link.label} to={link.to} onClick={closeAll} className={navLinkClass(link)}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Right Actions ── */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Link
            to="/login"
            className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 hover:bg-slate-100"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.97]"
          >
            Get Started Free
            <HiOutlineArrowRight className="text-sm" />
          </Link>
        </div>

        {/* ── Apple-style 2-line hamburger ── */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="relative ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className="absolute flex flex-col items-center gap-[5px]">
            <span className={`block h-[2px] w-[18px] rounded-full bg-slate-700 transition-all duration-300 ${
              mobileMenuOpen ? 'translate-y-[3.5px] -rotate-45' : ''
            }`} />
            <span className={`block h-[2px] w-[18px] rounded-full bg-slate-700 transition-all duration-300 ${
              mobileMenuOpen ? 'translate-y-[-3.5px] rotate-45' : ''
            }`} />
          </span>
        </button>
      </div>

      {/* ── Apple-style Mobile Menu Overlay ── */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${mobileMenuOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'}`}>
        {/* Backdrop — dark, smooth fade */}
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeAll}
          aria-label="Close menu"
          tabIndex={mobileMenuOpen ? 0 : -1}
        />

        {/* Drawer — slides from right, Apple spring curve */}
        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col overflow-hidden bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer header — minimal */}
          <div className="flex items-center justify-between px-5 py-[18px]">
            <NexoraLogo compact />
            <button
              type="button"
              onClick={closeAll}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 hover:bg-slate-200 hover:text-slate-700 active:scale-95"
              aria-label="Close"
            >
              <HiOutlineXMark className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Thin separator */}
          <div className="mx-5 h-px bg-slate-100" />

          {/* Drawer body — staggered items */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            {/* Main links — Apple-style large touch targets */}
            <div className="grid gap-1">
              {mainLinks.map((link, i) => {
                const active = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={closeAll}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-[28px] font-medium leading-none tracking-[-0.02em] transition-colors duration-200 ${
                      mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    } ${
                      active ? 'text-slate-900' : 'text-slate-900 hover:text-slate-500'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Solutions section */}
            <div className="mt-8">
              <p className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Solutions</p>
              <div className="grid gap-0.5">
                {solutionLinks.map((link) => {
                  const Icon = solutionIconMap[link.label]
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={closeAll}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {Icon && (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                          <Icon className="text-sm" />
                        </span>
                      )}
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Auth buttons — Apple style */}
            <div className="mt-8 grid gap-2.5 border-t border-slate-100 pt-6">
              <Link
                to="/login"
                onClick={closeAll}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-[15px] font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                <HiOutlineUserCircle className="h-5 w-5" />
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={closeAll}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-slate-900 text-[15px] font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
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
