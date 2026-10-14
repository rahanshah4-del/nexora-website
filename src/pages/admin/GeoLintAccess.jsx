import { useCallback, useEffect, useState } from 'react'
import { actOnClient, getAccessConfig, listAccessClients, listAccessEvents, saveAccessConfig } from '../../lib/geolint.js'
import { BLOCK_DURATIONS, EVENT_LABELS, EXTRA_PAGE_PRESETS, blockPayload, clientBadge, grantPayload, isIpAddress, parseHosts, usedPercent } from '../../lib/geolintAccess.js'
import { timeLabel } from '../../lib/geolintUi.js'
import { Button, Notice, Panel, Pill } from './GeoLintUi.jsx'

const FILTERS = [['all', 'All'], ['blocked', 'Blocked'], ['limited', 'Out of pages'], ['exempt', 'No limit']]
const input = 'min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100'

function Field({ label, hint, children }) {
  return <label className="block text-xs font-black text-slate-600">{label}<span className="mt-1 block">{children}</span>{hint ? <span className="mt-1 block text-[11px] font-semibold text-slate-400">{hint}</span> : null}</label>
}

function Settings({ config, onSaved, onError }) {
  const [limit, setLimit] = useState(String(config.dailyPageLimit))
  const [hours, setHours] = useState(String(config.windowHours))
  const [enabled, setEnabled] = useState(config.siteAuditEnabled)
  const [hosts, setHosts] = useState(config.blockedHosts.join('\n'))
  const [saving, setSaving] = useState(false)
  const parsed = parseHosts(hosts)

  async function save() {
    if (parsed.invalid.length) return onError(`Not a website name: ${parsed.invalid.join(', ')}`)
    setSaving(true)
    try {
      onSaved(await saveAccessConfig({ dailyPageLimit: Number(limit), windowHours: Number(hours), siteAuditEnabled: enabled, blockedHosts: parsed.hosts }))
    } catch (err) {
      onError(err?.message || 'Could not save the settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="Limits and switches" action={<Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Pages per client" hint="A one-page audit counts as 1."><input className={`${input} w-full`} type="number" min="1" max="100000" value={limit} onChange={(e) => setLimit(e.target.value)} /></Field>
        <Field label="Window (hours)" hint="Starts at the client's first audit."><input className={`${input} w-full`} type="number" min="1" max="720" value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
        <Field label="Whole-site audits" hint="Turn off to stop every crawl at once.">
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((v) => !v)} className={`min-h-[40px] rounded-xl border px-4 text-sm font-black ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{enabled ? 'On' : 'Off'}</button>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Websites nobody may audit" hint="One per line. Subdomains are included. Use this when a site owner asks us to stop.">
          <textarea className={`${input} w-full py-2 font-mono`} rows={3} value={hosts} onChange={(e) => setHosts(e.target.value)} placeholder="example.com" />
        </Field>
      </div>
      {config.updatedAt ? <p className="mt-3 text-[11px] font-semibold text-slate-400">Last changed {timeLabel(config.updatedAt)}{config.updatedBy ? ` by ${config.updatedBy}` : ''}.</p> : null}
    </Panel>
  )
}

/** The form that appears for block / extra pages, for a listed client or a typed IP address. */
function ActionForm({ pending, onCancel, onDone, onError }) {
  const [reason, setReason] = useState('')
  const [hours, setHours] = useState(24)
  const [pages, setPages] = useState(250)
  const [busy, setBusy] = useState(false)
  const block = pending.kind === 'block'

  async function submit() {
    const built = block ? blockPayload(reason, hours) : grantPayload(pages)
    if (built.error) return onError(built.error)
    setBusy(true)
    try {
      await actOnClient(pending.target, pending.kind, built.extra)
      onDone()
    } catch (err) {
      onError(err?.message || 'The action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={`${block ? 'Block' : 'Give extra pages to'} ${pending.label}`} action={<Button onClick={onCancel}>Cancel</Button>}>
      <div className="flex flex-wrap items-end gap-3">
        {block ? (
          <>
            <Field label="Reason (shown to the person)"><input className={`${input} w-72 max-w-full`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. automated scraping" /></Field>
            <Field label="For"><select className={input} value={hours} onChange={(e) => setHours(Number(e.target.value))}>{BLOCK_DURATIONS.map((d) => <option key={d.hours} value={d.hours}>{d.label}</option>)}</select></Field>
          </>
        ) : (
          <>
            <Field label="Extra pages" hint="Valid for the current window only."><input className={`${input} w-32`} type="number" min="1" value={pages} onChange={(e) => setPages(e.target.value)} /></Field>
            <div className="flex gap-2 pb-0.5">{EXTRA_PAGE_PRESETS.map((n) => <Button key={n} onClick={() => setPages(n)}>+{n}</Button>)}</div>
          </>
        )}
        <Button className={block ? 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50' : ''} onClick={submit} disabled={busy}>{busy ? 'Working…' : block ? 'Block' : 'Give pages'}</Button>
      </div>
    </Panel>
  )
}

export default function GeoLintAccess() {
  const [config, setConfig] = useState(null)
  const [clients, setClients] = useState([])
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [ip, setIp] = useState('')
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [list, ev, cfg] = await Promise.all([listAccessClients({ filter, q }), listAccessEvents(), getAccessConfig()])
      return { ok: true, list, ev, cfg }
    } catch (err) {
      return { ok: false, message: err?.message || 'Could not load access data.' }
    }
  }, [filter, q])

  const apply = useCallback((r) => {
    if (r.ok) { setClients(r.list.items); setEvents(r.ev.items); setConfig(r.cfg); setError('') } else setError(r.message)
    setLoading(false)
  }, [])

  useEffect(() => {
    let live = true
    const t = setTimeout(() => load().then((r) => { if (live) apply(r) }), q ? 300 : 0)
    return () => { live = false; clearTimeout(t) }
  }, [load, apply, q])

  async function refresh() { setLoading(true); apply(await load()) }
  async function quick(target, kind, label, message) {
    try { await actOnClient(target, kind); setNotice(`${label}: ${message}`); setError(''); await refresh() } catch (err) { setError(err?.message || 'The action failed.') }
  }
  const finish = () => { const l = pending?.label; setPending(null); setNotice(`Done for ${l}.`); refresh() }
  const byIp = ip.trim()
  const ipOk = isIpAddress(byIp)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">Access control</h2>
          <p className="text-sm font-semibold text-slate-500">Each client may audit a fixed number of pages per window. Block abusers, give extra pages, or lift the limit.</p>
        </div>
        <Button onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
      </div>
      {error ? <Notice tone="rose">{error}</Notice> : null}
      {notice ? <Notice tone="emerald">{notice}</Notice> : null}

      {config ? <Settings key={config.updatedAt || 'initial'} config={config} onSaved={(c) => { setConfig(c); setNotice('Settings saved.'); setError('') }} onError={setError} /> : null}

      <Panel title="Act on an IP address">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="IP address" hint="For someone who is not in the list yet. It is hashed and never stored."><input className={`${input} w-64 max-w-full font-mono`} value={ip} onChange={(e) => setIp(e.target.value)} placeholder="203.0.113.7" inputMode="text" autoComplete="off" /></Field>
          <div className="flex flex-wrap gap-2 pb-0.5">
            <Button disabled={!ipOk} onClick={() => setPending({ kind: 'block', target: { ip: byIp }, label: byIp })}>Block…</Button>
            <Button disabled={!ipOk} onClick={() => setPending({ kind: 'grant', target: { ip: byIp }, label: byIp })}>Extra pages…</Button>
            <Button disabled={!ipOk} onClick={() => quick({ ip: byIp }, 'exempt', byIp, 'no page limit')}>No limit</Button>
            <Button disabled={!ipOk} onClick={() => quick({ ip: byIp }, 'unblock', byIp, 'unblocked')}>Unblock</Button>
            <Button disabled={!ipOk} onClick={() => quick({ ip: byIp }, 'reset', byIp, 'allowance reset')}>Reset</Button>
          </div>
        </div>
        {byIp && !ipOk ? <p className="mt-2 text-xs font-bold text-amber-700">That is not an IPv4 or IPv6 address.</p> : null}
      </Panel>

      {pending ? <ActionForm key={`${pending.kind}:${pending.label}`} pending={pending} onCancel={() => setPending(null)} onDone={finish} onError={setError} /> : null}

      <Panel title="Clients (most recent first)" action={<div className="flex gap-1.5">{FILTERS.map(([id, label]) => <Button key={id} onClick={() => setFilter(id)} className={filter === id ? 'border-violet-300 bg-violet-50 text-violet-800' : ''}>{label}</Button>)}</div>}>
        <input className={`${input} mb-3 w-full max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search network or website" aria-label="Search clients" />
        {clients.length === 0 && !loading ? (
          <p className="text-sm font-semibold text-slate-500">No clients here yet. They appear after someone runs an audit.</p>
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Network</th><th className="px-3 py-2">Pages</th><th className="px-3 py-2">Last site</th><th className="px-3 py-2">Last seen</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => {
                  const badge = clientBadge(c)
                  const target = { key: c.key }
                  return (
                    <tr key={c.key} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-bold text-slate-900" title={`client ${c.key.slice(0, 8)}`}>{c.label}</td>
                      <td className="min-w-[9rem] px-3 py-2">
                        <p className="text-xs font-bold text-slate-800">{c.exempt ? `${c.used} used` : `${c.used} / ${c.limit}`}{c.extraPages > 0 ? <span className="ml-1 text-emerald-700">(+{c.extraPages})</span> : null}</p>
                        {c.exempt ? null : <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${usedPercent(c) >= 100 ? 'bg-rose-500' : 'bg-violet-500'}`} style={{ width: `${usedPercent(c)}%` }} /></div>}
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">{c.totalPages} all time · {c.denied} refused</p>
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-2 text-xs font-semibold text-slate-600" title={c.lastTarget || ''}>{c.lastTarget || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-500">{timeLabel(c.lastSeen)}</td>
                      <td className="px-3 py-2"><Pill tone={badge.tone}>{badge.text}</Pill>{c.blockReason ? <p className="mt-1 max-w-[14rem] text-[11px] font-semibold text-slate-500">{c.blockReason}{c.blockedBy ? ` (${c.blockedBy})` : ''}</p> : null}</td>
                      <td className="px-3 py-2"><div className="flex flex-wrap justify-end gap-1.5">
                        <Button onClick={() => setPending({ kind: 'grant', target, label: c.label })}>+ Pages</Button>
                        <Button onClick={() => quick(target, 'reset', c.label, 'allowance reset')}>Reset</Button>
                        {c.blocked ? <Button onClick={() => quick(target, 'unblock', c.label, 'unblocked')}>Unblock</Button> : <Button className="border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50" onClick={() => setPending({ kind: 'block', target, label: c.label })}>Block</Button>}
                        <Button onClick={() => quick(target, c.exempt ? 'unexempt' : 'exempt', c.label, c.exempt ? 'limit restored' : 'no page limit')}>{c.exempt ? 'Restore limit' : 'No limit'}</Button>
                      </div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] font-semibold text-slate-400">Networks are shown masked and matched by a salted hash, so no raw IP address is kept. Many people behind one office or mobile network share one allowance.</p>
      </Panel>

      <Panel title="Activity">
        {events.length === 0 ? <p className="text-sm font-semibold text-slate-500">No admin actions yet.</p> : (
          <ul className="max-h-72 space-y-1.5 overflow-auto text-xs font-semibold text-slate-600">
            {events.map((e) => <li key={e.id}><span className="text-slate-400">{timeLabel(e.at)}</span> · <span className="font-black text-slate-800">{EVENT_LABELS[e.type] || e.type}</span>{e.label ? ` ${e.label}` : ''}{e.detail ? ` · ${e.detail}` : ''}{e.by ? <span className="text-slate-400"> · {e.by}</span> : null}</li>)}
          </ul>
        )}
      </Panel>
    </div>
  )
}
