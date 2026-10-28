import { useCallback, useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase.js'
import { enablePush, pushConfigured, pushSupported } from '../../lib/pushClient.js'
import { Button, Card, Notice, Panel, Pill, StatCard } from './GeoLintUi.jsx'

const call = (name, payload = {}) => httpsCallable(functions, name)(payload).then((result) => result.data)

const SEGMENTS = [
  ['all', 'All clients with alerts on'],
  ['trial', 'Trial clients (trial still running)'],
  ['expired', 'Expired trials (not paid)'],
  ['paid', 'Paying clients'],
  ['module:crm', 'Module: Sales Hub / CRM'],
  ['module:retail', 'Module: Retail POS'],
  ['module:restaurant', 'Module: Restaurant POS'],
  ['module:school', 'Module: School ERP'],
  ['module:property', 'Module: Property ERP'],
  ['module:transport', 'Module: Transport / Fleet'],
  ['module:whatsapp', 'Module: WhatsApp CRM'],
  ['module:pharmacy', 'Module: Pharmacy'],
]

const TEMPLATES = [
  { label: 'New feature', title: 'New in Nexora', body: 'We just added something new to your workspace. Take a look.', segment: 'all' },
  { label: 'Trial offer', title: 'Keep your Nexora workspace', body: 'Choose a plan before your trial ends and keep all your data and settings.', segment: 'trial' },
  { label: 'Win-back', title: 'Your data is waiting', body: 'Your workspace is saved. Pick a plan to open it again.', segment: 'expired' },
]

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50">
      <span>
        <span className="block text-sm font-black text-slate-900">{label}</span>
        <span className="block text-xs font-semibold leading-5 text-slate-500">{hint}</span>
      </span>
      <input type="checkbox" disabled={disabled} className="mt-1 h-5 w-5 accent-violet-600" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

/** Control Centre → Push Notifications: devices, automations, campaigns, admin alerts. */
export default function PushNotificationsPanel() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState('')
  const [form, setForm] = useState({ title: '', body: '', url: '/app/dashboard', segment: 'all' })
  const [audienceFor, setAudienceFor] = useState({ segment: '', data: null })
  const audience = audienceFor.segment === form.segment ? audienceFor.data : null

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStatus(await call('getPushStatus'))
    } catch (err) {
      setError(err?.message || 'Could not load push status.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { const t = setTimeout(refresh, 0); return () => clearTimeout(t) }, [refresh])

  useEffect(() => {
    let live = true
    call('previewPushAudience', { segment: form.segment }).then((data) => { if (live) setAudienceFor({ segment: form.segment, data }) }).catch(() => {})
    return () => { live = false }
  }, [form.segment])

  const run = async (key, task, done) => {
    setBusy(key)
    setError('')
    setInfo('')
    try {
      const result = await task()
      setInfo(typeof done === 'function' ? done(result) : done)
      await refresh()
    } catch (err) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy('')
    }
  }

  const toggle = (id, enabled) => run(`toggle-${id}`, () => call('setPushAutomation', { id, enabled }), enabled ? 'Switched on.' : 'Switched off.')
  const send = (test) => run(test ? 'test' : 'send', () => call('sendPushCampaign', { ...form, test }), (r) => `${test ? 'Test sent' : 'Sent'} to ${r.sent} device(s)${r.failed ? `, ${r.failed} failed` : ''}.${r.sent === 0 && r.errors?.length ? ` Reason: ${r.errors.join(' | ')}` : ''}`)
  const enableHere = () => run('enable', () => enablePush(), 'Alerts are on for this device. You will get lead and ticket alerts here.')

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const canSend = form.title.trim() && form.body.trim()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">Push Notifications</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Alerts to signed-in clients who turned them on themselves, plus instant alerts to you. Pushes can go out at any hour, at most one automatic push a day per device.
          </p>
        </div>
        <Button onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
      </div>

      {error ? <Notice tone="rose">{error}</Notice> : null}
      {info ? <Notice tone="emerald">{info}</Notice> : null}
      {!pushConfigured ? (
        <Notice tone="amber">
          Browser alerts are not set up yet. In Firebase Console open Project settings, Cloud Messaging, Web Push certificates, generate a key pair, then add its public key as <code>VITE_FIREBASE_VAPID_KEY</code> in the Cloudflare build variables and deploy again. Clients will not see the &ldquo;Turn on alerts&rdquo; card until then.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Devices with alerts on" value={status ? status.enabledDevices : '…'} />
        <StatCard label="Clients reachable" value={status ? status.users : '…'} />
        <StatCard label="Your devices (admin)" value={status ? status.adminDevices : '…'} />
        <StatCard label="Automatic pushes sent" value={status ? status.sequences.reduce((sum, item) => sum + item.sent, 0) : '…'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Instant alerts for you">
          <div className="space-y-3">
            <Toggle
              checked={status?.adminAlerts !== false}
              disabled={!status || busy === 'toggle-adminAlerts'}
              onChange={(value) => toggle('adminAlerts', value)}
              label="Leads, tickets and payments"
              hint="A push to your own devices for a new website lead, a new support ticket, a payment received, a failed payment or a cancelled plan."
            />
            {status && status.adminDevices === 0 ? (
              <Notice tone="amber">
                No admin device is registered yet, so these alerts have nowhere to go.{' '}
                {pushConfigured && pushSupported()
                  ? <Button className="ml-1" onClick={enableHere} disabled={busy === 'enable'}>{busy === 'enable' ? 'Turning on…' : 'Turn on alerts here'}</Button>
                  : 'Open this page in a browser that supports alerts after setting up the key above.'}
              </Notice>
            ) : (
              <p className="text-xs font-semibold text-slate-500">{status ? `${status.adminDevices} admin device(s) registered.` : ''}</p>
            )}
          </div>
        </Panel>

        <Panel title="Automatic pushes">
          <div className="space-y-2">
            {(status?.sequences || []).map((sequence) => (
              <Toggle
                key={sequence.id}
                checked={sequence.enabled}
                disabled={busy === `toggle-${sequence.id}`}
                onChange={(value) => toggle(sequence.id, value)}
                label={`${sequence.label} (${sequence.sent} sent)`}
                hint={sequence.when}
              />
            ))}
            {!status ? <p className="text-sm font-semibold text-slate-500">Loading…</p> : null}
            <Button onClick={() => run('now', () => call('runPushAutomationsNow'), (r) => (r.skipped ? `Skipped: ${r.skipped}.` : 'Ran now.'))} disabled={busy === 'now'}>
              {busy === 'now' ? 'Running…' : 'Run automations now'}
            </Button>
          </div>
        </Panel>
      </div>

      <Panel title="Send a push to clients">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((template) => (
                <Button key={template.label} onClick={() => setForm((current) => ({ ...current, title: template.title, body: template.body, segment: template.segment }))}>{template.label}</Button>
              ))}
            </div>
            <label className="block text-xs font-black text-slate-600">Title ({form.title.length}/65)
              <input value={form.title} maxLength={65} onChange={set('title')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
            </label>
            <label className="block text-xs font-black text-slate-600">Message ({form.body.length}/180)
              <textarea value={form.body} maxLength={180} rows={3} onChange={set('body')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
            </label>
            <label className="block text-xs font-black text-slate-600">Opens this page
              <input value={form.url} onChange={set('url')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" />
            </label>
            <label className="block text-xs font-black text-slate-600">Audience
              <select value={form.segment} onChange={set('segment')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                {SEGMENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="space-y-3">
            <Card className="bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Preview</p>
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-sm font-black text-slate-900">{form.title || 'Title'}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{form.body || 'Your message appears here.'}</p>
                <p className="mt-2 text-[11px] font-semibold text-slate-400">nexorasolution.us</p>
              </div>
            </Card>
            <Notice tone="slate">
              {audience
                ? `${audience.devices} device(s) of ${audience.users} client(s) match. ${audience.readyDevices} can receive a push right now (a device is skipped for 6 hours after any push).`
                : 'Counting the audience…'}
            </Notice>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => send(true)} disabled={!canSend || busy === 'test'}>{busy === 'test' ? 'Sending…' : 'Send test to my devices'}</Button>
              <Button className="!border-violet-300 !bg-violet-600 !text-white hover:!bg-violet-700" onClick={() => send(false)} disabled={!canSend || busy === 'send' || !audience?.readyDevices}>
                {busy === 'send' ? 'Sending…' : 'Send to audience'}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Recent sends">
        {status?.recent?.length ? (
          <ul className="divide-y divide-slate-100">
            {status.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0"><span className="font-black text-slate-900">{row.title}</span> <span className="font-semibold text-slate-500">{row.body}</span></span>
                <span className="flex items-center gap-2">
                  <Pill tone={row.test ? 'slate' : 'violet'}>{row.test ? 'test' : row.segment}</Pill>
                  <span className="text-xs font-bold text-slate-500">{row.sent} sent{row.failed ? `, ${row.failed} failed` : ''}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm font-semibold text-slate-500">No pushes sent yet.</p>}
      </Panel>
    </div>
  )
}
