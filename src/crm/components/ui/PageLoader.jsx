import { useEffect, useMemo, useState } from 'react'
import NexoraLogo from '../../../components/brand/NexoraLogo.jsx'

const messages = [
  'Loading your workspace...',
  'Connecting secure cloud...',
  'Preparing dashboard...',
  'Syncing your business data...',
  'Almost ready...',
]

const businessTypes = ['General CRM', 'School ERP', 'Retail POS', 'Property ERP']

const stageProgress = {
  auth: 20,
  workspace: 50,
  permissions: 75,
  dashboard: 100,
}

function normalizeBusinessType(value) {
  const text = String(value || '').toLowerCase()
  if (text.includes('school')) return 'School ERP'
  if (text.includes('retail') || text.includes('pos')) return 'Retail POS'
  if (text.includes('property')) return 'Property ERP'
  return 'General CRM'
}

export default function PageLoader({ stage = 'dashboard', businessType = 'General CRM' }) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const selectedBusinessType = useMemo(() => normalizeBusinessType(businessType), [businessType])
  const targetProgress = stageProgress[stage] || stageProgress.workspace

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const startProgress = progress
    const nextProgress = Math.max(startProgress, Math.min(targetProgress, 100))
    const duration = Math.min(2400, Math.max(500, (nextProgress - startProgress) * 24))
    const startedAt = window.performance.now()
    let frameId = 0

    function tick(now) {
      const elapsed = now - startedAt
      const ratio = duration > 0 ? Math.min(elapsed / duration, 1) : 1
      const eased = 1 - Math.pow(1 - ratio, 3)
      setProgress(Math.round(startProgress + (nextProgress - startProgress) * eased))
      if (ratio < 1) frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  // Intentionally depend on target only; each real init stage advances the loader.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProgress])

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
      <style>{`
        @keyframes nexoraLoaderFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(124,58,237,0.16),transparent_28%)] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(124,58,237,0.16),transparent_30%)]" />
      <div className="pointer-events-none absolute h-56 w-56 animate-pulse rounded-full bg-sky-400/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/75 p-6 text-center shadow-[0_28px_90px_-48px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-8" style={{ animation: 'nexoraLoaderFadeIn 500ms ease-out both' }}>
        <div className="mx-auto flex justify-center">
          <div className="rounded-[2rem] bg-sky-400/10 p-3 shadow-[0_0_42px_rgba(56,189,248,0.36)]">
            <NexoraLogo compact hideText className="animate-pulse" iconClassName="scale-95" />
          </div>
        </div>

        <h1 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-white">Nexora Workspace</h1>
        <p className="mt-2 min-h-6 text-sm font-semibold text-slate-600 transition-opacity dark:text-slate-300">{messages[messageIndex]}</p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-300">
            <span>{stage === 'auth' ? 'Auth check' : stage === 'workspace' ? 'Workspace load' : stage === 'permissions' ? 'Permissions load' : 'Dashboard ready'}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200/80 shadow-inner dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 shadow-[0_0_22px_rgba(37,99,235,0.42)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Selected workspace</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {businessTypes.map((type) => (
              <div
                key={type}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  type === selectedBusinessType
                    ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                }`}
              >
                {type}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
