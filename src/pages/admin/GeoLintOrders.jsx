import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addFixNote, attachFixAudit, attachFixCrawl, crawlFixSite, fetchFixFile, getFixOrder, listFixOrders, markFixMessagesRead, markFixPaid, recheckFixOrder, saveFixConfig, sendFixMessage, setFixStatus, uploadFixFile,
} from '../../lib/geolint.js'
import { ADMIN_STATUSES, NEXT_STATUSES, PLATFORM_OPTIONS, ACCESS_OPTIONS, buildFixBrief, formatMoney, optionLabel, planLabel, signed, compareScores, nextAction, orderTotals, relativeTime, statusInfo, STEPS } from '../../lib/geolintFix.js'
import { timeLabel } from '../../lib/geolintUi.js'
import { GscData } from '../public/tools/GeoLintGsc.jsx'
import GeoLintChat from '../public/tools/GeoLintChat.jsx'
import { STAFF_QUICK_REPLIES } from '../../lib/geolintChatKit.js'
import { downloadOrderReport } from '../../lib/geolintReportPdf.js'
import { Button, Notice, Panel, Pill } from './GeoLintUi.jsx'

const input = 'min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100'

function Field({ label, hint, children }) {
  return <label className="block text-xs font-black text-slate-600">{label}<span className="mt-1 block">{children}</span>{hint ? <span className="mt-1 block text-[11px] font-semibold text-slate-400">{hint}</span> : null}</label>
}

function ConfigPanel({ config, onSaved, onError }) {
  const [enabled, setEnabled] = useState(config.enabled)
  const [price, setPrice] = useState(String(config.priceUsd))
  const [seoPrice, setSeoPrice] = useState(String(config.seoPriceUsd ?? 500))
  const [target, setTarget] = useState(String(config.targetScore))
  const [instructions, setInstructions] = useState(config.paymentInstructions)
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      onSaved(await saveFixConfig({ enabled, priceUsd: Number(price), seoPriceUsd: Number(seoPrice), targetScore: Number(target), paymentInstructions: instructions.trim() }))
    } catch (err) {
      onError(err?.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Panel title="Fix service settings" action={<Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>}>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="GEO fix price (USD)" hint="Per website."><input className={`${input} w-full`} type="number" min="1" max="10000" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <Field label="Full SEO price (USD)" hint="Per website."><input className={`${input} w-full`} type="number" min="1" max="100000" value={seoPrice} onChange={(e) => setSeoPrice(e.target.value)} /></Field>
        <Field label="Target score" hint="Shown as a goal, never as a promise."><input className={`${input} w-full`} type="number" min="50" max="100" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        <Field label="Accept new orders">
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((v) => !v)} className={`min-h-[40px] rounded-xl border px-4 text-sm font-black ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{enabled ? 'On' : 'Paused'}</button>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Manual payment note (optional)" hint="Card payments are automatic and need nothing here. Only fill this if you ever take a bank or JazzCash payment by hand.">
          <textarea className={`${input} w-full py-2`} rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={1500} />
        </Field>
      </div>
      {config.updatedAt ? <p className="mt-3 text-[11px] font-semibold text-slate-400">Last changed {timeLabel(config.updatedAt)}{config.updatedBy ? ` by ${config.updatedBy}` : ''}.</p> : null}
    </Panel>
  )
}

const RING = { rose: 'border-rose-300 ring-2 ring-rose-100', amber: 'border-amber-300 ring-2 ring-amber-100' }
const HINT = { rose: 'text-rose-700', amber: 'text-amber-800', blue: 'text-blue-700', violet: 'text-violet-700', emerald: 'text-emerald-700', slate: 'text-slate-500' }

function OrderCard({ row, active, onOpen }) {
  const info = statusInfo(row.status)
  const next = nextAction(row)
  const gain = row.before !== null && row.after !== null ? Math.round((row.after - row.before) * 10) / 10 : null
  const attention = row.unreadMessages > 0 ? 'rose' : row.status === 'payment_submitted' ? 'amber' : ''
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      aria-pressed={active}
      className={`group flex w-full flex-col gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-violet-400 ring-2 ring-violet-100' : RING[attention] || 'border-slate-200'}`}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-black text-violet-700">{row.id}</span>
        {row.unreadMessages > 0 ? <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white" title="Unread client messages">{row.unreadMessages} new</span> : null}
        <span className="ml-auto text-[11px] font-semibold text-slate-400" title={timeLabel(row.createdAt)}>{relativeTime(row.createdAt)}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-black text-slate-950">{row.host}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">{row.name ? `${row.name} · ` : ''}{row.email}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Pill tone={info.tone}>{info.label}</Pill>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{planLabel(row.plan)}</span>
        {row.messageCount > 0 ? <span className="text-xs font-semibold text-slate-400">{row.messageCount} message{row.messageCount === 1 ? '' : 's'}{row.lastMessageAt ? `, last ${relativeTime(row.lastMessageAt)}` : ''}</span> : null}
      </span>
      {info.step >= 0 ? (
        <span className="flex gap-1" role="img" aria-label={`Step ${info.step + 1} of ${STEPS.length}: ${STEPS[info.step].label}`}>
          {STEPS.map((step, i) => <span key={step.id} title={step.label} className={`h-1.5 flex-1 rounded-full ${i <= info.step ? (info.step === STEPS.length - 1 ? 'bg-emerald-500' : 'bg-violet-500') : 'bg-slate-200'}`} />)}
        </span>
      ) : <span className="h-1.5 rounded-full bg-slate-100" />}
      <span className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase tracking-wide text-slate-400">Score</span>
          <span className="block text-sm font-black tabular-nums text-slate-900">{row.before ?? '—'} → {row.after ?? '—'}{gain !== null ? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${gain >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{signed(gain)}</span> : null}</span>
        </span>
        <span className="text-right">
          <span className="block text-[11px] font-black uppercase tracking-wide text-slate-400">Price</span>
          <span className="block text-sm font-black text-slate-900">{formatMoney(row.price)}</span>
        </span>
      </span>
      {next.text ? <span className={`rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold ${HINT[next.tone] || HINT.slate}`}>Next: {next.text}</span> : null}
    </button>
  )
}

function Totals({ totals, filter, onFilter }) {
  const cards = [
    { key: 'open', label: 'Open', value: totals.open, tone: 'text-slate-950' },
    { key: 'payment_submitted', label: 'Payment to check', value: totals.payment, tone: totals.payment ? 'text-amber-700' : 'text-slate-950' },
    { key: 'in_progress', label: 'In progress', value: totals.working, tone: 'text-blue-700' },
    { key: 'completed', label: 'Completed', value: totals.completed, tone: 'text-emerald-700' },
    { key: 'all', label: 'All orders', value: totals.all, tone: 'text-slate-950' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5" role="group" aria-label="Filter orders">
      {cards.map((c) => (
        <button key={c.key} type="button" aria-pressed={filter === c.key} onClick={() => onFilter(c.key)} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${filter === c.key ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'}`}>
          <span className="block text-xs font-black text-slate-500">{c.label}</span>
          <span className={`mt-1 block text-2xl font-black tabular-nums ${c.tone}`}>{c.value}</span>
        </button>
      ))}
    </div>
  )
}

function Detail({ id, target, onClose, onChanged, onError }) {
  const [state, setState] = useState({ order: null, report: null, loading: true })
  const [busy, setBusy] = useState('')
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [visible, setVisible] = useState(false)
  const [auditId, setAuditId] = useState('')
  const [copied, setCopied] = useState(false)
  const [crawlPages, setCrawlPages] = useState('100')
  const [crawlAuditId, setCrawlAuditId] = useState('')
  const [crawlSecs, setCrawlSecs] = useState(0)
  const [tab, setTab] = useState('order')
  // a whole-site crawl takes minutes: show how long it has been running
  const crawling = busy === 'crawl'
  useEffect(() => {
    if (!crawling) return undefined
    const started = Date.now()
    const t = setInterval(() => setCrawlSecs(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(t)
  }, [crawling])
  // when the team last opened this chat, kept from the first load so the "New messages" line stays put while it is open
  const [readMark, setReadMark] = useState('')

  useEffect(() => {
    let live = true
    getFixOrder(id).then((r) => { if (live) { setReadMark(r.order.chatReadByStaffAt || ''); setState({ order: r.order, report: r.report, loading: false }) } }).catch((e) => { if (live) { onError(e?.message || 'Could not load the order.'); setState((s) => ({ ...s, loading: false })) } })
    return () => { live = false }
  }, [id, onError])

  // while the order is open: pull new client messages every few seconds and mark them read
  const orderLoaded = Boolean(state.order)
  useEffect(() => {
    if (!orderLoaded) return undefined
    const poll = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      markFixMessagesRead(id)
        .then((r) => setState((s) => (s.order && ((r.order.messages?.length || 0) !== (s.order.messages?.length || 0) || r.order.chatReadByClientAt !== s.order.chatReadByClientAt) ? { ...s, order: { ...s.order, messages: r.order.messages, chatReadByStaffAt: r.order.chatReadByStaffAt, chatReadByClientAt: r.order.chatReadByClientAt } } : s)))
        .catch(() => {})
    }
    poll()
    const timer = setInterval(poll, 8000)
    return () => clearInterval(timer)
  }, [id, orderLoaded])

  async function sendChat(payload) {
    const r = await sendFixMessage(id, payload)
    setState((s) => ({ ...s, order: r.order }))
    onChanged()
  }
  const uploadChatFile = useCallback((file) => uploadFixFile(id, file), [id])
  const loadChatFile = useCallback((fileId) => fetchFixFile(id, fileId), [id])

  async function act(name, fn) {
    setBusy(name)
    try {
      const r = await fn()
      setState((s) => ({ ...s, order: r.order }))
      onChanged()
      return true
    } catch (err) {
      onError(err?.message || 'The action failed.')
      return false
    } finally {
      setBusy('')
    }
  }

  const { order, loading } = state
  if (loading) return <Panel title={id} action={<Button onClick={onClose}>Close</Button>}><p className="text-sm font-semibold text-slate-500">Loading…</p></Panel>
  if (!order) return <Panel title={id} action={<Button onClick={onClose}>Close</Button>}><p className="text-sm font-semibold text-rose-700">Order not found.</p></Panel>

  const info = statusInfo(order.status)
  const compare = compareScores(order.before, order.after, target)
  const canPay = ['awaiting_payment', 'payment_submitted'].includes(order.status)
  const brief = buildFixBrief(order, { target })

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onError('Your browser blocked copying. Select the brief below and copy it by hand.')
    }
  }

  return (
    <Panel title={`${order.id}: ${order.host}`} action={<Button onClick={onClose}>Close</Button>}>
      <div className="flex flex-wrap items-center gap-3">
        <Pill tone={info.tone}>{info.label}</Pill>
        <Pill tone={order.plan === 'seo' ? 'violet' : 'blue'}>{planLabel(order.plan)}</Pill>
        <span className="text-sm font-black text-slate-900">{formatMoney(order.price)}</span>
        <a className="text-xs font-bold text-violet-700 hover:underline" href={order.siteUrl} target="_blank" rel="noreferrer noopener">Open site</a>
        <span className="text-xs font-semibold text-slate-500">Placed {timeLabel(order.createdAt)}</span>
      </div>

      <div role="tablist" aria-label="Order sections" className="mt-4 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        {[['order', 'Order'], ['chat', `Chat (${(order.messages || []).length})`]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-1.5 text-sm font-black ${tab === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}>{label}</button>
        ))}
      </div>

      {tab === 'chat' ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500">The client sees these messages on their order page and gets an email for each reply. The chat is open for the client while the order is paid and being worked on. When you set the order to Completed, the client can still read it but can no longer write.</p>
          <GeoLintChat
            messages={order.messages || []}
            mine="staff"
            title={order.name || 'Client'}
            subtitle={`${order.email} · ${order.host}`}
            quickReplies={STAFF_QUICK_REPLIES}
            otherReadAt={order.chatReadByClientAt || ''}
            myReadAt={readMark}
            onUpload={uploadChatFile}
            loadFile={loadChatFile}
            canWrite={['paid', 'in_progress', 'ready_for_review', 'completed'].includes(order.status)}
            closedText="The chat opens once the order is paid."
            emptyText="No messages yet. The client can write to you once the order is paid."
            hint={order.status === 'completed' ? 'This order is completed. The client can read your message but cannot reply.' : ''}
            onSend={sendChat}
          />
        </div>
      ) : null}

      {tab === 'order' ? <>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
        <div><dt className="text-xs font-black text-slate-500">Client</dt><dd className="font-semibold text-slate-900">{order.name}, {order.email}{order.whatsapp ? `, ${order.whatsapp}` : ''}</dd></div>
        <div><dt className="text-xs font-black text-slate-500">Platform</dt><dd className="font-semibold text-slate-900">{optionLabel(PLATFORM_OPTIONS, order.platform)}</dd></div>
        <div><dt className="text-xs font-black text-slate-500">Access</dt><dd className="font-semibold text-slate-900">{optionLabel(ACCESS_OPTIONS, order.accessMethod)}{order.accessNotes ? ` (${order.accessNotes})` : ''}</dd></div>
        <div><dt className="text-xs font-black text-slate-500">Confirmed ownership</dt><dd className="font-semibold text-slate-900">{timeLabel(order.authorizedAt)}</dd></div>
        {order.competitors?.length ? <div className="md:col-span-2"><dt className="text-xs font-black text-slate-500">Competitors</dt><dd className="font-semibold text-slate-900">{order.competitors.map((c) => `${c.title || c.host}${c.scorePercent !== null ? ` (${c.scorePercent})` : ''}`).join(', ')}</dd></div> : null}
        {order.notes ? <div className="md:col-span-2"><dt className="text-xs font-black text-slate-500">Client note</dt><dd className="font-semibold text-slate-900">{order.notes}</dd></div> : null}
        {order.payment.reference ? <div className="md:col-span-2"><dt className="text-xs font-black text-slate-500">Payment claimed</dt><dd className="font-semibold text-slate-900">{order.payment.method}, reference {order.payment.reference}{order.payment.submittedAt ? `, ${timeLabel(order.payment.submittedAt)}` : ''}{order.payment.paidAt ? `. Confirmed ${timeLabel(order.payment.paidAt)} by ${order.payment.confirmedBy || '—'}` : ''}</dd></div> : null}
      </dl>

      {canPay ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">Confirm payment</p>
          <p className="mt-0.5 text-xs font-semibold text-amber-800">Only after the money is really in your account.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="Method"><input className={`${input} w-full`} value={method || order.payment.method || ''} onChange={(e) => setMethod(e.target.value)} placeholder="JazzCash, bank…" /></Field>
            <Field label="Reference"><input className={`${input} w-full`} value={reference || order.payment.reference || ''} onChange={(e) => setReference(e.target.value)} /></Field>
            <div className="flex items-end"><Button disabled={Boolean(busy)} onClick={() => act('pay', () => markFixPaid(order.id, (method || order.payment.method || '').trim(), (reference || order.payment.reference || '').trim()))}>{busy === 'pay' ? 'Saving…' : 'Mark paid'}</Button></div>
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-xs font-black text-slate-500">Move to</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {NEXT_STATUSES[order.status].filter((s) => s !== 'paid').map((s) => (
            <Button key={s} disabled={Boolean(busy)} onClick={() => act(s, () => setFixStatus(order.id, s))}>{statusInfo(s).label}</Button>
          ))}
          {NEXT_STATUSES[order.status].length === 0 ? <span className="text-xs font-semibold text-slate-400">This order is closed.</span> : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-black text-slate-950">Score before and after</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">Before <strong>{compare.before ?? '—'}</strong> → After <strong>{compare.after ?? '—'}</strong>{compare.gain !== null ? ` (${signed(compare.gain)} points${compare.reachedTarget ? `, target ${target}+ reached` : `, target ${target}+ not reached`})` : ''}</p>
        {order.before && order.after && !compare.sameKind ? <div className="mt-2"><Notice tone="amber">Before and after are different kinds of audit (page vs whole site). The comparison is not like for like.</Notice></div> : null}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Button disabled={Boolean(busy) || !order.before} onClick={() => act('pdf', async () => { await downloadOrderReport({ ...order, events: order.events.filter((e) => e.visible) }, { target }); return { order } })}>{busy === 'pdf' ? 'Building PDF…' : 'Download client PDF report'}</Button>
          <Button disabled={Boolean(busy)} onClick={() => act('rb', () => recheckFixOrder(order.id, 'before'))}>{busy === 'rb' ? 'Auditing…' : 'Run baseline now'}</Button>
          <Button disabled={Boolean(busy)} onClick={() => act('ra', () => recheckFixOrder(order.id, 'after'))}>{busy === 'ra' ? 'Auditing…' : 'Re-audit now (after)'}</Button>
          <input className={`${input} w-56 font-mono`} value={auditId} onChange={(e) => setAuditId(e.target.value)} placeholder="Audit ID to attach" aria-label="Audit ID to attach" />
          <Button disabled={Boolean(busy) || !auditId.trim()} onClick={() => act('ab', () => attachFixAudit(order.id, 'before', auditId.trim()))}>Attach as before</Button>
          <Button disabled={Boolean(busy) || !auditId.trim()} onClick={() => act('aa', () => attachFixAudit(order.id, 'after', auditId.trim()))}>Attach as after</Button>
        </div>
        {order.before?.issues?.length ? (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm font-semibold text-slate-700">
            {order.before.issues.slice(0, 15).map((i) => <li key={i.title}><span className="mr-1.5 inline-block rounded border border-slate-200 px-1.5 text-[11px] font-black uppercase text-slate-500">{i.priority}</span>{i.title}</li>)}
          </ol>
        ) : <p className="mt-3 text-xs font-semibold text-slate-400">No findings attached. Run the baseline to add them.</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-black text-slate-950">Full-website crawl <span className="font-semibold text-slate-500">(included in the client's PDF)</span></p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Checks every page of the site, not just the home page. The result goes into the client's report and their Results tab, so the order shows much more than one score.</p>
        {order.siteCrawl ? (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            {order.siteCrawl.pagesAudited} pages checked{order.siteCrawl.pagesDiscovered > order.siteCrawl.pagesAudited ? ` of ${order.siteCrawl.pagesDiscovered} found` : ''} · site score <strong>{order.siteCrawl.score?.indexable ?? '—'}</strong> · {order.siteCrawl.issues?.length || 0} site-wide findings
            <span className="block text-xs font-semibold text-emerald-700">Crawled {relativeTime(order.siteCrawl.crawledAt)}. Run it again to replace this result.</span>
            {order.siteCrawl.issues?.length ? (
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-emerald-900">
                {order.siteCrawl.issues.slice(0, 5).map((i) => <li key={i.title}>{i.title} <span className="text-emerald-700">({i.count} pages)</span></li>)}
              </ol>
            ) : null}
          </div>
        ) : <p className="mt-3 text-xs font-semibold text-amber-700">Not crawled yet. The client's PDF has no page-by-page section until you do.</p>}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select className={`${input} w-44`} value={crawlPages} onChange={(e) => setCrawlPages(e.target.value)} aria-label="Pages to crawl" disabled={Boolean(busy)}>
            <option value="50">Up to 50 pages</option>
            <option value="100">Up to 100 pages</option>
            <option value="200">Up to 200 pages</option>
          </select>
          <Button disabled={Boolean(busy)} onClick={() => act('crawl', () => crawlFixSite(order.id, Number(crawlPages)))}>{crawling ? `Crawling… ${Math.floor(crawlSecs / 60)}:${String(crawlSecs % 60).padStart(2, '0')}` : order.siteCrawl ? 'Crawl again' : 'Crawl whole site now'}</Button>
          <input className={`${input} w-56 font-mono`} value={crawlAuditId} onChange={(e) => setCrawlAuditId(e.target.value)} placeholder="Saved site audit ID" aria-label="Saved site audit ID" disabled={Boolean(busy)} />
          <Button disabled={Boolean(busy) || !crawlAuditId.trim()} onClick={() => act('crawlat', () => attachFixCrawl(order.id, crawlAuditId.trim()))}>Attach saved site audit</Button>
        </div>
        {crawling ? <p className="mt-2 text-xs font-semibold text-slate-500">This can take a few minutes. Keep this tab open.</p> : null}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-950">Fix brief for Claude Code</p>
          <Button onClick={copyBrief}>{copied ? 'Copied' : 'Copy brief'}</Button>
        </div>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100" tabIndex={0}>{brief}</pre>
      </div>

      {order.gsc ? (
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <p className="mb-3 text-sm font-black text-slate-950">Search Console data (fetched {timeLabel(order.gsc.fetchedAt)})</p>
          <GscData gsc={order.gsc} />
        </div>
      ) : <p className="mt-6 text-xs font-semibold text-slate-400">The client has not connected Search Console.</p>}

      <div className="mt-6">
        <p className="text-sm font-black text-slate-950">Notes and history</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input className={`${input} min-w-[220px] flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" aria-label="Note" maxLength={1000} />
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Show to client</label>
          <Button disabled={Boolean(busy) || !note.trim()} onClick={async () => { if (await act('note', () => addFixNote(order.id, note.trim(), visible))) setNote('') }}>Add note</Button>
        </div>
        <ol className="mt-3 space-y-2">
          {[...order.events].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`} className="rounded-lg border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              <span className="text-slate-400">{timeLabel(e.at)}</span> · {e.by || 'system'} · <span className="uppercase text-slate-400">{e.type}</span>{e.visible ? '' : ' · staff only'}
              <span className="mt-0.5 block text-[13px] text-slate-900">{e.note}</span>
            </li>
          ))}
        </ol>
      </div>
      </> : null}
    </Panel>
  )
}

/** Control Centre > GeoLint > Fix orders. */
export default function GeoLintOrders() {
  const [filter, setFilter] = useState('open')
  const [data, setData] = useState({ items: [], counts: {}, config: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const load = useCallback(async (status) => {
    try {
      const r = await listFixOrders(status)
      setData(r)
      setError('')
    } catch (err) {
      setError(err?.message || 'Could not load the orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let live = true
    listFixOrders(filter).then((r) => { if (live) { setData(r); setError(''); setLoading(false) } }).catch((err) => { if (live) { setError(err?.message || 'Could not load the orders.'); setLoading(false) } })
    return () => { live = false }
  }, [filter])

  // new orders and client messages show up without a page reload
  useEffect(() => {
    const timer = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) load(filter) }, 30000)
    return () => clearInterval(timer)
  }, [filter, load])

  const totals = orderTotals(data.counts, data.items)
  const target = data.config?.targetScore || 90
  const detailRef = useRef(null)
  const openOrder = useCallback((id) => {
    setOpenId(id)
    // the order opens above the list: bring it into view so nobody has to hunt for it
    setTimeout(() => detailRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 60)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-950">Fix orders</h2>
        {totals.unread ? <Pill tone="rose">{totals.unread} unread message{totals.unread === 1 ? '' : 's'}</Pill> : null}
        {totals.payment ? <Pill tone="amber">{totals.payment} payment{totals.payment === 1 ? '' : 's'} to check</Pill> : null}
        <div className="ml-auto flex gap-2">
          <Button onClick={() => load(filter)}>Refresh</Button>
          <Button aria-pressed={showSettings} className={showSettings ? 'border-violet-300 bg-violet-50' : ''} onClick={() => setShowSettings((v) => !v)}>{showSettings ? 'Hide settings' : 'Service settings'}</Button>
        </div>
      </div>
      {error ? <Notice tone="rose">{error}</Notice> : null}

      <Totals totals={totals} filter={filter} onFilter={(key) => { setLoading(true); setFilter(key) }} />

      <div ref={detailRef} className="scroll-mt-4">
        {openId ? <Detail key={openId} id={openId} target={target} onClose={() => setOpenId('')} onChanged={() => load(filter)} onError={setError} /> : null}
      </div>

      {loading ? <p className="text-sm font-semibold text-slate-500">Loading…</p> : data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">No orders here yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((row) => <OrderCard key={row.id} row={row} active={row.id === openId} onOpen={openOrder} />)}
        </div>
      )}

      {showSettings && data.config ? <ConfigPanel key={data.config.updatedAt || 'default'} config={data.config} onSaved={(config) => setData((d) => ({ ...d, config }))} onError={setError} /> : null}
      <p className="text-[11px] font-semibold text-slate-400">Statuses: {ADMIN_STATUSES.map((st) => statusInfo(st).label).join(' · ')}</p>
    </div>
  )
}
