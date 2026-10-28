import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'
import { PLATFORM_PLAN_COLLECTION, defaultResolvedPlans, freeTrialConfig, resolvePlatformPlans } from '../../lib/platformPlans.js'
import { getBuildData } from '../../lib/buildData.js'
import { useMultiCurrency } from '../../context/MultiCurrencyProvider.jsx'
import PricingCurrencySelector from '../../components/PricingCurrencySelector.jsx'

const BusinessServicesSection = lazy(() => import('../../components/BusinessServicesSection.jsx'))
const RoiCalculator = lazy(() => import('../../components/RoiCalculator.jsx'))
const ReviewsSection = lazy(() => import('../../components/ReviewsSection.jsx'))

const FONT = { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Inter, Roboto, sans-serif' }

const BASIC_FEATURES_SHORT = [
  'Choose Any 1 Nexora Module',
  'Up to 2 Users',
  'Team Management',
  'Dashboard & Reports',
  '5 GB Cloud Storage',
  'Email Support',
  'Free Updates',
]

function toPaidPlans(plans) {
  return plans.filter((p) => p.active !== false).map((plan) => ({
    ...plan,
    features: plan.id === 'basic' ? BASIC_FEATURES_SHORT : plan.features,
    ctaLabel: plan.monthlyPrice === 'custom' ? 'Book Demo' : plan.id === 'basic' ? 'Start Free Trial' : 'Upgrade Now',
    ctaTo: plan.monthlyPrice === 'custom' ? '/contact' : '/signup',
  }))
}

// Live plans from Firestore platformPlans (public read; edited in the admin
// Plans tab). The build-time snapshot (see lib/buildData.js) is the initial
// state, so the prerendered prices hydrate unchanged; the code defaults are only
// the last resort. Firestore then updates them, and on any error they stay.
function usePlatformPlans() {
  const [plans, setPlans] = useState(() => getBuildData('platformPlans') || defaultResolvedPlans())
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [{ collection, getDocs }, { firestoreDb: db }] = await Promise.all([
          import('firebase/firestore'),
          import('../../lib/firebase.js'),
        ])
        if (!db || cancelled) return
        const snapshot = await getDocs(collection(db, PLATFORM_PLAN_COLLECTION))
        if (!cancelled) setPlans(resolvePlatformPlans(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))))
      } catch {
        // Keep the default plans.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])
  return plans
}

function basicMonthlyPrice(plans) {
  const basic = plans.find((plan) => plan.id === 'basic')
  return typeof basic?.monthlyPrice === 'number' ? basic.monthlyPrice : defaultResolvedPlans()[0].monthlyPrice
}

const comparisonRows = [
  ['Nexora Business Modules', 'All modules', 'Choose ANY ONE', '1 + upgrade', 'All'],
  ['Team Members', 'Unlimited', 'Up to 2', 'Up to 5', 'Unlimited'],
  ['Team Management', true, 'Yes (max 2)', true, true],
  ['Role & Permission Management', true, true, true, true],
  ['Dashboard & Reports', true, true, true, true],
  ['Invoice & Billing', true, true, true, true],
  ['Cloud Storage', 'Unlimited', '5 GB', '20 GB', 'Custom'],
  ['Cloud Sync', true, true, true, true],
  ['Automatic Backup & Restore', true, true, true, true],
  ['Email Support', true, true, true, true],
  ['Priority Support', false, false, true, true],
  ['Free Updates', true, true, true, true],
  ['Custom Integrations', false, false, false, true],
  ['Dedicated Support', false, false, false, true],
  ['Custom Development', false, false, false, true],
]

function faqs(formatPrice, basicPrice) {
  return [
    ['Is there a free trial?', 'Yes. Start a free 1-month trial with full access to all Nexora modules, unlimited users and unlimited storage. No credit card required.'],
    ['Do I need a credit card to start?', 'No. Nexora lets you start a free trial without a credit card.'],
    ['What happens after the free trial?', `You can continue with Basic at ${formatPrice(basicPrice)} with one business module and up to 2 users, or upgrade to Standard or Enterprise anytime.`],
    ['Can I choose any business module on Basic?', 'Yes. Basic lets you pick any ONE Nexora Business Module — Restaurant POS, Retail POS, School ERP, Transport, PharmaFlow, CRM, WhatsApp CRM, or any future module.'],
    ['What are the Basic plan limits?', 'Basic allows one active module, up to 2 team members, and 5 GB of cloud storage.'],
    ['When should I upgrade to Standard?', 'Upgrade when your team needs more than 2 users, more than 5 GB storage, or priority support.'],
    ['Do yearly plans save money?', 'Yes. Yearly billing applies a 20% saving compared with monthly billing.'],
    ['Can I request a custom plan?', 'Yes. Enterprise plans are tailored for larger teams, custom workflows and integrations.'],
  ]
}

const highlights = [
  { title: 'Start safely', text: 'Try Nexora for 30 days free with full access. No credit card required.' },
  { title: 'Scale clearly', text: 'Choose Basic with one module, or upgrade to Standard when your team grows.' },
  { title: 'Sell with confidence', text: 'All plans include Dashboard & Reports, Invoice & Billing, Cloud Sync and Email Support.' },
]

const trustFacts = ['1-Month Free Trial', 'Lifetime Price Lock', 'Free Setup & Data Migration']

const UPGRADE_NOTE = 'Only one business module can be active. Upgrade to Standard anytime for more modules, users and storage.'

const css = `
@keyframes nx-roll { from { opacity: 0; transform: translateY(0.35em); } to { opacity: 1; transform: none; } }
.nx-roll { animation: nx-roll 320ms cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .nx-roll { animation: none; } }
`

function Tick({ className = '' }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true" className={`mt-0.5 shrink-0 ${className}`}>
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.14" />
      <path d="m6 10.4 2.7 2.6L14 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Segmented({ value, onChange }) {
  const options = [['monthly', 'Monthly'], ['yearly', 'Yearly']]
  return (
    <div role="radiogroup" aria-label="Billing period" className="relative inline-grid grid-cols-2 rounded-full bg-[#e8e8ed] p-1">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.16)] transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: value === 'yearly' ? 'translateX(100%)' : 'translateX(0)' }}
      />
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`relative z-10 min-h-[44px] rounded-full px-5 text-[15px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d3df2] sm:px-6 ${value === id ? 'text-[#1d1d1f]' : 'text-[#6e6e73]'}`}
        >
          {label}
          {id === 'yearly' ? <span className="ml-1.5 text-[13px] font-semibold text-[#1c8a4b]">Save 20%</span> : null}
        </button>
      ))}
    </div>
  )
}

function CompareValue({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex text-[#6d3df2]">
        <Tick className="!mt-0" />
        <span className="sr-only">Included</span>
      </span>
    )
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden="true" className="text-[#c7c7cc]">–</span>
        <span className="sr-only">Not included</span>
      </>
    )
  }
  return <span className="text-[14px] text-[#424245]">{value}</span>
}

function useVisibleSection(rootMargin = '900px') {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return undefined
    let cancelled = false
    const markVisible = () => {
      if (!cancelled) setVisible(true)
    }
    if (typeof IntersectionObserver === 'undefined') {
      const timeoutId = window.setTimeout(markVisible, 1)
      return () => {
        cancelled = true
        window.clearTimeout(timeoutId)
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        markVisible()
      },
      { rootMargin },
    )
    if (ref.current) observer.observe(ref.current)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [rootMargin, visible])

  return [ref, visible]
}

function PlanCard({ plan, billingCycle, formatPlanPrice, getBillingSuffix }) {
  const isFree = plan.id === 'free-trial'
  const dark = Boolean(plan.recommended)
  const description = isFree
    ? 'One month of full access to every Nexora module.'
    : plan.id === 'basic'
      ? 'One module, two users, all the essentials.'
      : plan.description || ''

  const muted = dark ? 'text-[#a1a1a6]' : 'text-[#6e6e73]'
  const body = dark ? 'text-[#e8e8ed]' : 'text-[#424245]'

  return (
    <article
      className={`relative flex flex-col rounded-[28px] p-7 ${
        dark
          ? 'bg-[#1d1d1f] text-white shadow-[0_40px_80px_-40px_rgba(109,61,242,0.55)] lg:-translate-y-2'
          : 'bg-white text-[#1d1d1f] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex min-h-[28px] items-center justify-between gap-3">
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{isFree ? 'Free Trial' : plan.name}</h2>
        {plan.badge ? (
          <span className="rounded-full bg-[#fff1f0] px-3 py-1 text-[12px] font-semibold text-[#c0362c]">{plan.badge}</span>
        ) : dark ? (
          <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white">Most popular</span>
        ) : isFree ? (
          <span className="rounded-full bg-[#e9f7ee] px-3 py-1 text-[12px] font-semibold text-[#1c8a4b]">Free</span>
        ) : null}
      </div>
      <p className={`mt-2 min-h-[40px] text-[14px] leading-snug ${muted}`}>{description}</p>

      <div className="mt-6 min-h-[88px]">
        <p className={`font-semibold leading-none tracking-[-0.03em] ${plan.monthlyPrice === 'custom' ? 'text-[32px]' : 'text-[40px]'}`}>
          <span key={`${plan.id}-${billingCycle}`} className="nx-roll inline-block tabular-nums">{formatPlanPrice(plan, billingCycle)}</span>
        </p>
        {plan.originalPrice ? (
          <p className={`mt-1 text-[14px] line-through ${muted}`}>PKR {plan.originalPrice.toLocaleString('en-PK')}</p>
        ) : null}
        {plan.monthlyPrice !== 'custom' && !isFree ? <p className={`mt-1.5 text-[14px] ${muted}`}>{getBillingSuffix(plan, billingCycle)}</p> : null}
        {isFree ? <p className={`mt-1.5 text-[14px] ${muted}`}>No credit card required</p> : null}
      </div>

      <Link
        to={isFree ? '/signup' : plan.ctaTo || '/signup'}
        className={`mt-7 inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[16px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d3df2] ${
          dark ? 'bg-white text-[#1d1d1f] hover:bg-[#e8e8ed]' : isFree ? 'bg-[#6d3df2] text-white hover:bg-[#5b2fe0]' : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebf0]'
        }`}
      >
        {isFree ? 'Start Free Trial' : plan.ctaLabel}
      </Link>

      <ul className={`mt-7 flex-1 space-y-3 border-t pt-6 ${dark ? 'border-white/15' : 'border-[#e8e8ed]'}`}>
        {plan.features.map((feature) => (
          <li key={feature} className={`flex gap-3 text-[15px] leading-snug ${body}`}>
            <Tick className={dark ? 'text-[#b9a4ff]' : 'text-[#6d3df2]'} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {plan.id === 'basic' ? <p className={`mt-5 text-[13px] leading-snug ${muted}`}>{UPGRADE_NOTE}</p> : null}
    </article>
  )
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [servicesRef, servicesVisible] = useVisibleSection()
  const seo = getSeoForPath('/pricing')
  const { formatPlanPrice, formatPrice, getBillingSuffix } = useMultiCurrency()

  const platformPlans = usePlatformPlans()
  const basicPrice = basicMonthlyPrice(platformPlans)
  const displayPlans = [freeTrialConfig, ...toPaidPlans(platformPlans)]
  const faqItems = faqs(formatPrice, basicPrice)

  return (
    <PublicPageShell>
      <PageSeo {...seo} faqItems={faqItems} />
      <style>{css}</style>

      <div style={FONT} className="text-[#1d1d1f] antialiased">
        {/* ── Hero ── */}
        <section className="bg-[#f5f5f7] px-5 pb-10 pt-20 text-center sm:px-8 sm:pb-14 sm:pt-28">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[64px]">
              Start free, then choose the plan that fits your business.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-[19px] leading-snug text-[#6e6e73] sm:text-[21px]">
              Try Nexora free for 30 days with full access to all AI-powered modules. No credit card required — upgrade when you&apos;re ready.
            </p>
            <ul className="mx-auto mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px] text-[#424245]">
              {trustFacts.map((fact) => (
                <li key={fact} className="inline-flex items-center gap-2">
                  <Tick className="!mt-0 text-[#1c8a4b]" />
                  {fact}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Segmented value={billingCycle} onChange={setBillingCycle} />
              <PricingCurrencySelector />
            </div>
          </div>
        </section>

        {/* ── Plans ── */}
        <section aria-label="Plans" className="bg-[#f5f5f7] px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
            {displayPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} billingCycle={billingCycle} formatPlanPrice={formatPlanPrice} getBillingSuffix={getBillingSuffix} />
            ))}
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3 md:gap-10">
            {highlights.map(({ title, text }) => (
              <div key={title}>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-[#6e6e73]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparison ── */}
        <section className="bg-white px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-[32px] font-semibold tracking-[-0.025em] sm:text-[48px]">Feature comparison</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[18px] leading-snug text-[#6e6e73]">
              Compare Free Trial, Basic, Standard and Enterprise plans to find the right fit for your business.
            </p>
            <div className="relative mt-12 overflow-x-auto rounded-[24px] border border-[#e8e8ed]">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#f5f5f7]">
                    <th scope="col" className="sticky left-0 z-10 bg-[#f5f5f7] px-5 py-4 text-[14px] font-semibold">Feature</th>
                    {['Free Trial', 'Basic', 'Standard', 'Enterprise'].map((header) => (
                      <th key={header} scope="col" className="px-4 py-4 text-center text-[14px] font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(([feature, ...values]) => (
                    <tr key={feature} className="border-t border-[#e8e8ed]">
                      <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-4 text-[14px] font-medium text-[#1d1d1f]">{feature}</th>
                      {values.map((value, index) => (
                        <td key={`${feature}-${index}`} className="px-4 py-4 text-center align-middle">
                          <CompareValue value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-[#f5f5f7] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-[32px] font-semibold tracking-[-0.025em] sm:text-[48px]">Pricing FAQ</h2>
            <div className="mt-10 divide-y divide-[#d2d2d7] border-y border-[#d2d2d7]">
              {faqItems.map(([question, answer]) => (
                <details key={question} className="group">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d3df2] sm:text-[18px] [&::-webkit-details-marker]:hidden">
                    <h3 className="text-inherit font-medium">{question}</h3>
                    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true" className="shrink-0 text-[#6e6e73] transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </summary>
                  <p className="max-w-xl pb-5 text-[16px] leading-relaxed text-[#6e6e73]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Business Services (lazy) ── */}
      <Suspense fallback={null}><RoiCalculator /></Suspense>
      <Suspense fallback={null}><ReviewsSection /></Suspense>

      <div ref={servicesRef}>
        {servicesVisible ? (
          <Suspense fallback={null}>
            <BusinessServicesSection />
          </Suspense>
        ) : null}
      </div>

      {/* ── Bottom CTA ── */}
      <section style={FONT} className="bg-white px-5 pb-20 pt-4 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-5xl rounded-[32px] bg-[#1d1d1f] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <h2 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[48px]">Start free today. Choose the plan that fits.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-snug text-[#a1a1a6] sm:text-[19px]">
            Start a 1-month free trial with full access, choose Basic to stay lean with one module, or upgrade to Standard for more capacity.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 min-[420px]:flex-row">
            <Link
              to="/signup"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-8 text-[17px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white min-[420px]:w-auto"
            >
              Start Free Trial
            </Link>
            <Link
              to="/contact"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white/10 px-8 text-[17px] font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white min-[420px]:w-auto"
            >
              Book Demo
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
