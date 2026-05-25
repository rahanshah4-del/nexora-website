import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineBars3,
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineXMark,
} from 'react-icons/hi2'

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

const navLinks = [
  { href: '#services', label: 'Services' },
  { href: '#restaurant-pos', label: 'POS' },
  { href: '#dashboards', label: 'Dashboards' },
  { href: '#case-studies', label: 'Projects' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#contact', label: 'Contact' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fiverrLink = 'https://pro.fiverr.com/s/o85L4R4'

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/90 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-400/0 via-sky-500/70 to-indigo-500/0" />

          <div className="flex min-h-[4rem] min-w-0 items-center gap-3 px-3 py-2.5 sm:px-4 lg:px-5">
            <a href="#hero" className="group flex min-w-0 shrink-0 items-center gap-3" onClick={closeMenu}>
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-1.5 shadow-sm transition duration-300 group-hover:scale-[1.03]">
                <img src="/nexora-logo.jpg" alt="Nexora logo" className="h-full w-full rounded-xl object-cover" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold uppercase tracking-[0.18em] text-slate-950">
                  Nexora
                </span>
                <span className="hidden truncate text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500 min-[390px]:block">
                  Software Studio
                </span>
              </span>
            </a>

            <nav className="mx-auto hidden min-w-0 items-center justify-center rounded-full border border-slate-200/70 bg-slate-50/80 p-1 text-sm font-semibold text-slate-600 lg:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-2 transition duration-300 hover:bg-white hover:text-slate-950 hover:shadow-sm xl:px-4"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <HiOutlineUserCircle className="text-lg" />
                <span className="hidden md:inline">Sign In</span>
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_16px_40px_-22px_rgba(15,23,42,0.9)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_46px_-20px_rgba(14,165,233,0.75)]"
              >
                <HiOutlineSparkles className="text-lg" />
                <span className="hidden md:inline">Free Trial</span>
                <span className="md:hidden">Sign Up</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition duration-300 hover:bg-slate-50 sm:hidden lg:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <HiOutlineXMark className="text-xl" /> : <HiOutlineBars3 className="text-xl" />}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition duration-300 hover:bg-slate-50 sm:inline-flex lg:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <HiOutlineXMark className="text-xl" /> : <HiOutlineBars3 className="text-xl" />}
            </button>
          </div>

          <div
            className={`grid border-t border-slate-200/70 bg-white/95 transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
              mobileMenuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 px-3 pb-4 pt-3 sm:px-4">
                <div className="grid gap-1.5">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                      {link.label}
                      <HiOutlineArrowRight className="text-slate-400" />
                    </a>
                  ))}
                </div>

                <div className="grid gap-2 border-t border-slate-200/70 pt-4 min-[390px]:grid-cols-2">
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm"
                  >
                    <HiOutlineUserCircle className="text-lg" />
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={closeMenu}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15"
                  >
                    <HiOutlineSparkles className="text-lg" />
                    Sign Up
                  </Link>
                </div>

                <a
                  href={fiverrLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800"
                >
                  <FiverrIcon className="h-4 w-4 text-emerald-600" />
                  Hire on Fiverr
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
