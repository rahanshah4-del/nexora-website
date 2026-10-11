import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  HiSparkles,
  HiOutlineXMark,
  HiOutlinePaperAirplane,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiChevronDown,
} from 'react-icons/hi2'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../utils/cn.js'
import { runRestaurantAiTool } from '../../ai/restaurantAiTools.js'
import { NexoraAiError, runNexoraAiTurn } from '../../ai/nexoraAiClient.js'
import { answerLocally } from '../../ai/nexoraAiEngine.js'
import { notUnderstood } from '../../ai/nexoraAiAnswers.js'
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

import './nexoraAi.css'

const LANGUAGE_STORAGE_KEY = 'nexora.ai.language.v1'

const COPY = {
  en: {
    title: 'Nexora AI',
    subtitle: 'Your restaurant assistant',
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
    subtitle: 'Aap ka restaurant assistant',
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
    subtitle: 'آپ کا ریسٹورنٹ اسسٹنٹ',
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
    <div className="mt-2.5 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-3.5 shadow-sm dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.02]">
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
    <div className="mt-2.5 rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50 to-fuchsia-50/50 p-3.5 shadow-sm dark:border-violet-400/30 dark:from-violet-500/15 dark:to-fuchsia-500/5">
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
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className="mt-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 text-xs text-emerald-800 shadow-[0_10px_24px_-16px_rgba(16,185,129,0.8)] dark:border-emerald-400/30 dark:from-emerald-500/15 dark:to-teal-500/10 dark:text-emerald-200"
          dir="auto"
        >
          <p className="flex items-center gap-2 font-semibold">
            <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }} className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
              <HiOutlineCheckCircle className="h-4 w-4" />
            </motion.span>
            {copy.saved}: {confirmation.orderNumber}
          </p>
          <p className="mt-1.5 text-[11px] opacity-90">{copy.savedNote}</p>
        </motion.div>
      ) : (
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm?.(card)}
          className="focus-ring mt-3 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2.5 text-xs font-semibold text-white shadow-[0_12px_26px_-12px_rgba(124,58,237,0.9)] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_16px_30px_-12px_rgba(124,58,237,1)] enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
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

function Orb({ size = 36, breathe = false, className = '' }) {
  return (
    <span className={cn('nx-ai-orb grid shrink-0 place-items-center text-white', breathe && 'nx-ai-orb-breathe', className)} style={{ width: size, height: size }} aria-hidden="true">
      <HiSparkles style={{ width: size * 0.46, height: size * 0.46 }} className="relative z-10 drop-shadow-sm" />
    </span>
  )
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 640px)').matches : true))
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(min-width: 640px)')
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return desktop
}

function Bubble({ message, copy, onPrint, onConfirmDraft, reduceMotion }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      layout="position"
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn('flex items-start gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser ? <Orb size={26} className="mt-0.5" /> : null}
      <div
        className={cn(
          'max-w-[88%] px-3.5 py-2.5',
          isUser
            ? 'nx-ai-bubble-user rounded-2xl rounded-br-md text-white'
            : message.error
              ? 'rounded-2xl rounded-bl-md border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200'
              : 'nx-ai-bubble-ai rounded-2xl rounded-bl-md text-slate-800 dark:text-slate-100',
        )}
      >
        <MessageText text={message.text} />
        {(message.cards || []).map((card) => (card.kind === 'order'
          ? <OrderCard key={card.key} card={card} copy={copy} onPrint={onPrint} />
          : <OrderDraftCard key={card.key} card={card} copy={copy} onConfirm={(c) => onConfirmDraft?.(message.id, c)} />))}
      </div>
    </motion.div>
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
  const engineContextRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()
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
      if (!ready) throw new NexoraAiError('no_data')
      const data = await getData()

      // 1. Free local engine: answers straight from the POS data, no AI service.
      const local = answerLocally(question, data, { role, language: languageSetting, context: engineContextRef.current })
      if (local) {
        engineContextRef.current = local.context
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: local.text, cards: local.cards }])
        return
      }

      // 2. Not understood locally: ask the AI service when it is available.
      if (!firebaseUser) throw new NexoraAiError('not_understood')
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
        // The AI service is only a bonus: when it is down, say what the free engine can do.
        const soft = ['unavailable', 'network', 'rate', 'auth', 'not_understood', 'too_many_steps'].includes(code)
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', error: !soft, text: soft ? notUnderstood(errorLanguage) : friendlyError(code, errorLanguage) }])
      }
    } finally {
      setBusy(false)
      setStatus('')
      abortRef.current = null
    }
  }, [businessName, busy, firebaseUser, getData, languageSetting, messages, ready, role, settings])

  const stop = () => abortRef.current?.abort()
  const clear = () => { abortRef.current?.abort(); setMessages([]); setStatus(''); engineContextRef.current = null }

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

  const fade = reduceMotion ? { duration: 0.01 } : null
  const panelMotion = isDesktop
    ? {
        initial: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86, y: 28, filter: 'blur(12px)' },
        animate: reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
        exit: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 18, filter: 'blur(8px)', transition: { duration: 0.18, ease: 'easeIn' } },
        transition: fade || { type: 'spring', stiffness: 300, damping: 27, mass: 0.9 },
        style: { transformOrigin: 'bottom right' },
      }
    : {
        initial: reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.6 },
        animate: reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 },
        exit: reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.6, transition: { duration: 0.22, ease: 'easeIn' } },
        transition: fade || { type: 'spring', stiffness: 320, damping: 34 },
      }
  const stagger = (i) => (reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 300, damping: 26, delay: 0.18 + i * 0.045 })

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="nx-ai-backdrop"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.25 }}
            className="fixed inset-0 z-[69] bg-slate-950/35 backdrop-blur-[3px] sm:hidden"
          />
          <motion.div
            key="nx-ai-panel"
            role="dialog"
            aria-label="Nexora AI"
            {...panelMotion}
            className={cn(
              'nx-ai-panel fixed z-[70] flex flex-col overflow-hidden border border-white/60 dark:border-white/10',
              'inset-x-0 bottom-0 top-14 rounded-t-3xl',
              'sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(42rem,calc(100vh-8rem))] sm:w-[26.5rem] sm:rounded-3xl',
            )}
          >
            <div className="nx-ai-sheen" aria-hidden="true" />

            <header className="nx-ai-aurora relative flex items-center gap-3 border-b border-slate-200/70 px-4 py-3.5 dark:border-white/10">
              <Orb size={40} breathe />
              <div className="relative min-w-0 flex-1">
                <p className="nx-ai-gradient-text truncate text-[15px] font-extrabold tracking-tight" dir="auto">{copy.title}</p>
                <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500 dark:text-slate-400" dir="auto">
                  <span className="nx-ai-online shrink-0" aria-hidden="true" />
                  <span className="truncate">{copy.subtitle}</span>
                </p>
              </div>
              <div className="relative">
                <select
                  value={languageSetting}
                  onChange={(e) => setLanguageSetting(e.target.value)}
                  aria-label={copy.language}
                  className="focus-ring w-[5.6rem] cursor-pointer appearance-none !bg-none truncate rounded-xl border border-slate-200/80 bg-white/70 py-1.5 !ps-2.5 !pe-6 text-xs font-medium text-slate-700 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                >
                  {AI_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <HiChevronDown className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </div>
              <button type="button" onClick={clear} disabled={!messages.length} aria-label={copy.clear} title={copy.clear} className="focus-ring relative grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition enabled:hover:bg-white/80 enabled:hover:text-slate-700 disabled:opacity-35 dark:enabled:hover:bg-white/10 dark:enabled:hover:text-slate-200">
                <HiOutlineTrash className="h-4 w-4" />
              </button>
              <button type="button" onClick={onClose} aria-label={copy.close} className="focus-ring relative grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-white/80 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200">
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </header>

            <div ref={scrollRef} className="nx-ai-scroll min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
              {!messages.length ? (
                <div className="flex flex-col items-center pt-3 text-center">
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.4, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
                  >
                    <Orb size={68} breathe />
                  </motion.div>
                  <motion.p
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={stagger(0)}
                    className="mt-4 max-w-[19rem] text-sm leading-relaxed text-slate-600 dark:text-slate-300"
                    dir="auto"
                  >
                    {copy.greeting}
                  </motion.p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {suggestionsFor(uiLanguage).map((s, i) => (
                      <motion.button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => send(s)}
                        dir="auto"
                        initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={stagger(i + 1)}
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        className="nx-ai-chip focus-ring px-3.5 py-1.5 text-xs font-medium text-violet-700 disabled:opacity-50 dark:text-violet-200"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m) => <Bubble key={m.id} message={m} copy={copy} onPrint={printOrder} onConfirmDraft={confirmDraft} reduceMotion={reduceMotion} />)}

              <AnimatePresence>
                {busy ? (
                  <motion.div
                    key="thinking"
                    className="flex items-center gap-2"
                    aria-live="polite"
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  >
                    <Orb size={26} breathe />
                    <div className="nx-ai-bubble-ai inline-flex items-center gap-2.5 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-xs">
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="nx-ai-dot" />
                        <span className="nx-ai-dot" />
                        <span className="nx-ai-dot" />
                      </span>
                      <span className="nx-ai-status font-medium" dir="auto">{status || toolStatusLabel('_default', uiLanguage)}</span>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <form
              className="border-t border-slate-200/70 bg-white/50 p-3 dark:border-white/10 dark:bg-white/[0.02]"
              onSubmit={(e) => { e.preventDefault(); send(input) }}
            >
              <div className="nx-ai-composer flex items-end gap-2 rounded-2xl p-1.5 ps-3">
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
                  className="max-h-28 min-h-[2.25rem] flex-1 resize-none bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
                <AnimatePresence mode="wait" initial={false}>
                  {busy ? (
                    <motion.button
                      key="stop"
                      type="button"
                      onClick={stop}
                      aria-label={copy.stop}
                      title={copy.stop}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900"
                    >
                      <span className="h-3 w-3 rounded-sm bg-current" />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="send"
                      type="submit"
                      disabled={!input.trim()}
                      aria-label={copy.send}
                      title={copy.send}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: input.trim() ? 1 : 0.92, opacity: input.trim() ? 1 : 0.45 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_10px_22px_-10px_rgba(124,58,237,0.95)]"
                    >
                      <HiOutlinePaperAirplane className="h-4 w-4 rtl:-scale-x-100" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
