import { motion } from 'framer-motion'
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Badge from '../components/ui/Badge.jsx'
import { db, getFirebaseEnvHint } from '../lib/firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { useUser } from '../hooks/useUser.js'
import { getBusinessPlanPrice } from '../data/moduleAccess.js'
import { formatCurrency } from '../utils/format.js'
import { clientSafeMessage } from '../utils/messages.js'

const nayapayAccounts = [
  { key: 'NayaPay ID', value: 'mehranshah01@nayapay' },
  { key: 'Account Number', value: '03208601170' },
  { key: 'Raast ID', value: '03208601170' },
  { key: 'IBAN', value: 'PK18NAYA1234503208601170' },
]

function Toast({ tone = 'success', message, onClose }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
      : 'border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200'
  return (
    <div
      className={`glass fixed right-4 top-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border p-3 ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{message}</p>
        <button
          type="button"
          className="focus-ring rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}

function copyText(text) {
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return Promise.resolve()
}

function PaymentDetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/30 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/25 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
        <p className="mt-0.5 break-all text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
      </div>
      <button
        type="button"
        className="focus-ring inline-flex items-center justify-center rounded-xl bg-slate-900/5 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
        onClick={() => copyText(value)}
      >
        Copy
      </button>
    </div>
  )
}

export default function UpgradeBusinessPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { userId, plan, accessPlan } = useUser()
  const { profile } = usePreferences()
  const businessPrice = useMemo(() => getBusinessPlanPrice(), [])
  const currency = businessPrice.currency
  const selectedPlan = 'Business'
  const billingCycle = 'monthly'
  const planPrice = businessPrice.amount

  const [amountPaid, setAmountPaid] = useState('')

  const [customerName, setCustomerName] = useState(profile.ownerName || 'Nexora User')
  const [customerEmail, setCustomerEmail] = useState(profile.email || user?.email || 'user@nexora.solutions')
  const [customerPhone, setCustomerPhone] = useState(profile.phone || '')

  const [paymentMethod, setPaymentMethod] = useState('NayaPay')
  const [paidToAccount, setPaidToAccount] = useState(nayapayAccounts[0].value)
  const [transactionId, setTransactionId] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)
  const firebaseHint = getFirebaseEnvHint()

  // Show pending approval status if a request already exists.
  // (Keeps UI stable even after reload.)
  useEffect(() => {
    if (!db) return
    if (!userId) {
      Promise.resolve().then(() => setPendingRequest(null))
      return
    }
    const q = query(
      collection(db, 'upgradeRequests'),
      where('userId', '==', userId),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        const pending = all
          .filter((r) => r.approvalStatus === 'pending')
          .sort((a, b) => {
            const at = a.createdAt?.toMillis?.() ?? 0
            const bt = b.createdAt?.toMillis?.() ?? 0
            return bt - at
          })[0]
        setPendingRequest(pending ?? null)
      },
      () => setPendingRequest(null),
    )
    return () => unsub()
  }, [userId])

  const canSubmit = useMemo(
    () =>
      !!userId &&
      customerName.trim().length > 0 &&
      customerEmail.trim().length > 0 &&
      customerPhone.trim().length > 0 &&
      transactionId.trim().length > 0 &&
      paymentReference.trim().length > 0 &&
      String(amountPaid).trim().length > 0 &&
      !submitting,
    [userId, customerName, customerEmail, customerPhone, transactionId, paymentReference, amountPaid, submitting],
  )

  async function onSubmit() {
    setError('')
    setToast(null)
    if (!db) {
      setError(firebaseHint || 'Secure Cloud Sync is not available right now.')
      return
    }
    if (!userId) {
      setToast({ tone: 'error', message: 'Please login first' })
      return
    }
    if (!customerName.trim()) return setError('Please enter Customer Name.')
    if (!customerEmail.trim()) return setError('Please enter Customer Email.')
    if (!customerPhone.trim()) return setError('Please enter Customer Phone.')
    if (!String(amountPaid).trim()) return setError('Please enter Amount Paid.')
    if (!transactionId.trim()) return setError('Please enter Transaction ID.')
    if (!paymentReference.trim()) return setError('Please enter Payment Reference.')

    setSubmitting(true)
    try {
      const payload = {
        userId,
        ownerId: userId,
        workspaceId: userId,
        createdBy: userId,
        userName: customerName.trim(),
        userEmail: customerEmail.trim(),
        userPhone: customerPhone.trim(),
        currentPlan: plan || 'Free',
        selectedPlan,
        requestedPlan: selectedPlan,
        billingCycle,
        planPrice,
        amountPaid: Number(amountPaid),
        currency,
        billingCurrency: currency,
        requestedDurationDays: 30,
        paymentMethod,
        paidToAccount,
        transactionId: transactionId.trim(),
        paymentReference: paymentReference.trim(),
        paymentNotes: paymentNotes.trim(),
        paymentStatus: 'pending',
        approvalStatus: 'pending',
        createdAt: serverTimestamp(),
        approvedAt: null,
        rejectedAt: null,
      }

      await addDoc(collection(db, 'upgradeRequests'), payload)
      setToast({ tone: 'success', message: 'Upgrade request submitted successfully' })

      setSubmitted(true)
    } catch (err) {
      const msg = clientSafeMessage(err, 'Unable to submit request.')
      setToast({ tone: 'error', message: msg })
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <motion.div className="nexora-bg" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="relative mx-auto min-h-screen max-w-[980px] p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link className="focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-300" to="/app/settings">
            Back to Settings
          </Link>
          <Badge variant={accessPlan === 'Business' ? 'success' : 'default'}>
            {accessPlan === 'Business' ? 'Business Access' : 'Free Plan'}
          </Badge>
        </div>

        <PageHeader
          title="Upgrade Plan"
          subtitle="Submit your payment details for secure plan approval."
          right={
            accessPlan === 'Business' && plan === 'Business' ? (
              <Button className="rounded-2xl" onClick={() => navigate('/app/dashboard')} type="button">
                Go to Dashboard
              </Button>
            ) : null
          }
        />

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Manual Approval Flow</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Pay for the Business plan, then submit your transaction details. Your workspace updates after account approval.
              </p>
            </div>
            <Badge variant="purple">NEXORA</Badge>
          </div>

          {accessPlan === 'Business' && plan === 'Business' ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Business is active</p>
              <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                Your account already has the Business plan. No action required.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="rounded-2xl" onClick={() => navigate('/app/dashboard')} type="button">
                  Go to Dashboard
                </Button>
                <Button variant="subtle" className="rounded-2xl" onClick={() => navigate('/app/settings')} type="button">
                  Back to Settings
                </Button>
              </div>
            </div>
          ) : pendingRequest || submitted ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Request submitted</p>
              <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                Approval status: <span className="font-semibold">pending</span>
                {pendingRequest?.selectedPlan ? (
                  <>
                    {' '}
                    for <span className="font-semibold">Business Plan</span>
                  </>
                ) : null}
                . Your plan will update after account approval.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="rounded-2xl" onClick={() => navigate('/app/settings')} type="button">
                  Back to Settings
                </Button>
                <Button variant="subtle" className="rounded-2xl" onClick={() => navigate('/app/dashboard')} type="button">
                  Back to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Name</label>
                <Input className="mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Email</label>
                <Input className="mt-1" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} type="email" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Phone</label>
                <Input className="mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. +92..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Selected Plan</label>
                <Input className="mt-1" value="Business Plan" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Billing Cycle</label>
                <Input className="mt-1" value="Monthly" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Plan Price</label>
                <Input className="mt-1" value={formatCurrency(planPrice, currency)} readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Amount Paid</label>
                <Input
                  className="mt-1"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`e.g. ${formatCurrency(planPrice, currency)}`}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Currency</label>
                <Input className="mt-1" value={currency} readOnly />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment method</label>
                <Select className="mt-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option>NayaPay</option>
                </Select>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  After payment, enter Transaction ID / Reference Number and submit for account approval.
                </p>
              </div>

              {paymentMethod === 'NayaPay' ? (
                <div className="glass-muted rounded-2xl p-4 lg:col-span-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">NayaPay Details</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Use any of the details below to pay, then submit your transaction info.
                  </p>
                  <div className="mt-3 space-y-2">
                    <PaymentDetailRow label="NayaPay ID" value="mehranshah01@nayapay" />
                    <PaymentDetailRow label="Account Number" value="03208601170" />
                    <PaymentDetailRow label="Raast ID" value="03208601170" />
                    <PaymentDetailRow label="IBAN" value="PK18NAYA1234503208601170" />
                  </div>
                </div>
              ) : null}

              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Paid To Account</label>
                <Select className="mt-1" value={paidToAccount} onChange={(e) => setPaidToAccount(e.target.value)}>
                  {nayapayAccounts.map((a) => (
                    <option key={a.key} value={a.value}>
                      {a.key}: {a.value}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Transaction ID</label>
                <Input className="mt-1" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. TXN-123456" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Enter the transaction ID from your payment receipt.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment Reference</label>
                <Input className="mt-1" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="e.g. REF-987654" />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment Notes</label>
                <textarea
                  className="focus-ring mt-1 h-24 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any extra notes for account verification (optional)…"
                />
              </div>
              {error ? (
                <div className="lg:col-span-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">
                  {error}
                </div>
              ) : null}
              <div className="lg:col-span-2 flex flex-wrap items-center gap-2">
                <Button className="rounded-2xl" disabled={!canSubmit} onClick={onSubmit} type="button">
                  {submitting ? 'Submitting...' : 'Submit upgrade request'}
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Plan updates happen only after account approval.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
      </motion.div>
    </>
  )
}
