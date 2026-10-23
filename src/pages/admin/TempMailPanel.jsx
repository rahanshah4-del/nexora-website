import { useCallback, useEffect, useMemo, useState } from 'react'
import { TEMP_MAIL_LAUNCHED, TEMP_MAIL_PATH } from '../../lib/tempMailData.js'
import { getTempMailOverview, removeTempMailAutoBlock, removeTempMailBan, saveTempMailSettings } from '../../lib/tempMailAdmin.js'
import { timeLabel } from '../../lib/geolintUi.js'
import { Button, Card, Notice, Panel, Pill, StatCard } from './GeoLintUi.jsx'
import { buildTempMailPageStats } from './tempMailStats.js'

const VERDICT_TONE = { human: 'emerald', suspicious: 'amber', bot: 'rose' }
const REASON_LABEL = {
  no_user_agent: 'no browser identity', automation_user_agent: 'automation tool', non_browser_user_agent: 'not a browser', no_accept_language: 'no language header',
  no_fetch_metadata: 'no browser metadata', no_origin: 'no origin', datacenter_network: 'datacenter network', vpn_network: 'VPN / proxy', no_page_visit: 'never opened the page',
  instant_after_load: 'acted instantly', many_creates: 'many addresses', repeat_creates: 'repeated creates', network_burst: 'network burst', previous_ban: 'was banned before',
  passed_captcha_recently: 'passed captcha', banned: 'currently banned', mail_spray: 'mail spray', allowlisted: 'allowlisted',
}
const reasonText = (r) => String(r || '').split(',').filter(Boolean).map((x) => REASON_LABEL[x] || x.replace(/_/g, ' ')).join(', ')

const SWITCHES = [
  ['creationEnabled', 'New addresses', 'Kill switch: when off, nobody can create an address.'],
  ['receivingEnabled', 'Receiving mail', 'When off, incoming temp-mail is rejected at the door. Real Nexora mail is never touched.'],
  ['customAddressEnabled', 'Custom names', 'Let visitors choose their own address name.'],
  ['extensionsEnabled', 'Add 1 hour', 'Let visitors extend an address once.'],
  ['attachmentsEnabled', 'Attachments', 'Store and offer file downloads. When off, files are listed but not kept.'],
]

function Bars({ rows, field, color }) {
  const max = Math.max(1, ...rows.map((r) => r[field]))
  return (
    <div className="flex h-24 items-end gap-1" role="img" aria-label={`${field} per day`}>
      {rows.map((r) => (
        <div key={r.date} className="group relative flex-1" title={`${r.date}: ${r[field]}`}>
          <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(3, (r[field] / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50">
      <span>
        <span className="block text-sm font-black text-slate-900">{label}</span>
        <span className="block text-xs font-semibold leading-5 text-slate-500">{hint}</span>
      </span>
      <input type="checkbox" className="mt-1 h-5 w-5 accent-violet-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Check({ ok, label, detail }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Pill tone={ok ? 'emerald' : 'amber'}>{ok ? 'OK' : 'To do'}</Pill>
      <span><span className="font-bold text-slate-900">{label}</span> <span className="font-semibold text-slate-500">{detail}</span></span>
    </li>
  )
}

/** Control Centre → Temp Mail: live numbers, switches, blocklist, reports, launch checklist. */
export default function TempMailPanel({ events = [] }) {
  const [overview, setOverview] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [newDomain, setNewDomain] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTempMailOverview()
      setOverview(data)
      setDraft(data.settings)
    } catch (e) {
      setError(e?.message || 'Could not load temp-mail data.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { const t = setTimeout(refresh, 0); return () => clearTimeout(t) }, [refresh])

  const page = useMemo(() => buildTempMailPageStats(events), [events])
  const dirty = Boolean(overview && draft && JSON.stringify(draft) !== JSON.stringify(overview.settings))

  const save = async (patch = draft, message = 'Saved. It is live now.') => {
    setSaving(true)
    setError('')
    setSaved('')
    try {
      const result = await saveTempMailSettings(patch)
      setOverview((current) => ({ ...current, settings: result.settings }))
      setDraft(result.settings)
      setSaved(message)
    } catch (e) {
      setError(e?.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))
  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase().replace(/^@/, '')
    if (!domain) return
    const next = [...new Set([...(draft.blockedDomains || []), domain])]
    setNewDomain('')
    save({ blockedDomains: next }, 'Domain blocked.')
  }
  const unblock = (domain) => save({ blockedDomains: draft.blockedDomains.filter((d) => d !== domain) }, 'Domain unblocked.')
  const unban = async (hash) => {
    try { await removeTempMailBan(hash); await refresh(); setSaved('Visitor unbanned.') } catch (e) { setError(e?.message || 'Could not unban.') }
  }
  const unblockAuto = async (domain) => {
    try { await removeTempMailAutoBlock(domain); await refresh(); setSaved('Auto-block removed.') } catch (e) { setError(e?.message || 'Could not remove.') }
  }

  const t = overview?.totals
  const system = overview?.system
  const last14 = overview ? overview.days.slice(-14) : []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">Temp Mail</h2>
          <p className="text-sm font-semibold text-slate-500">
            Free temporary email tool at {TEMP_MAIL_PATH}/ · <Pill tone={TEMP_MAIL_LAUNCHED ? 'emerald' : 'amber'}>{TEMP_MAIL_LAUNCHED ? 'Launched' : 'Not launched (noindex)'}</Pill>
          </p>
        </div>
        <Button onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
      </div>

      {error ? <Notice tone="rose">{error}</Notice> : null}
      {saved ? <Notice tone="emerald">{saved}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Page views (30 days)" value={page.views} />
        <StatCard label="Unique visitors" value={page.uniqueVisitors} />
        <StatCard label="Addresses created (30 days)" value={t ? t.created : '—'} />
        <StatCard label="Mails received (30 days)" value={t ? t.mail_received : '—'} />
        <StatCard label="Active addresses now" value={overview ? overview.activeAddresses : '—'} />
        <StatCard label="Codes detected" value={t ? t.codes_found : '—'} />
        <StatCard label="Alert subscribers now" value={overview ? overview.pushSubscriptions : '—'} />
        <StatCard label="Blocked / refused" value={t ? t.rate_limited + t.captcha_failed + t.mail_rejected : '—'} />
      </div>

      {overview ? (
        <Panel title="Last 14 days">
          <div className="grid gap-5 md:grid-cols-3">
            <div><p className="mb-2 text-xs font-black text-slate-500">Site visits (page loads)</p><Bars rows={last14} field="visits" color="bg-blue-500" /></div>
            <div><p className="mb-2 text-xs font-black text-slate-500">Addresses created</p><Bars rows={last14} field="created" color="bg-violet-500" /></div>
            <div><p className="mb-2 text-xs font-black text-slate-500">Mails received</p><Bars rows={last14} field="mail_received" color="bg-emerald-500" /></div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Extended: {t.extended} · Reports: {t.reports} · Custom names: {t.created_custom} · With attachments: {t.attachments_stored} · Captcha failures: {t.captcha_failed} · Rate limited: {t.rate_limited} · Mails refused: {t.mail_rejected} (blocked sender: {t.mail_blocked_sender}). Counters are approximate.
          </p>
        </Panel>
      ) : null}

      {draft ? (
        <Panel
          title="Controls"
          action={<Button onClick={() => save()} disabled={!dirty || saving} className={dirty ? 'border-violet-300 bg-violet-50' : ''}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Button>}
        >
          <div className="grid gap-2 md:grid-cols-2">
            {SWITCHES.map(([key, label, hint]) => <Toggle key={key} checked={Boolean(draft[key])} onChange={(v) => set(key, v)} label={label} hint={hint} />)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-black text-slate-500">Extensions per address
              <select className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" value={draft.maxExtensions ?? ''} onChange={(e) => set('maxExtensions', e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">Server default</option>
                {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs font-black text-slate-500">New addresses per minute (per visitor)
              <input type="number" min="1" max="60" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" value={draft.createPerMinute} onChange={(e) => set('createPerMinute', Number(e.target.value))} />
            </label>
            <label className="text-xs font-black text-slate-500">New addresses per hour (per visitor)
              <input type="number" min="1" max="500" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" value={draft.createPerHour} onChange={(e) => set('createPerHour', Number(e.target.value))} />
            </label>
          </div>
          <label className="mt-4 block text-xs font-black text-slate-500">Notice shown on the page (empty = none, 200 characters max)
            <input type="text" maxLength={200} placeholder="e.g. Maintenance tonight 2:00 to 2:30" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900" value={draft.notice} onChange={(e) => set('notice', e.target.value)} />
          </label>
        </Panel>
      ) : null}

      {draft && overview ? (
        <Panel
          title="Bot defense (people vs scripts)"
          action={<Button onClick={() => save()} disabled={!dirty || saving} className={dirty ? 'border-violet-300 bg-violet-50' : ''}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Button>}
        >
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Every new-address request is scored from browser signals, network type, page-visit behaviour and burst patterns.
            People pass normally, suspicious visitors get tight limits, scripts are refused and banned (repeat offenders for longer).
            One sender hitting many inboxes in minutes is blocked as mail spray.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="People (30 days)" value={t.verdict_human} />
            <StatCard label="Suspicious" value={t.verdict_suspicious} />
            <StatCard label="Bots refused" value={`${t.verdict_bot} · bans ${t.bans} · spray ${t.spray_blocks}`} />
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <div><p className="mb-2 text-xs font-black text-slate-500">People / day</p><Bars rows={last14} field="verdict_human" color="bg-emerald-500" /></div>
            <div><p className="mb-2 text-xs font-black text-slate-500">Suspicious / day</p><Bars rows={last14} field="verdict_suspicious" color="bg-amber-500" /></div>
            <div><p className="mb-2 text-xs font-black text-slate-500">Bots / day</p><Bars rows={last14} field="verdict_bot" color="bg-rose-500" /></div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-black text-slate-500">Mode
              <select className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" value={draft.defenseMode} onChange={(e) => set('defenseMode', e.target.value)}>
                <option value="enforce">Enforce (block and ban)</option>
                <option value="monitor">Monitor (record only)</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label className="text-xs font-black text-slate-500">Bot score from (50-100)
              <input type="number" min="50" max="100" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" value={draft.botThreshold} onChange={(e) => set('botThreshold', Number(e.target.value))} />
            </label>
            <label className="text-xs font-black text-slate-500">Suspicious from (15-69)
              <input type="number" min="15" max="69" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" value={draft.suspiciousThreshold} onChange={(e) => set('suspiciousThreshold', Number(e.target.value))} />
            </label>
            <label className="text-xs font-black text-slate-500">Spray: inboxes per sender / 10 min
              <input type="number" min="10" max="500" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" value={draft.sprayLimit} onChange={(e) => set('sprayLimit', Number(e.target.value))} />
            </label>
          </div>
          <label className="mt-3 block text-xs font-black text-slate-500">Allowlisted IPs, comma separated (skip scoring: use for your own network)
            <input type="text" placeholder="203.0.113.7, 2001:db8::1" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900" value={(draft.allowIps || []).join(', ')} onChange={(e) => set('allowIps', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))} />
          </label>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {[['Top suspicious networks', overview.defense.topNetworks], ['Top suspicious countries', overview.defense.topCountries], ['Most common reasons', overview.defense.topReasons.map((r) => ({ ...r, label: REASON_LABEL[r.label] || r.label }))]].map(([title, rows]) => (
              <div key={title}>
                <p className="mb-2 text-xs font-black text-slate-500">{title}</p>
                {rows.length === 0 ? <p className="text-sm font-semibold text-slate-400">Nothing suspicious yet.</p> : (
                  <ul className="space-y-1 text-sm font-semibold text-slate-700">{rows.map((r) => <li key={r.label} className="flex justify-between gap-3"><span className="truncate">{r.label}</span><span>{r.count}</span></li>)}</ul>
                )}
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs font-black text-slate-500">Active bans ({overview.defense.bans.length})</p>
          {overview.defense.bans.length === 0 ? <p className="mt-1 text-sm font-semibold text-slate-400">No one is banned right now.</p> : (
            <div className="mt-2 flex flex-wrap gap-2">
              {overview.defense.bans.map((b) => (
                <span key={b.hash} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700" title={`${b.why || ''} · until ${b.until || ''}`}>
                  {b.ip} · {b.c || '??'} · strike {b.n}<button type="button" className="underline" onClick={() => unban(b.hash)}>unban</button>
                </span>
              ))}
            </div>
          )}

          <p className="mt-5 text-xs font-black text-slate-500">Recent decisions (last {overview.defense.recent.length}, kept 3 days; IPs are masked)</p>
          {overview.defense.recent.length === 0 ? <p className="mt-1 text-sm font-semibold text-slate-400">No decisions recorded yet.</p> : (
            <div className="mt-2 max-h-96 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">Verdict</th><th className="px-3 py-2">Why</th><th className="px-3 py-2">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.defense.recent.map((e, i) => (
                    <tr key={`${e.at}-${i}`}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-500">{timeLabel(e.at)}</td>
                      <td className="max-w-[14rem] truncate px-3 py-2 text-xs font-semibold text-slate-800" title={e.o}>{e.k === 'spray' ? `sender ${e.ip}` : `${e.ip} · ${e.c || '??'} · ${e.o || (e.a ? `AS${e.a}` : 'unknown network')}`}</td>
                      <td className="whitespace-nowrap px-3 py-2"><Pill tone={VERDICT_TONE[e.v] || 'slate'}>{e.v} {e.s}</Pill></td>
                      <td className="max-w-[18rem] truncate px-3 py-2 text-xs text-slate-600" title={reasonText(e.r)}>{reasonText(e.r) || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-bold text-slate-700">{e.x}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}

      {draft ? (
        <Panel title="Blocked sender domains">
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="spam-sender.com" className="min-w-[14rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addDomain() }} />
            <Button onClick={addDomain} disabled={saving || !newDomain.trim()}>Block domain</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {draft.blockedDomains.length === 0 ? <p className="text-sm font-semibold text-slate-500">No domains blocked by hand.</p> : null}
            {draft.blockedDomains.map((d) => (
              <span key={d} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                {d}<button type="button" className="font-black hover:text-rose-900" aria-label={`Unblock ${d}`} onClick={() => unblock(d)}>×</button>
              </span>
            ))}
          </div>
          {overview?.autoBlocked?.length ? (
            <div className="mt-4">
              <p className="text-xs font-black text-slate-500">Blocked automatically (3 reports from different inboxes, 24 hours)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {overview.autoBlocked.map((b) => (
                  <span key={b.domain} className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                    {b.domain}<button type="button" className="underline" onClick={() => unblockAuto(b.domain)}>unblock</button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {overview ? (
        <Panel title={`Abuse reports (${overview.reports.length})`}>
          {overview.reports.length === 0 ? <p className="text-sm font-semibold text-slate-500">No reports in the last 30 days.</p> : (
            <div className="max-h-96 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">From</th><th className="px-3 py-2">Subject</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.reports.map((r, i) => (
                    <tr key={`${r.at}-${i}`}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-500">{timeLabel(r.at)}</td>
                      <td className="px-3 py-2"><Pill tone="amber">{r.reason}</Pill></td>
                      <td className="max-w-[14rem] truncate px-3 py-2 font-semibold text-slate-900" title={r.fromAddress}>{r.fromAddress}</td>
                      <td className="max-w-[18rem] truncate px-3 py-2 text-slate-600" title={r.subject}>{r.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}

      <Panel title="Visitors to this page (from Visitor Analytics)">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Visitors today" value={page.visitorsToday} />
          <StatCard label="Sessions (30 days)" value={page.sessions} />
          <StatCard label="Devices" value={page.devices.length ? page.devices.map((d) => `${d.label} ${d.count}`).join(' · ') : '—'} />
        </div>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div><p className="mb-2 text-xs font-black text-slate-500">Page views, 14 days</p><Bars rows={page.trend} field="views" color="bg-blue-500" /></div>
          <div>
            <p className="mb-2 text-xs font-black text-slate-500">Where visitors come from</p>
            {page.referrers.length === 0 ? <p className="text-sm font-semibold text-slate-500">No outside referrers yet (the page is not linked anywhere).</p> : (
              <ul className="space-y-1 text-sm font-semibold text-slate-700">{page.referrers.map((r) => <li key={r.label} className="flex justify-between"><span>{r.label}</span><span>{r.count}</span></li>)}</ul>
            )}
          </div>
        </div>
      </Panel>

      {system ? (
        <Card className="p-4">
          <p className="text-sm font-black text-slate-950">Launch checklist and server status</p>
          <ul className="mt-3 space-y-2">
            <Check ok={system.domains.length > 0} label="Mail domain" detail={system.domains.join(', ') || 'none set'} />
            <Check ok={system.captchaEnforced} label="Captcha (Turnstile)" detail={system.captchaEnforced ? 'enforced on new addresses' : `site key ${system.captchaSiteKeySet ? 'set' : 'missing'}, secret ${system.captchaSecretSet ? 'set' : 'missing'}`} />
            <Check ok={system.pushReady} label="Browser alerts (push)" detail={system.pushReady ? 'ready' : 'run npm run temp-mail:vapid, then deploy'} />
            <Check ok={system.forwardToSet} label="Real mail forwarding" detail={system.forwardToSet ? 'FORWARD_TO is set, so Nexora mail keeps arriving' : 'FORWARD_TO missing: non-temp mail would be rejected'} />
            <Check ok={TEMP_MAIL_LAUNCHED} label="Public launch" detail={TEMP_MAIL_LAUNCHED ? 'page is indexable and linked' : 'after AdSense approval: set TEMP_MAIL_LAUNCHED to true, and BLOCK_OWN_TEMP_MAIL="true" on the email Worker'} />
          </ul>
          <p className="mt-3 text-xs font-semibold text-slate-500">Inbox lifetime {Math.round(system.ttlSeconds / 60)} min · fixed sender blocklist: {system.staticBlockedDomains.length ? system.staticBlockedDomains.join(', ') : 'none'}</p>
        </Card>
      ) : null}
    </div>
  )
}
