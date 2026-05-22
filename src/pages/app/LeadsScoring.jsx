import { useMemo } from 'react'
import { useCollectionData } from '../../lib/useCollectionData.js'

export default function LeadsScoring() {
  const { items: leads, loading, error } = useCollectionData('leadScores', { orderByField: 'score', direction: 'desc', limitCount: 12 })
  const topLeads = useMemo(() => leads.slice(0, 6), [leads])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">AI Lead Scoring</h1>
            <p className="mt-2 text-sm text-slate-300">
              Automatically rank new leads by intent, close probability, and revenue potential.
            </p>
          </div>
          <div className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Analyzing...' : `${leads.length} leads scored`}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading lead scores…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to fetch lead scores.</div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No scored leads yet</h2>
          <p className="mt-2 text-sm text-slate-400">Capture leads from forms, chat, or campaigns to start scoring automatically.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {topLeads.map((lead) => (
            <div key={lead.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{lead.name || 'Unknown lead'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{lead.company || 'No company'}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                  {lead.score ?? 0}%
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>Stage: <span className="font-semibold text-white">{lead.stage || 'Discovery'}</span></p>
                <p>Priority: <span className="font-semibold text-white">{lead.priority || 'Medium'}</span></p>
                <p>Next action: <span className="font-semibold text-white">{lead.nextAction || 'Follow up with email'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
