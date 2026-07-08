import { Component, lazy, Suspense, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlinePlayCircle } from 'react-icons/hi2'
import Header from './components/Header'
import trustBadges from './components/trustBadges'

/* Isolated error boundary for each lazy section so a stale chunk never crashes the whole page */
class SectionErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return <div className="hidden" />
    }
    return this.props.children
  }
}

const DashboardPreview = lazy(() => import('./components/DashboardPreview.jsx'))
const TawkChat = lazy(() => import('./pages/public/TawkChat.jsx'))
const HomepageSections = lazy(() => import('./sections/HomepageSections.jsx'))

function App({ initialSectionId = '' }) {
  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')
    return () => { document.documentElement.classList.remove('public-website'); document.body.classList.remove('public-website') }
  }, [])

  useEffect(() => {
    if (!initialSectionId) return undefined
    const handle = window.requestAnimationFrame(() => { document.getElementById(initialSectionId)?.scrollIntoView({ behavior: 'auto', block: 'start' }) })
    return () => window.cancelAnimationFrame(handle)
  }, [initialSectionId])

  return (
    <div className="marketing-page min-h-screen overflow-x-hidden bg-white text-slate-950">
      <Header />
      <main>
        <section id="hero" className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-14 pt-12 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
          <div className="soft-arc-bg pointer-events-none" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="pointer-events-none absolute left-[12%] top-9 hidden h-52 w-52 rotate-3 bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] opacity-50 lg:block" />
          <div className="pointer-events-none absolute right-[11%] top-28 hidden h-48 w-48 -rotate-6 bg-[radial-gradient(circle,#bae6fd_1px,transparent_1px)] [background-size:18px_18px] opacity-60 lg:block" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">Nexora Business Suite</span>
              <h1 className="website-hero-heading mx-auto mt-6 max-w-5xl text-[2.85rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.4rem] lg:text-[5.7rem]">All your business on <span className="marker-highlight">one platform.</span></h1>
              <p className="hero-script-line mx-auto mt-5 max-w-3xl text-3xl leading-tight text-slate-900 sm:text-4xl">Simple, efficient, yet powerful.</p>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">Nexora Business Suite helps you manage customers, students, tenants, sales, invoices, reports and team access from one secure dashboard.</p>
              <div className="mt-7 flex flex-col justify-center gap-3 min-[390px]:flex-row">
                <Link to="/signup" className="premium-button-primary">Start Free Trial <HiOutlineArrowRight className="text-lg" /></Link>
                <a href="#contact" className="premium-button-secondary">Book a Demo <HiOutlinePlayCircle className="text-xl text-blue-600" /></a>
              </div>
              <div className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
                {trustBadges.map((badge) => (
                  <div key={badge.title} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.5)] backdrop-blur"><badge.icon className="text-2xl text-blue-600" /><div className="mt-3 min-w-0"><p className="text-xs font-extrabold leading-4 text-slate-900">{badge.title}</p><p className="mt-1 text-[0.68rem] leading-4 text-slate-500">{badge.text}</p></div></div>
                ))}
              </div>
              {/* DashboardPreview is hidden on mobile to avoid heavy SVG rendering
                  below the fold (mobile LCP fix). Desktop shows the full mockup. */}
              <div className="hidden sm:block sm:mt-14"><Suspense fallback={null}><SectionErrorBoundary><DashboardPreview /></SectionErrorBoundary></Suspense></div>
            </div>
          </div>
        </section>
      </main>

      {/* Anchor-link targets: ensure #services, #about, #products, #pricing, #contact
          always exist before the lazy sections load, so hash navigation works */}
      <div id="services" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="about" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="products" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="pricing" style={{ scrollMarginTop: '5.5rem' }} />
      <div id="contact" style={{ scrollMarginTop: '5.5rem' }} />

      <Suspense fallback={null}>
        <SectionErrorBoundary>
          <HomepageSections />
        </SectionErrorBoundary>
      </Suspense>

      <Suspense fallback={null}><SectionErrorBoundary><TawkChat /></SectionErrorBoundary></Suspense>
    </div>
  )
}

export default App
