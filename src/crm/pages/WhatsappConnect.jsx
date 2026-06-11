import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineArrowRight,
  HiOutlineBolt,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCog6Tooth,
  HiOutlineDevicePhoneMobile,
  HiOutlineExclamationTriangle,
  HiOutlineInbox,
  HiOutlineQrCode,
  HiOutlineServerStack,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUsers,
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useUser } from '../hooks/useUser.js'
import { useWhatsappSettings } from '../hooks/useWhatsappSettings.js'
import { useWhatsappWorkerStatus } from '../hooks/useWhatsappWorkerStatus.js'
import WhatsappConnectPricing from '../components/whatsapp/WhatsappConnectPricing.jsx'
import { startEmbeddedSignup, isEmbeddedSignupConfigured } from '../lib/metaEmbeddedSignup.js'
import {
  exchangeConnection,
  webhookUrlForWorkspace,
  defaultVerifyTokenLabel,
  isWorkerConfigured,
} from '../lib/whatsappConnect.js'

const STEPS = [
  { id: 1, label: 'Overview' },
  { id: 2, label: 'Method' },
  { id: 3, label: 'Connect' },
  { id: 4, label: 'Done' },
]

const VERIFICATION_COPY = {
  idle: { label: 'Ready', variant: 'default', text: 'Start Meta setup to begin.' },
  waiting: { label: 'Waiting for Meta', variant: 'info', text: 'Opening the secure Meta setup window…' },
  qr_pending: { label: 'QR Displayed', variant: 'info', text: 'Meta is showing a QR / verification code. Scan or confirm it from your WhatsApp Business App.' },
  code_pending: { label: 'Verification Pending', variant: 'warning', text: 'Confirm the code shown by Meta inside your WhatsApp Business App.' },
  verified: { label: 'Verified', variant: 'success', text: 'Meta confirmed your number. Finishing up…' },
  connected: { label: 'Connected', variant: 'success', text: 'Your WhatsApp Business Account is connected.' },
  failed: { label: 'Failed', variant: 'danger', text: 'Meta setup did not complete. You can retry or use Manual Advanced Setup.' },
}

function StepIndicator({ current }) {
  return (
    <ol className="flex w-full items-center gap-2 sm:gap-3">
      {STEPS.map((step, index) => {
        const done = current > step.id
        const active = current === step.id
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  done
                    ? 'bg-emerald-600 text-white'
                    : active
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {done ? <HiOutlineCheckCircle className="h-5 w-5" /> : step.id}
              </span>
              <span className={`hidden truncate text-xs font-semibold sm:inline ${active || done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <span className={`h-0.5 flex-1 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function FeatureItem({ icon: Icon, title, detail }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-100/70 bg-emerald-50/40 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        {detail ? <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p> : null}
      </div>
    </div>
  )
}

function CopyField({ label, value, hint }) {
  const [copied, setCopied] = useState(false)
  const canCopy = Boolean(value)

  async function copy() {
    if (!canCopy) return
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</span>
        <button
          type="button"
          onClick={copy}
          disabled={!canCopy}
          className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          {copied ? <HiOutlineClipboardDocumentCheck className="h-4 w-4" /> : <HiOutlineClipboardDocument className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-1 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
        {value || hint || '—'}
      </p>
    </div>
  )
}

function WorkerStatusCard({ status, onRefresh }) {
  const { loading, online, configured, url } = status
  const label = loading ? 'Checking…' : !configured ? 'Not Configured' : online ? 'Worker Online' : 'Worker Offline'
  const variant = loading ? 'info' : online ? 'success' : configured ? 'danger' : 'warning'
  const dotClass = loading ? 'bg-sky-400 animate-pulse' : online ? 'bg-emerald-500' : configured ? 'bg-rose-500' : 'bg-amber-500'

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          <HiOutlineServerStack className="h-4 w-4" /> Worker status
        </span>
        <Badge variant={variant}>
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${dotClass}`} /> {label}
        </Badge>
      </div>
      <p className="mt-2 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">{url || 'Set VITE_WHATSAPP_WORKER_URL'}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        {loading
          ? 'Pinging the deployed worker…'
          : online
            ? 'Worker reachable — connection requests will be processed.'
            : configured
              ? 'Worker not reachable right now. Your connection will be saved as pending verification.'
              : 'Worker URL is not configured for this build.'}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="focus-ring mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
      >
        <HiOutlineArrowPath className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Re-check
      </button>
    </div>
  )
}

function ResultRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`min-w-0 truncate text-right font-semibold ${ok ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{value || '—'}</span>
    </div>
  )
}

// Connect WhatsApp wizard — Meta Embedded Signup / Coexistence flow.
// Premium WhatsApp Business onboarding. No Meta tokens are ever handled in the
// browser; the auth code is exchanged server-side by the Nexora worker and only
// non-secret connection metadata is persisted (workspace-isolated) in Firestore.
export default function WhatsappConnectPage() {
  const navigate = useNavigate()
  const { workspaceId, firebaseUser } = useUser()
  const { config, loading, canManage, saveConnection, saveEmbeddedConnection, resetConnectionStatus } = useWhatsappSettings({ enabled: true })

  const alreadyConnected = Boolean(config.connectedNumber || config.phoneNumberId || config.businessAccountId)
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState('embedded')
  const [verification, setVerification] = useState('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState({ displayName: '', connectedNumber: '', phoneNumberId: '', businessAccountId: '' })
  const [prefilled, setPrefilled] = useState(false)

  const embeddedConfigured = isEmbeddedSignupConfigured()
  const workerConfigured = isWorkerConfigured()
  const workerStatus = useWhatsappWorkerStatus({ enabled: true })
  const webhookUrl = useMemo(() => webhookUrlForWorkspace(workspaceId), [workspaceId])
  const verifyTokenLabel = useMemo(() => config.webhookVerifyLabel || defaultVerifyTokenLabel(workspaceId), [config.webhookVerifyLabel, workspaceId])

  // Pre-fill the manual form once from any existing connection so editing is
  // easy. This is the React-recommended "adjust state during render" pattern —
  // it runs only until the first time config data is available.
  if (!prefilled && (config.phoneNumberId || config.businessAccountId || config.displayName || config.connectedNumber)) {
    setPrefilled(true)
    setManual({
      displayName: config.displayName || config.businessName || '',
      connectedNumber: config.connectedNumber || '',
      phoneNumberId: config.phoneNumberId || '',
      businessAccountId: config.businessAccountId || '',
    })
  }

  const status = VERIFICATION_COPY[verification] || VERIFICATION_COPY.idle

  function goTo(next) {
    setError('')
    setStep(next)
  }

  async function handleStartEmbedded() {
    if (!canManage) return
    setError('')
    setBusy(true)
    setVerification('waiting')

    const result = await startEmbeddedSignup({ onStatus: setVerification })
    if (!result.ok) {
      setBusy(false)
      setVerification('failed')
      if (result.sdkUnavailable) {
        setError('Meta setup is unavailable right now. Use Manual Advanced Setup instead.')
        setMethod('manual')
      } else if (result.cancelled) {
        setError('Meta setup was cancelled. You can try again.')
      } else {
        setError(result.error || 'Meta setup did not complete.')
      }
      return
    }

    // Forward the short-lived auth code + ids to the Nexora worker for the secure
    // exchange. If the worker is not ready, we still persist a safe pending record.
    const exchange = await exchangeConnection({
      firebaseUser,
      workspaceId,
      phoneNumberId: result.phoneNumberId,
      wabaId: result.wabaId,
      businessName: result.businessName,
      displayName: result.businessName,
      code: result.code,
    })

    // A successful Embedded Signup callback returned the phone_number_id + waba_id,
    // so the WhatsApp Business Account is connected. Webhook verification continues
    // in the background; the access token (if any) stays server-side only.
    const save = await saveEmbeddedConnection({
      connectedNumber: '',
      displayName: result.businessName,
      businessName: result.businessName,
      phoneNumberId: exchange.ok ? exchange.phoneNumberId : result.phoneNumberId,
      businessAccountId: exchange.ok ? exchange.businessAccountId : result.wabaId,
      webhookUrl,
      webhookVerifyLabel: verifyTokenLabel,
      connectionStatus: 'connected',
      verificationStatus: 'verified',
      webhookStatus: exchange.ok ? exchange.webhookStatus : 'pending',
    })

    setBusy(false)
    if (!save.ok) {
      setVerification('failed')
      setError(save.error || 'Could not save the WhatsApp connection.')
      return
    }
    setVerification('connected')
    goTo(4)
  }

  async function handleManualSave() {
    if (!canManage) return
    setError('')
    setBusy(true)
    const res = await saveConnection({
      displayName: manual.displayName,
      connectedNumber: manual.connectedNumber,
      phoneNumberId: manual.phoneNumberId,
      businessAccountId: manual.businessAccountId,
      webhookVerifyLabel: verifyTokenLabel,
    })
    setBusy(false)
    if (!res?.ok) {
      setError(res?.error || 'Could not save WhatsApp details.')
      return
    }
    goTo(4)
  }

  async function handleRetry() {
    setError('')
    setVerification('idle')
    await resetConnectionStatus()
    goTo(2)
  }

  function updateManual(key, value) {
    setManual((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="crm-dashboard-page min-w-0">
      <PageHeader
        title="Connect WhatsApp Business"
        subtitle="Securely link your existing WhatsApp Business number through Meta and sync conversations into your Nexora inbox."
        right={
          <Badge variant={alreadyConnected ? 'success' : 'default'}>
            {alreadyConnected ? (config.connectionStatus === 'connected' ? 'Connected' : 'Pending Verification') : 'Not Connected'}
          </Badge>
        }
      />

      <Card className="p-5 sm:p-6">
        <StepIndicator current={step} />

        {!canManage ? (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            You have view access only. Ask a workspace administrator to connect WhatsApp.
          </div>
        ) : null}

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {/* STEP 1 — Welcome / Overview */}
          {step === 1 ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_12px_30px_-12px_rgba(16,185,129,0.6)]">
                  <HiOutlineChatBubbleLeftRight className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Bring WhatsApp into Nexora</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Keep using your WhatsApp Business App — Nexora syncs alongside it.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FeatureItem icon={HiOutlineDevicePhoneMobile} title="Connect your WhatsApp Business App" detail="Use your existing number — no new SIM or number required." />
                <FeatureItem icon={HiOutlineChatBubbleLeftRight} title="Keep using WhatsApp Business App" detail="Coexistence keeps your phone app working as normal." />
                <FeatureItem icon={HiOutlineInbox} title="Sync messages into Nexora Inbox" detail="Conversations flow into your CRM inbox automatically." />
                <FeatureItem icon={HiOutlineUsers} title="Multi-agent ready" detail="Your whole team can reply from one shared workspace." />
                <FeatureItem icon={HiOutlineShieldCheck} title="Secure Meta Business Platform integration" detail="Tokens stay on Nexora's secure backend — never in your browser." />
                <FeatureItem icon={HiOutlineBolt} title="Fast guided setup" detail="A few clicks through Meta's official Embedded Signup." />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to="/app/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400">
                  Back to dashboard
                </Link>
                <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" type="button" disabled={!canManage} onClick={() => goTo(2)}>
                  Get Started <HiOutlineArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* STEP 2 — Choose Connection Method */}
          {step === 2 ? (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Choose a connection method</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMethod('embedded')}
                  className={`focus-ring rounded-2xl border p-4 text-left transition ${
                    method === 'embedded'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30'
                      : 'border-slate-200 hover:border-emerald-300 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                      <HiOutlineSparkles className="h-5 w-5" />
                    </span>
                    <Badge variant="success">Recommended</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Connect with Meta Embedded Signup</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Guided, official flow. Select your number, scan the QR / confirm the code in WhatsApp Business App, done.
                  </p>
                  {!embeddedConfigured ? (
                    <p className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Meta App not configured yet — Manual setup available below.</p>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('manual')}
                  className={`focus-ring rounded-2xl border p-4 text-left transition ${
                    method === 'manual'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30'
                      : 'border-slate-200 hover:border-emerald-300 dark:border-slate-700'
                  }`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <HiOutlineCog6Tooth className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Manual Advanced Setup</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Already have your Phone Number ID and WhatsApp Business Account (WABA) ID from Meta? Enter them directly.
                  </p>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => goTo(1)}>
                  <HiOutlineArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                  type="button"
                  disabled={!canManage || (method === 'embedded' && !embeddedConfigured)}
                  onClick={() => goTo(3)}
                >
                  Continue <HiOutlineArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* STEP 3 — Embedded Signup OR Manual */}
          {step === 3 && method === 'embedded' ? (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Embedded Signup</h2>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">1 · Start the secure Meta setup</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    A Meta window opens where you select or enter your existing WhatsApp Business number.
                  </p>
                  <Button
                    className="mt-3 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                    type="button"
                    disabled={!canManage || busy || !embeddedConfigured}
                    onClick={handleStartEmbedded}
                  >
                    {busy ? 'Opening Meta…' : 'Start Meta Setup'}
                  </Button>
                  {!workerConfigured ? (
                    <p className="mt-2 text-[11px] leading-4 text-amber-700 dark:text-amber-300">
                      Backend worker URL not configured — the connection will be saved as pending verification.
                    </p>
                  ) : null}
                </div>

                <div className="grid place-items-center rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="grid h-28 w-28 place-items-center rounded-2xl border-2 border-dashed border-emerald-300 bg-white text-emerald-400 dark:bg-slate-900">
                    {verification === 'connected' || verification === 'verified' ? (
                      <HiOutlineCheckCircle className="h-12 w-12 text-emerald-500" />
                    ) : (
                      <HiOutlineQrCode className="h-12 w-12" />
                    )}
                  </div>
                  <p className="mt-3 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Use your WhatsApp Business App to scan or confirm the code shown by Meta.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Connection status</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{status.text}</p>
                </div>
                <WorkerStatusCard status={workerStatus} onRefresh={workerStatus.refresh} />
              </div>

              {error ? (
                <p className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => goTo(2)}>
                  <HiOutlineArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button variant="ghost" className="rounded-2xl text-emerald-700" type="button" onClick={() => setMethod('manual')}>
                  Use Manual Advanced Setup
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 && method === 'manual' ? (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Manual Advanced Setup</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enter the values from your Meta WhatsApp Manager. The access token is configured securely on Nexora's backend — never here.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">WhatsApp Business Display Name</span>
                  <Input value={manual.displayName} onChange={(e) => updateManual('displayName', e.target.value)} placeholder="e.g. Nexora Support" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Business Phone Number</span>
                  <Input value={manual.connectedNumber} onChange={(e) => updateManual('connectedNumber', e.target.value)} placeholder="e.g. 92300..." />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Meta Phone Number ID</span>
                  <Input value={manual.phoneNumberId} onChange={(e) => updateManual('phoneNumberId', e.target.value)} placeholder="From WhatsApp Manager" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">WhatsApp Business Account ID</span>
                  <Input value={manual.businessAccountId} onChange={(e) => updateManual('businessAccountId', e.target.value)} placeholder="WABA ID" />
                </label>
              </div>

              <WorkerStatusCard status={workerStatus} onRefresh={workerStatus.refresh} />

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-xs leading-5 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                Access token will be configured securely from the Nexora backend. Secrets are never stored in the browser or Firestore.
              </div>

              {error ? (
                <p className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => goTo(2)}>
                  <HiOutlineArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" type="button" disabled={!canManage || busy} onClick={handleManualSave}>
                  {busy ? 'Saving…' : 'Save & Continue'}
                </Button>
              </div>
            </div>
          ) : null}

          {/* STEP 4 — Result */}
          {step === 4 ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
                  <HiOutlineCheckCircle className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {config.connectionStatus === 'connected' ? 'WhatsApp Business connected' : 'WhatsApp Business saved — pending verification'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {config.connectionStatus === 'connected'
                      ? 'Messages will start syncing into your Nexora inbox.'
                      : 'Nexora is verifying your webhook with Meta. Status updates automatically.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Connection details</p>
                  <ResultRow label="Business Name" value={config.businessName || config.displayName} ok={Boolean(config.businessName || config.displayName)} />
                  <ResultRow label="Connected Number" value={config.connectedNumber} ok={Boolean(config.connectedNumber)} />
                  <ResultRow label="Phone Number ID" value={config.phoneNumberId} ok={Boolean(config.phoneNumberId)} />
                  <ResultRow label="Business Account ID" value={config.businessAccountId} ok={Boolean(config.businessAccountId)} />
                  <ResultRow label="Webhook Status" value={config.webhookStatus ? config.webhookStatus.replace(/_/g, ' ') : (config.webhookVerified ? 'Verified' : 'Pending')} ok={Boolean(config.webhookVerified)} />
                  <ResultRow label="Connection" value={(config.connectionStatus || 'pending_verification').replace(/_/g, ' ')} ok={config.connectionStatus === 'connected'} />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Meta webhook setup</p>
                    <Badge variant={workerStatus.loading ? 'info' : workerStatus.online ? 'success' : workerStatus.configured ? 'danger' : 'warning'}>
                      {workerStatus.loading ? 'Checking…' : workerStatus.online ? 'Worker Reachable' : workerStatus.configured ? 'Worker Not Reachable' : 'Not Configured'}
                    </Badge>
                  </div>
                  <CopyField label="Webhook Callback URL" value={webhookUrl} hint="Configure VITE_WHATSAPP_WORKER_URL" />
                  <CopyField label="Verify Token (reference)" value={verifyTokenLabel} hint="Set the real token in the worker" />
                  <p className="text-[11px] leading-4 text-slate-400">
                    Paste the callback URL and the matching verify token into Meta → WhatsApp → Configuration. The real verify token lives only in the Nexora worker.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={handleRetry}>
                  Reconnect
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => navigate('/app/settings')}>
                    Open Settings
                  </Button>
                  <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" type="button" onClick={() => navigate('/app/whatsapp-inbox')}>
                    <HiOutlineInbox className="h-4 w-4" /> Open WhatsApp Inbox
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>

        {loading ? <p className="mt-4 text-xs text-slate-400">Loading WhatsApp settings…</p> : null}
      </Card>

      <WhatsappConnectPricing />
    </div>
  )
}
