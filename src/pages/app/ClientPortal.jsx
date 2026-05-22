import { useMemo } from 'react'
import { useCollectionData } from '../../lib/useCollectionData.js'

export default function ClientPortal() {
  const { items: portals, loading, error } = useCollectionData('clientPortals', { limitCount: 12 })

  const empty = !loading && portals.length === 0
  const displayItems = useMemo(() => portals.slice(0, 6), [portals])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Client Portal</h1>
            <p className="mt-2 text-sm text-slate-300">
              Manage client access, portal invitations, and workspace activity for your business customers.
            </p>
          </div>
          <div className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Loading...' : `${portals.length} portals`}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading client portals…</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Failed to load client portals.</div>
        ) : empty ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
            <h2 className="text-lg font-semibold text-white">No client portals found</h2>
            <p className="mt-2 text-sm text-slate-400">
              Invite your first client to the portal. Portal activity will appear here once clients are onboarded.
            </p>
          </div>
        ) : (
          displayItems.map((portal) => (
            <div key={portal.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{portal.name || 'Untitled portal'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{portal.clientEmail || 'No email provided'}</p>
                </div>
                <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  {portal.status || 'Invited'}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-950/50 p-3 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Access level</p>
                  <p className="mt-2 font-semibold text-white">{portal.accessLevel || 'Standard'}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/50 p-3 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Created</p>
                  <p className="mt-2 font-semibold text-white">{portal.createdAt || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/50 p-3 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Pending actions</p>
                  <p className="mt-2 font-semibold text-white">{portal.pendingActions ?? 0}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
