import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useMemo, useState } from 'react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Badge from '../ui/Badge.jsx'
import Select from '../ui/Select.jsx'
import CurrencySelector from './CurrencySelector.jsx'
import { formatCurrency } from '../../utils/format.js'

function calcSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.quantity ?? it.qty) || 0) * (Number(it.price) || 0), 0)
}

function createBlankInvoice() {
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const rand = Math.floor(1000 + Math.random() * 9000)
  return {
    invoiceNumber: `INV-${rand}`,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    items: [{ productId: '', name: '', sku: '', quantity: 1, qty: 1, price: 0 }],
    taxRate: 0,
    discount: 0,
    currency: 'PKR',
    status: 'Pending',
    dueDate: due,
    recurring: false,
    notes: '',
  }
}

function paymentBadge(invoice) {
  const value = String(invoice?.paymentStatus || invoice?.status || 'pending').toLowerCase()
  if (value === 'paid') return { label: 'Paid', variant: 'success' }
  if (value === 'partial') return { label: 'Partial Payment', variant: 'info' }
  if (value === 'rejected' || value === 'cancelled') return { label: 'Payment Rejected', variant: 'danger' }
  return { label: 'Payment Pending', variant: 'warning' }
}

function InvoiceModal({
  open,
  mode = 'detail',
  invoice,
  currency,
  products = [],
  canApprovePayments = false,
  onClose,
  onCreate,
  onMarkPaid,
  onRejectPayment,
  onPartialPayment,
}) {
  const [draft, setDraft] = useState(invoice || null)
  const [newInvoice, setNewInvoice] = useState(() => createBlankInvoice())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (invoice) Promise.resolve().then(() => setDraft(invoice))
    if (mode === 'create') Promise.resolve().then(() => setNewInvoice(createBlankInvoice()))
  }, [open, invoice, mode])

  useEffect(() => {
    if (!open) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  const totals = useMemo(() => {
    const subtotal = calcSubtotal(newInvoice.items)
    const taxRate = Math.max(Number(newInvoice.taxRate) || 0, 0)
    const taxAmount = subtotal * (taxRate / 100)
    const discount = Math.min(Math.max(Number(newInvoice.discount || 0), 0), subtotal + taxAmount)
    const total = Math.max(subtotal + taxAmount - discount, 0)
    return { subtotal, discount, taxableAmount: subtotal, taxRate, taxAmount, total, amountPaid: 0, balanceDue: total }
  }, [newInvoice])

  function updateItem(index, patch) {
    setNewInvoice((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  function selectProduct(index, productId) {
    const product = products.find((item) => item.id === productId)
    if (!product) {
      updateItem(index, { productId: '', name: '', sku: '', price: 0 })
      return
    }
    setNewInvoice((current) => ({
      ...current,
      currency: product.currency || current.currency || 'PKR',
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
            }
          : item,
      ),
    }))
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-2 backdrop-blur-sm sm:p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[92vw] max-w-[960px] overflow-hidden rounded-3xl"
          >
            <Card className="flex max-h-[82vh] flex-col rounded-3xl p-0">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/95 sm:px-5">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {mode === 'create' ? 'Create Invoice' : 'Invoice Detail'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Create, review, and manage invoice payments.</p>
                </div>
                <Badge variant="purple">Invoice</Badge>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
                {mode === 'detail' && draft ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="glass-muted rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Invoice</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.invoiceNumber}</p>
                  </div>
                  <div className="glass-muted rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-slate-900 dark:text-white">{draft.status}</p>
                  </div>
                  <div className="glass-muted rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Payment</p>
                    <div className="mt-1.5">
                      <Badge variant={paymentBadge(draft).variant}>{paymentBadge(draft).label}</Badge>
                    </div>
                  </div>
                  <div className="glass-muted rounded-xl p-3 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Customer</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {draft.customerName} — {draft.customerEmail}
                    </p>
                  </div>
                  <div className="glass-muted rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(draft.total ?? draft.totalUsd ?? 0, draft.currency || currency || 'PKR')}
                    </p>
                  </div>
                  <div className="glass-muted rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Due</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.dueDate}</p>
                  </div>
                  <div className="glass-muted rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Amount Paid</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(draft.amountPaid ?? draft.partialPaidAmount ?? 0, draft.currency || currency || 'PKR')}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Items</p>
                    <div className="mt-2 space-y-2">
                      {draft.items.map((it, idx) => (
                        <div key={idx} className="glass-muted flex items-center justify-between gap-3 rounded-xl p-2.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{it.name}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {it.quantity ?? it.qty} × {formatCurrency(it.price ?? it.priceUsd ?? 0, draft.currency || currency || 'PKR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {String(draft.paymentStatus || draft.status || '').toLowerCase() !== 'paid' &&
                  !['rejected', 'cancelled'].includes(String(draft.paymentStatus || draft.status || '').toLowerCase()) ? (
                    <div className="sm:col-span-2">
                      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/80 p-2.5">
                        <Button
                          className="h-9 rounded-xl px-3 text-xs"
                          type="button"
                          disabled={!canApprovePayments}
                          onClick={(event) => {
                            event.preventDefault()
                            onMarkPaid?.(draft)
                          }}
                        >
                          Mark as Paid
                        </Button>
                        <Button
                          variant="subtle"
                          className="h-9 rounded-xl px-3 text-xs"
                          type="button"
                          disabled={!canApprovePayments}
                          onClick={(event) => {
                            event.preventDefault()
                            onPartialPayment?.(draft)
                          }}
                        >
                          Record Partial Payment
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 rounded-xl px-3 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          type="button"
                          disabled={!canApprovePayments}
                          onClick={(event) => {
                            event.preventDefault()
                            onRejectPayment?.(draft)
                          }}
                        >
                          Reject/Cancel Payment
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : mode === 'create' ? (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Invoice Number</label>
                    <Input className="mt-1 h-9 rounded-lg" value={newInvoice.invoiceNumber} onChange={(e) => setNewInvoice((s) => ({ ...s, invoiceNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Currency</label>
                    <div className="mt-1">
                      <CurrencySelector className="h-9 rounded-lg" value={newInvoice.currency} onChange={(v) => setNewInvoice((s) => ({ ...s, currency: v }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Customer Name</label>
                    <Input className="mt-1 h-9 rounded-lg" value={newInvoice.customerName} onChange={(e) => setNewInvoice((s) => ({ ...s, customerName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Customer Email</label>
                    <Input className="mt-1 h-9 rounded-lg" type="email" value={newInvoice.customerEmail} onChange={(e) => setNewInvoice((s) => ({ ...s, customerEmail: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Due Date</label>
                    <Input className="mt-1 h-9 rounded-lg" type="date" value={newInvoice.dueDate} onChange={(e) => setNewInvoice((s) => ({ ...s, dueDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Tax Rate (%)</label>
                    <Input className="mt-1 h-9 rounded-lg" inputMode="decimal" value={newInvoice.taxRate} onChange={(e) => setNewInvoice((s) => ({ ...s, taxRate: Number(e.target.value || 0) }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Discount</label>
                    <Input className="mt-1 h-9 rounded-lg" inputMode="decimal" value={newInvoice.discount} onChange={(e) => setNewInvoice((s) => ({ ...s, discount: Number(e.target.value || 0) }))} />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Invoice Items</p>
                      <Button
                        variant="subtle"
                        className="h-9 rounded-xl px-3 text-xs"
                        type="button"
                        onClick={() =>
                          setNewInvoice((s) => ({
                            ...s,
                            items: [...s.items, { productId: '', name: '', sku: '', quantity: 1, qty: 1, price: 0 }],
                          }))
                        }
                      >
                        Add Item
                      </Button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {newInvoice.items.map((item, index) => (
                        <div key={index} className="rounded-xl border border-slate-200/80 bg-white/80 p-2">
                          <div className="grid gap-2 lg:grid-cols-[minmax(9rem,1fr)_minmax(10rem,1.1fr)_72px_96px_auto]">
                            <Select className="h-9 rounded-lg" value={item.productId} onChange={(event) => selectProduct(index, event.target.value)}>
                              <option value="">Manual item</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.sku || 'No SKU'})
                                </option>
                              ))}
                            </Select>
                            <Input
                              className="h-9 rounded-lg"
                              value={item.name}
                              placeholder="Item name"
                              onChange={(event) => updateItem(index, { name: event.target.value })}
                            />
                            <Input
                              className="h-9 rounded-lg"
                              inputMode="numeric"
                              value={item.quantity ?? item.qty}
                              onChange={(event) => {
                                const quantity = Number(event.target.value || 0)
                                updateItem(index, { quantity, qty: quantity })
                              }}
                            />
                            <Input
                              className="h-9 rounded-lg"
                              inputMode="decimal"
                              value={item.price}
                              onChange={(event) => updateItem(index, { price: Number(event.target.value || 0) })}
                            />
                            <Button
                              variant="ghost"
                              className="h-9 rounded-xl px-3 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              type="button"
                              onClick={() =>
                                setNewInvoice((s) => ({
                                  ...s,
                                  items: s.items.length > 1 ? s.items.filter((_, itemIndex) => itemIndex !== index) : s.items,
                                }))
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Totals</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="glass-muted rounded-xl p-2.5">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Subtotal</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.subtotal, newInvoice.currency)}</p>
                      </div>
                      <div className="glass-muted rounded-xl p-2.5">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Discount</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.discount, newInvoice.currency)}</p>
                      </div>
                      <div className="glass-muted rounded-xl p-2.5">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Tax</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.taxAmount, newInvoice.currency)}</p>
                      </div>
                      <div className="glass-muted rounded-xl border border-sky-200/70 bg-sky-50/70 p-2.5 dark:border-sky-500/20 dark:bg-sky-500/10">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Total</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.total, newInvoice.currency)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                ) : null}

              </div>

              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/95 sm:px-5">
                {mode === 'create' ? (
                  <Button
                    className="h-9 rounded-xl px-4 text-sm"
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true)
                      const res = await onCreate?.({
                        ...newInvoice,
                        items: newInvoice.items.filter((item) => item.name || item.productId),
                        subtotal: totals.subtotal,
                        discount: totals.discount,
                        taxableAmount: totals.taxableAmount,
                        taxAmount: totals.taxAmount,
                        total: totals.total,
                        amountPaid: totals.amountPaid,
                        balanceDue: totals.balanceDue,
                        subtotalUsd: totals.subtotal,
                        taxAmountUsd: totals.taxAmount,
                        totalUsd: totals.total,
                        currency: newInvoice.currency,
                        status: 'pending',
                        paymentStatus: 'pending',
                        approvalStatus: 'pending',
                        requiresApproval: true,
                      })
                      setSubmitting(false)
                      if (res?.ok) onClose?.()
                    }}
                  >
                    {submitting ? 'Creating…' : 'Create'}
                  </Button>
                ) : null}
                <Button variant="subtle" className="h-9 rounded-xl px-4 text-sm" type="button" onClick={onClose}>
                  Close
                </Button>
                <Button variant="ghost" className="h-9 rounded-xl px-4 text-sm" type="button">
                  Export PDF
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default memo(InvoiceModal)
