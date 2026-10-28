import PaymentLogos from '../components/PaymentLogos.jsx'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { collection, doc, getDoc, onSnapshot, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import useNoIndex from '../hooks/useNoIndex.js'
import { auth, db } from '../lib/firebase.js'
import { clientSafeMessage } from '../lib/errorHandler.js'
import {
  DEFAULT_SAAS_CURRENCY,
  PLATFORM_PLAN_COLLECTION,
  mergePlatformPlans,
  mergePlatformSettings,
} from '../lib/platformPlans.js'
import { safeTrackMetaEventOnce } from '../lib/metaPixel.js'
import { labelForBusinessType } from '../crm/data/moduleAccess.js'
import { useMultiCurrency } from '../context/MultiCurrencyProvider.jsx'
import PricingCurrencySelector from '../components/PricingCurrencySelector.jsx'
import { formatPriceLabel } from '../lib/multiCurrency.js'

const PAYMENTS_WORKER_URL = String(
  import.meta.env.VITE_NOWPAYMENTS_WORKER_URL || 'https://nexora-payments-api.rahanshah4.workers.dev',
).replace(/\/$/, '')

const FONT = { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Inter, Roboto, sans-serif' }

const FAQ = [
  ['When does my plan start?', 'Right after your payment goes through. Nothing to submit and nobody to wait for.'],
  ['How am I charged?', 'By card, in US dollars, on a secure Polar checkout page. If your card is in rupees, your bank does the conversion.'],
  ['Can I cancel?', 'Yes, any time. Your plan stays active until the end of the period you paid for.'],
  ['Can I switch to a different plan later?', 'Yes. Write to support and we will move your workspace to the new plan.'],
]

const css = `
@keyframes nx-roll { from { opacity: 0; transform: translateY(0.35em); } to { opacity: 1; transform: none; } }
.nx-roll { animation: nx-roll 320ms cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .nx-roll { animation: none; } }
`

function isCustom(value) {
  return String(value ?? '').toLowerCase() === 'custom'
}

function positiveAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function money(value, currency = DEFAULT_SAAS_CURRENCY, displayCurrency = null, rates = null) {
  if (isCustom(value)) return 'Custom'
  const amount = Number(value || 0)
  if (displayCurrency && displayCurrency !== 'PKR' && rates) return formatPriceLabel(amount, displayCurrency, rates)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#6d3df2]">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.12" />
      <path d="m6 10.4 2.7 2.6L14 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function Segmented({ value, onChange, saving }) {
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
          className={`relative z-10 min-h-[44px] rounded-full px-5 text-[15px] font-medium sm:px-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d3df2] ${value === id ? 'text-[#1d1d1f]' : 'text-[#6e6e73]'}`}
        >
          {label}
          {id === 'yearly' && saving ? <span className="ml-1.5 text-[13px] font-semibold text-[#1c8a4b]">{saving}</span> : null}
        </button>
      ))}
    </div>
  )
}

function PlanCard({ plan, selected, current, cycle, onSelect, displayCurrency, displayRates }) {
  const custom = isCustom(plan.monthlyPrice)
  const monthly = Number(plan.monthlyPrice ?? plan.price ?? 0)
  const yearly = Number(plan.yearlyPrice ?? monthly * 12)
  const perMonth = cycle === 'yearly' && !custom ? yearly / 12 : monthly
  const price = custom ? 'Custom' : money(perMonth, plan.currency, displayCurrency, displayRates)
  const billedNote = custom
    ? 'Tailored to your business'
    : cycle === 'yearly'
      ? `${money(yearly, plan.currency, displayCurrency, displayRates)} billed once a year`
      : 'Billed monthly'

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(plan.id)}
      className={[
        'group relative flex h-full flex-col rounded-[24px] bg-white p-5 text-left transition-all duration-300 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d3df2] motion-reduce:transition-none md:rounded-[28px] md:p-7',
        selected
          ? 'shadow-[0_0_0_2px_#6d3df2,0_30px_60px_-28px_rgba(109,61,242,0.45)] lg:-translate-y-1'
          : 'shadow-[0_0_0_1px_rgba(0,0,0,0.06)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.14)]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors md:hidden ${selected ? 'border-[#6d3df2] bg-[#6d3df2]' : 'border-[#c7c7cc]'}`}>
            {selected ? <svg viewBox="0 0 20 20" width="12" height="12" fill="none"><path d="m5.5 10.4 3 2.8 6-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
          </span>
          <h3 className="truncate text-[20px] font-semibold tracking-[-0.01em] text-[#1d1d1f] md:text-[22px]">{plan.name}</h3>
        </div>
        {current ? (
          <span className="rounded-full bg-[#e9f7ee] px-3 py-1 text-[12px] font-semibold text-[#1c8a4b]">Your plan</span>
        ) : plan.recommended ? (
          <span className="rounded-full bg-[#efeaff] px-3 py-1 text-[12px] font-semibold text-[#6d3df2]">Most popular</span>
        ) : null}
      </div>
      <p className="mt-4 text-[34px] font-semibold leading-none tracking-[-0.03em] text-[#1d1d1f] md:mt-6 md:text-[44px]">
        <span key={`${plan.id}-${cycle}-${displayCurrency}`} className="nx-roll inline-block tabular-nums">{price}</span>
      </p>
      <p className="mt-2 text-[14px] text-[#6e6e73]">{custom ? billedNote : <>per month<span className="mx-1.5 text-[#c7c7cc]">/</span>{billedNote}</>}</p>
      {/* On phones the features of the chosen plan are listed once, below the cards, so the cards stay short. */}
      <ul className="mt-7 hidden flex-1 space-y-3 border-t border-[#e8e8ed] pt-6 md:block">
        {(plan.features || []).slice(0, 5).map((feature) => (
          <li key={feature} className="flex gap-3 text-[15px] leading-snug text-[#424245]">
            <Check />
            <span className="line-clamp-3">{feature}</span>
          </li>
        ))}
      </ul>
      <span className={`mt-8 hidden min-h-[48px] items-center justify-center rounded-full px-6 text-[16px] font-medium transition-colors md:inline-flex ${selected ? 'bg-[#6d3df2] text-white' : 'bg-[#f5f5f7] text-[#1d1d1f] group-hover:bg-[#ebebf0]'}`}>
        {selected ? 'Selected' : custom ? 'Talk to us' : `Choose ${plan.name}`}
      </span>
    </button>
  )
}

export default function UpgradeBusiness({ cameFromUpgrade = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  useNoIndex(true)

  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(() => !auth)
  const [userDoc, setUserDoc] = useState(null)
  const [workspaceDoc, setWorkspaceDoc] = useState(null)
  const [planDocs, setPlanDocs] = useState([])
  const [settingsDocs, setSettingsDocs] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState('standard')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [submitError, setSubmitError] = useState('')
  const [cardLoading, setCardLoading] = useState(false)

  useEffect(() => {
    if (!auth) return undefined
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (!db) return undefined
    const unsubPlans = onSnapshot(
      query(collection(db, PLATFORM_PLAN_COLLECTION)),
      (snap) => setPlanDocs(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      () => setPlanDocs([]),
    )
    const unsubSettings = onSnapshot(
      query(collection(db, 'platformSettings')),
      (snap) => setSettingsDocs(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      () => setSettingsDocs([]),
    )
    return () => {
      unsubPlans()
      unsubSettings()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      if (!db || !user?.uid) {
        if (!cancelled) {
          setUserDoc(null)
          setWorkspaceDoc(null)
        }
        return
      }
      const profileSnap = await getDoc(doc(db, 'users', user.uid))
      const profile = profileSnap.exists() ? { id: profileSnap.id, ...profileSnap.data() } : null
      const workspaceId = profile?.workspaceId || user.uid
      const workspaceSnap = workspaceId ? await getDoc(doc(db, 'workspaces', workspaceId)) : null
      if (!cancelled) {
        setUserDoc(profile)
        setWorkspaceDoc(workspaceSnap?.exists?.() ? { id: workspaceSnap.id, ...workspaceSnap.data() } : null)
      }
    }
    loadProfile().catch((error) => {
      console.error('Upgrade Profile Load Error:', error)
      if (!cancelled) {
        setUserDoc(null)
        setWorkspaceDoc(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  // Keep the workspace live so the plan badge updates the moment the payment webhook activates it.
  useEffect(() => {
    const liveWorkspaceId = userDoc?.workspaceId || user?.uid
    if (!db || !liveWorkspaceId) return undefined
    return onSnapshot(doc(db, 'workspaces', liveWorkspaceId), (snap) => {
      if (snap.exists()) setWorkspaceDoc({ id: snap.id, ...snap.data() })
    })
  }, [user?.uid, userDoc?.workspaceId])

  const platformPlans = useMemo(() => mergePlatformPlans(planDocs), [planDocs])
  const activePlans = useMemo(() => platformPlans.filter((plan) => plan.active !== false), [platformPlans])
  const platformSettings = useMemo(() => mergePlatformSettings(settingsDocs), [settingsDocs])
  const selectedPlan = activePlans.find((plan) => plan.id === selectedPlanId) || activePlans[1] || activePlans[0]
  const currentPlan = workspaceDoc?.plan || workspaceDoc?.selectedPlan || userDoc?.plan || 'Basic'
  const workspaceId = userDoc?.workspaceId || workspaceDoc?.id || user?.uid || ''
  const workspaceName = workspaceDoc?.workspaceName || workspaceDoc?.companyName || workspaceDoc?.businessName || userDoc?.workspaceName || 'Nexora Workspace'
  const businessType = workspaceDoc?.selectedBusinessType || workspaceDoc?.businessType || userDoc?.selectedBusinessType || userDoc?.businessType || ''
  const businessTypeLabel = businessType ? labelForBusinessType(businessType) : ''
  const currency = selectedPlan?.currency || platformSettings.defaultCurrency || DEFAULT_SAAS_CURRENCY
  const { currency: displayCurrency, rates: displayRates } = useMultiCurrency()
  const supportEmail = platformSettings.supportEmail || 'support@nexorasolution.us'

  const customPlan = isCustom(selectedPlan?.monthlyPrice)
  const selectedAmount = billingCycle === 'yearly' ? selectedPlan?.yearlyPrice : selectedPlan?.monthlyPrice
  const amount = positiveAmount(selectedAmount)
  const monthlyTotal = positiveAmount(selectedPlan?.monthlyPrice) * 12
  const yearlySaving = billingCycle === 'yearly' && !customPlan ? Math.max(0, monthlyTotal - amount) : 0
  const yearlyBadge = useMemo(() => {
    const plan = activePlans.find((item) => !isCustom(item.monthlyPrice) && positiveAmount(item.monthlyPrice) && positiveAmount(item.yearlyPrice))
    if (!plan) return ''
    const pct = Math.round((1 - Number(plan.yearlyPrice) / (Number(plan.monthlyPrice) * 12)) * 100)
    return pct > 0 ? `Save ${pct}%` : ''
  }, [activePlans])

  // Back returns to the page the person came from. history.state.idx is above 0 only when this page was
  // opened from another page of the app; a direct load (Polar return, email link) has nothing to go back to.
  function goBack() {
    const cameFromApp = typeof window !== 'undefined' && Number(window.history.state?.idx) > 0
    if (cameFromApp) navigate(-1)
    else navigate('/workspace')
  }

  function validate() {
    if (customPlan) return ''
    if (!user?.uid) return 'Sign in to upgrade your plan.'
    if (!workspaceId || !workspaceDoc?.id) return 'We could not find your workspace. Reload the page or sign in again.'
    if (!workspaceDoc?.ownerId) return 'Your workspace has no owner on record. Contact support.'
    if (!businessType) return 'Choose a business type for this workspace first.'
    if (!selectedPlan?.name) return 'Choose a plan to continue.'
    return ''
  }
  const validationError = validate()

  async function handleCheckout() {
    setSubmitError('')
    if (customPlan) {
      window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent('Nexora Enterprise plan')}`
      return
    }
    const problem = validate()
    if (problem) {
      setSubmitError(problem)
      return
    }
    safeTrackMetaEventOnce('InitiateCheckout', { currency: 'USD', value: Number(amount || 0) }, 'nexora_meta_initiatecheckout')
    setCardLoading(true)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch(`${PAYMENTS_WORKER_URL}/api/polar/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id, cycle: billingCycle, returnPath: `${window.location.pathname}${window.location.search}` }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok || !result.url) throw new Error(result.error || 'Unable to start card checkout.')
      window.location.assign(result.url)
    } catch (error) {
      console.error('Card checkout error:', error)
      setSubmitError(clientSafeMessage(error, 'We could not open the checkout. Try again in a moment.', { context: 'Card checkout' }))
      setCardLoading(false)
    }
  }

  if (authReady && !user && !cameFromUpgrade) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  const total = customPlan ? 'Custom' : money(amount, currency, displayCurrency, displayRates)
  const ctaLabel = customPlan ? 'Contact sales' : cardLoading ? 'Opening secure checkout…' : `Pay ${total} by card`
  const ctaDisabled = cardLoading || (!customPlan && Boolean(validationError))

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f5f5f7] pb-40 text-[#1d1d1f] antialiased lg:pb-0" style={FONT}>
      <style>{css}</style>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <button type="button" onClick={goBack} className="inline-flex min-h-[44px] items-center gap-1 rounded-full pr-3 text-[15px] text-[#6d3df2] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d3df2]">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="m12 4-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <p className="truncate text-right text-[13px] text-[#6e6e73]">
          {workspaceName}{businessTypeLabel ? ` · ${businessTypeLabel}` : ''}
        </p>
      </div>

      <header className="mx-auto max-w-4xl px-5 pb-8 pt-8 text-center sm:px-8 sm:pb-10 sm:pt-16">
        <h1 className="text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[64px]">Choose the plan that fits your business.</h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-[19px] leading-snug text-[#6e6e73] sm:text-[21px]">
          Pay by card and your plan starts right away. You are on <span className="font-medium text-[#1d1d1f]">{currentPlan}</span> now.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Segmented value={billingCycle} onChange={setBillingCycle} saving={yearlyBadge} />
          <PricingCurrencySelector />
        </div>
      </header>

      <section aria-label="Plans" className="mx-auto max-w-6xl px-5 sm:px-8">
        <div role="radiogroup" aria-label="Plan" className="grid gap-3 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:items-stretch">
          {activePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan?.id === plan.id}
              current={String(currentPlan).toLowerCase() === String(plan.name).toLowerCase()}
              cycle={billingCycle}
              onSelect={setSelectedPlanId}
              displayCurrency={displayCurrency}
              displayRates={displayRates}
            />
          ))}
        </div>
      </section>

      <section aria-label="Checkout" className="mx-auto mt-10 grid max-w-6xl gap-5 px-5 sm:px-8 md:mt-16 md:gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="rounded-[24px] bg-white p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.05)] sm:p-10 md:rounded-[32px]">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] sm:text-[32px]">Everything in {selectedPlan?.name}</h2>
          <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {(selectedPlan?.features || []).map((feature) => (
              <li key={feature} className="flex gap-3 text-[16px] leading-snug text-[#424245]">
                <Check />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-10 grid gap-6 border-t border-[#e8e8ed] pt-8 sm:grid-cols-3">
            <div>
              <dt className="text-[15px] font-semibold">Starts instantly</dt>
              <dd className="mt-1 text-[14px] leading-snug text-[#6e6e73]">Your plan turns on the moment the payment clears.</dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold">Secure by design</dt>
              <dd className="mt-1 text-[14px] leading-snug text-[#6e6e73]">You pay on Polar. Nexora never sees your card number.</dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold">Cancel any time</dt>
              <dd className="mt-1 text-[14px] leading-snug text-[#6e6e73]">Keep your plan until the end of the period you paid for.</dd>
            </div>
          </dl>
        </div>

        <aside className="lg:sticky lg:top-6">
          <div className="rounded-[24px] bg-white/80 p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_40px_80px_-40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8 md:rounded-[32px]">
            <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Order summary</h2>
            <div className="mt-6 space-y-3 text-[15px]">
              <div className="flex justify-between gap-4"><span className="text-[#6e6e73]">Plan</span><span className="font-medium">{selectedPlan?.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#6e6e73]">Billing</span><span className="font-medium capitalize">{billingCycle}</span></div>
              {yearlySaving ? (
                <div className="flex justify-between gap-4"><span className="text-[#6e6e73]">You save</span><span className="font-medium text-[#1c8a4b]">{money(yearlySaving, currency, displayCurrency, displayRates)}</span></div>
              ) : null}
            </div>
            <div className="mt-6 flex items-end justify-between gap-4 border-t border-[#e8e8ed] pt-6">
              <span className="text-[15px] text-[#6e6e73]">Total today</span>
              <span key={`${selectedPlan?.id}-${billingCycle}-${displayCurrency}`} className="nx-roll text-[36px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{total}</span>
            </div>
            {!customPlan ? <p className="mt-2 text-right text-[13px] text-[#6e6e73]">Charged in USD at checkout</p> : null}

            {/* On phones the sticky bar shows these messages, so they are not repeated here. */}
            {submitError ? <p role="alert" className="mt-5 hidden rounded-2xl bg-[#fff1f0] px-4 py-3 text-[14px] font-medium text-[#c0362c] lg:block">{submitError}</p> : null}
            {!submitError && validationError ? <p className="mt-5 hidden rounded-2xl bg-[#fff8e5] px-4 py-3 text-[14px] font-medium text-[#8a5a00] lg:block">{validationError}</p> : null}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={ctaDisabled}
              className={`mt-6 hidden min-h-[56px] w-full items-center justify-center lg:inline-flex rounded-full px-6 text-[17px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d3df2] ${ctaDisabled ? 'cursor-not-allowed bg-[#e8e8ed] text-[#8e8e93]' : 'bg-[#6d3df2] text-white hover:bg-[#5b2fe0] active:bg-[#4f26c9]'}`}
            >
              {ctaLabel}
            </button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[13px] text-[#6e6e73]"><Lock />Secure checkout on Polar</p>
            <PaymentLogos className="mt-4" />
          </div>
        </aside>
      </section>

      <section aria-label="Questions" className="mx-auto mt-20 max-w-3xl px-5 sm:px-8">
        <h2 className="text-center text-[32px] font-semibold tracking-[-0.025em] sm:text-[40px]">Questions, answered.</h2>
        <div className="mt-8 divide-y divide-[#d2d2d7] border-y border-[#d2d2d7]">
          {FAQ.map(([question, answer]) => (
            <details key={question} className="group">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-medium sm:text-[18px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d3df2] [&::-webkit-details-marker]:hidden">
                {question}
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true" className="shrink-0 text-[#6e6e73] transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </summary>
              <p className="max-w-xl pb-5 text-[16px] leading-relaxed text-[#6e6e73]">{answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-[15px] text-[#6e6e73]">
          Need help choosing? Write to{' '}
          <a href={`mailto:${supportEmail}`} className="inline-flex min-h-[44px] items-center break-all font-medium text-[#6d3df2] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6d3df2]">{supportEmail}</a>
        </p>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {submitError || validationError ? (
          <p role={submitError ? 'alert' : undefined} className={`mx-auto mb-3 max-w-xl rounded-2xl px-4 py-2.5 text-[13px] font-medium leading-snug ${submitError ? 'bg-[#fff1f0] text-[#c0362c]' : 'bg-[#fff8e5] text-[#8a5a00]'}`}>{submitError || validationError}</p>
        ) : null}
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0">
            <p className="truncate text-[13px] text-[#6e6e73]">{selectedPlan?.name} · {billingCycle}</p>
            <p className="text-[20px] font-semibold leading-tight tabular-nums">{total}</p>
          </div>
          <button type="button" onClick={handleCheckout} disabled={ctaDisabled} className={`ml-auto inline-flex min-h-[52px] shrink-0 items-center justify-center rounded-full px-7 text-[16px] font-medium [-webkit-tap-highlight-color:transparent] ${ctaDisabled ? 'bg-[#e8e8ed] text-[#8e8e93]' : 'bg-[#6d3df2] text-white'}`}>
            {customPlan ? 'Contact sales' : cardLoading ? 'Opening…' : 'Pay by card'}
          </button>
        </div>
      </div>
    </main>
  )
}
