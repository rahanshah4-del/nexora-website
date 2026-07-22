import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import {
  HiOutlineArrowRight,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCloud,
  HiOutlineDocumentChartBar,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import { defaultPlatformPlans, freeTrialConfig } from '../../lib/platformPlans.js'
import { useMultiCurrency } from '../../context/MultiCurrencyProvider.jsx'
import PricingCurrencySelector from '../../components/PricingCurrencySelector.jsx'

const BusinessServicesSection = lazy(() => import('../../components/BusinessServicesSection.jsx'))
const RoiCalculator = lazy(() => import('../../components/RoiCalculator.jsx'))
const ReviewsSection = lazy(() => import('../../components/ReviewsSection.jsx'))

const BASIC_FEATURES_SHORT = [
  'Choose Any 1 Nexora Module',
  'Up to 2 Users',
  'Team Management',
  'Dashboard & Reports',
  '5 GB Cloud Storage',
  'Email Support',
  'Free Updates',
]

const paidPlans = defaultPlatformPlans.filter((p) => p.active !== false).map((plan) => ({
  ...plan,
  features: plan.id === 'basic' ? BASIC_FEATURES_SHORT : plan.features,
  ctaLabel: plan.monthlyPrice === 'custom' ? 'Book Demo' : plan.id === 'basic' ? 'Start Free Trial' : 'Upgrade Now',
  ctaTo: plan.monthlyPrice === 'custom' ? '/contact' : '/signup',
}))

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

function faqs(formatPrice) {
  return [
    ['Is there a free trial?', 'Yes. Start a free 7-day trial with full access to all Nexora modules, unlimited users and unlimited storage. No credit card required.'],
    ['Do I need a credit card to start?', 'No. Nexora lets you start a free trial without a credit card.'],
    ['What happens after the free trial?', `You can continue with Basic at ${formatPrice(1000)} with one business module and up to 2 users, or upgrade to Standard or Enterprise anytime.`],
    ['Can I choose any business module on Basic?', 'Yes. Basic lets you pick any ONE Nexora Business Module — Restaurant POS, Retail POS, School ERP, Transport, Medical Store POS, CRM, WhatsApp CRM, or any future module.'],
    ['What are the Basic plan limits?', 'Basic allows one active module, up to 2 team members, and 5 GB of cloud storage.'],
    ['When should I upgrade to Standard?', 'Upgrade when your team needs more than 2 users, more than 5 GB storage, or priority support.'],
    ['Do yearly plans save money?', 'Yes. Yearly billing applies a 20% saving compared with monthly billing.'],
    ['Can I request a custom plan?', 'Yes. Enterprise plans are tailored for larger teams, custom workflows and integrations.'],
  ]
}

const highlightCards = [
  { title: 'Start safely', text: 'Try Nexora for 7 days free with full access. No credit card required.', icon: HiOutlineCloud, tone: 'sky' },
  { title: 'Scale clearly', text: 'Choose Basic with one module, or upgrade to Standard when your team grows.', icon: HiOutlineShieldCheck, tone: 'indigo' },
  { title: 'Sell with confidence', text: 'All plans include Dashboard & Reports, Invoice & Billing, Cloud Sync and Email Support.', icon: HiOutlineDocumentChartBar, tone: 'violet' },
]

const toneIcons = {
  sky: 'bg-sky-100/80 text-sky-700',
  indigo: 'bg-indigo-100/80 text-indigo-700',
  violet: 'bg-violet-100/80 text-violet-700',
}

const UPGRADE_NOTE = 'Only one business module can be active. Upgrade to Standard anytime for more modules, users and storage.'

function renderComparisonValue(value) {
  if (value === true) return <HiOutlineCheckCircle className="mx-auto h-5 w-5 text-emerald-600" />
  if (value === false) return <span className="text-sm font-medium text-slate-300">—</span>
  return <span className="text-center text-xs font-medium tracking-[-0.01em] text-slate-500">{value}</span>
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

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [servicesRef, servicesVisible] = useVisibleSection()
  const seo = getSeoForPath('/pricing')
  const { formatPlanPrice, formatPrice, getBillingSuffix } = useMultiCurrency()

  const displayPlans = [freeTrialConfig, ...paidPlans]

  return (
    <PublicPageShell>
      <PageSeo {...seo} faqItems={faqs(formatPrice)} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
            Nexora Pricing
          </span>
          <div className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border border-rose-200/60 bg-rose-50/70 px-4 py-2 text-xs font-medium tracking-[-0.01em] text-rose-700 shadow-sm backdrop-blur-xl">
            🎉 50% OFF for New Users — Limited Time
          </div>
          <h1 className="mx-auto mt-5 max-w-5xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
            Start free, then choose the plan that{' '}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              fits your business.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-500 sm:text-lg">
            Try Nexora free for 7 days with full access to all modules. No credit card required — upgrade when you're ready.
          </p>

          {/* Trust badges */}
          <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-3 text-[13px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/60 px-3 py-1.5 text-emerald-700">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              30 Day Money Back Guarantee
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/60 px-3 py-1.5 text-blue-700">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Lifetime Price Lock
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/60 px-3 py-1.5 text-violet-700">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Free Setup & Data Migration
            </span>
          </div>

          {/* How-it-works cards */}
          <div className="mx-auto mt-8 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
            {[
              { title: 'Start Free Trial', text: 'Experience the complete Nexora platform with all modules, unlimited users and unlimited storage.' },
              { title: 'Choose Basic', text: `Continue at ${formatPrice(1000)} with one business module, up to 2 users and 5 GB storage.` },
              { title: 'Upgrade When Ready', text: 'Unlock more modules, more users, larger storage and priority support.' },
            ].map(({ title, text }) => (
              <div key={title} className="rounded-[1.2rem] border border-slate-200/60 bg-white/80 p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <p className="text-sm font-medium tracking-[-0.01em] text-slate-900">{title}</p>
                <p className="mt-2 text-[13px] leading-[1.6] text-slate-500">{text}</p>
              </div>
            ))}
          </div>

          {/* Billing toggle */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="inline-flex rounded-full border border-slate-200/60 bg-white/70 p-1 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              {['monthly', 'yearly'].map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`min-h-[38px] rounded-full px-5 text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 ${
                    billingCycle === cycle
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.2)]'
                      : 'text-slate-500 hover:text-slate-500'
                  }`}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Yearly (Save 20%)'}
                </button>
              ))}
            </div>
            <PricingCurrencySelector />
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section data-reveal className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayPlans.map((plan) => {
              const isPopular = plan.recommended
              const isFree = plan.id === 'free-trial'
              const isEnterprise = plan.id === 'enterprise'

              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col overflow-hidden rounded-[1.35rem] border bg-white p-6 shadow-[0_4px_24px_-10px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.16)] ${
                    isPopular
                      ? 'border-violet-200/70 ring-1 ring-violet-100/60'
                      : isFree
                        ? 'border-emerald-200/70'
                        : 'border-slate-200/60'
                  }`}
                >
                  {/* Glow on popular */}
                  {isPopular && (
                    <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-violet-50 to-fuchsia-50 opacity-60 blur-xl" />
                  )}

                  <div className="relative mb-4 flex min-h-7 justify-center">
                    {plan.badge && (
                      <span className="rounded-full bg-rose-600 px-3 py-1 text-[0.65rem] font-medium tracking-[-0.01em] text-white">
                        {plan.badge}
                      </span>
                    )}
                    {isPopular && !plan.badge && (
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-[0.65rem] font-medium tracking-[-0.01em] text-white">
                        Most Popular
                      </span>
                    )}
                    {isFree && (
                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-[0.65rem] font-medium tracking-[-0.01em] text-white">
                        Free
                      </span>
                    )}
                  </div>

                  <h2 className={`relative text-center text-xl font-medium tracking-[-0.02em] ${
                    isPopular ? 'text-violet-700' : isFree ? 'text-emerald-700' : 'text-slate-900'
                  }`}>
                    {isFree ? '7-Day Free Trial' : plan.name}
                  </h2>

                  <p className={`${plan.id === 'basic' ? 'mt-1.5' : 'mt-2'} relative text-center text-[13px] leading-[1.6] text-slate-500`}>
                    {isFree
                      ? 'Experience the complete Nexora platform before subscribing.'
                      : plan.id === 'basic'
                        ? 'One module, two users, all the essentials.'
                        : plan.description || ''}
                  </p>

                  <div className="relative mt-5 text-center">
                    <p className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
                      {formatPlanPrice(plan, billingCycle)}
                    </p>
                    {plan.originalPrice && (
                      <p className="mt-0.5 text-[14px] text-slate-400 line-through">
                        PKR {plan.originalPrice.toLocaleString('en-PK')}
                      </p>
                    )}
                    {plan.monthlyPrice !== 'custom' && !isFree && (
                      <p className="mt-0.5 text-[13px] text-slate-400">{getBillingSuffix(plan, billingCycle)}</p>
                    )}
                    {isFree && (
                      <p className="mt-0.5 text-[13px] text-slate-400">No credit card required</p>
                    )}
                  </div>

                  <div className="relative mt-5 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-[13px] text-slate-500">
                        <HiOutlineCheckCircle className={`mt-0.5 h-[17px] w-[17px] shrink-0 ${isFree ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="leading-[1.55]">{feature}</span>
                      </div>
                    ))}
                    {plan.id === 'basic' && (
                      <p className="pt-2 text-center text-[11px] leading-5 text-slate-400">{UPGRADE_NOTE}</p>
                    )}
                  </div>

                  <Link
                    to={plan.ctaTo || '/signup'}
                    className={`relative mt-auto inline-flex min-h-[42px] w-full items-center justify-center rounded-full px-5 text-sm font-medium tracking-[-0.01em] transition-all duration-200 active:scale-[0.97] ${
                      isPopular
                        ? 'bg-slate-900 text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)]'
                        : isFree
                          ? 'bg-emerald-600 text-white shadow-[0_4px_16px_-6px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_8px_24px_-8px_rgba(16,185,129,0.4)]'
                          : isEnterprise
                            ? 'border border-slate-300 bg-white text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)]'
                            : 'border border-slate-200/60 bg-white text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-500 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)]'
                    }`}
                  >
                    {isFree ? 'Start Free Trial' : plan.ctaLabel}
                  </Link>
                </article>
              )
            })}
          </div>

          {/* Highlight cards */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {highlightCards.map(({ title, text, icon: Icon, tone }) => (
              <article key={title} className="flex gap-4 rounded-[1.2rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneIcons[tone]}`}>
                  <Icon className="h-[20px] w-[20px]" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-[17px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-slate-500">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Comparison Table ── */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Feature comparison
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              Compare Free Trial, Basic, Standard and Enterprise plans to find the right fit for your business.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-[1.35rem] border border-slate-200/60 bg-white shadow-[0_8px_40px_-20px_rgba(15,23,42,0.1)]">
            <div className="min-w-[58rem]">
              {/* Header row */}
              <div className="grid grid-cols-[1.35fr_0.7fr_0.7fr_0.85fr_0.8fr] border-b border-slate-200/60 bg-slate-900 text-white">
                {['Feature', 'Free Trial', 'Basic', 'Standard', 'Enterprise'].map((header) => (
                  <div key={header} className="px-3 py-4 text-xs font-medium uppercase tracking-[0.12em] sm:px-5">
                    {header}
                  </div>
                ))}
              </div>
              {/* Body rows */}
              {comparisonRows.map(([feature, freeTrial, basic, standard, enterprise], i) => (
                <div
                  key={feature}
                  className={`grid grid-cols-[1.35fr_0.7fr_0.7fr_0.85fr_0.8fr] border-b border-slate-100 last:border-b-0 ${
                    i % 2 === 1 ? 'bg-slate-50/60' : ''
                  }`}
                >
                  <div className="px-3 py-4 text-[13px] font-medium tracking-[-0.01em] text-slate-500 sm:px-5">
                    {feature}
                  </div>
                  {[freeTrial, basic, standard, enterprise].map((value, idx) => (
                    <div key={`${feature}-${idx}`} className="grid place-items-center border-l border-slate-100 px-2 py-4 text-center">
                      {renderComparisonValue(value)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Pricing FAQ
            </h2>
          </div>
          <div className="mt-10 grid gap-3">
            {faqs(formatPrice).map(([question, answer]) => (
              <article
                key={question}
                className="rounded-[1.2rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] sm:p-6"
              >
                <h3 className="text-[15px] font-medium tracking-[-0.01em] text-slate-900">
                  {question}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-slate-500">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

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
      <section data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[1.8rem] border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-4 flex gap-2.5 text-slate-400">
              <HiOutlineUserGroup className="h-7 w-7" strokeWidth={1.5} />
              <HiOutlineChartBarSquare className="h-7 w-7" strokeWidth={1.5} />
              <HiOutlineChatBubbleLeftRight className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">
              Start free today. Choose the plan that fits.
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-slate-500">
              Start a 7-day free trial with full access, choose Basic to stay lean with one module, or upgrade to Standard for more capacity.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link
              to="/signup"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
            >
              Start Free Trial
              <HiOutlineArrowRight className="h-[17px] w-[17px]" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
            >
              Book Demo
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
