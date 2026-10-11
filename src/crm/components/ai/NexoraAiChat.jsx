import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  HiSparkles,
  HiOutlineXMark,
  HiOutlinePaperAirplane,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
} from 'react-icons/hi2'
import { cn } from '../../utils/cn.js'
import { runRestaurantAiTool } from '../../ai/restaurantAiTools.js'
import { NexoraAiError, runNexoraAiTurn } from '../../ai/nexoraAiClient.js'
import { printAiOrder } from '../../ai/nexoraAiPrint.js'
import { confirmAiOrderDraft } from '../../ai/nexoraAiOrderCreate.js'
import { useRestaurantAiData } from '../../ai/useRestaurantAiData.js'
import { restaurantBusinessDateKey } from '../../lib/restaurantBusinessDay.js'
import {
  AI_LANGUAGES,
  effectiveLanguage,
  formatMoneyLabel,
  friendlyError,
  orderConfirmError,
  parseBlocks,
  suggestionsFor,
  textDirection,
  toolStatusLabel,
} from '../../ai/nexoraAiText.js'

const LANGUAGE_STORAGE_KEY = 'nexora.ai.language.v1'

const COPY = {
  en: {
    title: 'Nexora AI',
    subtitle: 'Ask anything about your restaurant',
    placeholder: 'Ask about sales, orders, stock…',
    send: 'Send',
    stop: 'Stop',
    clear: 'Clear chat',
    close: 'Close',
    greeting: 'Hi! I can read your sales, orders, menu, stock and kitchen. Ask me in Urdu, Roman Urdu or English.',
    print: 'Print',
    printed: 'Sent to printer',
    printFailed: 'Could not print',
    draftTitle: 'Order draft',
    confirm: 'Confirm order',
    saving: 'Saving…',
    saved: 'Order saved',
    savedNote: 'Sent to the kitchen list as pending. Take payment from the POS.',
    notFound: 'Not found in the menu',
    notAvailable: 'Not available',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    service: 'Service charge',
    tax: 'Tax',
    paid: 'Paid',
    due: 'Due',
    items: 'items',
    table: 'Table',
    language: 'Language',
  },
  'roman-ur': {
    title: 'Nexora AI',
    subtitle: 'Apne restaurant ke bare mein kuch bhi puchein',
    placeholder: 'Sale, orders ya stock ke bare mein puchein…',
    send: 'Bhejein',
    stop: 'Rokein',
    clear: 'Chat saaf karein',
    close: 'Band karein',
    greeting: 'Assalam o Alaikum! Main aap ki sale, orders, menu, stock aur kitchen dekh sakta hun. Urdu, Roman Urdu ya English mein puchein.',
    print: 'Print',
    printed: 'Printer ko bhej diya',
    printFailed: 'Print nahi ho saka',
    draftTitle: 'Order ka draft',
    confirm: 'Order confirm karein',
    saving: 'Save ho raha hai…',
    saved: 'Order save ho gaya',
    savedNote: 'Kitchen list mein pending hai. Payment POS se lein.',
    notFound: 'Menu mein nahi mila',
    notAvailable: 'Dastiyab nahi',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    service: 'Service charge',
    tax: 'Tax',
    paid: 'Wasool',
    due: 'Baqi',
    items: 'items',
    table: 'Table',
    language: 'Zabaan',
  },
  ur: {
    title: 'نیکسورا اے آئی',
    subtitle: 'اپنے ریسٹورنٹ کے بارے میں کچھ بھی پوچھیں',
    placeholder: 'سیل، آرڈرز یا اسٹاک کے بارے میں پوچھیں…',
    send: 'بھیجیں',
    stop: 'روکیں',
    clear: 'چیٹ صاف کریں',
    close: 'بند کریں',
    greeting: 'السلام علیکم! میں آپ کی سیل، آرڈرز، مینو، اسٹاک اور کچن دیکھ سکتا ہوں۔ اردو، رومن اردو یا انگلش میں پوچھیں۔',
    print: 'پرنٹ',
    printed: 'پرنٹر کو بھیج دیا',
    printFailed: 'پرنٹ نہیں ہو سکا',
    draftTitle: 'آرڈر کا مسودہ',
    confirm: 'آرڈر کنفرم کریں',
    saving: 'محفوظ ہو رہا ہے…',
    saved: 'آرڈر محفوظ ہو گیا',
    savedNote: 'کچن لسٹ میں پینڈنگ ہے۔ ادائیگی POS سے لیں۔',
    notFound: 'مینو میں نہیں ملا',
    notAvailable: 'دستیاب نہیں',
    total: 'ٹوٹل',
    subtotal: 'سب ٹوٹل',
    discount: 'ڈسکاؤنٹ',
    service: 'سروس چارج',
    tax: 'ٹیکس',
    paid: 'وصول',
    due: 'باقی',
    items: 'آئٹمز',
    table: 'ٹیبل',
    language: 'زبان',
  },
}

function readStoredLanguage() {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return AI_LANGUAGES.some((l) => l.value === value) ? value : 'auto'
  } catch {
    return 'auto'
  }
}

let messageCounter = 0
const nextId = () => `m${Date.now().toString(36)}${(messageCounter += 1)}`

function Money({ value, currency }) {
  return <span className="tabular-nums">{formatMoneyLabel(value, currency)}</span>
}

function Segments({ segments }) {
  return segments.map((seg, i) => (seg.bold ? <strong key={i} className="font-semibold">{seg.text}</strong> : <span key={i}>{seg.text}</span>))
}

function MessageText({ text }) {
  const blocks = useMemo(() => parseBlocks(text), [text])
  return (
    <div dir={textDirection(text)} className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        if (block.type === 'p') {
          return <p key={bi}>{block.items.map((segs, i) => <span key={i}>{i > 0 ? <br /> : null}<Segments segments={segs} /></span>)}</p>
        }
        const List = block.type === 'ol' ? 'ol' : 'ul'
        return (
          <List key={bi} className={cn('space-y-1 ps-5', block.type === 'ol' ? 'list-decimal' : 'list-disc')}>
            {block.items.map((segs, i) => <li key={i}><Segments segments={segs} /></li>)}
          </List>
        )
      })}
    </div>
  )
}

function TotalsRows({ rows, currency, labels }) {
  return (
    <dl className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs dark:border-white/10">
      {rows.filter((r) => r.always || Number(r.value) > 0).map((r) => (
        <div key={r.key} className={cn('flex items-center justify-between gap-3', r.strong && 'text-sm font-bold text-slate-950 dark:text-white')}>
          <dt className="text-slate-500 dark:text-slate-400">{labels[r.key]}{r.suffix || ''}</dt>
          <dd><Money value={r.value} currency={currency} /></dd>
        </div>
      ))}
    </dl>
  )
}

function OrderCard({ card, copy, onPrint }) {
  const { order, currency } = card
  const [state, setState] = useState('')
  const print = async () => {
    setState('busy')
    const out = await onPrint(order)
    setState(out?.ok ? 'ok' : 'fail')
  }
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{order.orderNumber}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {order.type}{order.table ? ` · ${copy.table} ${order.table}` : ''}{order.customer ? ` · ${order.customer}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">{order.orderStatus}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200')}>{order.paymentStatus}</span>
        </div>
      </div>
      <ul className="mt-2 space-y-1 text-xs">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{item.quantity}× {item.name}</span>
            <Money value={item.lineTotal} currency={currency} />
          </li>
        ))}
      </ul>
      <TotalsRows
        currency={currency}
        labels={copy}
        rows={[
          { key: 'subtotal', value: order.subtotal },
          { key: 'discount', value: order.discount },
          { key: 'service', value: order.serviceCharges },
          { key: 'tax', value: order.tax },
          { key: 'total', value: order.total, always: true, strong: true },
          { key: 'paid', value: order.paid },
          { key: 'due', value: order.due },
        ]}
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={print}
          disabled={state === 'busy'}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <HiOutlinePrinter className="h-4 w-4" />
          {copy.print}
        </button>
        {state === 'ok' ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300"><HiOutlineCheckCircle className="h-4 w-4" />{copy.printed}</span> : null}
        {state === 'fail' ? <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-300"><HiOutlineExclamationTriangle className="h-4 w-4" />{copy.printFailed}</span> : null}
      </div>
    </div>
  )
}

function OrderDraftCard({ card, copy, onConfirm }) {
  const { draft, currency, unmatched, unavailable, readyToConfirm, confirmation } = card
  const saving = confirmation?.status === 'saving'
  const saved = confirmation?.status === 'confirmed'
  const canConfirm = typeof onConfirm === 'function' && readyToConfirm && !saving && !saved
  return (
    <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-400/30 dark:bg-violet-500/10">
      <p className="text-sm font-bold text-slate-950 dark:text-white">{copy.draftTitle}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {draft.orderType}{draft.tableName ? ` · ${copy.table} ${draft.tableName}` : ''}{draft.customerName ? ` · ${draft.customerName}` : ''}
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        {draft.lines.map((line, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{line.quantity}× {line.name}{line.note ? ` (${line.note})` : ''}</span>
            <Money value={line.lineTotal} currency={currency} />
          </li>
        ))}
      </ul>
      {unmatched.length || unavailable.length ? (
        <ul className="mt-2 space-y-1 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {unmatched.map((u, i) => (
            <li key={`u${i}`}>“{u.requested}” — {copy.notFound}{u.suggestions?.length ? `: ${u.suggestions.join(', ')}` : ''}</li>
          ))}
          {unavailable.map((u, i) => (
            <li key={`a${i}`}>“{u.item}” — {copy.notAvailable}</li>
          ))}
        </ul>
      ) : null}
      <TotalsRows
        currency={currency}
        labels={copy}
        rows={[
          { key: 'subtotal', value: draft.totals.subtotal },
          { key: 'discount', value: draft.totals.discount },
          { key: 'service', value: draft.totals.serviceCharges },
          { key: 'tax', value: draft.totals.tax, suffix: draft.totals.taxRate > 0 ? ` (${draft.totals.taxLabel} ${draft.totals.taxRate}%)` : '' },
          { key: 'total', value: draft.totals.total, always: true, strong: true },
        ]}
      />
      {saved ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200" dir="auto">
          <p className="flex items-center gap-1.5 font-semibold"><HiOutlineCheckCircle className="h-4 w-4" />{copy.saved}: {confirmation.orderNumber}</p>
          <p className="mt-1 text-[11px]">{copy.savedNote}</p>
        </div>
      ) : (
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm?.(card)}
          className="focus-ring mt-3 w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? copy.saving : copy.confirm}
        </button>
      )}
      {confirmation?.status === 'failed' ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-rose-700 dark:text-rose-300" dir="auto">
          <HiOutlineExclamationTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{confirmation.message}
        </p>
      ) : null}
    </div>
  )
}

function Bubble({ message, copy, onPrint, onConfirmDraft }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[92%] rounded-2xl px-3.5 py-2.5 shadow-sm',
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white'
            : message.error
              ? 'rounded-bl-md border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200'
              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100',
        )}
      >
        <MessageText text={message.text} />
        {(message.cards || []).map((card) => (card.kind === 'order'
          ? <OrderCard key={card.key} card={card} copy={copy} onPrint={onPrint} />
          : <OrderDraftCard key={card.key} card={card} copy={copy} onConfirm={(c) => onConfirmDraft?.(message.id, c)} />))}
      </div>
    </div>
  )
}

export default function NexoraAiChat({ open, onClose }) {
  const { getData, ready, businessName, role, settings, firebaseUser, workspaceId } = useRestaurantAiData({ enabled: true })
  const [languageSetting, setLanguageSetting] = useState(readStoredLanguage)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const abortRef = useRef(null)
  const confirmingRef = useRef(new Set())
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const lastUserText = useMemo(() => [...messages].reverse().find((m) => m.role === 'user')?.text || '', [messages])
  const uiLanguage = effectiveLanguage(languageSetting, lastUserText)
  const copy = COPY[uiLanguage] || COPY['roman-ur']

  useEffect(() => {
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languageSetting) } catch { /* storage unavailable */ }
  }, [languageSetting])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy, status])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(async (raw) => {
    const question = String(raw ?? '').trim()
    if (!question || busy) return
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.text }))
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: question }])
    setInput('')
    setBusy(true)
    setStatus('')
    const controller = new AbortController()
    abortRef.current = controller
    const errorLanguage = effectiveLanguage(languageSetting, question)

    try {
      if (!ready || !firebaseUser) throw new NexoraAiError('no_data')
      const data = await getData()
      const context = {
        businessName,
        currency: data.currency,
        role,
        language: languageSetting,
        todayISO: restaurantBusinessDateKey(new Date(), settings) || new Date().toISOString().slice(0, 10),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi',
      }
      const result = await runNexoraAiTurn({
        history,
        userText: question,
        context,
        signal: controller.signal,
        getToken: (force) => firebaseUser.getIdToken(Boolean(force)),
        runTool: async (name, args) => runRestaurantAiTool(name, args, data, { role }),
        onStatus: ({ tool }) => setStatus(toolStatusLabel(tool, errorLanguage)),
      })
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: result.text, cards: result.cards }])
    } catch (error) {
      const code = error instanceof NexoraAiError ? error.code : 'unknown'
      if (code !== 'aborted') {
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', error: true, text: friendlyError(code, errorLanguage) }])
      }
    } finally {
      setBusy(false)
      setStatus('')
      abortRef.current = null
    }
  }, [businessName, busy, firebaseUser, getData, languageSetting, messages, ready, role, settings])

  const stop = () => abortRef.current?.abort()
  const clear = () => { abortRef.current?.abort(); setMessages([]); setStatus('') }

  const printOrder = useCallback(async (order) => {
    try {
      return await printAiOrder(order, { restaurantName: businessName, settings })
    } catch {
      return { ok: false }
    }
  }, [businessName, settings])

  const setCardConfirmation = useCallback((messageId, cardKey, confirmation) => {
    setMessages((prev) => prev.map((m) => (m.id !== messageId ? m : {
      ...m,
      cards: (m.cards || []).map((c) => (c.key === cardKey ? { ...c, confirmation } : c)),
    })))
  }, [])

  const confirmDraft = useCallback(async (messageId, card) => {
    const requestId = `${workspaceId}:${messageId}:${card.key}`
    if (confirmingRef.current.has(requestId)) return
    confirmingRef.current.add(requestId)
    const lang = effectiveLanguage(languageSetting, lastUserText)
    setCardConfirmation(messageId, card.key, { status: 'saving' })
    try {
      const [orders, sync, data] = await Promise.all([
        import('../../data/restaurantOrders.js'),
        import('../../data/restaurantFirestoreSync.js'),
        getData(),
      ])
      const result = confirmAiOrderDraft(card.draft, {
        data,
        role,
        workspaceId,
        userId: firebaseUser?.uid,
        requestId,
        deps: {
          upsertOrder: orders.upsertRestaurantOrder,
          syncOrder: sync.syncSingleOrderToFirestore,
          posNextOrderNumber: orders.getNextRestaurantOrderNumber,
        },
      })
      if (result.ok) {
        setCardConfirmation(messageId, card.key, { status: 'confirmed', orderNumber: result.orderNumber, total: result.total })
      } else {
        confirmingRef.current.delete(requestId)
        setCardConfirmation(messageId, card.key, { status: 'failed', code: result.code, message: orderConfirmError(result.code, lang) })
      }
    } catch {
      confirmingRef.current.delete(requestId)
      setCardConfirmation(messageId, card.key, { status: 'failed', code: 'save_failed', message: orderConfirmError('save_failed', lang) })
    }
  }, [firebaseUser, getData, languageSetting, lastUserText, role, setCardConfirmation, workspaceId])

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(input)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Nexora AI"
      className={cn(
        'fixed z-[70] flex flex-col overflow-hidden border border-slate-200 bg-slate-50 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-slate-950',
        'inset-x-0 bottom-0 top-14 rounded-t-2xl',
        'sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(42rem,calc(100vh-8rem))] sm:w-[26rem] sm:rounded-2xl',
      )}
    >
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
          <HiSparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white" dir="auto">{copy.title}</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400" dir="auto">{copy.subtitle}</p>
        </div>
        <select
          value={languageSetting}
          onChange={(e) => setLanguageSetting(e.target.value)}
          aria-label={copy.language}
          className="focus-ring max-w-[6.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
        >
          {AI_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <button type="button" onClick={clear} disabled={!messages.length} aria-label={copy.clear} title={copy.clear} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:opacity-40 dark:enabled:hover:bg-white/10 dark:enabled:hover:text-slate-200">
          <HiOutlineTrash className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} aria-label={copy.close} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200">
          <HiOutlineXMark className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!messages.length ? (
          <div className="space-y-4">
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200" dir="auto">{copy.greeting}</div>
            <div className="flex flex-wrap gap-2">
              {suggestionsFor(uiLanguage).map((s) => (
                <button key={s} type="button" disabled={busy} onClick={() => send(s)} dir="auto" className="focus-ring rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-400/30 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-violet-500/10">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => <Bubble key={m.id} message={m} copy={copy} onPrint={printOrder} onConfirmDraft={confirmDraft} />)}

        {busy ? (
          <div className="flex justify-start" aria-live="polite">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" />
              </span>
              <span dir="auto">{status || toolStatusLabel('_default', uiLanguage)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <form
        className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"
        onSubmit={(e) => { e.preventDefault(); send(input) }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          dir="auto"
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          className="focus-ring max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-white"
        />
        {busy ? (
          <button type="button" onClick={stop} aria-label={copy.stop} title={copy.stop} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
            <span className="h-3 w-3 rounded-sm bg-current" />
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} aria-label={copy.send} title={copy.send} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm transition enabled:hover:opacity-90 disabled:opacity-40">
            <HiOutlinePaperAirplane className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        )}
      </form>
    </div>
  )
}
