import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { collection, doc, getDoc, onSnapshot, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import useNoIndex from '../hooks/useNoIndex.js'
import { assertFirebaseReady, auth, db } from '../lib/firebase.js'
import { clientSafeMessage } from '../lib/errorHandler.js'
import {
  DEFAULT_SAAS_CURRENCY,
  PLATFORM_PLAN_COLLECTION,
  mergePlatformPlans,
  mergePlatformSettings,
  paymentMethodsFromSettings,
  planPriceLabel,
} from '../lib/platformPlans.js'
import { trackAnalyticsEvent } from '../lib/analyticsTracking.js'
import { sendWorkerEmail, upgradeRequestReceivedEmail } from '../lib/transactionalEmail.js'
import { submitManualUpgradeRequest } from '../lib/upgradeWorker.js'
import { evaluatePromoCode, normalizePromoCode, PROMO_CODE_COLLECTION } from '../lib/promoCodes.js'
import { labelForBusinessType } from '../crm/data/moduleAccess.js'

const PAYMENTS_WORKER_URL = String(
  import.meta.env.VITE_NOWPAYMENTS_WORKER_URL || 'https://nexora-payments-api.rahanshah4.workers.dev',
).replace(/\/$/, '')

function Section({ children, className = '' }) {
  return <section className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</section>
}

function Panel({ children, className = '' }) {
  return <div className={`rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)] ${className}`}>{children}</div>
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

function money(value, currency = DEFAULT_SAAS_CURRENCY) {
  if (String(value).toLowerCase() === 'custom') return 'Custom'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0))
}

function positiveAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function planSavings(plan) {
  const monthly = Number(plan.monthlyPrice || 0)
  const yearly = Number(plan.yearlyPrice || 0)
  if (!monthly || !yearly || String(plan.yearlyPrice).toLowerCase() === 'custom') return ''
  const fullYear = monthly * 12
  const savings = Math.max(0, fullYear - yearly)
  return savings ? `Save ${money(savings, plan.currency)}` : 'Best annual value'
}

function PlanCard({ plan, selected, active, onSelect }) {
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">{plan.name}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{plan.currency || DEFAULT_SAAS_CURRENCY} billing</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {active ? <Badge tone="green">Active plan</Badge> : null}
          {plan.recommended ? <Badge tone="violet">Recommended</Badge> : null}
        </div>
      </div>
      <div className="mt-5">
        <p className="text-3xl font-black tracking-tight text-slate-950">{planPriceLabel(plan, 'monthly')}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">per month</p>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <p className="text-sm font-black text-slate-900">{planPriceLabel(plan, 'yearly')}</p>
        <p className="mt-1 text-xs font-bold text-emerald-700">{planSavings(plan) || 'Yearly billing available'}</p>
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
  const isNowPayments = method.id === 'nowpayments'
  const lines = [
    method.bankName,
    method.accountTitle ? `Account Title: ${method.accountTitle}` : '',
    method.accountNumber ? `Account Number: ${method.accountNumber}` : '',
    method.instructions,
  ].filter(Boolean)
  return (
    <button
      type="button"
      onClick={() => onSelect(method.id)}
      className={`relative overflow-hidden rounded-[1.25rem] border p-4 text-left transition ${
        isNowPayments
          ? selected
            ? 'border-emerald-300 bg-slate-950 text-white shadow-[0_24px_55px_-30px_rgba(16,185,129,0.8)] ring-2 ring-emerald-300/50'
            : 'border-slate-800 bg-slate-950 text-white shadow-[0_20px_50px_-34px_rgba(15,23,42,0.9)] hover:border-emerald-400'
          : selected
            ? 'border-violet-400 bg-violet-50'
            : 'border-slate-200 bg-white hover:border-violet-200'
      }`}
    >
      {isNowPayments ? <span className="absolute inset-y-0 left-0 w-1.5 bg-emerald-400" /> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {isNowPayments ? <span className="mb-2 inline-flex rounded-full bg-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">Recommended</span> : null}
          <p className={`text-sm font-black ${isNowPayments ? 'text-white' : 'text-slate-950'}`}>{method.label}</p>
        </div>
        <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${selected ? isNowPayments ? 'border-emerald-300 bg-emerald-400 ring-4 ring-emerald-400/15' : 'border-violet-500 bg-violet-500' : isNowPayments ? 'border-slate-500' : 'border-slate-300'}`} />
      </div>
      {isNowPayments ? (
        <div className="mt-3 inline-flex rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200">
          Crypto checkout • Global payments
        </div>
      ) : null}
      <div className={`mt-3 space-y-1 text-xs font-semibold ${isNowPayments ? 'text-slate-300' : 'text-slate-600'}`}>
        {lines.map((line) => <p key={line}>{line}</p>)}
      </div>
    </button>
  )
}

function UploadBox({ file, previewUrl, onFile }) {
  const inputRef = useRef(null)
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-[1.25rem] border border-dashed border-violet-300 bg-violet-50/70 p-5 text-left transition hover:bg-violet-50"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">Upload Payment Proof Screenshot</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Required for manual upgrade review. PNG/JPG receipt screenshots are supported.</p>
          </div>
          <span className="rounded-full bg-violet-600 px-4 py-2 text-xs font-black text-white">{file ? 'Replace proof' : 'Choose proof file'}</span>
        </div>
        {previewUrl ? <img src={previewUrl} alt="Payment proof preview" className="mt-4 h-56 w-full rounded-2xl object-cover" /> : null}
      </button>
      <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0] || null)} />
    </div>
  )
}

export default function UpgradeBusiness({ cameFromUpgrade = false }) {
  const location = useLocation()
  useNoIndex(true)

  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(() => !auth)
  const [userDoc, setUserDoc] = useState(null)
  const [workspaceDoc, setWorkspaceDoc] = useState(null)
  const [planDocs, setPlanDocs] = useState([])
  const [settingsDocs, setSettingsDocs] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState('standard')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [paymentMethod, setPaymentMethod] = useState('nowpayments')
  const [form, setForm] = useState({
    transactionId: '',
    amountPaid: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    senderName: '',
    senderNumber: '',
    notes: '',
  })
  const [proofFile, setProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [cryptoCheckoutLoading, setCryptoCheckoutLoading] = useState(false)
  const [cryptoCheckoutStarted, setCryptoCheckoutStarted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoResult, setPromoResult] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)

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

  const platformPlans = useMemo(() => mergePlatformPlans(planDocs), [planDocs])
  const activePlans = useMemo(() => platformPlans.filter((plan) => plan.active !== false), [platformPlans])
  const platformSettings = useMemo(() => mergePlatformSettings(settingsDocs), [settingsDocs])
  const paymentMethods = useMemo(() => paymentMethodsFromSettings(platformSettings), [platformSettings])
  const selectedPlan = platformPlans.find((plan) => plan.id === selectedPlanId) || platformPlans[1] || platformPlans[0]
  const selectedMethod = paymentMethods.find((method) => method.id === paymentMethod) || paymentMethods[0]
  const isAutomaticCrypto = selectedMethod?.id === 'nowpayments'
  const cryptoReturnStatus = new URLSearchParams(location.search).get('crypto')
  const currentPlan = workspaceDoc?.plan || workspaceDoc?.selectedPlan || userDoc?.plan || 'Basic'
  const workspaceId = userDoc?.workspaceId || workspaceDoc?.id || user?.uid || ''
  const workspaceName = workspaceDoc?.workspaceName || workspaceDoc?.companyName || workspaceDoc?.businessName || userDoc?.workspaceName || 'Nexora Workspace'
  const businessType = workspaceDoc?.selectedBusinessType || workspaceDoc?.businessType || userDoc?.selectedBusinessType || userDoc?.businessType || ''
  const businessTypeLabel = businessType ? labelForBusinessType(businessType) : ''
  const currency = selectedPlan?.currency || platformSettings.defaultCurrency || DEFAULT_SAAS_CURRENCY
  const selectedAmount = billingCycle === 'yearly' ? selectedPlan?.yearlyPrice : selectedPlan?.monthlyPrice
  const originalAmount = positiveAmount(selectedAmount)
  const discountAmount = promoResult?.valid ? promoResult.discountAmount : 0
  const finalAmount = promoResult?.valid ? promoResult.finalAmount : originalAmount
  const requestedPlan = selectedPlan?.name || ''
  const previewUrl = useMemo(() => (proofFile ? URL.createObjectURL(proofFile) : ''), [proofFile])
  const paidAmount = positiveAmount(form.amountPaid)

  useEffect(() => {
    if (!previewUrl) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    setForm((current) => ({
      ...current,
      amountPaid: String(selectedAmount || '').toLowerCase() === 'custom' ? current.amountPaid : String(finalAmount || ''),
      senderName: current.senderName || user?.displayName || userDoc?.ownerName || '',
    }))
  }, [finalAmount, selectedAmount, user?.displayName, userDoc?.ownerName])

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

  function upgradeRequestContext() {
    return {
      collectionPath: 'upgradeRequests',
      hasDb: Boolean(db),
      storageTarget: 'cloudflare-r2',
      hasUserUid: Boolean(user?.uid),
      userUid: user?.uid || '',
      hasWorkspaceId: Boolean(workspaceId),
      workspaceId,
      hasWorkspaceDoc: Boolean(workspaceDoc?.id),
      workspaceDocId: workspaceDoc?.id || '',
      hasWorkspaceOwnerId: Boolean(workspaceDoc?.ownerId),
      workspaceOwnerId: workspaceDoc?.ownerId || '',
      hasBusinessType: Boolean(businessType),
      businessType,
      hasRequestedPlan: Boolean(requestedPlan),
      requestedPlan,
      hasPaymentMethod: Boolean(selectedMethod?.id),
      paymentMethodId: selectedMethod?.id || '',
      amountPaid: paidAmount,
      hasPositiveAmount: paidAmount > 0,
      hasScreenshot: Boolean(proofFile),
      hasTransactionId: Boolean(form.transactionId.trim()),
      hasSenderName: Boolean(form.senderName.trim()),
      hasSenderNumber: Boolean(form.senderNumber.trim()),
      hasPaymentDate: Boolean(form.paymentDate),
      hasNotes: Boolean(form.notes.trim()),
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
    if (isAutomaticCrypto) return ''
    if (!form.transactionId.trim()) return 'Enter the transaction ID before submitting your upgrade request.'
    if (paidAmount <= 0) return 'Enter the paid amount before submitting your upgrade request.'
    if (!form.paymentDate) return 'Select the payment date before submitting your upgrade request.'
    if (!form.senderName.trim()) return 'Enter the sender/account name before submitting your upgrade request.'
    if (!form.senderNumber.trim()) return 'Enter the sender/account number before submitting your upgrade request.'
    if (!form.notes.trim()) return 'Add transaction notes before submitting your upgrade request.'
    if (!proofFile) return 'Upload payment proof screenshot before submitting.'
    if (!String(proofFile.type || '').startsWith('image/')) return 'Only image screenshots are supported.'
    if (proofFile.size > 6 * 1024 * 1024) return 'Screenshot must be 6MB or smaller.'
    return ''
  }

  const validationError = validateUpgradeRequest()
  const canSubmit = !submitting && !submitted && !validationError

  async function handleCryptoCheckout() {
    setSubmitError('')
    const checkoutError = validateUpgradeRequest()
    if (checkoutError) {
      setSubmitError(checkoutError)
      return
    }
    setCryptoCheckoutLoading(true)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/invoice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: selectedPlan.id, billingCycle, promoCode: promoResult?.valid ? promoResult.promoCode : '' }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to create crypto checkout.')
      const invoiceUrl = result.invoiceUrl
      if (!invoiceUrl) throw new Error('Crypto checkout URL was not returned.')
      setCryptoCheckoutStarted(true)
      window.location.assign(invoiceUrl)
    } catch (error) {
      console.error('NOWPayments checkout error:', error)
      setSubmitError(clientSafeMessage(error, 'Unable to start crypto checkout. Please try again.', { context: 'NOWPayments checkout' }))
    } finally {
      setCryptoCheckoutLoading(false)
    }
  }

  async function handleSubmit() {
    setSubmitError('')
    const requestContext = upgradeRequestContext()
    console.info('Upgrade Request Validation:', requestContext)
    const validationError = validateUpgradeRequest()
    if (validationError) {
      const error = new Error(validationError)
      console.error('Upgrade Request Error:', error)
      console.error('Upgrade Request Context:', requestContext)
      setSubmitError(validationError)
      return
    }
    setSubmitting(true)
    try {
      assertFirebaseReady()
      const idToken = await user.getIdToken()
      const workerFields = {
        email: user.email || userDoc?.email || '',
        uid: user.uid,
        userId: user.uid,
        createdBy: user.uid,
        ownerId: workspaceDoc.ownerId,
        workspaceId,
        workspaceName,
        businessType,
        currentPlan,
        requestedPlan,
        planId: selectedPlan?.id || selectedPlanId,
        selectedPlan: requestedPlan,
        billingCycle,
        originalAmount,
        discountAmount,
        finalAmount: paidAmount,
        promoCode: promoResult?.valid ? promoResult.promoCode : '',
        promoCodeId: promoResult?.valid ? promoResult.promoCodeId : '',
        promoDiscountType: promoResult?.valid ? promoResult.discountType : '',
        promoDiscountValue: promoResult?.valid ? promoResult.discountValue : 0,
        amount: paidAmount,
        amountPaid: paidAmount,
        currency,
        transactionId: form.transactionId.trim(),
        senderName: form.senderName.trim(),
        senderNumber: form.senderNumber.trim(),
        paymentMethod: selectedMethod.label || selectedMethod.id,
        paymentMethodId: selectedMethod.id,
        paymentDate: form.paymentDate || '',
        module: businessTypeLabel || businessType,
        notes: form.notes.trim(),
        paymentNotes: form.notes.trim(),
        status: 'pending',
        approvalStatus: 'pending',
        paymentStatus: 'pending',
      }
      console.info('Upgrade request Worker submit starting:', {
        endpoint: 'Cloudflare Worker /api/upgrades/manual',
        userId: workerFields.userId,
        workspaceId: workerFields.workspaceId,
        businessType: workerFields.businessType,
        requestedPlan: workerFields.requestedPlan,
        paymentMethod: workerFields.paymentMethod,
        amount: workerFields.amount,
        hasTransactionId: Boolean(workerFields.transactionId),
        hasScreenshot: Boolean(proofFile),
      })
      const workerResult = await submitManualUpgradeRequest({ idToken, fields: workerFields, screenshotFile: proofFile })
      const payload = workerResult.request || workerFields
      console.info('Upgrade request Worker submit completed:', { id: payload.id, source: payload.source || 'cloudflare-d1' })
      const emailTemplate = upgradeRequestReceivedEmail({
        name: workerFields.senderName || user.displayName || 'there',
        plan: requestedPlan,
        amount: paidAmount,
        currency,
        billingCycle: workerFields.billingCycle || '',
        paymentMethod: workerFields.paymentMethod || '',
        transactionId: workerFields.transactionId || '',
        paymentDate: workerFields.paymentDate || '',
        workspaceName: workerFields.workspaceName || '',
      })
      const emailResult = await sendWorkerEmail({ to: workerFields.email, ...emailTemplate })
      await trackAnalyticsEvent('upgrade_request_submitted', {
        userId: user.uid,
        email: workerFields.email,
        workspaceId,
        businessType,
        page: '/upgrade-business',
        buttonLabel: 'Submit Upgrade Request',
        status: 'pending',
      })
      setSubmitted(true)
      if (!emailResult.ok) {
        setSubmitError(`Upgrade request submitted, but confirmation email failed: ${emailResult.error}`)
      }
    } catch (error) {
      console.error('Upgrade Request Error:', error)
      console.error('Upgrade Request Context:', upgradeRequestContext())
      setSubmitError(clientSafeMessage(error, 'Failed to submit upgrade request. Please try again.', { context: 'Upgrade request submit' }))
    } finally {
      setSubmitting(false)
    }
  }

  if (authReady && !user && !cameFromUpgrade) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.42),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.28),transparent_30%)]" />
        <Section className="relative py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-violet-200">Nexora SaaS Upgrade Portal</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Upgrade your Nexora plan.</h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-200">
                Choose a plan and payment method. Crypto payments are verified and activated automatically.
              </p>
            </div>
            <Panel className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-300">Current Plan</p>
              <p className="mt-3 text-2xl font-black">{currentPlan}</p>
              <p className="mt-2 text-sm font-semibold text-slate-200">{workspaceName}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="violet">{businessTypeLabel || 'Workspace'}</Badge>
                <Badge tone="green">{workspaceDoc?.subscriptionStatus || 'trial'}</Badge>
              </div>
            </Panel>
          </div>
        </Section>
      </div>

      <Section className="py-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            <Panel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Plans</p>
                  <h2 className="mt-2 text-2xl font-black">Choose your SaaS plan</h2>
                </div>
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  {['monthly', 'yearly'].map((cycle) => (
                    <button key={cycle} type="button" onClick={() => selectBillingCycle(cycle)} className={`rounded-xl px-4 py-2 text-xs font-black capitalize ${billingCycle === cycle ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>
                      {cycle}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {platformPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} selected={selectedPlan?.id === plan.id} active={String(currentPlan).toLowerCase() === String(plan.name).toLowerCase()} onSelect={selectPlan} />
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
                        <td className="px-4 py-4 font-bold">{planPriceLabel(plan, 'monthly')}</td>
                        <td className="px-4 py-4 font-bold">{planPriceLabel(plan, 'yearly')}</td>
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
              {isAutomaticCrypto ? (
                <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-emerald-300 bg-slate-950 text-white shadow-[0_26px_65px_-38px_rgba(16,185,129,0.85)]">
                  <div className="h-1.5 bg-emerald-400" />
                  <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black">Pay securely with crypto</p>
                        <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">Recommended</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">Your payment is verified automatically. No receipt upload or manual approval is needed.</p>
                      <p className="mt-2 text-[11px] font-bold text-emerald-200">Signed payment verification • Multiple cryptocurrencies • Automatic activation</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCryptoCheckout}
                      disabled={cryptoCheckoutLoading}
                      className="inline-flex min-h-14 shrink-0 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 shadow-lg transition hover:bg-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-wait disabled:opacity-60"
                    >
                      {cryptoCheckoutLoading ? (
                        <span className="px-4 text-sm font-black text-emerald-200">Opening secure checkout...</span>
                      ) : (
                        <img
                          src={selectedMethod.buttonImageUrl}
                          alt="Pay securely with cryptocurrency through NOWPayments"
                          className="h-10 w-auto max-w-full"
                        />
                      )}
                    </button>
                  </div>
                  </div>
                </div>
              ) : null}
            </Panel>

            {!isAutomaticCrypto ? <Panel>
              <h2 className="text-xl font-black">Transaction information</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">All transaction fields and payment proof screenshot are required for manual review.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-xs font-black text-slate-600">
                  Transaction ID <span className="font-semibold text-rose-500">(required)</span>
                  <input required className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" value={form.transactionId} onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))} placeholder="e.g. TXN-123456" />
                </label>
                <label className="text-xs font-black text-slate-600">
                  Amount Paid <span className="font-semibold text-rose-500">(required)</span>
                  <input required className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-500" value={form.amountPaid} onChange={(event) => setForm((current) => ({ ...current, amountPaid: event.target.value }))} inputMode="decimal" placeholder={money(selectedAmount, currency)} disabled={promoResult?.valid === true} />
                </label>
                <label className="text-xs font-black text-slate-600">
                  Payment Date <span className="font-semibold text-rose-500">(required)</span>
                  <input required type="date" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} />
                </label>
                <label className="text-xs font-black text-slate-600">
                  Sender Name <span className="font-semibold text-rose-500">(required)</span>
                  <input required className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" value={form.senderName} onChange={(event) => setForm((current) => ({ ...current, senderName: event.target.value }))} placeholder="Name on payment account" />
                </label>
                <label className="text-xs font-black text-slate-600">
                  Sender Number <span className="font-semibold text-rose-500">(required)</span>
                  <input required className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" value={form.senderNumber} onChange={(event) => setForm((current) => ({ ...current, senderNumber: event.target.value }))} placeholder="e.g. 03xx-xxxxxxx" />
                </label>
                <label className="text-xs font-black text-slate-600">
                  Payment Method <span className="font-semibold text-rose-500">(required)</span>
                  <input className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold" value={selectedMethod?.label || ''} readOnly />
                </label>
                <label className="md:col-span-2 text-xs font-black text-slate-600">
                  Notes <span className="font-semibold text-rose-500">(required)</span>
                  <textarea required className="mt-1 h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Add account name, transfer app, or any details Nexora billing team needs" />
                </label>
              </div>
            </Panel> : null}

            {!isAutomaticCrypto ? <Panel>
              <UploadBox file={proofFile} previewUrl={previewUrl} onFile={setProofFile} />
            </Panel> : null}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6">
            <Panel>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Request Summary</p>
              <h2 className="mt-2 text-2xl font-black">{selectedPlan?.name}</h2>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                <div className="flex justify-between gap-4"><span>Billing</span><span className="text-slate-950 capitalize">{billingCycle}</span></div>
                <div className="flex justify-between gap-4"><span>Original amount</span><span className={discountAmount ? 'text-slate-400 line-through' : 'text-slate-950'}>{money(selectedAmount, currency)}</span></div>
                {discountAmount ? <div className="flex justify-between gap-4 text-emerald-700"><span>Promo discount</span><span>-{money(discountAmount, currency)}</span></div> : null}
                <div className="flex justify-between gap-4 border-t border-slate-100 pt-3"><span>Total</span><span className="text-base text-slate-950">{money(finalAmount || selectedAmount, currency)}</span></div>
                <div className="flex justify-between gap-4"><span>Verification</span><span className="text-right text-slate-950">{isAutomaticCrypto ? 'Automatic' : proofFile ? 'Screenshot ready' : 'Screenshot required'}</span></div>
                <div className="flex justify-between gap-4"><span>Currency</span><span className="text-slate-950">{currency}</span></div>
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
                {promoResult?.valid ? <p className="mt-2 text-xs font-bold text-emerald-700">{promoResult.promoCode} applied. You saved {money(promoResult.discountAmount, currency)}.</p> : null}
                {promoResult && !promoResult.valid ? <p className="mt-2 text-xs font-bold text-rose-700">{promoResult.error}</p> : null}
                {appliedPromo?.description ? <p className="mt-1 text-xs font-semibold text-slate-500">{appliedPromo.description}</p> : null}
              </div>
              {submitError ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{submitError}</p> : null}
              {cryptoReturnStatus === 'processing' ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Payment received for verification. This page updates automatically when NOWPayments marks it finished.</p> : null}
              {cryptoReturnStatus === 'cancelled' ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">Crypto checkout was cancelled. No plan change was made.</p> : null}
              {!submitError && validationError && !submitted ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{validationError}</p> : null}
              {submitted ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Upgrade request submitted. Status is pending until Nexora approves payment.</p> : null}
              {cryptoCheckoutStarted ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Checkout created. Your plan will activate automatically after the payment reaches finished status.</p> : null}
              {isAutomaticCrypto ? (
                <button type="button" disabled={cryptoCheckoutLoading || Boolean(validationError)} onClick={handleCryptoCheckout} className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black transition ${!cryptoCheckoutLoading && !validationError ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`}>
                  {cryptoCheckoutLoading ? 'Opening secure checkout...' : validationError ? 'Checkout unavailable' : 'Pay with Crypto'}
                </button>
              ) : (
                <button type="button" disabled={!canSubmit} onClick={handleSubmit} className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black transition ${canSubmit ? 'bg-slate-950 text-white hover:bg-violet-700' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`}>
                  {submitting ? 'Submitting...' : submitted ? 'Submitted' : validationError ? 'Complete Payment Details' : 'Submit Upgrade Request'}
                </button>
              )}
            </Panel>

            <Panel>
              <h3 className="text-lg font-black">Request status timeline</h3>
              <div className="mt-4 space-y-4">
                {(isAutomaticCrypto
                  ? ['Secure checkout', 'Blockchain payment', 'Automatic verification', 'Workspace plan activated']
                  : ['Payment submitted', 'Nexora review', 'Approved or rejected', 'Workspace plan updated']).map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 && submitted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</span>
                    <p className="text-sm font-bold text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h3 className="text-lg font-black">FAQ</h3>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <p><span className="font-black text-slate-950">How long approval takes?</span><br />Crypto activates automatically after NOWPayments marks it finished.</p>
                <p><span className="font-black text-slate-950">Can I change plans?</span><br />Submit a new request for the target plan.</p>
                <p><span className="font-black text-slate-950">Need help?</span><br />Contact {platformSettings.supportEmail || 'support@nexorasolution.online'}.</p>
              </div>
            </Panel>
          </aside>
        </div>
      </Section>

      <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur xl:hidden">
        <button type="button" disabled={isAutomaticCrypto ? cryptoCheckoutLoading || Boolean(validationError) : !canSubmit} onClick={isAutomaticCrypto ? handleCryptoCheckout : handleSubmit} className={`w-full rounded-2xl px-5 py-4 text-sm font-black ${isAutomaticCrypto ? !cryptoCheckoutLoading && !validationError ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 text-slate-500' : canSubmit ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-500'}`}>
          {isAutomaticCrypto ? cryptoCheckoutLoading ? 'Opening secure checkout...' : 'Pay with Crypto' : submitting ? 'Submitting...' : submitted ? 'Submitted' : validationError ? 'Complete Payment Details' : 'Submit Upgrade Request'}
        </button>
      </div>
    </main>
  )
}
