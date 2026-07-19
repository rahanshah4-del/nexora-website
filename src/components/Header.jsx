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
  const [scrolled, setScrolled] = useState(false)
  const dropdownCloseTimer = useRef(null)

  /* ── Scroll-aware background ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    `nav-link relative inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-bold transition-colors duration-200 ${
      isActiveLink(link)
        ? 'text-slate-950 bg-slate-100'
        : 'text-slate-800 hover:text-slate-950'
    }`

  return (
    <header
      className={`site-header sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70'
          : 'border-b border-transparent bg-white/95'
      }`}
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
              className={`nav-link relative inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-bold transition-colors duration-200 ${
                isSolutionsActive
                  ? 'text-slate-950 bg-slate-100'
                  : 'text-slate-800 hover:text-slate-950'
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
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                    >
                      {Icon && (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
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
            className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-bold text-slate-600 transition-colors hover:text-slate-950 hover:bg-slate-100"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 text-[13px] font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.97]"
          >
            Get Started Free
            <HiOutlineArrowRight className="text-sm" />
          </Link>
        </div>

        {/* ── Mobile menu button ── */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <HiOutlineXMark className="text-xl" /> : <HiOutlineBars3 className="text-xl" />}
        </button>
      </div>

      {/* ── Mobile Menu Overlay ── */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/20 backdrop-blur-sm transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeAll}
          aria-label="Close menu"
          tabIndex={mobileMenuOpen ? 0 : -1}
        />

        {/* Drawer */}
        <aside
          className={`absolute right-2 top-2 flex h-[calc(100dvh-1rem)] w-[min(20rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-2xl transition-all duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <NexoraLogo compact />
            <button
              type="button"
              onClick={closeAll}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
              aria-label="Close"
            >
              <HiOutlineXMark className="text-lg" />
            </button>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Main links */}
            <div className="grid gap-0.5">
              {mainLinks.map((link) => {
                const active = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={closeAll}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      active ? 'bg-slate-100 text-slate-950' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    {link.label}
                    <HiOutlineArrowRight className="text-slate-400" />
                  </Link>
                )
              })}
            </div>

            {/* Solutions */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Solutions</p>
              <div className="grid gap-0.5">
                {solutionLinks.map((link) => {
                  const Icon = solutionIconMap[link.label]
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={closeAll}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-slate-950"
                    >
                      {Icon && (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm">
                          <Icon className="text-xs" />
                        </span>
                      )}
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Auth buttons */}
            <div className="mt-5 grid gap-2">
              <Link
                to="/login"
                onClick={closeAll}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <HiOutlineUserCircle className="text-lg" />
                Login
              </Link>
              <Link
                to="/signup"
                onClick={closeAll}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
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
