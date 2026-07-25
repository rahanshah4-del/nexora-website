import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlinePlayCircle } from 'react-icons/hi2'
import Header from './components/Header'
import trustBadges from './components/trustBadges'
import './styles/mobile-ai-animations.css'
import { initMobileAiAnimations } from './lib/mobileAiAnimations.js'

/* Isolated error boundary for each lazy section so a stale chunk never crashes the whole page.
   On error, logs the issue and shows a visible retry section instead of silent <div className="hidden" />. */
class SectionErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('[SectionErrorBoundary] Caught error:', error) }
  render() {
    if (this.state.error) {
      return (
        <section className="grid min-h-[200px] place-items-center bg-white px-5 py-12">
          <div className="text-center">
            <p className="text-sm font-black text-slate-400">This section could not load.</p>
            <button
              type="button"
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white"
            >
              Reload page
            </button>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}

const DashboardPreview = lazy(() => import('./components/DashboardPreview.jsx'))
const TawkChat = lazy(() => import('./pages/public/TawkChat.jsx'))
const NewUserOfferPopup = lazy(() => import('./components/NewUserOfferPopup.jsx'))
const StickyCTA = lazy(() => import('./components/StickyCTA.jsx'))
const ExitIntentPopup = lazy(() => import('./components/ExitIntentPopup.jsx'))
const AIAssistant = lazy(() => import('./components/AIAssistant.jsx'))
const HomepageSections = lazy(() => import('./sections/HomepageSections.jsx'))

function useIdleVisible(rootMargin = '900px') {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return undefined
    let cancelled = false
    let idleId = null
    let timeoutId = null
    const markReady = () => {
      if (!cancelled) setReady(true)
    }

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      timeoutId = window.setTimeout(markReady, 1)
      return () => {
        cancelled = true
        window.clearTimeout(timeoutId)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        if ('requestIdleCallback' in window) {
          idleId = window.requestIdleCallback(markReady, { timeout: 200 })
        } else {
          timeoutId = window.setTimeout(markReady, 120)
        }
      },
      { rootMargin },
    )

    if (ref.current) observer.observe(ref.current)
    return () => {
      cancelled = true
      observer.disconnect()
      if (idleId) window.cancelIdleCallback?.(idleId)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [ready, rootMargin])

  return [ref, ready]
}

function App({ initialSectionId = '' }) {
  const [previewRef, previewReady] = useIdleVisible('700px')
  const [sectionsRef, sectionsReady] = useIdleVisible('1000px')
  const [chatReady, setChatReady] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')
    // Mobile AI animations — self-contained, only activates on <768px
    initMobileAiAnimations()
    return () => { document.documentElement.classList.remove('public-website'); document.body.classList.remove('public-website') }
  }, [])

  useEffect(() => {
    if (!initialSectionId) return undefined
    const handle = window.requestAnimationFrame(() => { document.getElementById(initialSectionId)?.scrollIntoView({ behavior: 'auto', block: 'start' }) })
    return () => window.cancelAnimationFrame(handle)
  }, [initialSectionId])

  useEffect(() => {
    let cancelled = false
    let idleId = null
    let timeoutId = null
    const showChat = () => {
      if (!cancelled) setChatReady(true)
    }
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(showChat, { timeout: 5000 })
    } else {
      timeoutId = window.setTimeout(showChat, 3500)
    }
    return () => {
      cancelled = true
      if (idleId) window.cancelIdleCallback?.(idleId)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="marketing-page min-h-screen overflow-x-hidden bg-white text-slate-950">
      <Header />
      <main className="pt-14">
        <section id="hero" data-ai="fade-up" className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-14 pt-12 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
          <div className="soft-arc-bg pointer-events-none" />
          {/* AI glow orbs */}
          <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 hidden lg:block">
            <div className="h-[420px] w-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.07)_0%,transparent_70%)] blur-3xl" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="pointer-events-none absolute left-[12%] top-9 hidden h-52 w-52 rotate-3 bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] opacity-50 lg:block" />
          <div className="pointer-events-none absolute right-[11%] top-28 hidden h-48 w-48 -rotate-6 bg-[radial-gradient(circle,#bae6fd_1px,transparent_1px)] [background-size:18px_18px] opacity-60 lg:block" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-[0_0_24px_-4px_rgba(139,92,246,0.18)] backdrop-blur-xl">
                <img src="/nexora-ai-logo.png" alt="Nexora AI" className="ai-float-logo hidden max-[767px]:block h-5 w-5 rounded-md object-cover" />
                <svg className="h-3.5 w-3.5 text-violet-500 max-[767px]:hidden" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                ✨ Powered by Nexora AI
              </span>
              <h1 className="website-hero-heading mx-auto mt-6 max-w-5xl text-[clamp(2rem,8vw,2.85rem)] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[clamp(3rem,7vw,4.4rem)] lg:text-[5.7rem]">Nexora Solution <span className="marker-highlight">AI Business Suite</span></h1>
              <p className="mx-auto mt-4 max-w-3xl text-sm font-bold tracking-wide text-slate-500 uppercase sm:text-base">for Restaurants · Retail · Pharmacy · CRM &amp; ERP</p>
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
              <div ref={previewRef} className="hidden sm:block sm:mt-14">
                {previewReady ? <Suspense fallback={null}><SectionErrorBoundary><DashboardPreview /></SectionErrorBoundary></Suspense> : null}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Anchor-link targets: ensure #services, #about, #products, #pricing, #contact
          always exist before the lazy sections load, so hash navigation works */}
      <div id="services" style={{ scrollMarginTop: '4rem' }} />
      <div id="about" style={{ scrollMarginTop: '4rem' }} />
      <div id="products" style={{ scrollMarginTop: '4rem' }} />
      <div id="pricing" style={{ scrollMarginTop: '4rem' }} />
      <div id="contact" style={{ scrollMarginTop: '4rem' }} />

      <div ref={sectionsRef} className="min-h-[200px]">
        {sectionsReady ? (
          <Suspense fallback={
            <div className="space-y-6 px-5 py-12 sm:px-8">
              <div className="mx-auto h-8 w-48 animate-pulse rounded-xl bg-slate-100" />
              <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          }>
            <SectionErrorBoundary>
              <HomepageSections />
            </SectionErrorBoundary>
          </Suspense>
        ) : (
          /* Initial skeleton while observer hasn't fired yet — prevents blank gap */
          <div className="space-y-6 px-5 py-12 sm:px-8">
            <div className="mx-auto h-8 w-48 animate-pulse rounded-xl bg-slate-100" />
            <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        )}
      </div>

      {chatReady ? <Suspense fallback={null}><SectionErrorBoundary><TawkChat /></SectionErrorBoundary></Suspense> : null}
      <Suspense fallback={null}><NewUserOfferPopup /></Suspense>
      <Suspense fallback={null}><StickyCTA /></Suspense>
      <Suspense fallback={null}><ExitIntentPopup /></Suspense>
      <Suspense fallback={null}><AIAssistant /></Suspense>
    </div>
  )
}

export default App
