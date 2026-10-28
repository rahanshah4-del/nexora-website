import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import useNoIndex from '../hooks/useNoIndex.js'
import { auth, db } from '../lib/firebase.js'
import { clientSafeMessage } from '../lib/errorHandler.js'
import {
  DEFAULT_SAAS_CURRENCY,
  PLATFORM_PLAN_COLLECTION,
  mergePlatformPlans,
  mergePlatformSettings,
  paymentMethodsFromSettings,
  planPriceLabel,
} from '../lib/platformPlans.js'
import { safeTrackMetaEventOnce } from '../lib/metaPixel.js'
import { evaluatePromoCode, normalizePromoCode, PROMO_CODE_COLLECTION } from '../lib/promoCodes.js'
import { labelForBusinessType } from '../crm/data/moduleAccess.js'
import { useMultiCurrency } from '../context/MultiCurrencyProvider.jsx'
import PricingCurrencySelector from '../components/PricingCurrencySelector.jsx'
import CopyEmailButton from '../components/CopyEmailButton.jsx'
import { formatPriceLabel } from '../lib/multiCurrency.js'

const PAYMENTS_WORKER_URL = String(
  import.meta.env.VITE_NOWPAYMENTS_WORKER_URL || 'https://nexora-payments-api.rahanshah4.workers.dev',
).replace(/\/$/, '')
const META_PURCHASE_TRACKED_PREFIX = 'nexora_meta_purchase_tracked:'

function Section({ children, className = '' }) {
  return <section className={`mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 ${className}`}>{children}</section>
}

function Panel({ children, className = '' }) {
  return <div className={`rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)] sm:p-5 ${className}`}>{children}</div>
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${tones[tone] || tones.slate}`}>{children}</span>
}

function money(value, currency = DEFAULT_SAAS_CURRENCY, displayCurrency = null, rates = null) {
  if (String(value).toLowerCase() === 'custom') return 'Custom'
  const amount = Number(value || 0)
  // If a display currency is requested and differs from base, convert + format
  if (displayCurrency && displayCurrency !== 'PKR' && rates) {
    return formatPriceLabel(amount, displayCurrency, rates)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function positiveAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function timestampMs(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function formatTimelineDate(value) {
  const ms = timestampMs(value)
  if (!ms) return 'Just now'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms))
}

function normalizeRequestStatus(row = {}) {
  const safe = row || {}
  return String(safe.approvalStatus || safe.status || safe.paymentStatus || 'pending').toLowerCase()
}

function normalizedText(value) {
  return String(value || '').trim().toLowerCase()
}

function purchaseAmount(request = {}) {
  return positiveAmount(request.amount ?? request.finalAmount ?? request.planPrice ?? request.amountPaid)
}

function isApprovedPaidUpgrade(request = {}) {
  const approvalStatus = normalizedText(request.approvalStatus || request.status)
  const paymentStatus = normalizedText(request.paymentStatus)
  return approvalStatus === 'approved' && paymentStatus === 'paid'
}

function workspaceHasActivatedPlan(workspace = {}, request = {}) {
  const activeSubscription = ['active', 'paid'].includes(normalizedText(workspace.subscriptionStatus || workspace.planStatus))
  const requestedPlan = normalizedText(request.requestedPlan || request.selectedPlan || request.plan)
  const activePlan = normalizedText(workspace.plan || workspace.selectedPlan)
  return activeSubscription && (!requestedPlan || !activePlan || requestedPlan === activePlan)
}

function trackMetaPurchaseOnce(request = {}) {
  if (typeof window === 'undefined') return
  const amount = purchaseAmount(request)
  if (amount <= 0) return
  const purchaseId = String(request.id || request.sourceId || request.transactionId || request.nowPaymentsPaymentId || '').trim()
  if (!purchaseId) return
  const storageKey = `${META_PURCHASE_TRACKED_PREFIX}${purchaseId}`
  if (window.localStorage.getItem(storageKey) === '1') return

  let attempts = 0
  const fire = () => {
    attempts += 1
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value: amount,
        currency: 'PKR',
      })
      window.localStorage.setItem(storageKey, '1')
      return
    }
    if (attempts < 10) window.setTimeout(fire, 300)
  }

  fire()
}

function isClosedUpgradeRequest(row = {}) {
  const status = normalizeRequestStatus(row)
  if (['approved', 'rejected', 'active', 'closed', 'cancelled', 'canceled', 'waiting', 'expired'].includes(status)) return true
  // Also close stale crypto checkouts that were created but never received payment
  if (row?.nowPaymentsOrderId && !row?.nowPaymentsPaymentId && status === 'pending') {
    const createdMs = row?.createdAt ? (typeof row.createdAt?.toDate === 'function' ? row.createdAt.toDate().getTime() : new Date(row.createdAt).getTime()) : 0
    const ageHours = createdMs ? (Date.now() - createdMs) / 3600000 : 0
    if (ageHours > 2) return true
  }
  return false
}

function requestTimelineSteps(request = {}, isAutomaticCrypto = false) {
  const status = normalizeRequestStatus(request)
  const rejected = status === 'rejected'
  const approved = status === 'approved' || request.paymentStatus === 'paid'
  const reviewing = ['under_review', 'reviewing', 'in_review'].includes(status) || request.reviewOpenedAt
  const labels = isAutomaticCrypto
    ? ['Secure checkout', 'Blockchain payment', 'Automatic verification', 'Workspace plan activated']
    : ['Payment submitted', 'Nexora review', rejected ? 'Rejected' : 'Approved or rejected', 'Workspace plan updated']
  return labels.map((label, index) => {
    const done = index === 0 || (index === 1 && (reviewing || approved || rejected)) || (index === 2 && (approved || rejected)) || (index === 3 && approved)
    const active = (!approved && !rejected && ((index === 1 && reviewing) || (index === 0 && !reviewing))) || (index === 2 && rejected)
    return { label, done, active, rejected: rejected && index === 2 }
  })
}

function planSavings(plan, displayCurrency = null, rates = null) {
  const monthly = Number(plan.monthlyPrice || 0)
  const yearly = Number(plan.yearlyPrice || 0)
  if (!monthly || !yearly || String(plan.yearlyPrice).toLowerCase() === 'custom') return ''
  const fullYear = monthly * 12
  const savings = Math.max(0, fullYear - yearly)
  return savings ? `Save ${money(savings, plan.currency, displayCurrency, rates)}` : 'Best annual value'
}

function PlanCard({ plan, selected, active, onSelect, displayCurrency, displayRates }) {
  const disabled = plan.active === false
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(plan.id)}
      disabled={disabled}
      className={[
        'relative flex h-full flex-col rounded-[1.4rem] border p-5 text-left transition',
        selected ? 'border-violet-400 bg-violet-50 shadow-[0_20px_60px_-38px_rgba(124,58,237,0.65)]' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40',
        disabled ? 'cursor-not-allowed opacity-55' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black text-slate-950">{plan.name}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{plan.currency || DEFAULT_SAAS_CURRENCY} billing</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {active ? <Badge tone="green">Active plan</Badge> : null}
          {plan.recommended ? <Badge tone="violet">Recommended</Badge> : null}
        </div>
      </div>
      <div className="mt-5">
        <p className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{displayCurrency && displayCurrency !== 'PKR' && displayRates ? formatPriceLabel(plan.monthlyPrice ?? plan.price, displayCurrency, displayRates) : planPriceLabel(plan, 'monthly')}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">per month</p>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <p className="text-sm font-black text-slate-900">{displayCurrency && displayCurrency !== 'PKR' && displayRates ? formatPriceLabel(plan.yearlyPrice ?? plan.monthlyPrice ?? plan.price, displayCurrency, displayRates) : planPriceLabel(plan, 'yearly')}</p>
        <p className="mt-1 text-xs font-bold text-emerald-700">{planSavings(plan, displayCurrency, displayRates) || 'Yearly billing available'}</p>
      </div>
      <ul className="mt-5 flex-1 space-y-2 text-sm font-semibold text-slate-600">
        {(plan.features || []).slice(0, 5).map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <span className={`mt-5 inline-flex justify-center rounded-2xl px-4 py-3 text-sm font-black ${selected ? 'bg-violet-600 text-white' : 'bg-slate-950 text-white'}`}>
        {disabled ? 'Disabled' : selected ? 'Selected' : 'Choose plan'}
      </span>
    </button>
  )
}

function PaymentCard({ method, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(method.id)}
      className={`relative overflow-hidden rounded-[1.25rem] border p-4 text-left transition ${selected ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">{method.label}</p>
        <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${selected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'}`} />
      </div>
      {method.instructions ? <p className="mt-3 text-xs font-semibold text-slate-600">{method.instructions}</p> : null}
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
  const [paymentMethod, setPaymentMethod] = useState('polar')
  const [submitError, setSubmitError] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoResult, setPromoResult] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [activeRequest, setActiveRequest] = useState(null)
  const [requestTimeline, setRequestTimeline] = useState([])

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
      console.error('Upgrade Request Profile Load Error:', error)
      if (!cancelled) {
        setUserDoc(null)
        setWorkspaceDoc(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  useEffect(() => {
    const liveWorkspaceId = userDoc?.workspaceId || user?.uid
    if (!db || !liveWorkspaceId) return undefined
    return onSnapshot(doc(db, 'workspaces', liveWorkspaceId), (snap) => {
      if (snap.exists()) setWorkspaceDoc({ id: snap.id, ...snap.data() })
    })
  }, [user?.uid, userDoc?.workspaceId])

  useEffect(() => {
    if (!db || !user?.uid) {
      setActiveRequest(null)
      setRequestTimeline([])
      return undefined
    }
    const q = query(collection(db, 'upgradeRequests'), where('userId', '==', user.uid))
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => timestampMs(b.createdAt || b.updatedAt) - timestampMs(a.createdAt || a.updatedAt))
        const latestOpen = rows.find((row) => !isClosedUpgradeRequest(row))
        const latest = latestOpen || rows[0] || null
        setActiveRequest(latest)
      },
      () => {
        setActiveRequest(null)
        setRequestTimeline([])
      },
    )
  }, [user?.uid])

  useEffect(() => {
    if (!db || !activeRequest?.id) {
      setRequestTimeline([])
      return undefined
    }
    const q = query(collection(db, 'upgradeRequests', activeRequest.id, 'timeline'), orderBy('createdAt', 'asc'), limit(80))
    return onSnapshot(
      q,
      (snap) => setRequestTimeline(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      () => setRequestTimeline([]),
    )
  }, [activeRequest?.id])

  const platformPlans = useMemo(() => mergePlatformPlans(planDocs), [planDocs])
  const activePlans = useMemo(() => platformPlans.filter((plan) => plan.active !== false), [platformPlans])
  const platformSettings = useMemo(() => mergePlatformSettings(settingsDocs), [settingsDocs])
  const paymentMethods = useMemo(
    () => paymentMethodsFromSettings(platformSettings),
    [platformSettings],
  )
  const selectedPlan = platformPlans.find((plan) => plan.id === selectedPlanId) || platformPlans[1] || platformPlans[0]
  const selectedMethod = paymentMethods.find((method) => method.id === paymentMethod) || paymentMethods[0]
  const currentPlan = workspaceDoc?.plan || workspaceDoc?.selectedPlan || userDoc?.plan || 'Basic'
  const workspaceId = userDoc?.workspaceId || workspaceDoc?.id || user?.uid || ''
  const workspaceName = workspaceDoc?.workspaceName || workspaceDoc?.companyName || workspaceDoc?.businessName || userDoc?.workspaceName || 'Nexora Workspace'
  const businessType = workspaceDoc?.selectedBusinessType || workspaceDoc?.businessType || userDoc?.selectedBusinessType || userDoc?.businessType || ''
  const businessTypeLabel = businessType ? labelForBusinessType(businessType) : ''
  const currency = selectedPlan?.currency || platformSettings.defaultCurrency || DEFAULT_SAAS_CURRENCY
  const { currency: displayCurrency, rates: displayRates, formatPrice } = useMultiCurrency()
  const selectedAmount = billingCycle === 'yearly' ? selectedPlan?.yearlyPrice : selectedPlan?.monthlyPrice
  const originalAmount = positiveAmount(selectedAmount)

  useEffect(() => {
    if (!paymentMethods.length) return
    if (!paymentMethods.some((method) => method.id === paymentMethod)) {
      setPaymentMethod(paymentMethods[0].id)
    }
  }, [paymentMethod, paymentMethods])
  const discountAmount = promoResult?.valid ? promoResult.discountAmount : 0
  const finalAmount = promoResult?.valid ? promoResult.finalAmount : originalAmount
  const requestedPlan = selectedPlan?.name || ''

  useEffect(() => {
    if (!activeRequest || !workspaceDoc) return
    if (!isApprovedPaidUpgrade(activeRequest)) return
    if (!workspaceHasActivatedPlan(workspaceDoc, activeRequest)) return
    trackMetaPurchaseOnce(activeRequest)
  }, [activeRequest, workspaceDoc])

  function clearAppliedPromo() {
    setAppliedPromo(null)
    setPromoResult(null)
  }

  function selectPlan(planId) {
    clearAppliedPromo()
    setSelectedPlanId(planId)
  }

  function selectBillingCycle(cycle) {
    clearAppliedPromo()
    setBillingCycle(cycle)
  }

  async function applyPromoCode() {
    const code = normalizePromoCode(promoInput)
    setPromoInput(code)
    setPromoResult(null)
    if (!code) {
      setPromoResult({ valid: false, error: 'Enter a promo code first.' })
      return
    }
    if (!db || !user?.uid) {
      setPromoResult({ valid: false, error: 'Sign in before applying a promo code.' })
      return
    }
    setPromoLoading(true)
    try {
      const snap = await getDoc(doc(db, PROMO_CODE_COLLECTION, code))
      if (!snap.exists()) throw new Error('Promo code was not found or is no longer available.')
      const promo = { id: snap.id, ...snap.data() }
      const result = evaluatePromoCode(promo, {
        planId: selectedPlan?.id,
        billingCycle,
        amount: selectedAmount,
      })
      if (!result.valid) throw new Error(result.error)
      setAppliedPromo(promo)
      setPromoResult(result)
    } catch (error) {
      setAppliedPromo(null)
      const message = error?.message?.startsWith('This promo') || error?.message?.startsWith('Minimum order')
        ? error.message
        : 'Promo code was not found or is no longer available.'
      setPromoResult({ valid: false, error: message })
    } finally {
      setPromoLoading(false)
    }
  }

  function validateUpgradeRequest() {
    if (!user?.uid) return 'Authentication is required before submitting an upgrade request.'
    if (!workspaceId) return 'Workspace ID is missing. Please reselect your workspace and try again.'
    if (!workspaceDoc?.id) return 'Workspace record is missing. Please reselect your workspace and try again.'
    if (!workspaceDoc?.ownerId) return 'Workspace owner ID is missing. Please contact support.'
    if (!businessType) return 'Business type is missing for this workspace.'
    if (!requestedPlan) return 'Plan is required.'
    if (!selectedMethod?.id) return 'Payment method is required.'
    // Card checkout is the only payment path now, so an old manual/crypto request must never block it.
    return ''
  }

  const validationError = validateUpgradeRequest()
  
  const [cardLoading, setCardLoading] = useState(false)
  async function handleCardCheckout() {
    setSubmitError('')
    const checkoutError = validateUpgradeRequest()
    if (checkoutError) { setSubmitError(checkoutError); return }
    safeTrackMetaEventOnce('InitiateCheckout', { currency: 'USD', value: Number(finalAmount || originalAmount || 0) }, 'nexora_meta_initiatecheckout')
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
      setSubmitError(clientSafeMessage(error, 'Unable to start card checkout. Please try again.', { context: 'Card checkout' }))
    } finally {
      setCardLoading(false)
    }
  }

  if (authReady && !user && !cameFromUpgrade) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  const timelineSteps = requestTimelineSteps(activeRequest || {}, true)
  const requestRejected = normalizeRequestStatus(activeRequest) === 'rejected'
  const latestAdminNote = [...requestTimeline]
    .reverse()
    .find((item) => item.actor === 'admin' && item.message)
  const adminRemark = activeRequest?.latestAdminRemark || activeRequest?.adminRemark || activeRequest?.rejectionReason || latestAdminNote?.message || ''
  const openRejectedTicket = () => {
    if (!activeRequest?.id) return
    navigate('/workspace', {
      state: {
        openSupportTicket: true,
        supportTicketDraft: {
          source: 'upgrade_rejection',
          upgradeRequestId: activeRequest.id,
          category: 'Upgrade Request',
          subject: `Upgrade request rejected - ${activeRequest.id}`,
          priority: 'High',
          message: [
            `My upgrade request was rejected. Request ID: ${activeRequest.id}.`,
            requestedPlan ? `Requested plan: ${requestedPlan}.` : '',
            adminRemark ? `Nexora remark: ${adminRemark}` : '',
            'Please review this request and guide me on the next step.',
          ].filter(Boolean).join('\n'),
        },
      },
    })
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.42),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.28),transparent_30%)]" />
        <Section className="relative py-8 sm:py-14">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200 sm:tracking-[0.32em]">Nexora SaaS Upgrade Portal</p>
              <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-balance sm:text-5xl">Upgrade your Nexora plan.</h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-200">
                Choose a plan and pay securely by card. Your plan activates automatically after payment.
              </p>
            </div>
            <Panel className="min-w-0 border-white/10 bg-white/10 text-white backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-300">Current Plan</p>
              <p className="mt-3 truncate text-2xl font-black">{currentPlan}</p>
              <p className="mt-2 break-words text-sm font-semibold text-slate-200">{workspaceName}</p>
              <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                <Badge tone="violet">{businessTypeLabel || 'Workspace'}</Badge>
                <Badge tone="green">{workspaceDoc?.subscriptionStatus || 'trial'}</Badge>
              </div>
            </Panel>
          </div>
        </Section>
      </div>

      <Section className="py-8">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-6">
            <Panel className="min-w-0">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Plans</p>
                  <h2 className="mt-2 text-2xl font-black">Choose your SaaS plan</h2>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="inline-flex min-w-0 shrink-0 rounded-2xl bg-slate-100 p-1">
                    {['monthly', 'yearly'].map((cycle) => (
                      <button key={cycle} type="button" onClick={() => selectBillingCycle(cycle)} className={`rounded-xl px-4 py-2 text-xs font-black capitalize ${billingCycle === cycle ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>
                        {cycle}
                      </button>
                    ))}
                  </div>
                  <PricingCurrencySelector />
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {platformPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} selected={selectedPlan?.id === plan.id} active={String(currentPlan).toLowerCase() === String(plan.name).toLowerCase()} onSelect={selectPlan} displayCurrency={displayCurrency} displayRates={displayRates} />
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="text-xl font-black">Feature comparison</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Monthly</th>
                      <th className="px-4 py-3">Yearly</th>
                      <th className="px-4 py-3">Features</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePlans.map((plan) => (
                      <tr key={plan.id}>
                        <td className="px-4 py-4 font-black">{plan.name}</td>
                        <td className="px-4 py-4 font-bold">{formatPrice(plan.monthlyPrice ?? plan.price)}</td>
                        <td className="px-4 py-4 font-bold">{formatPrice(plan.yearlyPrice ?? plan.monthlyPrice ?? plan.price)}</td>
                        <td className="px-4 py-4 text-slate-600">{(plan.features || []).join(' • ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel>
              <h2 className="text-xl font-black">Payment information</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Select a payment method to continue.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {paymentMethods.map((method) => (
                  <PaymentCard key={method.id} method={method} selected={selectedMethod?.id === method.id} onSelect={setPaymentMethod} />
                ))}
              </div>
              {selectedMethod ? (
                <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-violet-300 bg-white">
                  <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
                  <div className="p-4 sm:p-5">
                    <p className="text-base font-black text-[#1d1d1f]">Pay by credit or debit card</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Secure hosted checkout. Charged in USD, so your bank converts from PKR. Your plan activates automatically after payment, and you can cancel any time.</p>
                    <button type="button" onClick={handleCardCheckout} disabled={cardLoading || Boolean(validationError)} className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black transition ${!cardLoading && !validationError ? 'bg-violet-600 text-white hover:bg-violet-500' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`}>
                      {cardLoading ? 'Opening secure checkout...' : 'Pay by card'}
                    </button>
                  </div>
                </div>
              ) : null}
            </Panel>

          </div>

          <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
            <Panel>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Request Summary</p>
              <h2 className="mt-2 text-2xl font-black">{selectedPlan?.name}</h2>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                <div className="flex justify-between gap-4"><span>Billing</span><span className="text-slate-950 capitalize">{billingCycle}</span></div>
                <div className="flex justify-between gap-4"><span>Original amount</span><span className={discountAmount ? 'text-slate-400 line-through' : 'text-slate-950'}>{money(selectedAmount, currency, displayCurrency, displayRates)}</span></div>
                {discountAmount ? <div className="flex justify-between gap-4 text-emerald-700"><span>Promo discount</span><span>-{money(discountAmount, currency, displayCurrency, displayRates)}</span></div> : null}
                <div className="flex justify-between gap-4 border-t border-slate-100 pt-3"><span>Total</span><span className="text-base text-slate-950">{money(finalAmount || selectedAmount, currency, displayCurrency, displayRates)}</span></div>
                <div className="flex justify-between gap-4"><span>Verification</span><span className="text-right text-slate-950">Automatic</span></div>
                <div className="flex justify-between gap-4"><span>Currency</span><span className="text-slate-950">{displayCurrency || currency}</span></div>
                <div className="flex justify-between gap-4"><span>Payment</span><span className="text-slate-950">{selectedMethod?.label}</span></div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="billing-promo-code">Promo code</label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="billing-promo-code"
                    value={promoInput}
                    onChange={(event) => {
                      setPromoInput(normalizePromoCode(event.target.value))
                      setAppliedPromo(null)
                      setPromoResult(null)
                    }}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyPromoCode() } }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black uppercase outline-none focus:border-violet-400"
                    placeholder="NEXORA20"
                    maxLength={32}
                  />
                  <button type="button" onClick={applyPromoCode} disabled={promoLoading} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                    {promoLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {promoResult?.valid ? <p className="mt-2 text-xs font-bold text-emerald-700">{promoResult.promoCode} applied. You saved {money(promoResult.discountAmount, currency, displayCurrency, displayRates)}.</p> : null}
                {promoResult && !promoResult.valid ? <p className="mt-2 text-xs font-bold text-rose-700">{promoResult.error}</p> : null}
                {appliedPromo?.description ? <p className="mt-1 text-xs font-semibold text-slate-500">{appliedPromo.description}</p> : null}
              </div>
              {submitError ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{submitError}</p> : null}
              {!submitError && validationError ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{validationError}</p> : null}
              {selectedMethod ? (
                <button type="button" disabled={cardLoading || Boolean(validationError)} onClick={handleCardCheckout} className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black transition ${!cardLoading && !validationError ? 'bg-violet-600 text-white hover:bg-violet-500' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`}>
                  {cardLoading ? 'Opening secure checkout...' : validationError ? 'Checkout unavailable' : 'Pay by card'}
                </button>
              ) : null}
            </Panel>

            <Panel>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Request status timeline</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {activeRequest ? `Request ID: ${activeRequest.id}` : 'Submit a request to start live tracking.'}
                  </p>
                </div>
                {activeRequest ? <Badge tone={normalizeRequestStatus(activeRequest) === 'rejected' ? 'amber' : normalizeRequestStatus(activeRequest) === 'approved' ? 'green' : 'violet'}>{normalizeRequestStatus(activeRequest).replace(/_/g, ' ')}</Badge> : null}
              </div>
              <div className="mt-4 space-y-4">
                {timelineSteps.map((item, index) => (
                  <div key={item.label} className="flex gap-3">
                    <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                      item.rejected ? 'bg-rose-500 text-white' : item.done ? 'bg-emerald-500 text-white' : item.active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>{item.done ? '✓' : index + 1}</span>
                    <p className={`text-sm font-bold ${item.done || item.active ? 'text-slate-900' : 'text-slate-600'}`}>{item.label}</p>
                  </div>
                ))}
              </div>
              {adminRemark ? (
                <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Nexora remark</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{adminRemark}</p>
                </div>
              ) : null}
              {requestRejected ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-black text-rose-900">Need help with this rejected request?</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-rose-700">
                    Create a support ticket so Nexora team can review the rejection and guide you.
                  </p>
                  <button
                    type="button"
                    onClick={openRejectedTicket}
                    className="mt-3 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-rose-700"
                  >
                    Create Support Ticket
                  </button>
                </div>
              ) : null}
              {requestTimeline.length ? (
                <div className="mt-5 space-y-3">
                  {requestTimeline.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.title || item.type || 'Update'}</p>
                        <p className="text-[11px] font-bold text-slate-400">{formatTimelineDate(item.createdAt)}</p>
                      </div>
                      {item.message ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.message}</p> : null}
                      {item.actorName ? <p className="mt-2 text-[11px] font-bold text-slate-400">By {item.actorName}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </Panel>

            <Panel>
              <h3 className="text-lg font-black">FAQ</h3>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <p><span className="font-black text-slate-950">How long approval takes?</span><br />Your plan activates automatically after your card payment goes through.</p>
                <p><span className="font-black text-slate-950">Can I change plans?</span><br />Submit a new request for the target plan.</p>
                <p><span className="font-black text-slate-950">Need help?</span><br />Contact <span className="inline-flex items-center">{platformSettings.supportEmail || 'support@nexorasolution.us'}<CopyEmailButton email={platformSettings.supportEmail || 'support@nexorasolution.us'} /></span>.</p>
              </div>
            </Panel>
          </aside>
        </div>
      </Section>

      <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur xl:hidden">
        <button
          type="button"
          disabled={cardLoading || Boolean(validationError)}
          onClick={handleCardCheckout}
          className={`w-full rounded-2xl px-5 py-4 text-sm font-black ${!cardLoading && !validationError ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}
        >
          {cardLoading ? 'Opening secure checkout...' : 'Pay by card'}
        </button>
      </div>
    </main>
  )
}
