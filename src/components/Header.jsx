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

        {/* ── Apple-style hamburger ── */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="relative ml-auto inline-flex h-10 w-10 items-center justify-center lg:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className="relative block h-[18px] w-[18px]">
            <span
              className="absolute left-0 block h-[2px] w-[18px] rounded-full bg-slate-700 transition-all"
              style={{
                top: mobileMenuOpen ? '8px' : '3px',
                transform: mobileMenuOpen ? 'rotate(-45deg)' : 'rotate(0deg)',
                transitionDuration: '350ms',
                transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
            <span
              className="absolute left-0 block h-[2px] w-[18px] rounded-full bg-slate-700 transition-all"
              style={{
                top: mobileMenuOpen ? '8px' : '13px',
                transform: mobileMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                transitionDuration: '350ms',
                transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
          </span>
        </button>
      </div>

      {/* ── Apple-style Mobile Menu — full-screen overlay ── */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileMenuOpen}
      >
        {/* Full-screen menu panel */}
        <div
          className={`absolute inset-0 flex flex-col bg-[#f5f5f7] transition-all duration-500 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Top bar: logo + close */}
          <div className="flex shrink-0 items-center justify-between px-5 py-3">
            <NexoraLogo compact />
            <button
              type="button"
              onClick={closeAll}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-slate-500 transition-all duration-200 hover:bg-black/10 active:scale-95"
              aria-label="Close menu"
            >
              <HiOutlineXMark className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="flex min-h-full flex-col px-5 pb-10">
              {/* Main nav — large Apple typography */}
              <nav className="mt-6 flex flex-col">
                {mainLinks.map((link) => {
                  const active = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={closeAll}
                      className={`py-3 text-[32px] font-medium leading-[1.1] tracking-[-0.02em] transition-colors duration-200 ${
                        active ? 'text-black' : 'text-black/80 hover:text-black/50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Solutions — collapsible */}
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'mobile-solutions' ? null : 'mobile-solutions')}
                  className="flex w-full items-center gap-1.5 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-slate-600"
                >
                  Solutions
                  <HiOutlineChevronDown className={`h-3 w-3 transition-transform duration-200 ${activeDropdown === 'mobile-solutions' ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`grid gap-0.5 overflow-hidden transition-all duration-300 ${
                    activeDropdown === 'mobile-solutions' ? 'mt-2 max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {solutionLinks.map((link) => {
                    const Icon = solutionIconMap[link.label]
                    return (
                      <Link
                        key={link.label}
                        to={link.to}
                        onClick={closeAll}
                        className="flex items-center gap-3 rounded-lg px-2 py-3 text-[16px] font-medium text-slate-500 transition-colors duration-200 hover:text-slate-900"
                      >
                        {Icon && (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500">
                            <Icon className="text-sm" />
                          </span>
                        )}
                        <span>{link.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Spacer */}
              <div className="mt-auto flex-1" />

              {/* CTA buttons */}
              <div className="mt-8 grid gap-3">
                <Link
                  to="/login"
                  onClick={closeAll}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-[16px] font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <HiOutlineUserCircle className="h-5 w-5" />
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={closeAll}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-slate-900 text-[16px] font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
