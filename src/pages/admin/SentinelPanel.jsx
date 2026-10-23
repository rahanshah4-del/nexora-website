import { useCallback, useEffect, useState } from 'react'
import { getSentinelStatus, runSentinelNow, sendSentinelTestEmail } from '../../lib/sentinelAdmin.js'
import { Button, Card, Notice, Panel, Pill, StatCard } from './GeoLintUi.jsx'

const OVERALL = {
  healthy: { tone: 'emerald', label: 'All systems working' },
  degraded: { tone: 'amber', label: 'Something is slow or flickering' },
  down: { tone: 'rose', label: 'Problem: something is down' },
  unknown: { tone: 'slate', label: 'Waiting for the first check' },
}

const ago = (ms, now) => {
  if (!ms) return 'never'
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 90) return `${s}s ago`
  if (s < 5400) return `${Math.round(s / 60)} min ago`
  if (s < 129600) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

const uptime = (history = []) => (history.length ? Math.round((history.filter(Boolean).length / history.length) * 100) : null)

function Dots({ history = [] }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {history.slice(-20).map((h, i) => <span key={i} className={`h-3 w-1.5 rounded-sm ${h ? 'bg-emerald-400' : 'bg-rose-500'}`} />)}
    </span>
  )
}

/** Platform watchdog: live checks, incidents, auto-fix log and browser errors, from nexora-sentinel. */
export default function SentinelPanel() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(0)

  const load = useCallback(async () => {
    try { const next = await getSentinelStatus(); setData(next); setNow(Date.now()); setError('') } catch (e) { setError(e.message) }
  }, [])
  useEffect(() => {
    const first = setTimeout(load, 0)
    // Poll only while the tab is visible: each status call costs KV reads.
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 60000)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [load])

  const act = async (fn, okText) => {
    setBusy(true); setNote('')
    try { await fn(); setNote(okText); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (error && !data) return <Notice tone="rose">{error}</Notice>
  if (!data) return <Notice tone="slate">Loading Sentinel…</Notice>

  const overall = OVERALL[data.overall] || OVERALL.unknown
  const stale = data.lastRunAt && now - data.lastRunAt > 25 * 60000
  const open = data.incidents.filter((i) => !i.resolvedAt)
  const groups = [...new Set(data.checks.map((c) => c.group))]
  const caps = data.capabilities || {}

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">Platform Sentinel <Pill tone={overall.tone}>{overall.label}</Pill></p>
          <p className="text-sm text-slate-500">Checks every 5 minutes; while all is well the result is saved every 15 minutes. Last saved check {ago(data.lastRunAt, now)}. Alerts go to {caps.alertTo || 'the owner'} only when something stays broken.</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => act(runSentinelNow, 'Checked just now.')}>{busy ? 'Working…' : 'Check now'}</Button>
          <Button disabled={busy} onClick={() => act(sendSentinelTestEmail, `Test email sent to ${caps.alertTo || 'you'}.`)}>Send test email</Button>
        </div>
      </div>

      {error ? <Notice tone="rose">{error}</Notice> : null}
      {note ? <Notice tone="emerald">{note}</Notice> : null}
      {stale ? <Notice tone="rose">The Sentinel has not saved a check for over 25 minutes. Open the Cloudflare dashboard, Workers, nexora-sentinel, and check its cron trigger.</Notice> : null}
      {data.probeFails ? <Notice tone="amber">The Sentinel could not reach anything in its last {data.probeFails} run(s), Google included. That points to a network problem on the monitoring side; your site may be fine.</Notice> : null}
      {data.outbox ? <Notice tone="amber">{data.outbox} alert email(s) are waiting to be re-sent.</Notice> : null}
      {data.lastMailError ? <Notice tone="amber">The last alert email failed: {data.lastMailError}. Alerts cannot reach you until this is fixed (see workers/nexora-sentinel/README.md).</Notice> : null}
      {!caps.email ? <Notice tone="amber">Email alerts are not set up yet: the send_email binding is missing on the Sentinel.</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open problems" value={open.length} />
        <StatCard label="Checks passing" value={`${data.checks.filter((c) => c.ok).length} / ${data.checks.length}`} />
        <StatCard label="Recent auto-fix attempts" value={data.fixLog.length} />
        <StatCard label="Browser errors (3 days, approx.)" value={data.errors.reduce((n, e) => n + (e.count || 0), 0)} />
      </div>

      {open.length ? (
        <Panel title="Open problems">
          <ul className="space-y-2">
            {open.map((i) => (
              <li key={i.id} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm">
                <p className="font-black text-rose-900">{i.label} <span className="font-semibold text-rose-700">({i.group})</span></p>
                <p className="text-rose-800">{i.flapping ? 'Keeps failing on and off' : 'Down'} since {ago(i.openedAt, now)}: {i.lastError}</p>
                <p className="text-xs text-rose-700">
                  {i.fixes?.length ? `Auto-fix tried: ${i.fixes.join('; ')}. ` : 'No automatic fix exists for this one. '}
                  {i.mailed === false ? 'The alert email has NOT reached you yet (being retried).' : i.mailed ? 'You were emailed.' : ''}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {groups.map((group) => (
        <Panel key={group} title={group}>
          <ul className="divide-y divide-slate-100">
            {data.checks.filter((c) => c.group === group).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-bold text-slate-900">{c.label}</span>
                <span className="flex items-center gap-3 text-xs text-slate-500">
                  <Dots history={c.history} />
                  {uptime(c.history) !== null ? <span>{uptime(c.history)}% up</span> : null}
                  {c.ms ? <span>{c.ms} ms</span> : null}
                  <Pill tone={c.ok ? (c.slow ? 'amber' : 'emerald') : 'rose'}>{c.ok ? (c.slow ? 'Slow' : 'OK') : 'Failing'}</Pill>
                </span>
                {!c.ok ? <p className="w-full text-xs font-semibold text-rose-700">{c.error}</p> : null}
              </li>
            ))}
          </ul>
        </Panel>
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Auto-fix log">
          {data.fixLog.length ? (
            <ul className="space-y-2 text-sm">
              {data.fixLog.map((f, i) => (
                <li key={i}>
                  <p className="font-bold text-slate-900">{f.label} <Pill tone={f.recovered ? 'emerald' : 'amber'}>{f.recovered ? 'Fixed' : 'Not fixed'}</Pill> <span className="text-xs font-normal text-slate-500">{ago(f.at, now)}</span></p>
                  <p className="text-xs text-slate-600">{f.actions.join('; ')}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Nothing needed fixing yet.</p>}
          <p className="mt-3 text-xs text-slate-500">
            Cache purge: {caps.purgeCache ? 'on' : 'off (add CF_API_TOKEN and CF_ZONE_ID)'} · Site rebuild: {caps.redeploy ? 'on' : 'off (add DEPLOY_HOOK)'}
          </p>
        </Panel>
        <Panel title="Errors visitors hit in their browser">
          {data.errors.length ? (
            <ul className="space-y-2 text-sm">
              {data.errors.map((e) => (
                <li key={e.fp}>
                  <p className="font-bold text-slate-900">{e.message}</p>
                  <p className="text-xs text-slate-500">{e.page} · {e.count}× from {e.reporters || 0} visitor(s) · last {ago(e.last, now)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No browser errors reported. 🎉</p>}
        </Panel>
      </div>

      <Card className="p-4">
        <p className="text-sm font-black text-slate-950">Recent history</p>
        {data.incidents.length ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {data.incidents.slice(0, 10).map((i) => (
              <li key={i.id}>{i.label}: {i.resolvedAt ? `down ${Math.max(1, Math.round((i.resolvedAt - i.openedAt) / 60000))} min, recovered ${ago(i.resolvedAt, now)}` : 'still down'}</li>
            ))}
          </ul>
        ) : <p className="mt-1 text-sm text-slate-500">No incidents recorded.</p>}
      </Card>
    </div>
  )
}
