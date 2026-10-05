import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineBanknotes,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentPlus,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineTrash,
} from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import { confirmAction } from '../components/ui/dialogActions.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useLocalData } from '../hooks/useLocalData.js'
import { printHtmlDocument } from '../lib/printerService.js'
import { currencySymbol } from '../lib/workspaceCurrency.js'
import { formatTransportCurrency, safeMoney } from '../lib/transportCalculations.js'
import {
  INVOICE_STATUSES, LINE_TYPES, QUOTE_STATUSES, TRIP_TYPES,
  computeDocumentTotals, effectiveStatus, lineAmount, summarizeDocuments, todayIso, unitsBetween,
} from '../lib/transportDocuments.js'
import {
  DEFAULT_INVOICE_TERMS, DEFAULT_QUOTE_TERMS, buildTransportDocumentHtml, buildTransportDocumentShareText,
} from '../lib/transportDocumentPrint.js'
import {
  convertQuoteToBooking, convertQuoteToInvoice, deleteTransportDocument, documentTotals, invoiceDraftFromBooking,
  loadTransportDocuments, normalizeTransportDocument, recordTransportDocumentPayment, saveTransportDocument,
  setTransportDocumentStatus, transportDocumentsStorageKey, voidTransportInvoice,
} from '../data/transportDocuments.js'
import { loadTransportVehicles, transportVehiclesStorageKey } from '../data/transportVehicles.js'
import { loadTransportBookings, transportBookingsStorageKey } from '../data/transportBookings.js'
import { loadTransportCustomers, transportCustomersStorageKey, upsertTransportCustomer } from '../data/transportCustomers.js'

const STATUS_BADGE = {
  draft: ['Draft', 'default'], sent: ['Sent', 'info'], accepted: ['Accepted', 'success'], rejected: ['Rejected', 'danger'],
  expired: ['Expired', 'warning'], converted: ['Converted', 'purple'],
  unpaid: ['Unpaid', 'danger'], partial: ['Part paid', 'warning'], paid: ['Paid', 'success'], overdue: ['Overdue', 'danger'], void: ['Void', 'default'],
}
const METHODS = ['Cash', 'Card', 'Bank Transfer', 'JazzCash', 'Easypaisa']
const RATE_TYPES = [['hourly', 'Per hour'], ['daily', 'Per day'], ['weekly', 'Per week']]

const newLineId = () => `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

function blankLine(type = 'vehicle') {
  const meta = LINE_TYPES.find((item) => item.id === type) || LINE_TYPES[LINE_TYPES.length - 1]
  return { id: newLineId(), type, description: type === 'custom' ? '' : meta.label, vehicleId: '', rateType: 'daily', qty: 1, unit: meta.unit, unitRate: 0 }
}

/** Qty and rate for a vehicle / driver line from the chosen vehicle, rate type and trip dates. */
function priceLine(line, draft, vehicles) {
  if (line.type !== 'vehicle' && line.type !== 'driver') return line
  const vehicleId = line.type === 'vehicle' ? line.vehicleId : (draft.lines.find((item) => item.type === 'vehicle')?.vehicleId || '')
  const vehicle = vehicles.find((item) => item.id === vehicleId)
  const rateType = line.type === 'vehicle' ? (line.rateType || 'daily') : (draft.lines.find((item) => item.type === 'vehicle')?.rateType || 'daily')
  const qty = draft.startAt && draft.endAt ? unitsBetween(draft.startAt, draft.endAt, rateType) : line.qty
  const unit = rateType === 'hourly' ? 'hour' : rateType === 'weekly' ? 'week' : 'day'
  if (!vehicle) return { ...line, qty, unit }
  const rate = line.type === 'vehicle'
    ? (rateType === 'hourly' ? vehicle.hourlyRate : rateType === 'weekly' ? vehicle.weeklyRate : vehicle.dailyRate)
    : vehicle.driverRate
  return { ...line, qty, unit, unitRate: rate || line.unitRate, description: line.type === 'vehicle' ? `${vehicle.name}${vehicle.registration ? ` (${vehicle.registration})` : ''}` : line.description }
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}

function Tile({ label, value, hint, tone }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-black tracking-tight ${tone || 'text-slate-950 dark:text-white'}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default function TransportDocumentsPage() {
  const { data: documents } = useLocalData(loadTransportDocuments, [transportDocumentsStorageKey])
  const { data: vehicles } = useLocalData(loadTransportVehicles, [transportVehiclesStorageKey])
  const { data: bookings } = useLocalData(loadTransportBookings, [transportBookingsStorageKey])
  const { data: customers } = useLocalData(loadTransportCustomers, [transportCustomersStorageKey])
  const { settings: business } = useBusinessSettings()

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState(null)
  const [newCustomer, setNewCustomer] = useState(false)
  const [payFor, setPayFor] = useState(null)
  const [pay, setPay] = useState({ amount: '', method: 'Cash', note: '' })
  const [fromBookingOpen, setFromBookingOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const today = todayIso()
  const rows = useMemo(() => documents.map((doc) => {
    const totals = doc.kind === 'invoice' ? documentTotals(doc, bookings) : computeDocumentTotals(doc)
    return { ...doc, totals, shownStatus: effectiveStatus(doc, { today, totals }) }
  }), [documents, bookings, today])
  const summary = useMemo(() => summarizeDocuments(documents.map((doc) => ({ ...doc, totalsOverride: doc.kind === 'invoice' ? documentTotals(doc, bookings) : undefined })), { today }), [documents, bookings, today])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => (tab === 'all' || (tab === 'quotes' ? row.kind === 'quotation' : row.kind === 'invoice'))
      && (statusFilter === 'all' || row.shownStatus === statusFilter)
      && (!needle || [row.number, row.customer, row.phone, row.pickupLocation, row.dropLocation, row.bookingNumber].some((value) => String(value || '').toLowerCase().includes(needle))))
  }, [rows, tab, query, statusFilter])

  const draftTotals = useMemo(() => (draft ? computeDocumentTotals(draft) : null), [draft])
  const billedBookings = useMemo(() => new Set(documents.filter((doc) => doc.kind === 'invoice' && doc.bookingNumber && doc.status !== 'void').map((doc) => doc.bookingNumber)), [documents])
  const bookingsWithoutInvoice = useMemo(() => bookings.filter((booking) => booking.status !== 'cancelled' && !billedBookings.has(booking.bookingNumber)), [bookings, billedBookings])

  const businessInfo = { ...business, businessName: business.businessName || 'Transport / Rental' }
  const fmt = (value) => formatTransportCurrency(value)
  const lockedToBooking = Boolean(draft?.bookingNumber)

  function startNew(kind) {
    const base = normalizeTransportDocument({
      kind,
      terms: kind === 'quotation' ? DEFAULT_QUOTE_TERMS : DEFAULT_INVOICE_TERMS,
      taxRate: safeMoney(business.defaultInvoiceTaxRate),
      lines: [blankLine('vehicle')],
    })
    setNewCustomer(false)
    setError('')
    setDraft(base)
  }

  function openEdit(doc) {
    if (doc.kind === 'invoice' && doc.payments.length && !doc.bookingNumber) {
      setNotice('This invoice already has payments, so only notes can change. Create a new invoice for extra charges.')
    }
    setNewCustomer(false)
    setError('')
    setDraft(JSON.parse(JSON.stringify(doc)))
  }

  function patch(changes) {
    setDraft((current) => {
      const next = { ...current, ...changes }
      if ('startAt' in changes || 'endAt' in changes) next.lines = next.lines.map((line) => priceLine(line, next, vehicles))
      return next
    })
  }

  function patchLine(id, changes) {
    setDraft((current) => {
      const lines = current.lines.map((line) => (line.id === id ? { ...line, ...changes } : line))
      const withPrice = { ...current, lines }
      const touchesPrice = 'vehicleId' in changes || 'rateType' in changes
      return { ...withPrice, lines: touchesPrice ? lines.map((line) => priceLine(line, withPrice, vehicles)) : lines }
    })
  }

  function addLine(type) {
    setDraft((current) => {
      const next = { ...current, lines: [...current.lines, blankLine(type)] }
      next.lines = next.lines.map((line) => (line.type === type && line.id === next.lines[next.lines.length - 1].id ? priceLine(line, next, vehicles) : line))
      return next
    })
  }

  function pickCustomer(id) {
    if (id === 'new') {
      setNewCustomer(true)
      patch({ customerId: '', customer: '', phone: '', address: '', cnic: '', email: '' })
      return
    }
    setNewCustomer(false)
    const customer = customers.find((row) => row.id === id)
    if (customer) patch({ customerId: customer.id, customer: customer.name, phone: customer.phone, address: customer.address, cnic: customer.cnic })
  }

  function save(statusOverride) {
    if (!draft.customer.trim()) return setError('Enter the customer name.')
    if (!draft.lines.some((line) => lineAmount(line) > 0)) return setError('Add at least one charge with a rate.')
    let customerId = draft.customerId
    if (newCustomer || !customerId) {
      const list = upsertTransportCustomer({ name: draft.customer.trim(), phone: draft.phone, address: draft.address, cnic: draft.cnic })
      customerId = list.find((row) => row.name === draft.customer.trim() && row.phone === draft.phone)?.id || list[0]?.id || 'tcust-walkin'
    }
    const saved = saveTransportDocument({ ...draft, customerId, ...(statusOverride ? { status: statusOverride } : {}) })
    setDraft(null)
    setNotice(`${saved.kind === 'quotation' ? 'Quotation' : 'Invoice'} ${saved.number} saved.`)
    return saved
  }

  function printDoc(doc) {
    const totals = doc.kind === 'invoice' ? documentTotals(doc, bookings) : computeDocumentTotals(doc)
    const label = STATUS_BADGE[effectiveStatus(doc, { today, totals })]?.[0] || ''
    printHtmlDocument({ html: buildTransportDocumentHtml(doc, totals, businessInfo, fmt, label), settings: business, paperSize: 'a4' })
  }

  function shareDoc(doc) {
    const totals = doc.kind === 'invoice' ? documentTotals(doc, bookings) : computeDocumentTotals(doc)
    const phone = String(doc.phone || '').replace(/\D/g, '')
    const text = encodeURIComponent(buildTransportDocumentShareText(doc, totals, businessInfo, fmt))
    window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank', 'noopener')
    if (doc.kind === 'quotation' && doc.status === 'draft') setTransportDocumentStatus(doc.id, 'sent')
  }

  async function removeDoc(doc) {
    const ok = await confirmAction({ tone: 'warning', title: `Delete ${doc.number}?`, message: doc.kind === 'invoice' ? 'The amount is also removed from the customer ledger.' : 'This quotation will be removed.', confirmLabel: 'Delete' })
    if (!ok) return
    const result = deleteTransportDocument(doc.id)
    setNotice(result.ok ? `${doc.number} deleted.` : result.error)
  }

  async function voidDoc(doc) {
    const ok = await confirmAction({ tone: 'warning', title: `Void ${doc.number}?`, message: 'The invoice is cancelled and its amount is removed from the customer ledger.', confirmLabel: 'Void invoice' })
    if (!ok) return
    const result = voidTransportInvoice(doc.id)
    setNotice(result.ok ? `${doc.number} voided.` : result.error)
  }

  function toInvoice(doc) {
    const result = convertQuoteToInvoice(doc.id)
    setNotice(result.ok ? `Invoice ${result.invoice.number} created from ${doc.number}.` : result.error)
  }

  function toBooking(doc) {
    const result = convertQuoteToBooking(doc.id, vehicles)
    setNotice(result.ok ? `Booking ${result.bookingNumber} created from ${doc.number}.` : result.error)
  }

  function openPay(doc) {
    setPayFor(doc)
    setPay({ amount: String(Math.round(documentTotals(doc, bookings).balance)), method: 'Cash', note: '' })
    setError('')
  }

  function submitPay() {
    const result = recordTransportDocumentPayment(payFor.id, { amount: safeMoney(pay.amount), method: pay.method, note: pay.note })
    if (!result.ok) return setError(result.error)
    setNotice(`${fmt(result.applied)} received on ${payFor.number}.`)
    setPayFor(null)
  }

  function invoiceFromBooking(booking) {
    const saved = saveTransportDocument(invoiceDraftFromBooking(booking))
    setFromBookingOpen(false)
    setNotice(`Invoice ${saved.number} created for booking ${booking.bookingNumber}.`)
  }

  const tabs = [['all', 'All', rows.length], ['quotes', 'Quotations', summary.quotes], ['invoices', 'Invoices', rows.filter((row) => row.kind === 'invoice').length]]
  const statusOptions = tab === 'quotes' ? QUOTE_STATUSES : tab === 'invoices' ? INVOICE_STATUSES : Array.from(new Set([...QUOTE_STATUSES, ...INVOICE_STATUSES]))

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        title="Quotes & Invoices"
        subtitle="Price a trip or rental, send the quotation, turn it into a booking or invoice, and collect payments. Every payment flows into Rental Payments, the customer ledger and the Fleet Dashboard."
        right={(
          <>
            <Button variant="subtle" onClick={() => setFromBookingOpen(true)}>
              <HiOutlineClipboardDocumentList className="h-4 w-4" /> Invoice from booking
            </Button>
            <Button variant="subtle" onClick={() => startNew('quotation')}>
              <HiOutlineDocumentPlus className="h-4 w-4" /> New Quotation
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => startNew('invoice')}>
              <HiOutlinePlus className="h-4 w-4" /> New Invoice
            </Button>
          </>
        )}
      />

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <div className="crm-auto-grid gap-3">
        <Tile label="Open quotations" value={summary.openQuotes} hint={`${fmt(summary.openQuoteValue)} waiting for a yes`} />
        <Tile label="Quote win rate" value={`${summary.conversionRate}%`} hint={`${summary.acceptedQuotes + summary.convertedQuotes} of ${summary.decidedQuotes} decided`} tone="text-violet-600" />
        <Tile label="Invoiced" value={fmt(summary.invoiced)} hint={`${summary.invoices} invoice(s)`} />
        <Tile label="Collected" value={fmt(summary.collected)} tone="text-emerald-600" hint="against invoices" />
        <Tile label="Outstanding" value={fmt(summary.outstanding)} tone="text-rose-600" hint={summary.overdue ? `${summary.overdue} overdue (${fmt(summary.overdueAmount)})` : 'nothing overdue'} />
      </div>

      <Card className="rounded-[1.35rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {tabs.map(([key, label, count]) => (
              <button key={key} type="button" onClick={() => { setTab(key); setStatusFilter('all') }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${tab === key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-white dark:text-slate-300'}`}>
                {label} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
          <Input className="w-full sm:w-64" placeholder="Search number, customer, route…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select className="w-full sm:w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{STATUS_BADGE[status]?.[0] || status}</option>)}
          </Select>
        </div>

        <div className="mt-4 space-y-2.5">
          {visible.length ? visible.map((row) => {
            const [label, variant] = STATUS_BADGE[row.shownStatus] || [row.shownStatus, 'default']
            const isQuote = row.kind === 'quotation'
            const route = [row.pickupLocation, row.dropLocation].filter(Boolean).join(' → ')
            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-cyan-200 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${isQuote ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600' : 'bg-gradient-to-br from-cyan-500 to-teal-600'}`}>
                      <HiOutlineDocumentText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-slate-950 dark:text-white">{row.number}</p>
                        <Badge variant={variant}>{label}</Badge>
                        {row.bookingNumber ? <Badge variant="info">Booking {row.bookingNumber}</Badge> : null}
                        {row.convertedTo ? <span className="text-xs text-slate-500">→ {row.convertedTo}</span> : null}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-700 dark:text-slate-200">{row.customer}{row.phone ? ` • ${row.phone}` : ''}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[route, TRIP_TYPES.find((item) => item.id === row.tripType)?.label, isQuote ? `valid until ${row.validUntil}` : `due ${row.dueDate}`].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-black text-slate-950 dark:text-white">{fmt(row.totals.total)}</p>
                    {!isQuote ? (
                      row.totals.balance > 0
                        ? <p className="text-xs font-semibold text-rose-600">Balance {fmt(row.totals.balance)}</p>
                        : <p className="text-xs font-semibold text-emerald-600">Fully paid</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Button variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => printDoc(row)}><HiOutlinePrinter className="h-4 w-4" /> Print / PDF</Button>
                  <Button variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => shareDoc(row)}><HiOutlineChatBubbleLeftRight className="h-4 w-4" /> WhatsApp</Button>
                  {!row.bookingNumber && row.status !== 'void' && row.shownStatus !== 'converted' ? (
                    <Button variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => openEdit(row)}><HiOutlinePencilSquare className="h-4 w-4" /> Edit</Button>
                  ) : null}
                  {isQuote && row.shownStatus !== 'converted' ? (
                    <>
                      <Select className="h-8 w-32 px-2 text-xs" value={QUOTE_STATUSES.includes(row.status) ? row.status : 'draft'} onChange={(event) => setTransportDocumentStatus(row.id, event.target.value)} aria-label="Quotation status">
                        {['draft', 'sent', 'accepted', 'rejected'].map((status) => <option key={status} value={status}>{STATUS_BADGE[status][0]}</option>)}
                      </Select>
                      <Button variant="subtle" className="h-8 px-2.5 text-xs text-cyan-700" onClick={() => toInvoice(row)}>Make invoice</Button>
                      <Button variant="subtle" className="h-8 px-2.5 text-xs text-cyan-700" onClick={() => toBooking(row)}>Make booking</Button>
                    </>
                  ) : null}
                  {!isQuote && row.status !== 'void' && row.totals.balance > 0 ? (
                    <Button className="h-8 bg-emerald-600 px-3 text-xs hover:bg-emerald-700" onClick={() => openPay(row)}><HiOutlineBanknotes className="h-4 w-4" /> Collect payment</Button>
                  ) : null}
                  <span className="flex-1" />
                  {!isQuote && !row.bookingNumber && row.status !== 'void' && !row.payments.length ? (
                    <Button variant="ghost" className="h-8 px-2.5 text-xs text-amber-700" onClick={() => voidDoc(row)}>Void</Button>
                  ) : null}
                  {(isQuote || !row.payments.length) ? (
                    <Button variant="ghost" className="h-8 px-2 text-xs text-rose-600" onClick={() => removeDoc(row)} aria-label={`Delete ${row.number}`}><HiOutlineTrash className="h-4 w-4" /></Button>
                  ) : null}
                </div>
              </div>
            )
          }) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
              {documents.length ? 'Nothing matches these filters.' : 'No quotations or invoices yet. Start with a New Quotation to price a trip.'}
            </div>
          )}
        </div>
      </Card>

      {draft ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-4 text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">{draft.kind === 'quotation' ? 'Quotation' : 'Invoice'} {draft.number || '(new)'}</p>
                <h2 className="text-lg font-black tracking-tight">{documents.some((doc) => doc.id === draft.id) ? 'Edit' : 'Create'} {draft.kind === 'quotation' ? 'quotation' : 'invoice'}</h2>
              </div>
              <button type="button" onClick={() => setDraft(null)} className="rounded-lg px-2 py-1 text-sm font-semibold text-white/80 hover:bg-white/15">✕</button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0 space-y-5">
                <section>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Customer</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Rental customer">
                      <Select value={newCustomer ? 'new' : draft.customerId} onChange={(event) => pickCustomer(event.target.value)}>
                        <option value="">Select customer</option>
                        {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` • ${customer.phone}` : ''}</option>)}
                        <option value="new">+ New customer</option>
                      </Select>
                    </Field>
                    <Field label="Customer name *"><Input value={draft.customer} onChange={(event) => patch({ customer: event.target.value })} placeholder="Person or company" /></Field>
                    <Field label="Phone / WhatsApp"><Input value={draft.phone} onChange={(event) => patch({ phone: event.target.value })} placeholder="03xx xxxxxxx" /></Field>
                    <Field label="Email"><Input value={draft.email} onChange={(event) => patch({ email: event.target.value })} /></Field>
                    <Field label="Address" className="sm:col-span-2"><Input value={draft.address} onChange={(event) => patch({ address: event.target.value })} /></Field>
                  </div>
                </section>

                <section>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Trip</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Trip type">
                      <Select value={draft.tripType} onChange={(event) => patch({ tripType: event.target.value })}>
                        {TRIP_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </Select>
                    </Field>
                    <Field label={draft.kind === 'quotation' ? 'Valid until' : 'Due date'}>
                      <Input type="date" value={draft.kind === 'quotation' ? draft.validUntil : draft.dueDate} onChange={(event) => patch(draft.kind === 'quotation' ? { validUntil: event.target.value } : { dueDate: event.target.value })} />
                    </Field>
                    <Field label="Pickup location"><Input value={draft.pickupLocation} onChange={(event) => patch({ pickupLocation: event.target.value })} placeholder="e.g. Lahore airport" /></Field>
                    <Field label="Drop-off location"><Input value={draft.dropLocation} onChange={(event) => patch({ dropLocation: event.target.value })} placeholder="e.g. Murree" /></Field>
                    <Field label="Start"><Input type="datetime-local" value={draft.startAt} onChange={(event) => patch({ startAt: event.target.value })} /></Field>
                    <Field label="End"><Input type="datetime-local" value={draft.endAt} onChange={(event) => patch({ endAt: event.target.value })} /></Field>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Pick a vehicle and dates: days and the rate are filled in for you from your fleet.</p>
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Charges</p>
                  </div>
                  <div className="space-y-2.5">
                    {draft.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                          <Select value={line.type} onChange={(event) => { const meta = LINE_TYPES.find((item) => item.id === event.target.value); patchLine(line.id, { type: event.target.value, unit: meta?.unit || 'item', description: event.target.value === 'custom' ? '' : meta?.label || '' }) }}>
                            {LINE_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                          </Select>
                          {line.type === 'vehicle' ? (
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
                              <Select value={line.vehicleId} onChange={(event) => patchLine(line.id, { vehicleId: event.target.value })}>
                                <option value="">Select vehicle from fleet</option>
                                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name} {vehicle.registration ? `(${vehicle.registration})` : ''}</option>)}
                              </Select>
                              <Select value={line.rateType || 'daily'} onChange={(event) => patchLine(line.id, { rateType: event.target.value })}>
                                {RATE_TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                              </Select>
                            </div>
                          ) : (
                            <Input value={line.description} onChange={(event) => patchLine(line.id, { description: event.target.value })} placeholder="Description" />
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                          <Field label={`Qty${line.unit ? ` (${line.unit})` : ''}`}><Input type="number" min="0" step="any" value={line.qty} onChange={(event) => patchLine(line.id, { qty: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
                          <Field label={`Rate (${currencySymbol()})`}><Input type="number" min="0" step="any" value={line.unitRate} onChange={(event) => patchLine(line.id, { unitRate: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
                          <div><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Amount</span><p className="flex h-10 items-center text-sm font-black text-slate-950 dark:text-white">{fmt(lineAmount(line))}</p></div>
                          <Button variant="ghost" className="h-10 px-2 text-rose-600" disabled={draft.lines.length <= 1} onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((item) => item.id !== line.id) }))} aria-label="Remove charge"><HiOutlineTrash className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {LINE_TYPES.map((item) => <Button key={item.id} variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => addLine(item.id)}>+ {item.label}</Button>)}
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <Field label="Notes (shown on the document)" className="sm:col-span-2"><textarea className="min-h-[70px] w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/80" value={draft.notes} onChange={(event) => patch({ notes: event.target.value })} /></Field>
                  <Field label="Terms" className="sm:col-span-2"><textarea className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/80" value={draft.terms} onChange={(event) => patch({ terms: event.target.value })} /></Field>
                </section>
              </div>

              <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Adjustments</p>
                  <div className="grid grid-cols-[1fr_6.5rem] gap-2">
                    <Field label="Discount"><Input type="number" min="0" step="any" value={draft.discount} onChange={(event) => patch({ discount: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
                    <Field label="Type"><Select value={draft.discountType} onChange={(event) => patch({ discountType: event.target.value })}><option value="amount">{currencySymbol()}</option><option value="percent">%</option></Select></Field>
                    <Field label="Tax %"><Input type="number" min="0" step="any" value={draft.taxRate} onChange={(event) => patch({ taxRate: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
                    <Field label="Tax name"><Input value={draft.taxLabel} onChange={(event) => patch({ taxLabel: event.target.value })} /></Field>
                  </div>
                  <Field label="Refundable security deposit" className="mt-2"><Input type="number" min="0" step="any" value={draft.securityDeposit} onChange={(event) => patch({ securityDeposit: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
                </div>

                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="flex justify-between text-sm"><span className="text-slate-300">Subtotal</span><span>{fmt(draftTotals.subtotal)}</span></div>
                  {draftTotals.discount > 0 ? <div className="mt-1 flex justify-between text-sm"><span className="text-slate-300">Discount</span><span>- {fmt(draftTotals.discount)}</span></div> : null}
                  {draftTotals.tax > 0 ? <div className="mt-1 flex justify-between text-sm"><span className="text-slate-300">{draft.taxLabel || 'Tax'} ({draft.taxRate}%)</span><span>{fmt(draftTotals.tax)}</span></div> : null}
                  <div className="mt-3 flex items-end justify-between border-t border-white/15 pt-3"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Total</span><span className="text-2xl font-black">{fmt(draftTotals.total)}</span></div>
                  {draftTotals.securityDeposit > 0 ? <p className="mt-2 text-xs text-slate-400">+ {fmt(draftTotals.securityDeposit)} refundable deposit (not in the total)</p> : null}
                  {draft.kind === 'invoice' && draft.payments.length ? <p className="mt-2 text-xs text-emerald-300">Paid {fmt(draftTotals.paid)} • Balance {fmt(computeDocumentTotals({ ...draft, payments: draft.payments }).balance)}</p> : null}
                </div>
                {lockedToBooking ? <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">This invoice belongs to booking {draft.bookingNumber}. Its amounts come from the booking.</p> : null}
                {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
                <div className="flex flex-col gap-2">
                  {draft.kind === 'quotation' ? <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => save()}>Save quotation</Button> : <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => save()}>Save invoice</Button>}
                  <Button variant="subtle" onClick={() => setDraft(null)}>Cancel</Button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {payFor ? (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">{payFor.number}</p>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Collect payment</h2>
              <p className="text-xs text-slate-500">{payFor.customer} • balance {fmt(documentTotals(payFor, bookings).balance)}</p>
            </div>
            <div className="grid gap-3 p-5">
              <Field label={`Amount (${currencySymbol()})`}><Input type="number" min="0" value={pay.amount} onChange={(event) => setPay({ ...pay, amount: event.target.value })} /></Field>
              <Field label="Method"><Select value={pay.method} onChange={(event) => setPay({ ...pay, method: event.target.value })}>{METHODS.map((method) => <option key={method}>{method}</option>)}</Select></Field>
              <Field label="Note"><Input value={pay.note} onChange={(event) => setPay({ ...pay, note: event.target.value })} placeholder="Optional" /></Field>
              {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <Button variant="subtle" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitPay}>Save payment</Button>
            </div>
          </div>
        </div>
      ) : null}

      {fromBookingOpen ? (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <div><h2 className="text-lg font-black text-slate-950 dark:text-white">Invoice from a booking</h2><p className="text-xs text-slate-500">Bookings that have no invoice yet. Amounts stay the booking's.</p></div>
              <button type="button" onClick={() => setFromBookingOpen(false)} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {bookingsWithoutInvoice.length ? bookingsWithoutInvoice.map((booking) => (
                <button key={booking.bookingNumber} type="button" onClick={() => invoiceFromBooking(booking)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3 text-left hover:border-cyan-300 hover:bg-cyan-50/40 dark:border-slate-700">
                  <div className="min-w-0"><p className="text-sm font-bold text-slate-900 dark:text-white">{booking.bookingNumber} • {booking.customer}</p><p className="truncate text-xs text-slate-500">{booking.vehicleName} • {booking.pickupDate} → {booking.returnDate}</p></div>
                  <div className="shrink-0 text-right"><p className="text-sm font-black">{fmt(booking.total)}</p>{booking.dueAmount > 0 ? <p className="text-xs font-semibold text-rose-600">Due {fmt(booking.dueAmount)}</p> : <p className="text-xs font-semibold text-emerald-600">Paid</p>}</div>
                </button>
              )) : <p className="py-8 text-center text-sm text-slate-400">Every booking already has an invoice.</p>}
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
