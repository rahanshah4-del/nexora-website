import { useEffect, useMemo, useState } from 'react'
import NexoraLogo from '../../../components/brand/NexoraLogo.jsx'
import { labelForBusinessType } from '../../data/moduleAccess.js'

const messages = [
  'Loading your workspace...',
  'Connecting secure cloud...',
  'Preparing dashboard...',
  'Syncing your business data...',
  'Almost ready...',
]

const stageProgress = {
  auth: 20,
  workspace: 50,
  permissions: 75,
  dashboard: 100,
}

const stageLabels = {
  auth: 'Auth check',
  workspace: 'Workspace load',
  permissions: 'Permissions load',
  dashboard: 'Dashboard ready',
}

function normalizeBusinessType(value) {
  const text = String(value || '').toLowerCase()
  if (!text) return ''
  if (text.includes('school')) return 'School ERP'
  if (text.includes('retail') || text.includes('pos')) return 'Retail POS'
  if (text.includes('property')) return 'Property ERP'
  return 'General CRM'
}

export default function PageLoader({ stage = 'dashboard', businessType = '' }) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const selectedBusinessType = useMemo(() => normalizeBusinessType(businessType), [businessType])
  const targetProgress = stageProgress[stage] || stageProgress.workspace
  const stageLabel = stageLabels[stage] || stageLabels.workspace

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
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white">
      <style>{`
        @keyframes nexoraLoaderFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nexoraLoaderRing {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(226,232,240,0.58)),linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[length:auto,28px_28px,28px_28px] dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.82)),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)]" />

      <section className="relative w-full max-w-[21rem] overflow-hidden rounded-2xl border border-white/80 bg-white/[0.86] p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.58)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/82 sm:p-5" style={{ animation: 'nexoraLoaderFadeIn 420ms ease-out both' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-slate-950 shadow-sm dark:border-white/10 dark:bg-white">
            <div className="absolute inset-[-3px] rounded-[1.1rem] border border-sky-300/60 border-t-transparent" style={{ animation: 'nexoraLoaderRing 1100ms linear infinite' }} />
            <NexoraLogo compact hideText className="relative z-10" iconClassName="scale-[0.72]" />
          </div>
          <div className="min-w-0 text-left">
            <h1 className="truncate text-sm font-black tracking-tight text-slate-950 dark:text-white">Nexora Workspace</h1>
            <p className="mt-1 min-h-5 truncate text-xs font-semibold text-slate-500 transition-opacity dark:text-slate-300">{messages[messageIndex]}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200">{progress}%</span>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-300">
            <span>{stageLabel}</span>
            {selectedBusinessType ? <span className="truncate pl-3">{labelForBusinessType(selectedBusinessType)}</span> : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80 shadow-inner dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-400 shadow-[0_0_18px_rgba(14,165,233,0.36)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {selectedBusinessType ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Workspace</span>
            <span className="min-w-0 truncate text-xs font-bold text-slate-800 dark:text-slate-100">{labelForBusinessType(selectedBusinessType)}</span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
