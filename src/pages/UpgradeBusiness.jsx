import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { onAuthStateChanged } from 'firebase/auth'
import useNoIndex from '../hooks/useNoIndex.js'
import { assertFirebaseReady, auth, db, storage } from '../lib/firebase.js'

const PLAN = {
  name: 'Business Plan',
  monthlyLabel: 'Rs 9,999 / month',
  yearlyLabel: 'Rs 99,999 / year',
  monthlyValue: 'business_monthly',
  yearlyValue: 'business_yearly',
  features: [
    'Advanced Reports',
    'Team Permissions',
    'Multi-user Access',
    'Export Reports',
    'Priority Support',
    'Usage Analytics',
  ],
}

const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    detailLines: ['NEXORA SOLUTIONS', 'Account: 1234567890', 'Bank: Demo Bank', 'IBAN: PK00DEMO0000000000'],
  },
  {
    id: 'jazzcash',
    label: 'JazzCash',
    detailLines: ['Account Title: NEXORA SOLUTIONS', 'JazzCash: 03xx-xxxxxxx', 'Reference: Your email / User ID'],
  },
  {
    id: 'easypaisa',
    label: 'EasyPaisa',
    detailLines: ['Account Title: NEXORA SOLUTIONS', 'EasyPaisa: 03xx-xxxxxxx', 'Reference: Your email / User ID'],
  },
  {
    id: 'binance',
    label: 'Binance (Optional)',
    detailLines: ['USDT (TRC20)', 'Wallet: TDemoWalletAddressHere', 'Reference: Your email / User ID'],
  },
]

function SectionShell({ children }) {
  return <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
}

function FieldLabel({ children }) {
  return <p className="text-sm font-semibold text-slate-200">{children}</p>
}

function GlassCard({ className = '', children }) {
  return (
    <div
      className={[
        'rounded-2xl border border-white/10 bg-white/10 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)] backdrop-blur-xl',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={[
        'relative h-10 w-20 rounded-full border border-white/15 bg-white/10 p-1 transition hover:bg-white/15',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      ].join(' ')}
      aria-pressed={enabled}
    >
      <span
        className={[
          'block h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 shadow-lg transition',
          enabled ? 'translate-x-10' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

function PaymentMethodCard({ method, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(method.id)}
      className={[
        'group w-full rounded-2xl border p-4 text-left transition',
        selected ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{method.label}</p>
          <p className="mt-1 text-xs text-slate-300">Manual payment • Screenshot required</p>
        </div>
        <div
          className={[
            'mt-1 h-4 w-4 rounded-full border',
            selected ? 'border-indigo-300 bg-indigo-400' : 'border-white/20 bg-transparent',
          ].join(' ')}
          aria-hidden="true"
        />
      </div>
      <div className="mt-3 space-y-1">
        {method.detailLines.map((line) => (
          <p key={line} className="text-xs text-slate-200/90">
            {line}
          </p>
        ))}
      </div>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <p className="mt-3 text-xs text-slate-300">
        Tip: Add your email or user ID in the payment reference to speed up approval.
      </p>
    </button>
  )
}

function UploadDropzone({ file, previewUrl, onPickFile, disabled }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleFiles = (files) => {
    const picked = files?.[0]
    if (!picked) return
    if (!picked.type?.startsWith('image/')) return
    onPickFile(picked)
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          if (disabled) return
          handleFiles(event.dataTransfer.files)
        }}
        className={[
          'w-full rounded-2xl border border-dashed p-6 text-left transition',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          dragOver ? 'border-indigo-400/70 bg-indigo-500/10' : 'border-white/15 bg-white/5 hover:bg-white/10',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        ].join(' ')}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Upload payment screenshot</p>
            <p className="mt-1 text-xs text-slate-300">Drag & drop or click to select (PNG/JPG).</p>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
            {file ? 'Replace' : 'Choose file'}
          </div>
        </div>
        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950/20">
            <img src={previewUrl} alt="Payment screenshot preview" className="h-56 w-full object-cover sm:h-64" />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/20 p-4">
            <p className="text-xs text-slate-300">
              We only use this screenshot to verify your manual payment. Your Business access activates after admin approval.
            </p>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  )
}

function SuccessCard() {
  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6">
      <p className="text-base font-semibold text-emerald-200">Upgrade request submitted</p>
      <p className="mt-1 text-sm text-emerald-100/80">
        Your payment request has been submitted successfully. Business access will activate after admin approval.
      </p>
    </div>
  )
}

export default function UpgradeBusiness({ cameFromUpgrade = false }) {
  const location = useLocation()
  useNoIndex(true)

  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(() => !auth)

  const [yearly, setYearly] = useState(false)
  const selectedPlan = yearly ? PLAN.yearlyValue : PLAN.monthlyValue

  const [paymentMethod, setPaymentMethod] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!auth) return undefined
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
    return () => unsubscribe()
  }, [])

  const previewUrl = useMemo(() => (screenshotFile ? URL.createObjectURL(screenshotFile) : ''), [screenshotFile])
  useEffect(() => {
    if (!previewUrl) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const isAllowed = useMemo(() => {
    if (!authReady) return false
    return Boolean(user) || cameFromUpgrade
  }, [authReady, cameFromUpgrade, user])

  const redirectTarget = '/'
  const shouldRedirect = authReady && !isAllowed

  const readableEmail = user?.email ?? ''
  const readableName = user?.displayName ?? user?.email?.split('@')?.[0] ?? ''
  const userId = user?.uid ?? null

  const headerSubtitle = useMemo(() => {
    return 'Unlock advanced reports, multi-user access, export tools, team permissions, priority support, and usage analytics.'
  }, [])

  const canSubmit = Boolean(paymentMethod && screenshotFile && !isSubmitting && !submitted)

  const planPriceLabel = yearly ? PLAN.yearlyLabel : PLAN.monthlyLabel
  const planPill = yearly ? 'Yearly' : 'Monthly'

  const handleSubmit = async () => {
    setSubmitError('')
    if (!userId) {
      setSubmitError('Please login to submit an upgrade request.')
      return
    }
    if (!paymentMethod) {
      setSubmitError('Please select a payment method.')
      return
    }
    if (!screenshotFile) {
      setSubmitError('Please upload your payment screenshot.')
      return
    }

    setIsSubmitting(true)
    try {
      assertFirebaseReady()
      const safeName = screenshotFile.name?.replaceAll(/[^\w.-]+/g, '_') ?? 'payment.png'
      const objectPath = `upgradeRequests/${userId}/${Date.now()}_${safeName}`
      const storageRef = ref(storage, objectPath)
      await uploadBytes(storageRef, screenshotFile, { contentType: screenshotFile.type || 'image/png' })
      const screenshotUrl = await getDownloadURL(storageRef)

      await addDoc(collection(db, 'upgradeRequests'), {
        userId,
        ownerId: userId,
        workspaceId: userId,
        createdBy: userId,
        userName: readableName,
        email: readableEmail,
        selectedPlan,
        paymentMethod,
        screenshotUrl,
        paymentStatus: 'pending',
        approvalStatus: 'pending',
        createdAt: serverTimestamp(),
      })

      setSubmitted(true)
    } catch (error) {
      setSubmitError(error?.message || 'Failed to submit upgrade request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (shouldRedirect) {
    return <Navigate to={redirectTarget} replace state={{ from: location.pathname }} />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-slate-950 to-fuchsia-500/20" />
        <div className="pointer-events-none absolute -top-44 left-1/2 h-96 w-[38rem] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 right-[-10%] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-3xl" />

        <SectionShell>
          <div className="relative py-10 sm:py-14 lg:py-16">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.36em] text-indigo-200/80">NEXORA SOLUTIONS</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Upgrade to Business</h1>
                <p className="mt-3 text-base text-slate-200/90 sm:text-lg">{headerSubtitle}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Current user</p>
                <p className="mt-1 text-sm font-semibold text-white">{user ? readableEmail || 'Authenticated' : 'Not logged in'}</p>
              </div>
            </div>
          </div>
        </SectionShell>
      </div>

      <SectionShell>
        <div className="grid gap-6 pb-12 lg:grid-cols-2 lg:items-start">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute right-4 top-4">
              <span className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-1 text-xs font-semibold text-white shadow">
                Recommended
              </span>
            </div>

            <p className="text-sm font-semibold text-indigo-200">{PLAN.name}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{planPriceLabel}</p>
            <p className="mt-1 text-sm text-slate-200/80">Premium access • Cancel anytime after approval</p>

            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Billing</p>
                <p className="mt-1 text-sm font-semibold text-white">{planPill}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={yearly ? 'text-xs font-semibold text-slate-300' : 'text-xs font-semibold text-white'}>
                  Monthly
                </span>
                <Toggle enabled={yearly} onChange={setYearly} />
                <span className={yearly ? 'text-xs font-semibold text-white' : 'text-xs font-semibold text-slate-300'}>
                  Yearly
                </span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Included features</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-100/90">
                {PLAN.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-200">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>

          <div className="space-y-6">
            <GlassCard>
              <p className="text-sm font-semibold text-white">Payment methods</p>
              <p className="mt-1 text-sm text-slate-200/80">Choose a manual payment option and submit your screenshot for approval.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    selected={paymentMethod === method.id}
                    onSelect={setPaymentMethod}
                  />
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <p className="text-sm font-semibold text-white">Payment instructions</p>
              <ol className="mt-4 space-y-3 text-sm text-slate-200/90">
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                    1
                  </span>
                  <span>Send payment using your selected method.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                    2
                  </span>
                  <span>Upload a clear screenshot (transaction receipt / confirmation).</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                    3
                  </span>
                  <span>Wait for admin approval (status stays pending until verified).</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                    4
                  </span>
                  <span>Business access activates automatically after approval.</span>
                </li>
              </ol>
            </GlassCard>

            <GlassCard>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Payment screenshot</p>
                  <p className="mt-1 text-sm text-slate-200/80">Upload your payment proof to request Business activation.</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {paymentMethod ? `Method: ${paymentMethod}` : 'Select method first'}
                </div>
              </div>
              <div className="mt-4">
                <UploadDropzone
                  file={screenshotFile}
                  previewUrl={previewUrl}
                  onPickFile={setScreenshotFile}
                  disabled={!paymentMethod || submitted || isSubmitting}
                />
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <FieldLabel>Plan</FieldLabel>
                    <p className="mt-1 text-sm font-semibold text-white">{selectedPlan}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <FieldLabel>Payment</FieldLabel>
                    <p className="mt-1 text-sm font-semibold text-white">{paymentMethod || 'Not selected'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <FieldLabel>Status</FieldLabel>
                    <p className="mt-1 text-sm font-semibold text-white">{submitted ? 'Submitted' : 'Not submitted'}</p>
                  </div>
                </div>

                {submitted ? (
                  <SuccessCard />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {submitError ? <p className="text-sm font-semibold text-rose-200">{submitError}</p> : null}
                      {!auth ? (
                        <p className="mt-1 text-xs text-slate-300">
                          Firebase Auth isn&apos;t initialized yet. Configure Firebase to enable login + submissions.
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className={[
                        'inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition',
                        canSubmit
                          ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow hover:brightness-110'
                          : 'cursor-not-allowed bg-white/10 text-slate-300',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                      ].join(' ')}
                    >
                      {isSubmitting ? 'Submitting…' : 'Submit Payment for Approval'}
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </SectionShell>
    </div>
  )
}
