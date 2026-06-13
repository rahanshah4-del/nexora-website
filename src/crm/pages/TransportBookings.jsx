import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineClipboardDocumentList,
  HiOutlinePlus,
  HiOutlineArrowRightCircle,
  HiOutlineArrowLeftCircle,
  HiOutlineXCircle,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineChatBubbleLeftRight,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import {
  computeBookingTotals,
  formatTransportCurrency,
  rentalUnitsFor,
  unitRateForVehicle,
} from '../lib/transportCalculations.js'
import {
  loadTransportBookings,
  upsertTransportBooking,
  updateBookingStatus,
  getNextBookingNumber,
  syncVehiclesWithBookings,
} from '../data/transportBookings.js'
import { loadTransportVehicles } from '../data/transportVehicles.js'
import { loadTransportCustomers, applyTransportCustomerLedger, saveTransportCustomers } from '../data/transportCustomers.js'
import { recordTransportPayment } from '../data/transportPayments.js'

const statusMeta = {
  reserved: { label: 'Reserved', badge: 'info' },
  active: { label: 'Active', badge: 'warning' },
  returned: { label: 'Returned', badge: 'success' },
  cancelled: { label: 'Cancelled', badge: 'danger' },
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

function buildBookingPrintHtml(booking) {
  return `<!doctype html>
  <html>
    <head>
      <title>${escapeHtml(booking.bookingNumber)} Rental Booking</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
        .doc { max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
        .head { padding: 22px; background: #0f172a; color: white; display: flex; justify-content: space-between; gap: 18px; }
        .eyebrow { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #67e8f9; font-weight: 800; }
        h1 { margin: 6px 0 0; font-size: 24px; }
        .body { padding: 22px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .box { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #f8fafc; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: .14em; color: #64748b; font-weight: 800; }
        .value { margin-top: 5px; font-size: 14px; font-weight: 800; }
        .totals { margin-top: 16px; border-top: 2px solid #0f172a; padding-top: 12px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .total { font-size: 20px; font-weight: 900; }
        .refund-box { margin-top: 16px; border: 2px solid #be123c; border-radius: 16px; padding: 14px; background: #fff1f2; color: #881337; }
        .refund-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
        .refund-badge { border-radius: 999px; background: #be123c; color: white; padding: 7px 12px; font-size: 12px; font-weight: 900; }
        .refund-line { display: flex; justify-content: space-between; gap: 12px; padding-top: 10px; font-size: 14px; }
        .refund-line strong { text-align: right; }
        .footer { padding: 14px 22px; background: #f8fafc; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
        @media print { body { padding: 0; } .doc { border: none; border-radius: 0; } }
      </style>
    </head>
    <body>
      <section class="doc">
        <div class="head">
          <div>
            <div class="eyebrow">Transport / Rental</div>
            <h1>Booking ${escapeHtml(booking.bookingNumber)}</h1>
          </div>
          <div style="text-align:right">
            <div class="eyebrow">Status</div>
            <h1>${escapeHtml(booking.status)}</h1>
          </div>
        </div>
        <div class="body">
          <div class="grid">
            <div class="box"><div class="label">Customer</div><div class="value">${escapeHtml(booking.customer)} ${booking.phone ? `(${escapeHtml(booking.phone)})` : ''}</div></div>
            <div class="box"><div class="label">Vehicle</div><div class="value">${escapeHtml(booking.vehicleName)} - ${escapeHtml(booking.vehicleRegistration)}</div></div>
            <div class="box"><div class="label">Pickup</div><div class="value">${escapeHtml(booking.pickupDate)}</div></div>
            <div class="box"><div class="label">Return</div><div class="value">${escapeHtml(booking.returnDate)}</div></div>
            <div class="box"><div class="label">Rate / Units</div><div class="value">${escapeHtml(booking.rateType)} / ${escapeHtml(booking.units)}</div></div>
            <div class="box"><div class="label">Driver</div><div class="value">${booking.withDriver ? escapeHtml(booking.driverName || 'Included') : 'No driver'}</div></div>
          </div>
          <div class="totals">
            <div class="row"><span>Total</span><strong>${escapeHtml(formatTransportCurrency(booking.total))}</strong></div>
            <div class="row"><span>Paid</span><strong>${escapeHtml(formatTransportCurrency(booking.advancePaid))}</strong></div>
            <div class="row"><span>Due</span><strong>${escapeHtml(formatTransportCurrency(booking.dueAmount))}</strong></div>
            <div class="row"><span>Security Deposit</span><strong>${escapeHtml(formatTransportCurrency(booking.securityDeposit))}</strong></div>
            <div class="row total"><span>Payment</span><span>${escapeHtml(booking.paymentMethod)}</span></div>
          </div>
          ${booking.refundAmount > 0 ? `
            <div class="refund-box">
              <div class="refund-head">
                <span>Refund Status</span>
                <span class="refund-badge">Paid Refund</span>
              </div>
              <div class="refund-line"><span>Refunded Amount</span><strong>${escapeHtml(formatTransportCurrency(booking.refundAmount))}</strong></div>
              <div class="refund-line"><span>Refund Method</span><strong>${escapeHtml(booking.refundMethod || booking.paymentMethod || 'Cash')}</strong></div>
              ${booking.refundedAt ? `<div class="refund-line"><span>Refund Date</span><strong>${escapeHtml(new Date(booking.refundedAt).toLocaleString())}</strong></div>` : ''}
            </div>
          ` : ''}
          ${booking.notes ? `<p style="margin-top:16px;font-size:13px;color:#475569"><strong>Notes:</strong> ${escapeHtml(booking.notes)}</p>` : ''}
          ${booking.cancelReason ? `<p style="margin-top:16px;font-size:13px;color:#be123c"><strong>Cancel reason:</strong> ${escapeHtml(booking.cancelReason)}</p>` : ''}
        </div>
        <div class="footer"><span>NEXORA SOLUTION</span><span>ALL RIGHTS RESERVED 2019-2026</span></div>
      </section>
    </body>
  </html>`
}

function buildBooking58mmPrintHtml(booking) {
  return `<!doctype html>
  <html>
    <head>
      <title>${escapeHtml(booking.bookingNumber)} 58mm</title>
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
        .big { font-size: 12px; font-weight: 900; }
        .status { display: inline-block; margin-top: 4px; border: 1px solid #111827; border-radius: 999px; padding: 2px 7px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
        .refund { margin-top: 7px; border: 1px solid #be123c; padding: 6px; color: #be123c; font-weight: 800; }
        .footer { margin-top: 8px; text-align: center; font-size: 9px; }
        @media print { body { width: 58mm; } }
      </style>
    </head>
    <body>
      <section class="receipt">
        <div class="center">
          <div class="brand">NEXORA SOLUTION</div>
          <div class="muted">Transport / Rental</div>
          <div class="status">${escapeHtml(booking.status)}</div>
        </div>
        <div class="line"></div>
        <div class="row"><span>Booking</span><strong>${escapeHtml(booking.bookingNumber)}</strong></div>
        <div class="row"><span>Date</span><strong>${escapeHtml(new Date().toLocaleString())}</strong></div>
        <div class="row"><span>Customer</span><strong>${escapeHtml(booking.customer)}</strong></div>
        ${booking.phone ? `<div class="row"><span>Phone</span><strong>${escapeHtml(booking.phone)}</strong></div>` : ''}
        <div class="row"><span>Vehicle</span><strong>${escapeHtml(booking.vehicleName)}</strong></div>
        <div class="row"><span>Reg</span><strong>${escapeHtml(booking.vehicleRegistration)}</strong></div>
        <div class="row"><span>Pickup</span><strong>${escapeHtml(booking.pickupDate)}</strong></div>
        <div class="row"><span>Return</span><strong>${escapeHtml(booking.returnDate)}</strong></div>
        <div class="row"><span>Rate</span><strong>${escapeHtml(booking.rateType)} x ${escapeHtml(booking.units)}</strong></div>
        ${booking.withDriver ? `<div class="row"><span>Driver</span><strong>${escapeHtml(booking.driverName || 'Included')}</strong></div>` : ''}
        <div class="line"></div>
        <div class="row"><span>Total</span><strong>${escapeHtml(formatTransportCurrency(booking.total))}</strong></div>
        <div class="row"><span>Paid</span><strong>${escapeHtml(formatTransportCurrency(booking.advancePaid))}</strong></div>
        <div class="row"><span>Due</span><strong>${escapeHtml(formatTransportCurrency(booking.dueAmount))}</strong></div>
        <div class="row"><span>Deposit</span><strong>${escapeHtml(formatTransportCurrency(booking.securityDeposit))}</strong></div>
        <div class="row big"><span>Payment</span><strong>${escapeHtml(booking.paymentMethod)}</strong></div>
        ${booking.refundAmount > 0 ? `
          <div class="refund">
            <div class="row"><span>Refund</span><strong>PAID</strong></div>
            <div class="row"><span>Amount</span><strong>${escapeHtml(formatTransportCurrency(booking.refundAmount))}</strong></div>
            <div class="row"><span>Method</span><strong>${escapeHtml(booking.refundMethod || booking.paymentMethod || 'Cash')}</strong></div>
          </div>
        ` : ''}
        ${booking.cancelReason ? `<div class="line"></div><div><strong>Cancel reason:</strong> ${escapeHtml(booking.cancelReason)}</div>` : ''}
        ${booking.notes ? `<div class="line"></div><div><strong>Notes:</strong> ${escapeHtml(booking.notes)}</div>` : ''}
        <div class="line"></div>
        <div class="footer">Powered by Nexora<br/>ALL RIGHTS RESERVED 2019-2026</div>
      </section>
    </body>
  </html>`
}

function buildRefundPrintHtml(booking, refund) {
  return `<!doctype html>
  <html>
    <head>
      <title>${escapeHtml(booking.bookingNumber)} Refund Receipt</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
        .doc { max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
        .head { padding: 22px; background: #881337; color: white; display: flex; justify-content: space-between; gap: 18px; }
        .eyebrow { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #fecdd3; font-weight: 800; }
        h1 { margin: 6px 0 0; font-size: 22px; }
        .body { padding: 22px; }
        .row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e2e8f0; padding: 10px 0; font-size: 14px; }
        .row strong { text-align: right; }
        .total { margin-top: 14px; border: 2px solid #881337; border-radius: 14px; padding: 14px; display: flex; justify-content: space-between; font-size: 20px; font-weight: 900; color: #881337; }
        .reason { margin-top: 14px; border-radius: 14px; background: #fff1f2; padding: 12px; color: #9f1239; font-size: 13px; font-weight: 700; }
        .footer { padding: 14px 22px; background: #f8fafc; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
        @media print { body { padding: 0; } .doc { border: none; border-radius: 0; } }
      </style>
    </head>
    <body>
      <section class="doc">
        <div class="head">
          <div>
            <div class="eyebrow">Transport / Rental</div>
            <h1>Refund Receipt</h1>
          </div>
          <div style="text-align:right">
            <div class="eyebrow">Booking</div>
            <h1>${escapeHtml(booking.bookingNumber)}</h1>
          </div>
        </div>
        <div class="body">
          <div class="row"><span>Customer</span><strong>${escapeHtml(booking.customer)}</strong></div>
          <div class="row"><span>Vehicle</span><strong>${escapeHtml(booking.vehicleName)} - ${escapeHtml(booking.vehicleRegistration)}</strong></div>
          <div class="row"><span>Refund Method</span><strong>${escapeHtml(refund.method)}</strong></div>
          <div class="row"><span>Refund Date</span><strong>${escapeHtml(new Date().toLocaleString())}</strong></div>
          <div class="total"><span>Refunded</span><span>${escapeHtml(formatTransportCurrency(refund.amount))}</span></div>
          <div class="reason">Reason: ${escapeHtml(refund.reason)}</div>
        </div>
        <div class="footer"><span>NEXORA SOLUTION</span><span>ALL RIGHTS RESERVED 2019-2026</span></div>
      </section>
    </body>
  </html>`
}

const blankForm = {
  vehicleId: '',
  customerId: 'tcust-walkin',
  rateType: 'daily',
  pickupDate: todayStr(),
  returnDate: todayStr(),
  extraCharges: '',
  discount: '',
  taxRate: '',
  advancePaid: '',
  withDriver: false,
  paymentMethod: 'Cash',
  notes: '',
}

export default function TransportBookingsPage() {
  const [bookings, setBookings] = useState(() => loadTransportBookings())
  const [vehicles, setVehicles] = useState(() => loadTransportVehicles())
  const [customers, setCustomers] = useState(() => loadTransportCustomers())
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [warning, setWarning] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [refundForm, setRefundForm] = useState({ amount: '', method: 'Cash', printReceipt: true })
  const [returnTarget, setReturnTarget] = useState(null)

  useEffect(() => {
    syncVehiclesWithBookings()
    setVehicles(loadTransportVehicles())
  }, [bookings])

  const stats = useMemo(() => ({
    total: bookings.length,
    active: bookings.filter((booking) => booking.status === 'active').length,
    reserved: bookings.filter((booking) => booking.status === 'reserved').length,
    dues: bookings.filter((booking) => booking.status !== 'cancelled').reduce((sum, booking) => sum + booking.dueAmount, 0),
  }), [bookings])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()
    return bookings.filter((booking) => {
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
      const matchesQuery = !query
        || booking.bookingNumber.toLowerCase().includes(query)
        || booking.customer.toLowerCase().includes(query)
        || booking.vehicleName.toLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [bookings, statusFilter, search])

  const selectedVehicle = useMemo(() => vehicles.find((vehicle) => vehicle.id === form.vehicleId), [vehicles, form.vehicleId])

  const previewTotals = useMemo(() => {
    if (!selectedVehicle) return null
    const unitRate = unitRateForVehicle(selectedVehicle, form.rateType)
    const units = rentalUnitsFor(form.rateType, form.pickupDate, form.returnDate)
    return computeBookingTotals({
      unitRate,
      units,
      extraCharges: Number(form.extraCharges) || 0,
      driverRate: form.withDriver || selectedVehicle.driverIncluded ? selectedVehicle.driverRate : 0,
      discount: Number(form.discount) || 0,
      securityDeposit: selectedVehicle.securityDeposit,
      taxRate: Number(form.taxRate) || 0,
      advancePaid: Number(form.advancePaid) || 0,
    })
  }, [selectedVehicle, form])

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === 'available' || vehicle.id === form.vehicleId),
    [vehicles, form.vehicleId],
  )

  function openModal(booking = null) {
    setWarning('')
    setEditingBooking(booking)
    setForm(booking ? {
      vehicleId: booking.vehicleId || '',
      customerId: booking.customerId || 'tcust-walkin',
      rateType: booking.rateType || 'daily',
      pickupDate: booking.pickupDate || todayStr(),
      returnDate: booking.returnDate || todayStr(),
      extraCharges: String(booking.extraCharges || ''),
      discount: String(booking.discount || ''),
      taxRate: String(booking.taxRate || ''),
      advancePaid: String(booking.advancePaid || ''),
      withDriver: Boolean(booking.withDriver),
      paymentMethod: booking.paymentMethod || 'Cash',
      notes: booking.notes || '',
    } : { ...blankForm, pickupDate: todayStr(), returnDate: todayStr() })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingBooking(null)
    setForm(blankForm)
    setWarning('')
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function saveBooking(status) {
    if (!selectedVehicle) {
      setWarning('Select a vehicle for this booking.')
      return
    }
    if (!form.pickupDate || !form.returnDate) {
      setWarning('Pickup and return dates are required.')
      return
    }
    if (new Date(form.returnDate) < new Date(form.pickupDate)) {
      setWarning('Return date cannot be before the pickup date.')
      return
    }
    const customer = customers.find((row) => row.id === form.customerId) || customers[0]
    const unitRate = unitRateForVehicle(selectedVehicle, form.rateType)
    const units = rentalUnitsFor(form.rateType, form.pickupDate, form.returnDate)
    const bookingNumber = editingBooking?.bookingNumber || getNextBookingNumber()
    const payload = {
      ...(editingBooking || {}),
      bookingNumber,
      vehicleId: selectedVehicle.id,
      vehicleName: selectedVehicle.name,
      vehicleRegistration: selectedVehicle.registration,
      customerId: customer.id,
      customer: customer.name,
      phone: customer.phone,
      rateType: form.rateType,
      unitRate,
      units,
      pickupDate: form.pickupDate,
      returnDate: form.returnDate,
      extraCharges: Number(form.extraCharges) || 0,
      discount: Number(form.discount) || 0,
      taxRate: Number(form.taxRate) || 0,
      securityDeposit: selectedVehicle.securityDeposit,
      advancePaid: Number(form.advancePaid) || 0,
      withDriver: form.withDriver || selectedVehicle.driverIncluded,
      driverName: form.withDriver || selectedVehicle.driverIncluded ? selectedVehicle.driverName : '',
      driverPhone: form.withDriver || selectedVehicle.driverIncluded ? selectedVehicle.driverPhone : '',
      driverLicense: form.withDriver || selectedVehicle.driverIncluded ? selectedVehicle.driverLicense : '',
      driverRate: form.withDriver || selectedVehicle.driverIncluded ? selectedVehicle.driverRate : 0,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
      status: status || editingBooking?.status || 'reserved',
    }
    const nextBookings = upsertTransportBooking(payload)
    const created = nextBookings.find((booking) => booking.bookingNumber === bookingNumber)

    if (!editingBooking) {
      const advance = created?.advancePaid || 0
      const due = created?.dueAmount || 0
      const updatedCustomers = applyTransportCustomerLedger(customers, customer.id, {
        bookingNumber,
        total: created?.total || 0,
        paid: advance,
        due,
        method: form.paymentMethod,
        note: `Booking ${status}`,
      })
      saveTransportCustomers(updatedCustomers)
      setCustomers(updatedCustomers)
      if (advance > 0) {
        recordTransportPayment({
          bookingNumber,
          customerId: customer.id,
          customer: customer.name,
          amount: advance,
          method: form.paymentMethod,
          type: 'advance',
          note: 'Advance at booking',
        })
      }
    }

    setBookings(nextBookings)
    syncVehiclesWithBookings()
    setVehicles(loadTransportVehicles())
    closeModal()
  }

  function confirmReturnBooking() {
    const booking = returnTarget
    if (!booking) return
    // Returning the vehicle: settle any remaining due as collected on return.
    const due = booking.dueAmount
    const nextBookings = upsertTransportBooking({
      ...booking,
      advancePaid: booking.total,
      status: 'returned',
      paymentStatus: 'paid',
    })
    if (due > 0) {
      const updatedCustomers = applyTransportCustomerLedger(loadTransportCustomers(), booking.customerId, {
        bookingNumber: booking.bookingNumber,
        total: booking.total,
        paid: due,
        due: 0,
        method: booking.paymentMethod,
        note: 'Balance collected on return',
      })
      saveTransportCustomers(updatedCustomers)
      setCustomers(updatedCustomers)
      recordTransportPayment({
        bookingNumber: booking.bookingNumber,
        customerId: booking.customerId,
        customer: booking.customer,
        amount: due,
        method: booking.paymentMethod,
        type: 'rental',
        note: 'Balance on return',
      })
    }
    setBookings(nextBookings)
    syncVehiclesWithBookings()
    setVehicles(loadTransportVehicles())
    setReturnTarget(null)
  }

  function activate(booking) {
    setBookings(updateBookingStatus(booking.bookingNumber, 'active'))
  }

  function openCancel(booking) {
    setCancelTarget(booking)
    setCancelReason('')
    setRefundForm({
      amount: booking.advancePaid > 0 ? String(Math.round(booking.advancePaid)) : '',
      method: booking.paymentMethod || 'Cash',
      printReceipt: true,
    })
    setWarning('')
  }

  function confirmCancel() {
    if (!cancelTarget) return
    if (!cancelReason.trim()) {
      setWarning('Cancel reason is required.')
      return
    }
    const refundAmount = Math.max(0, Number(refundForm.amount || 0) || 0)
    if (refundAmount > cancelTarget.advancePaid) {
      setWarning(`Refund cannot exceed paid amount ${formatTransportCurrency(cancelTarget.advancePaid)}.`)
      return
    }
    if (refundAmount > 0) {
      recordTransportPayment({
        bookingNumber: cancelTarget.bookingNumber,
        customerId: cancelTarget.customerId,
        customer: cancelTarget.customer,
        amount: refundAmount,
        method: refundForm.method,
        type: 'refund',
        note: `Refund on cancellation: ${cancelReason.trim()}`,
      })
    }
    const nextBookings = upsertTransportBooking({
      ...cancelTarget,
      advancePaid: Math.max(0, cancelTarget.advancePaid - refundAmount),
      status: 'cancelled',
      paymentStatus: refundAmount > 0 ? 'refunded' : 'cancelled',
      cancelReason: cancelReason.trim(),
      refundAmount,
      refundMethod: refundForm.method,
      refundedAt: refundAmount > 0 ? new Date().toISOString() : '',
      cancelledAt: new Date().toISOString(),
    })
    setBookings(nextBookings)
    syncVehiclesWithBookings()
    setVehicles(loadTransportVehicles())
    if (refundAmount > 0 && refundForm.printReceipt) {
      const html = buildRefundPrintHtml(cancelTarget, {
        amount: refundAmount,
        method: refundForm.method,
        reason: cancelReason.trim(),
      })
      const printWindow = window.open('', '_blank', 'width=420,height=720')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
    }
    setCancelTarget(null)
    setCancelReason('')
    setRefundForm({ amount: '', method: 'Cash', printReceipt: true })
    setWarning('')
  }

  function printBooking(booking) {
    const html = buildBookingPrintHtml(booking)
    const printWindow = window.open('', '_blank', 'width=420,height=720')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  function printBooking58mm(booking) {
    const html = buildBooking58mmPrintHtml(booking)
    const printWindow = window.open('', '_blank', 'width=280,height=720')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  function whatsappBooking(booking) {
    const phone = String(booking.phone || '').replace(/\D/g, '')
    const text = [
      `Booking ${booking.bookingNumber}`,
      `Vehicle: ${booking.vehicleName} (${booking.vehicleRegistration})`,
      `Dates: ${booking.pickupDate} to ${booking.returnDate}`,
      `Total: ${formatTransportCurrency(booking.total)}`,
      `Paid: ${formatTransportCurrency(booking.advancePaid)}`,
      `Due: ${formatTransportCurrency(booking.dueAmount)}`,
      `Status: ${booking.status}`,
    ].join('\n')
    window.open(`https://wa.me/${phone || ''}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        title="Bookings & Rentals"
        subtitle="Create rental bookings, check vehicles out and in, and track payments and dues."
        right={(
          <Button onClick={openModal}>
            <HiOutlinePlus className="h-4 w-4" />
            New Booking
          </Button>
        )}
      />

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Bookings" value={stats.total} />
        <StatCard label="Active Rentals" value={stats.active} />
        <StatCard label="Reserved" value={stats.reserved} />
        <StatCard label="Outstanding Dues" value={formatTransportCurrency(stats.dues)} tone="text-rose-600" />
      </div>

      <Card className="rounded-[1.35rem] p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, customer, vehicle..." className="max-w-sm" />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="max-w-[180px]">
            <option value="all">All statuses</option>
            {Object.keys(statusMeta).map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
          </Select>
          <Badge variant="info" className="ml-auto">{filteredBookings.length} bookings</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {filteredBookings.map((booking) => {
            const meta = statusMeta[booking.status] || statusMeta.reserved
            return (
              <div key={booking.bookingNumber} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <HiOutlineClipboardDocumentList className="h-5 w-5 text-slate-400" />
                      <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">{booking.bookingNumber}</p>
                      <Badge variant={meta.badge}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{booking.vehicleName} <span className="text-slate-400">• {booking.vehicleRegistration}</span></p>
                    <p className="mt-0.5 text-xs text-slate-500">{booking.customer} • {booking.pickupDate} → {booking.returnDate} • {booking.units} {booking.rateType === 'hourly' ? 'hrs' : booking.rateType === 'weekly' ? 'wks' : 'days'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black tracking-tight text-slate-950 dark:text-white">{formatTransportCurrency(booking.total)}</p>
                    {booking.refundAmount > 0 ? (
                      <div className="mt-1 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
                        Refunded {formatTransportCurrency(booking.refundAmount)}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        Paid {formatTransportCurrency(booking.advancePaid)}
                        {booking.dueAmount > 0 ? <span className="text-rose-600"> • Due {formatTransportCurrency(booking.dueAmount)}</span> : null}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="subtle" className="h-8 px-3 text-xs" onClick={() => openModal(booking)}>
                    <HiOutlinePencilSquare className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="subtle" className="h-8 px-3 text-xs" onClick={() => printBooking(booking)}>
                    <HiOutlinePrinter className="h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="subtle" className="h-8 px-3 text-xs" onClick={() => printBooking58mm(booking)}>
                    <HiOutlinePrinter className="h-4 w-4" />
                    58mm
                  </Button>
                  <Button variant="subtle" className="h-8 px-3 text-xs text-emerald-700" onClick={() => whatsappBooking(booking)}>
                    <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  {booking.status === 'reserved' ? (
                    <Button variant="subtle" className="h-8 px-3 text-xs" onClick={() => activate(booking)}>
                      <HiOutlineArrowRightCircle className="h-4 w-4" />
                      Check Out
                    </Button>
                  ) : null}
                  {booking.status === 'reserved' || booking.status === 'active' ? (
                    <Button variant="subtle" className="h-8 px-3 text-xs" onClick={() => setReturnTarget(booking)}>
                      <HiOutlineArrowLeftCircle className="h-4 w-4" />
                      Return
                    </Button>
                  ) : null}
                  {booking.status !== 'cancelled' ? (
                    <Button variant="subtle" className="h-8 border-rose-200 bg-rose-50 px-3 text-xs text-rose-700 hover:bg-rose-100" onClick={() => openCancel(booking)}>
                      <HiOutlineXCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  ) : null}
                </div>
                {booking.cancelReason ? (
                  <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    Cancel reason: {booking.cancelReason}
                    {booking.refundAmount > 0 ? ` • Refunded ${formatTransportCurrency(booking.refundAmount)} via ${booking.refundMethod || 'Cash'}` : ''}
                  </p>
                ) : null}
              </div>
            )
          })}
          {!filteredBookings.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No bookings found. Create a new booking to get started.</div>
          ) : null}
        </div>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Transport / Rental</p>
                <h2 className="text-lg font-black tracking-tight text-slate-950">{editingBooking ? `Edit Booking ${editingBooking.bookingNumber}` : 'New Booking'}</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid content-start gap-3 sm:grid-cols-2">
                <Field label="Vehicle">
                  <Select value={form.vehicleId} onChange={(event) => updateForm('vehicleId', event.target.value)}>
                    <option value="">Select a vehicle</option>
                    {availableVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>{vehicle.name} • {vehicle.registration}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Customer">
                  <Select value={form.customerId} onChange={(event) => updateForm('customerId', event.target.value)}>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </Select>
                </Field>
                <Field label="Rate Type">
                  <Select value={form.rateType} onChange={(event) => updateForm('rateType', event.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                    <option value="weekly">Weekly</option>
                  </Select>
                </Field>
                <Field label="Payment Method">
                  <Select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)}>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Bank Transfer</option>
                    <option>JazzCash</option>
                    <option>Easypaisa</option>
                  </Select>
                </Field>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 sm:col-span-2">
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                    <span>
                      Include Driver
                      {selectedVehicle?.driverIncluded ? <span className="ml-2 text-xs text-sky-700">(default with vehicle)</span> : null}
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.withDriver || selectedVehicle?.driverIncluded)}
                      onChange={(event) => updateForm('withDriver', event.target.checked)}
                      disabled={Boolean(selectedVehicle?.driverIncluded)}
                    />
                  </label>
                  {form.withDriver || selectedVehicle?.driverIncluded ? (
                    <div className="mt-2 grid gap-2 text-xs font-semibold text-sky-800 sm:grid-cols-2">
                      <span>Driver: {selectedVehicle?.driverName || 'Assigned driver'}</span>
                      <span>Rate: {formatTransportCurrency(selectedVehicle?.driverRate || 0)}/unit</span>
                      {selectedVehicle?.driverPhone ? <span>Phone: {selectedVehicle.driverPhone}</span> : null}
                      {selectedVehicle?.driverLicense ? <span>License: {selectedVehicle.driverLicense}</span> : null}
                    </div>
                  ) : null}
                </div>
                <Field label="Pickup Date">
                  <Input type="date" value={form.pickupDate} onChange={(event) => updateForm('pickupDate', event.target.value)} />
                </Field>
                <Field label="Return Date">
                  <Input type="date" value={form.returnDate} onChange={(event) => updateForm('returnDate', event.target.value)} />
                </Field>
                <Field label="Extra Charges (PKR)">
                  <Input type="number" min="0" value={form.extraCharges} onChange={(event) => updateForm('extraCharges', event.target.value)} />
                </Field>
                <Field label="Discount (PKR)">
                  <Input type="number" min="0" value={form.discount} onChange={(event) => updateForm('discount', event.target.value)} />
                </Field>
                <Field label="Tax (%)">
                  <Input type="number" min="0" value={form.taxRate} onChange={(event) => updateForm('taxRate', event.target.value)} />
                </Field>
                <Field label="Advance Paid (PKR)">
                  <Input type="number" min="0" value={form.advancePaid} onChange={(event) => updateForm('advancePaid', event.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <Input value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Optional notes" />
                  </Field>
                </div>
              </div>

              <div className="sticky top-0 self-start rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Summary</p>
                {selectedVehicle && previewTotals ? (
                  <div className="mt-3 space-y-1.5 text-sm">
                    <SummaryRow label={`Rate (${form.rateType})`} value={formatTransportCurrency(unitRateForVehicle(selectedVehicle, form.rateType))} />
                    <SummaryRow label="Units" value={`${previewTotals.units}`} />
                    <SummaryRow label="Base" value={formatTransportCurrency(previewTotals.base)} />
                    <SummaryRow label="Extras" value={formatTransportCurrency(previewTotals.extras)} />
                    <SummaryRow label="Driver" value={formatTransportCurrency(previewTotals.driverCharges)} />
                    <SummaryRow label="Discount" value={`- ${formatTransportCurrency(previewTotals.discount)}`} />
                    <SummaryRow label="Tax" value={formatTransportCurrency(previewTotals.tax)} />
                    <div className="my-2 border-t border-slate-200" />
                    <SummaryRow label="Total" value={formatTransportCurrency(previewTotals.total)} strong />
                    <SummaryRow label="Advance" value={formatTransportCurrency(previewTotals.advancePaid)} />
                    <SummaryRow label="Due" value={formatTransportCurrency(previewTotals.dueAmount)} tone="text-rose-600" />
                    <SummaryRow label="Security Deposit" value={formatTransportCurrency(previewTotals.securityDeposit)} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">Select a vehicle to see the rental summary.</p>
                )}
              </div>
            </div>
            {warning ? <p className="px-5 pb-1 text-sm font-medium text-rose-600">{warning}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              {editingBooking ? (
                <Button onClick={() => saveBooking(editingBooking.status)}>Update Booking</Button>
              ) : (
                <>
                  <Button variant="subtle" onClick={() => saveBooking('reserved')}>Save as Reserved</Button>
                  <Button onClick={() => saveBooking('active')}>Check Out Now</Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {cancelTarget ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600">
              <HiOutlineXCircle className="h-5 w-5" />
              <p className="text-base font-black tracking-tight">Cancel booking & process refund</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Booking {cancelTarget.bookingNumber} will be cancelled. Enter refund details and print refund receipt if needed.
            </p>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <SummaryRow label="Paid amount" value={formatTransportCurrency(cancelTarget.advancePaid)} />
              <SummaryRow label="Current due" value={formatTransportCurrency(cancelTarget.dueAmount)} tone="text-rose-600" />
            </div>
            <Field label="Cancel Reason">
              <Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Customer cancelled, vehicle unavailable, duplicate booking..." />
            </Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Refund Amount (PKR)">
                <Input
                  type="number"
                  min="0"
                  max={cancelTarget.advancePaid}
                  value={refundForm.amount}
                  onChange={(event) => setRefundForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </Field>
              <Field label="Refund Method">
                <Select value={refundForm.method} onChange={(event) => setRefundForm((current) => ({ ...current, method: event.target.value }))}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>JazzCash</option>
                  <option>Easypaisa</option>
                </Select>
              </Field>
            </div>
            <label className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Print refund receipt
              <input
                type="checkbox"
                checked={refundForm.printReceipt}
                onChange={(event) => setRefundForm((current) => ({ ...current, printReceipt: event.target.checked }))}
              />
            </label>
            {warning ? <p className="mt-2 text-sm font-semibold text-rose-600">{warning}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="subtle" onClick={() => { setCancelTarget(null); setCancelReason(''); setRefundForm({ amount: '', method: 'Cash', printReceipt: true }); setWarning('') }}>Close</Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={confirmCancel}>Cancel & Refund</Button>
            </div>
          </div>
        </div>
      ) : null}

      {returnTarget ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-600">
              <HiOutlineExclamationTriangle className="h-5 w-5" />
              <p className="text-base font-black tracking-tight">Confirm vehicle return</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Waqai gaari wapas aa gayi hai? This will mark {returnTarget.vehicleName} as returned, settle remaining due, and free the vehicle.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <SummaryRow label="Booking" value={returnTarget.bookingNumber} />
              <SummaryRow label="Vehicle" value={returnTarget.vehicleRegistration} />
              <SummaryRow label="Due to settle" value={formatTransportCurrency(returnTarget.dueAmount)} tone="text-rose-600" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="subtle" onClick={() => setReturnTarget(null)}>No, keep open</Button>
              <Button onClick={confirmReturnBooking}>Yes, vehicle returned</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <Card className="rounded-[1.25rem] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone || 'text-slate-950 dark:text-white'}`}>{value}</p>
    </Card>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function SummaryRow({ label, value, strong, tone }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${strong ? 'font-bold text-slate-950' : 'text-slate-500'}`}>{label}</span>
      <span className={`${strong ? 'text-base font-black text-slate-950' : `font-semibold ${tone || 'text-slate-700'}`}`}>{value}</span>
    </div>
  )
}
