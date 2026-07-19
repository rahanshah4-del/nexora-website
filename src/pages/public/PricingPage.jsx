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
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import { defaultPlatformPlans, freeTrialConfig } from '../../lib/platformPlans.js'
import { useMultiCurrency } from '../../context/MultiCurrencyProvider.jsx'
import PricingCurrencySelector from '../../components/PricingCurrencySelector.jsx'

const BusinessServicesSection = lazy(() => import('../../components/BusinessServicesSection.jsx'))

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
    ['What happens after the free trial?', `You can continue with Basic at ${formatPrice(2000)} with one business module and up to 2 users, or upgrade to Standard or Enterprise anytime.`],
    ['Can I choose any business module on Basic?', 'Yes. Basic lets you pick any ONE Nexora Business Module — Restaurant POS, Retail POS, School ERP, Transport, Medical Store POS, CRM, WhatsApp CRM, or any future module.'],
    ['What are the Basic plan limits?', 'Basic allows one active module, up to 2 team members, and 5 GB of cloud storage.'],
    ['When should I upgrade to Standard?', 'Upgrade when your team needs more than 2 users, more than 5 GB storage, or priority support.'],
    ['Do yearly plans save money?', 'Yes. Yearly billing applies a 20% saving compared with monthly billing.'],
    ['Can I request a custom plan?', 'Yes. Enterprise plans are tailored for larger teams, custom workflows and integrations.'],
  ]
}

const highlightCards = [
  ['Start safely', 'Try Nexora for 7 days free with full access. No credit card required.', HiOutlineCloud],
  ['Scale clearly', 'Choose Basic with one module, or upgrade to Standard when your team grows.', HiOutlineShieldCheck],
  ['Sell with confidence', 'All plans include Dashboard & Reports, Invoice & Billing, Cloud Sync and Email Support.', HiOutlineDocumentChartBar],
]

const UPGRADE_NOTE = 'Only one business module can be active. Upgrade to Standard anytime for more modules, users and storage.'

function renderComparisonValue(value) {
  if (value === true) return <HiOutlineCheckCircle className="mx-auto text-2xl text-blue-600" />
  if (value === false) return <span className="text-sm font-bold text-slate-300">-</span>
  return <span className="text-center text-xs font-extrabold text-blue-700">{value}</span>
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
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-16 pt-12 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            Nexora Pricing
          </span>
          <h1 className="website-hero-heading mx-auto mt-6 max-w-5xl text-[2.85rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.4rem] lg:text-[5.7rem]">
            Start free, then choose the plan that <span className="marker-highlight marker-highlight-blue">fits your business.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            Try Nexora free for 7 days with full access to all modules. No credit card required — upgrade when you're ready.
          </p>
          <div className="mx-auto mt-7 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
            {[
              ['Start Free Trial', 'Experience the complete Nexora platform with all modules, unlimited users and unlimited storage.'],
              ['Choose Basic', `Continue at ${formatPrice(2000)} with one business module, up to 2 users and 5 GB storage.`],
              ['Upgrade When Ready', 'Unlock more modules, more users, larger storage and priority support.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[1.2rem] border border-blue-100 bg-white/85 p-4 shadow-[0_22px_58px_-46px_rgba(37,99,235,0.38)]">
                <p className="text-sm font-black text-slate-950">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.45)]">
              {['monthly', 'yearly'].map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`min-h-10 rounded-full px-5 text-sm font-bold ${
                    billingCycle === cycle ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-blue-600'
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

      <section data-reveal className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayPlans.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.34)] ${
                  plan.recommended ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-100' : plan.id === 'free-trial' ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'
                }`}
              >
                <div className="mb-4 flex min-h-7 justify-center">
                  {plan.recommended && (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[0.68rem] font-extrabold text-white">
                      Most Popular
                    </span>
                  )}
                  {plan.id === 'free-trial' && (
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-[0.68rem] font-extrabold text-white">
                      Free
                    </span>
                  )}
                </div>
                <h2 className={`text-center text-2xl font-black ${plan.recommended ? 'text-blue-600' : plan.id === 'free-trial' ? 'text-emerald-700' : 'text-slate-950'}`}>
                  {plan.id === 'free-trial' ? '7-Day Free Trial' : plan.name}
                </h2>
                <p className={`${plan.id === 'basic' ? 'mt-2' : 'mt-3'} text-center text-sm leading-6 text-slate-500`}>
                  {plan.id === 'free-trial' ? 'Experience the complete Nexora platform before subscribing.' : plan.id === 'basic' ? 'One module, two users, all the essentials.' : plan.description || ''}
                </p>
                <div className="mt-6 text-center">
                  <p className="text-3xl font-black text-slate-950 sm:text-4xl">{formatPlanPrice(plan, billingCycle)}</p>
                  {plan.monthlyPrice !== 'custom' && plan.id !== 'free-trial' && (
                    <p className="mt-1 text-sm text-slate-500">{getBillingSuffix(plan, billingCycle)}</p>
                  )}
                  {plan.id === 'free-trial' && (
                    <p className="mt-1 text-sm text-slate-500">No credit card required</p>
                  )}
                </div>

                <div className="mt-5 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <HiOutlineCheckCircle className={`mt-0.5 shrink-0 ${plan.id === 'free-trial' ? 'text-emerald-500' : 'text-blue-600'}`} />
                      <span className="leading-6">{feature}</span>
                    </div>
                  ))}
                  {plan.id === 'basic' && (
                    <p className="pt-2 text-center text-xs leading-5 text-slate-500">{UPGRADE_NOTE}</p>
                  )}
                </div>

                <Link
                  to={plan.ctaTo || '/signup'}
                  className={`mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-extrabold tracking-wide transition-all duration-200 ${
                    plan.recommended
                      ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-[0_4px_20px_-6px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_28px_-6px_rgba(99,102,241,0.65)] hover:-translate-y-[1px] active:translate-y-0'
                      : plan.id === 'free-trial'
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_4px_20px_-6px_rgba(16,185,129,0.45)] hover:shadow-[0_6px_28px_-6px_rgba(16,185,129,0.6)] hover:-translate-y-[1px] active:translate-y-0'
                        : plan.id === 'enterprise'
                          ? 'border-2 border-slate-800 bg-white text-slate-900 shadow-sm hover:bg-slate-50 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0'
                          : 'border-2 border-slate-300 bg-white text-slate-700 shadow-sm hover:border-blue-400 hover:text-blue-600 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0'
                  }`}
                >
                  {plan.id === 'free-trial' ? 'Start Free Trial' : plan.ctaLabel}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {highlightCards.map(([title, text, Icon]) => (
              <article key={title} className="premium-card flex gap-4 p-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="text-2xl" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Feature comparison
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Compare Free Trial, Basic, Standard and Enterprise plans to find the right fit for your business.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-[1.65rem] border border-slate-200 bg-white shadow-[0_28px_80px_-54px_rgba(15,23,42,0.4)]">
            <div className="min-w-[58rem]">
              <div className="grid grid-cols-[1.35fr_0.7fr_0.7fr_0.85fr_0.8fr] border-b border-slate-100 bg-slate-950 text-white">
                {['Feature', 'Free Trial', 'Basic', 'Standard', 'Enterprise'].map((header) => (
                  <div key={header} className="px-3 py-4 text-xs font-black uppercase tracking-[0.14em] sm:px-5">
                    {header}
                  </div>
                ))}
              </div>
              {comparisonRows.map(([feature, freeTrial, basic, standard, enterprise]) => (
                <div key={feature} className="grid grid-cols-[1.35fr_0.7fr_0.7fr_0.85fr_0.8fr] border-b border-slate-100 last:border-b-0">
                  <div className="px-3 py-4 text-sm font-bold text-slate-800 sm:px-5">{feature}</div>
                  {[freeTrial, basic, standard, enterprise].map((value, index) => (
                    <div key={`${feature}-${index}`} className="grid place-items-center border-l border-slate-100 px-2 py-4 text-center">
                      {renderComparisonValue(value)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Pricing FAQ</h2>
          </div>
          <div className="mt-10 grid gap-4">
            {faqs(formatPrice).map(([question, answer]) => (
              <article key={question} className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_18px_54px_-42px_rgba(15,23,42,0.36)]">
                <h3 className="text-base font-black text-slate-950">{question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div ref={servicesRef}>
        {servicesVisible ? (
          <Suspense fallback={null}>
            <BusinessServicesSection />
          </Suspense>
        ) : null}
      </div>

      <section data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(37,99,235,0.44)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-4 flex gap-3 text-blue-600">
              <HiOutlineUserGroup className="text-3xl" />
              <HiOutlineChartBarSquare className="text-3xl" />
              <HiOutlineChatBubbleLeftRight className="text-3xl" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Start free today. Choose the plan that fits.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Start a 7-day free trial with full access, choose Basic to stay lean with one module, or upgrade to Standard for more capacity.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link to="/signup" className="premium-button-primary">
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <Link to="/contact" className="premium-button-secondary">
              Book Demo
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
