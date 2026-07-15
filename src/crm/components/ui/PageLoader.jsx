import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import NexoraLogo from '../../../components/brand/NexoraLogo.jsx'
import { labelForBusinessType } from '../../data/moduleAccess.js'

const stageMessages = {
  auth: ['Checking your credentials...', 'Secure connection established...'],
  workspace: ['Loading your workspace...', 'Preparing business data...', 'Syncing workspace...'],
  permissions: ['Setting up permissions...', 'Loading modules...', 'Configuring access...'],
  dashboard: ['Preparing your dashboard...', 'Almost ready...', 'Loading business data...'],
}

const stageDefaults = ['Preparing your workspace...', 'Loading...', 'Almost ready...']

const stageLabels = {
  auth: 'Authenticating',
  workspace: 'Loading workspace',
  permissions: 'Configuring access',
  dashboard: 'Preparing dashboard',
}

function normalizeBusinessType(value) {
  const text = String(value || '').toLowerCase()
  if (!text) return ''
  if (text.includes('school')) return 'School ERP'
  if (text.includes('retail') || text.includes('pos')) return 'Retail POS'
  if (text.includes('property')) return 'Property ERP'
  return 'General CRM'
}

function cycleMessages(stage) {
  const list = stageMessages[stage] || stageDefaults
  return list[Math.floor(Math.random() * list.length)]
}

export default function PageLoader({ stage = 'dashboard', businessType = '' }) {
  const [message, setMessage] = useState(() => cycleMessages(stage))
  const selectedBusinessType = useMemo(() => normalizeBusinessType(businessType), [businessType])
  const stageLabel = stageLabels[stage] || stageLabels.dashboard

  useEffect(() => {
    setMessage(cycleMessages(stage))
  }, [stage])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessage(cycleMessages(stage))
    }, 2200)
    return () => window.clearInterval(timer)
  }, [stage])

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white">
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.6)),linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[length:auto,32px_32px,32px_32px] dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.97),rgba(15,23,42,0.85)),linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)]" />

      <motion.div
        key={stage}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-[22rem] overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/5 dark:bg-slate-950/80 sm:p-6"
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Top edge glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

        {/* Logo + Text row */}
        <div className="flex items-center gap-3">
          {/* Logo with Apple-style pulse ring */}
          <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-slate-950 shadow-sm dark:border-white/10 dark:bg-white">
            <div className="absolute inset-[-4px] rounded-[1.3rem] border-2 border-blue-400/40 border-t-transparent" style={{ animation: 'nexoraPulseRing 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <div className="absolute inset-[-2px] rounded-[1.15rem] bg-gradient-to-br from-blue-500/10 to-purple-600/10 opacity-0" style={{ animation: 'nexoraPulseGlow 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <NexoraLogo compact hideText className="relative z-10" iconClassName="scale-[0.72]" />
          </div>
          <div className="min-w-0 text-left">
            <h1 className="truncate text-sm font-bold tracking-tight text-slate-950 dark:text-white">Nexora Workspace</h1>
            <p className="mt-0.5 min-h-5 truncate text-xs font-medium text-slate-500 transition-opacity dark:text-slate-400">
              {message}
            </p>
          </div>
        </div>

        {/* Animated gradient progress bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            <span>{stageLabel}</span>
            {selectedBusinessType ? <span className="truncate pl-3">{labelForBusinessType(selectedBusinessType)}</span> : null}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-200/70 shadow-inner dark:bg-white/10">
            <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 shadow-[0_0_14px_rgba(99,102,241,0.3)]" style={{ animation: 'nexoraBarPulse 1.6s ease-in-out infinite, nexoraBarShimmer 2.4s linear infinite' }} />
          </div>
        </div>

        {/* Workspace badge */}
        {selectedBusinessType ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 dark:border-white/[0.07] dark:bg-white/[0.04]">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Workspace</span>
            <span className="min-w-0 truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200">{labelForBusinessType(selectedBusinessType)}</span>
          </div>
        ) : null}
      </motion.div>

      <style>{`
        @keyframes nexoraPulseRing {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes nexoraPulseGlow {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes nexoraBarPulse {
          0%, 100% { transform: scaleX(0.3); }
          50% { transform: scaleX(0.7); }
        }
        @keyframes nexoraBarShimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  )
}
