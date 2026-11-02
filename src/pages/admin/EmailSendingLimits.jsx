import { useEffect, useState } from 'react'
import { HiOutlineArrowPath } from 'react-icons/hi2'
import { getEmailUsage } from '../../lib/emailInbox.js'

const REFRESH_MS = 5 * 60 * 1000

function Bar({ label, used, limit }) {
  const hasLimit = Number.isFinite(limit) && limit > 0
  const pct = hasLimit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const left = hasLimit ? Math.max(0, limit - used) : null
  const tone = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11px] font-bold uppercase text-slate-400">
        <span>{label}</span>
        <span className="normal-case text-slate-600">{used}{hasLimit ? ` / ${limit}` : ''}{hasLimit ? ` · ${left} left` : ' sent'}</span>
      </div>
      {hasLimit ? <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} /></div> : null}
    </div>
  )
}

function ProviderCard({ provider }) {
  const { today, month, limits, reported, configured } = provider
  // Resend's own numbers (from its response headers) cover the whole account, so prefer them when we have them.
  const dailyUsed = reported?.dailyUsed ?? today.sent
  const monthlyUsed = reported?.monthlyUsed ?? month.sent
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-black text-slate-900">{provider.name}</span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">{provider.role}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${configured ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{configured ? 'Connected' : 'Not set up'}</span>
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Bar label="Today" used={dailyUsed} limit={limits.daily} />
        <Bar label="This month" used={monthlyUsed} limit={limits.monthly} />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {today.failed || month.failed ? `Failed: ${today.failed} today, ${month.failed} this month. ` : ''}
        {reported ? `Resend reported these at ${new Date(reported.seenAt).toLocaleTimeString()}.` : provider.id === 'cloudflare' ? 'Daily quota: see Cloudflare dashboard (Email Service).' : 'Counted from mail sent here.'}
      </p>
    </div>
  )
}

export default function EmailSendingLimits() {
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setUsage(await getEmailUsage())
      setError('')
    } catch (e) {
      setError(e?.message || 'Could not load sending limits.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Sending limits</h3>
        <button type="button" title="Refresh" onClick={load} disabled={loading} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <HiOutlineArrowPath className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {usage ? (
        <>
          <div className="grid gap-3 lg:grid-cols-2">{usage.providers.map((p) => <ProviderCard key={p.id} provider={p} />)}</div>
          {usage.note ? <p className="mt-2 text-[11px] text-slate-400">{usage.note}</p> : null}
        </>
      ) : !error ? <p className="text-xs text-slate-400">Loading…</p> : null}
    </div>
  )
}
