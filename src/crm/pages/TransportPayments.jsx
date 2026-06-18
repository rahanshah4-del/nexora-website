import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineBanknotes,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlinePrinter,
  HiOutlinePlus,
} from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import {
  buildTransportFinanceSummary,
  formatTransportCurrency,
  formatTransportSignedCurrency,
  isTransportRefundPayment,
  safeMoney,
} from '../lib/transportCalculations.js'
import { loadTransportPayments, recordTransportPayment } from '../data/transportPayments.js'
import { loadTransportBookings, upsertTransportBooking, updateBookingStatus, syncVehiclesWithBookings } from '../data/transportBookings.js'
import { loadTransportCustomers, applyTransportCustomerLedger, saveTransportCustomers } from '../data/transportCustomers.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { printHtmlDocument } from '../lib/printerService.js'

const methodMeta = {
  Cash: 'success',
  Card: 'info',
  'Bank Transfer': 'purple',
  JazzCash: 'warning',
  Easypaisa: 'warning',
}

const statusMeta = {
  reserved: { label: 'Reserved', badge: 'info' },
  active: { label: 'Active', badge: 'warning' },
  returned: { label: 'Returned', badge: 'success' },
  cancelled: { label: 'Cancelled', badge: 'danger' },
}

const paymentStatusMeta = {
  paid: { label: 'Paid', badge: 'success' },
  partial: { label: 'Partial', badge: 'warning' },
  due: { label: 'Due', badge: 'danger' },
  cancelled: { label: 'Cancelled', badge: 'danger' },
  refunded: { label: 'Refunded', badge: 'danger' },
  'partial-refund': { label: 'Partial Refund', badge: 'warning' },
}

const closedPaymentStatuses = new Set(['cancelled', 'refunded'])

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

function buildPaymentReceiptHtml(payment, booking) {
  const isRefund = isTransportRefundPayment(payment)
  const amountText = isRefund ? formatTransportSignedCurrency(-payment.amount) : formatTransportCurrency(payment.amount)
  return `<!doctype html>
  <html>
    <head>
      <title>${escapeHtml(payment.id)} Rental Payment Receipt</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
        .doc { max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
        .head { padding: 20px; background: ${isRefund ? '#881337' : '#0f766e'}; color: white; display: flex; justify-content: space-between; gap: 16px; }
        .eyebrow { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: ${isRefund ? '#fecdd3' : '#99f6e4'}; font-weight: 800; }
        h1 { margin: 6px 0 0; font-size: 22px; }
        .body { padding: 20px; }
        .row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e2e8f0; padding: 9px 0; font-size: 14px; }
        .row strong { text-align: right; }
        .total { margin-top: 14px; border: 2px solid ${isRefund ? '#881337' : '#0f766e'}; border-radius: 14px; padding: 14px; display: flex; justify-content: space-between; font-size: 20px; font-weight: 900; color: ${isRefund ? '#881337' : '#0f766e'}; }
        .note { margin-top: 14px; border-radius: 14px; background: #f8fafc; padding: 12px; color: #475569; font-size: 13px; font-weight: 700; }
        .footer { padding: 14px 20px; background: #f8fafc; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
        @media print { body { padding: 0; } .doc { border: none; border-radius: 0; } }
      </style>
    </head>
    <body>
      <section class="doc">
        <div class="head">
          <div>
            <div class="eyebrow">Transport / Rental</div>
            <h1>${isRefund ? 'Refund Receipt' : 'Payment Receipt'}</h1>
          </div>
          <div style="text-align:right">
            <div class="eyebrow">Payment</div>
            <h1>${escapeHtml(payment.id)}</h1>
          </div>
        </div>
        <div class="body">
          <div class="row"><span>Booking</span><strong>${escapeHtml(payment.bookingNumber || '-')}</strong></div>
          <div class="row"><span>Customer</span><strong>${escapeHtml(payment.customer || booking?.customer || '-')}</strong></div>
          <div class="row"><span>Vehicle</span><strong>${escapeHtml(booking?.vehicleName || '-')}</strong></div>
          <div class="row"><span>Type</span><strong>${escapeHtml(isRefund ? 'Refund' : payment.type)}</strong></div>
          <div class="row"><span>Method</span><strong>${escapeHtml(payment.method)}</strong></div>
          <div class="row"><span>Date</span><strong>${escapeHtml(`${payment.date} ${payment.time}`)}</strong></div>
          <div class="row"><span>Status</span><strong>${escapeHtml(booking?.status || '-')}</strong></div>
          <div class="total"><span>${isRefund ? 'Refunded' : 'Received'}</span><span>${escapeHtml(amountText)}</span></div>
          ${payment.note ? `<div class="note">Note: ${escapeHtml(payment.note)}</div>` : ''}
        </div>
        <div class="footer"><span>NEXORA SOLUTION</span><span>ALL RIGHTS RESERVED 2019-2026</span></div>
      </section>
    </body>
  </html>`
}

function buildPayment58mmReceiptHtml(payment, booking) {
  const isRefund = isTransportRefundPayment(payment)
  const amountText = isRefund ? formatTransportSignedCurrency(-payment.amount) : formatTransportCurrency(payment.amount)
  return `<!doctype html>
  <html>
    <head>
      <title>${escapeHtml(payment.id)} 58mm</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: 58mm auto; margin: 0; }
        body { margin: 0; width: 58mm; background: #fff; color: #111827; font-family: Arial, sans-serif; font-size: 10px; }
        .receipt { width: 58mm; padding: 8px 7px; }
        .center { text-align: center; }
        .brand { font-size: 13px; font-weight: 900; letter-spacing: .08em; }
        .muted { color: #475569; }
        .line { border-top: 1px dashed #111827; margin: 7px 0; }
        .row { display: flex; justify-content: space-between; gap: 6px; padding: 2px 0; }
        .row span:first-child { color: #475569; }
        .row strong { text-align: right; }
        .total { margin-top: 7px; border: 1px solid ${isRefund ? '#be123c' : '#047857'}; padding: 6px; color: ${isRefund ? '#be123c' : '#047857'}; font-size: 12px; font-weight: 900; }
        .status { display: inline-block; margin-top: 4px; border: 1px solid #111827; border-radius: 999px; padding: 2px 7px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
        .note { margin-top: 7px; font-weight: 700; }
        .footer { margin-top: 8px; text-align: center; font-size: 9px; }
        @media print { body { width: 58mm; } }
      </style>
    </head>
    <body>
      <section class="receipt">
        <div class="center">
          <div class="brand">NEXORA SOLUTION</div>
          <div class="muted">Transport / Rental</div>
          <div class="status">${escapeHtml(isRefund ? 'Refund Receipt' : 'Payment Receipt')}</div>
        </div>
        <div class="line"></div>
        <div class="row"><span>Receipt</span><strong>${escapeHtml(payment.id)}</strong></div>
        <div class="row"><span>Booking</span><strong>${escapeHtml(payment.bookingNumber || '-')}</strong></div>
        <div class="row"><span>Customer</span><strong>${escapeHtml(payment.customer || booking?.customer || '-')}</strong></div>
        <div class="row"><span>Vehicle</span><strong>${escapeHtml(booking?.vehicleName || '-')}</strong></div>
        <div class="row"><span>Type</span><strong>${escapeHtml(isRefund ? 'Refund' : payment.type)}</strong></div>
        <div class="row"><span>Method</span><strong>${escapeHtml(payment.method)}</strong></div>
        <div class="row"><span>Date</span><strong>${escapeHtml(`${payment.date} ${payment.time}`)}</strong></div>
        <div class="row"><span>Status</span><strong>${escapeHtml(booking?.status || '-')}</strong></div>
        <div class="total row"><span>${isRefund ? 'Refunded' : 'Received'}</span><strong>${escapeHtml(amountText)}</strong></div>
        ${payment.note ? `<div class="note">Note: ${escapeHtml(payment.note)}</div>` : ''}
        <div class="line"></div>
        <div class="footer">Powered by Nexora<br/>ALL RIGHTS RESERVED 2019-2026</div>
      </section>
    </body>
  </html>`
}

export default function TransportPaymentsPage() {
  const { settings: businessSettings } = useBusinessSettings()
  const [payments, setPayments] = useState(() => loadTransportPayments())
  const [bookings, setBookings] = useState(() => loadTransportBookings())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ bookingNumber: '', amount: '', method: 'Cash', type: 'rental', note: '' })
  const [warning, setWarning] = useState('')
  const [statusBookingNumber, setStatusBookingNumber] = useState('')
  const [statusValue, setStatusValue] = useState('reserved')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setBookings(loadTransportBookings())
  }, [payments])

  useEffect(() => {
    function reloadLatestLedger() {
      setPayments(loadTransportPayments())
      setBookings(loadTransportBookings())
    }
    window.addEventListener('focus', reloadLatestLedger)
    document.addEventListener('visibilitychange', reloadLatestLedger)
    return () => {
      window.removeEventListener('focus', reloadLatestLedger)
      document.removeEventListener('visibilitychange', reloadLatestLedger)
    }
  }, [])

  const dueBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== 'cancelled' && booking.dueAmount > 0),
    [bookings],
  )

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const finance = buildTransportFinanceSummary({ bookings, payments })
    const todayPayments = finance.activePayments.filter((payment) => payment.date === today)
    const todayGross = todayPayments
      .filter((payment) => !isTransportRefundPayment(payment))
      .reduce((sum, payment) => sum + payment.amount, 0)
    const todayRefunds = todayPayments
      .filter((payment) => isTransportRefundPayment(payment))
      .reduce((sum, payment) => sum + payment.amount, 0)
    return {
      collected: finance.netCollected,
      grossCollected: finance.grossCollected,
      refunds: finance.totalRefunds,
      today: Math.max(0, todayGross - todayRefunds),
      outstanding: finance.outstandingDues,
    }
  }, [bookings, payments])

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.bookingNumber === form.bookingNumber),
    [bookings, form.bookingNumber],
  )
  const bookingByNumber = useMemo(() => new Map(bookings.map((booking) => [booking.bookingNumber, booking])), [bookings])
  const statusBooking = useMemo(
    () => bookings.find((booking) => booking.bookingNumber === statusBookingNumber),
    [bookings, statusBookingNumber],
  )

  useEffect(() => {
    if (!statusBookingNumber && bookings[0]) {
      setStatusBookingNumber(bookings[0].bookingNumber)
      setStatusValue(bookings[0].status)
    }
  }, [bookings, statusBookingNumber])

  function openModal(booking = null) {
    setWarning('')
    setForm({
      bookingNumber: booking?.bookingNumber || dueBookings[0]?.bookingNumber || '',
      amount: booking ? String(Math.round(booking.dueAmount)) : '',
      method: 'Cash',
      type: 'rental',
      note: '',
    })
    setModalOpen(true)
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  function refreshBookings() {
    syncVehiclesWithBookings()
    setBookings(loadTransportBookings())
    setPayments(loadTransportPayments())
  }

  function changeBookingStatus(bookingNumber, nextStatus) {
    if (!bookingNumber) return
    const booking = bookingByNumber.get(bookingNumber)
    if (!booking) return
    if (nextStatus === 'cancelled' && booking.status !== 'cancelled') {
      const ok = window.confirm(`Cancel ${booking.bookingNumber}? This only changes status. Refund should be processed separately if needed.`)
      if (!ok) return
    }
    updateBookingStatus(bookingNumber, nextStatus)
    refreshBookings()
    if (bookingNumber === statusBookingNumber) setStatusValue(nextStatus)
    showNotice(`Booking ${bookingNumber} marked ${statusMeta[nextStatus]?.label || nextStatus}.`)
  }

  function applyStatusControl() {
    if (!statusBookingNumber) {
      showNotice('Select a booking first.')
      return
    }
    changeBookingStatus(statusBookingNumber, statusValue)
  }

  function printPayment(payment) {
    const booking = bookingByNumber.get(payment.bookingNumber)
    printHtmlDocument({ html: buildPaymentReceiptHtml(payment, booking), settings: businessSettings, paperSize: 'a4' })
  }

  function printPayment58mm(payment) {
    const booking = bookingByNumber.get(payment.bookingNumber)
    printHtmlDocument({ html: buildPayment58mmReceiptHtml(payment, booking), settings: businessSettings, paperSize: '58mm' })
  }

  function whatsappPayment(payment) {
    const booking = bookingByNumber.get(payment.bookingNumber)
    const phone = String(booking?.phone || '').replace(/\D/g, '')
    const isRefund = isTransportRefundPayment(payment)
    const amount = isRefund ? formatTransportSignedCurrency(-payment.amount) : formatTransportCurrency(payment.amount)
    const text = [
      `${isRefund ? 'Refund' : 'Payment'} receipt ${payment.id}`,
      `Booking: ${payment.bookingNumber || '-'}`,
      `Customer: ${payment.customer}`,
      booking?.vehicleName ? `Vehicle: ${booking.vehicleName}` : '',
      `Amount: ${amount}`,
      `Method: ${payment.method}`,
      `Status: ${booking?.status || '-'}`,
      payment.note ? `Note: ${payment.note}` : '',
      'NEXORA SOLUTION',
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${phone || ''}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  function savePayment() {
    const amount = safeMoney(form.amount)
    if (!form.bookingNumber) {
      setWarning('Select a booking.')
      return
    }
    if (amount <= 0) {
      setWarning('Enter a payment amount greater than zero.')
      return
    }
    const booking = bookings.find((row) => row.bookingNumber === form.bookingNumber)
    if (!booking) {
      setWarning('Booking not found.')
      return
    }
    const bookingPaymentStatus = String(booking.paymentStatus || '').toLowerCase()
    if (form.type !== 'refund' && (booking.status === 'cancelled' || closedPaymentStatuses.has(bookingPaymentStatus))) {
      setWarning('This booking is cancelled/refunded. New payment cannot be collected on it.')
      return
    }
    if (form.type === 'refund') {
      const refundAmount = Math.min(amount, booking.advancePaid)
      if (refundAmount <= 0) {
        setWarning('This booking has no paid amount available for refund.')
        return
      }
      setPayments(recordTransportPayment({
        bookingNumber: booking.bookingNumber,
        customerId: booking.customerId,
        customer: booking.customer,
        amount: refundAmount,
        method: form.method,
        type: 'refund',
        note: form.note || 'Refund processed',
      }))
      const nextAdvance = Math.max(0, booking.advancePaid - refundAmount)
      upsertTransportBooking({
        ...booking,
        advancePaid: nextAdvance,
        refundAmount: (booking.refundAmount || 0) + refundAmount,
        refundMethod: form.method,
        refundedAt: new Date().toISOString(),
        paymentStatus: nextAdvance <= 0 ? 'refunded' : 'partial-refund',
      })
      setBookings(loadTransportBookings())
      syncVehiclesWithBookings()
      setModalOpen(false)
      return
    }
    const applied = Math.min(amount, booking.dueAmount || amount)
    // Record payment
    setPayments(recordTransportPayment({
      bookingNumber: booking.bookingNumber,
      customerId: booking.customerId,
      customer: booking.customer,
      amount: applied,
      method: form.method,
      type: form.type,
      note: form.note,
    }))
    // Update booking advance/due
    const nextAdvance = Math.min(booking.total, booking.advancePaid + applied)
    upsertTransportBooking({
      ...booking,
      advancePaid: nextAdvance,
      paymentStatus: nextAdvance >= booking.total ? 'paid' : 'partial',
    })
    // Update customer ledger
    const updatedCustomers = applyTransportCustomerLedger(loadTransportCustomers(), booking.customerId, {
      bookingNumber: booking.bookingNumber,
      total: booking.total,
      paid: applied,
      due: 0,
      method: form.method,
      note: form.note || 'Payment received',
    })
    saveTransportCustomers(updatedCustomers)
    setBookings(loadTransportBookings())
    syncVehiclesWithBookings()
    setModalOpen(false)
  }

  const columns = [
    { key: 'id', header: 'Payment', cell: (row) => <span className="font-semibold text-slate-800">{row.id}</span> },
    { key: 'bookingNumber', header: 'Booking' },
    { key: 'customer', header: 'Customer' },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const booking = bookingByNumber.get(row.bookingNumber)
        if (!booking) return <span className="text-xs text-slate-400">No booking</span>
        const paymentMeta = isTransportRefundPayment(row)
          ? { label: 'Paid Refund', badge: 'danger' }
          : paymentStatusMeta[booking.paymentStatus] || paymentStatusMeta.due
        return (
          <div className="min-w-[145px] space-y-1.5">
            <Select
              value={booking.status}
              onChange={(event) => changeBookingStatus(booking.bookingNumber, event.target.value)}
              className="h-8 min-w-[125px] text-xs"
            >
              {Object.entries(statusMeta).map(([status, meta]) => <option key={status} value={status}>{meta.label}</option>)}
            </Select>
            <div className="flex flex-wrap gap-1">
              <Badge variant={statusMeta[booking.status]?.badge || 'default'}>{statusMeta[booking.status]?.label || booking.status}</Badge>
              <Badge variant={paymentMeta.badge}>{paymentMeta.label}</Badge>
            </div>
          </div>
        )
      },
    },
    { key: 'type', header: 'Type', cell: (row) => <Badge variant={isTransportRefundPayment(row) ? 'danger' : 'default'}>{isTransportRefundPayment(row) ? 'Refund' : row.type}</Badge> },
    { key: 'method', header: 'Method', cell: (row) => <Badge variant={methodMeta[row.method] || 'default'}>{row.method}</Badge> },
    { key: 'amount', header: 'Amount', cell: (row) => <span className={`font-semibold ${isTransportRefundPayment(row) ? 'text-rose-600' : 'text-emerald-600'}`}>{isTransportRefundPayment(row) ? formatTransportSignedCurrency(-row.amount) : formatTransportCurrency(row.amount)}</span> },
    { key: 'date', header: 'Date', cell: (row) => <span className="text-slate-500">{row.date} {row.time}</span> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button variant="subtle" className="h-8 px-2 text-xs" onClick={() => printPayment(row)}>
            <HiOutlinePrinter className="h-4 w-4" />
            Print
          </Button>
          <Button variant="subtle" className="h-8 px-2 text-xs" onClick={() => printPayment58mm(row)}>
            <HiOutlinePrinter className="h-4 w-4" />
            58mm
          </Button>
          <Button variant="subtle" className="h-8 px-2 text-xs text-emerald-700" onClick={() => whatsappPayment(row)}>
            <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      ),
    },
  ]

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      {notice ? (
        <div className="fixed right-4 top-4 z-[70] rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm">
          {notice}
        </div>
      ) : null}

      <PageHeader
        title="Rental Payments"
        subtitle="Record payments, settle dues, and review the rental payment ledger."
        right={(
          <Button onClick={() => openModal()}>
            <HiOutlinePlus className="h-4 w-4" />
            Record Payment
          </Button>
        )}
      />

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Net Collected</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatTransportCurrency(stats.collected)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Gross {formatTransportCurrency(stats.grossCollected)}</p>
        </Card>
        <Card className="rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Refunded</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{formatTransportCurrency(stats.refunds)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Cancelled/refund entries</p>
        </Card>
        <Card className="rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Net Today</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatTransportCurrency(stats.today)}</p>
        </Card>
        <Card className="rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Outstanding Dues</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{formatTransportCurrency(stats.outstanding)}</p>
        </Card>
      </div>

      <Card className="rounded-[1.35rem] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
              <HiOutlineClipboardDocumentCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950 dark:text-white">Booking Status Control</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Change rental status directly from payments without opening the booking screen.</p>
            </div>
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto]">
            <Select
              value={statusBookingNumber}
              onChange={(event) => {
                const nextBooking = bookings.find((booking) => booking.bookingNumber === event.target.value)
                setStatusBookingNumber(event.target.value)
                setStatusValue(nextBooking?.status || 'reserved')
              }}
            >
              <option value="">Select booking</option>
              {bookings.map((booking) => (
                <option key={booking.bookingNumber} value={booking.bookingNumber}>{booking.bookingNumber} • {booking.customer}</option>
              ))}
            </Select>
            <Select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
              {Object.entries(statusMeta).map(([status, meta]) => <option key={status} value={status}>{meta.label}</option>)}
            </Select>
            <Button onClick={applyStatusControl}>Update</Button>
          </div>
        </div>
        {statusBooking ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <Badge variant={statusMeta[statusBooking.status]?.badge || 'default'}>{statusMeta[statusBooking.status]?.label || statusBooking.status}</Badge>
            <span>{statusBooking.vehicleName}</span>
            <span>•</span>
            <span>Total {formatTransportCurrency(statusBooking.total)}</span>
            <span>•</span>
            <span className={statusBooking.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
              {statusBooking.dueAmount > 0 ? `Due ${formatTransportCurrency(statusBooking.dueAmount)}` : 'Paid'}
            </span>
          </div>
        ) : null}
      </Card>

      {dueBookings.length ? (
        <Card className="rounded-[1.35rem] p-4 sm:p-5">
          <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">Pending Dues</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dueBookings.map((booking) => (
              <div key={booking.bookingNumber} className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{booking.bookingNumber} • {booking.customer}</p>
                  <p className="truncate text-xs text-slate-500">{booking.vehicleName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-rose-600">Due {formatTransportCurrency(booking.dueAmount)}</p>
                </div>
                <Button variant="subtle" className="h-8 shrink-0 px-3 text-xs" onClick={() => openModal(booking)}>Collect</Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="rounded-[1.35rem] p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <HiOutlineBanknotes className="h-5 w-5 text-slate-400" />
          <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">Payment Ledger</p>
        </div>
        {payments.length ? (
          <Table columns={columns} rows={payments} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No payments recorded yet.</div>
        )}
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Transport / Rental</p>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Record Payment</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Booking">
                <Select value={form.bookingNumber} onChange={(event) => updateForm('bookingNumber', event.target.value)}>
                  <option value="">Select booking</option>
                  {bookings.filter((booking) => booking.status !== 'cancelled').map((booking) => (
                    <option key={booking.bookingNumber} value={booking.bookingNumber}>
                      {booking.bookingNumber} • {booking.customer} {booking.dueAmount > 0 ? `(Due ${formatTransportCurrency(booking.dueAmount)})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount (PKR)">
                <Input type="number" min="0" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} />
              </Field>
              {selectedBooking ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2">
                  <div className="flex justify-between"><span>Total</span><span className="font-semibold">{formatTransportCurrency(selectedBooking.total)}</span></div>
                  <div className="flex justify-between"><span>Paid</span><span className="font-semibold">{formatTransportCurrency(selectedBooking.advancePaid)}</span></div>
                  <div className="flex justify-between"><span>Due</span><span className="font-semibold text-rose-600">{formatTransportCurrency(selectedBooking.dueAmount)}</span></div>
                </div>
              ) : null}
              <Field label="Method">
                <Select value={form.method} onChange={(event) => updateForm('method', event.target.value)}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>JazzCash</option>
                  <option>Easypaisa</option>
                </Select>
              </Field>
              <Field label="Type">
                <Select value={form.type} onChange={(event) => updateForm('type', event.target.value)}>
                  <option value="rental">Rental</option>
                  <option value="advance">Advance</option>
                  <option value="security">Security</option>
                  <option value="refund">Refund</option>
                </Select>
              </Field>
              <Field label="Note" className="sm:col-span-2">
                <Input value={form.note} onChange={(event) => updateForm('note', event.target.value)} placeholder="Optional note" />
              </Field>
              {warning ? <p className="text-sm font-medium text-rose-600 sm:col-span-2">{warning}</p> : null}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={savePayment}>Save Payment</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}
