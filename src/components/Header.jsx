import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { blogArticles } from '../lib/blogData.js'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBars3,
  HiOutlineMagnifyingGlass,
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
  { label: 'AI', to: '/ai' },
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
  const [authUser, setAuthUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    try {
      const auth = getAuth()
      return onAuthStateChanged(auth, (fbUser) => {
        setAuthUser(fbUser)
        setAuthReady(true)
      })
    } catch {
      setAuthReady(true)
    }
  }, [])

  const isAuth = authReady && authUser != null
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null)
  const dropdownCloseTimer = useRef(null)
  const searchInputRef = useRef(null)

  /* ── Autofocus search input ── */
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  /* ── Escape / click-outside ── */
  useEffect(() => {
    if (!mobileMenuOpen && !searchOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setSearchOpen(false)
        setActiveDropdown(null)
      }
    }

    // Lock scroll when search is open
    if (searchOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
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
  }, [mobileMenuOpen, searchOpen])

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
    setSearchOpen(false)
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

  /* ── Search — filter all site content ── */
  const allSearchItems = useMemo(() => [
    ...mainLinks.map((l) => ({ label: l.label, to: l.to, kind: 'Page' })),
    ...solutionLinks.map((l) => ({ label: l.label, to: l.to, kind: 'Solution' })),
    { label: 'Industries', to: '/industries', kind: 'Page' },
    { label: 'Blog', to: '/blog', kind: 'Page' },
    { label: 'Contact', to: '/contact', kind: 'Page' },
    { label: 'About', to: '/about', kind: 'Page' },
    { label: 'Documentation', to: '/documentation', kind: 'Page' },
    { label: 'Help Center', to: '/help-center', kind: 'Page' },
    { label: 'FAQ', to: '/faq', kind: 'Page' },
    { label: 'Support', to: '/support-center', kind: 'Page' },
    ...blogArticles.map((a) => ({ label: a.title, to: `/blog/${a.slug}`, kind: 'Article', keywords: a.excerpt + ' ' + a.tags.join(' ') })),
  ], [])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return allSearchItems.filter((item) =>
      item.label.toLowerCase().includes(q)
      || (item.keywords && item.keywords.toLowerCase().includes(q))
    ).slice(0, 15)
  }, [searchQuery, allSearchItems])

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
          {mainLinks.slice(1).map((link) => {
            const isAi = link.label === 'AI'
            return (
              <Link key={link.label} to={link.to} onClick={closeAll}
                className={`${navLinkClass(link)} ${isAi ? '!text-violet-600 font-bold' : ''}`}>
                {isAi ? <HiOutlineSparkles className="text-sm mr-0.5" /> : null}
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* ── Right Actions ── */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {isAuth ? (
            <>
              <Link
                to="/workspace"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_2px_12px_rgba(139,92,246,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(139,92,246,0.45)] active:scale-95"
                title={authUser?.email || 'Dashboard'}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
              <Link
                to="/workspace"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-4 text-[13px] font-medium text-white shadow-[0_2px_8px_rgba(139,92,246,0.3)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Dashboard
                <HiOutlineArrowRight className="text-sm" />
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* ── Mobile: search + hamburger ── */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1d1d1f]/70 transition-colors hover:bg-black/5"
            aria-label="Search"
          >
            <HiOutlineMagnifyingGlass className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="relative inline-flex h-10 w-10 items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
          <span className="relative block h-[18px] w-[18px]">
            <span
              className="absolute left-0 block h-[2px] w-[18px] rounded-full bg-[#1d1d1f] transition-all"
              style={{
                top: mobileMenuOpen ? '8px' : '3px',
                transform: mobileMenuOpen ? 'rotate(-45deg)' : 'rotate(0deg)',
                transitionDuration: '350ms',
                transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
            <span
              className="absolute left-0 block h-[2px] w-[18px] rounded-full bg-[#1d1d1f] transition-all"
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

      {/* ── Mobile Menu — Portal to body, Apple slide animation ── */}
      {mobileMenuOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-white lg:hidden"
          style={{
            paddingTop: 'max(18px, env(safe-area-inset-top))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            animation: 'slideIn 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-[18px]">
              <NexoraLogo compact />
              <button
                type="button"
                onClick={closeAll}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e8e8ed] text-[#86868b] transition-all duration-200 hover:bg-[#dcdce0] active:scale-95"
                aria-label="Close menu"
              >
                <HiOutlineXMark className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-[#d2d2d7]" />

            {/* Body */}
            <div className="overflow-y-auto px-5 pb-10 pt-4" style={{maxHeight:'calc(100vh - 80px)'}}>
              {/* Main nav */}
              <nav>
                {mainLinks.map((link) => {
                  const active = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={closeAll}
                      className={`block py-3 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] transition-all duration-200 ${
                        active ? 'text-[#1d1d1f]' : 'text-[#1d1d1f]/90 hover:text-[#86868b]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Solutions */}
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'mobile-solutions' ? null : 'mobile-solutions')}
                  className="flex items-center gap-1.5 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#86868b] transition-colors hover:text-[#1d1d1f]"
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
                        className="flex items-center gap-3 rounded-lg px-2 py-3 text-[15px] font-medium text-[#1d1d1f]/75 transition-colors duration-200 hover:text-[#1d1d1f]"
                      >
                        {Icon && (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#86868b] shadow-sm">
                            <Icon className="text-sm" />
                          </span>
                        )}
                        <span>{link.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* CTA buttons */}
              <div className="mt-10 grid gap-3">
                {isAuth ? (
                  <>
                    <Link
                      to="/workspace"
                      onClick={closeAll}
                      className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-[16px] font-medium text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(139,92,246,0.4)] active:scale-[0.98]"
                    >
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={closeAll}
                      className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-white text-[16px] font-medium text-[#1d1d1f] transition-all duration-200 hover:bg-[#f5f5f7] active:scale-[0.98]"
                    >
                      <HiOutlineUserCircle className="h-5 w-5" />
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      onClick={closeAll}
                      className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#1d1d1f] text-[16px] font-medium text-white transition-all duration-200 hover:bg-black active:scale-[0.98]"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </div>
        </div>,
        document.body
      )}

      {/* ── Apple-style Search Overlay ── */}
      {searchOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-white"
          style={{
            paddingTop: 'max(18px, env(safe-area-inset-top))',
            animation: 'slideDown 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
          }}
        >
          {/* Search header */}
          <div className="flex items-center gap-3 px-5 py-[14px]">
            <HiOutlineMagnifyingGlass className="h-5 w-5 shrink-0 text-[#86868b]" strokeWidth={1.5} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nexora.com"
              className="flex-1 bg-transparent text-[17px] font-normal text-[#1d1d1f] placeholder:text-[#86868b] outline-none"
            />
            <button
              type="button"
              onClick={() => { setSearchOpen(false); setSearchQuery('') }}
              className="text-[15px] font-normal text-[#1d1d1f] transition-opacity hover:opacity-60"
            >
              Cancel
            </button>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-[#d2d2d7]" />

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            {!searchQuery.trim() ? (
              <p className="text-[15px] text-[#86868b]">
                Start typing to search Nexora products, services, and blog articles.
              </p>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-1">
                {searchResults.map((item) => (
                  <Link
                    key={item.label + item.to}
                    to={item.to}
                    onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                    className="flex items-center gap-3 rounded-lg px-2 py-3 text-[15px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                  >
                    <HiOutlineMagnifyingGlass className="h-4 w-4 shrink-0 text-[#86868b]" strokeWidth={1.5} />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[13px] text-[#86868b]">{item.kind}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-[#86868b]">
                No results found for "{searchQuery}".
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
      </div>
    </header>
  )
}

export default Header
