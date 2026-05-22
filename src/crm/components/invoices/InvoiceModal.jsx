import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Badge from '../ui/Badge.jsx'
import CurrencySelector from './CurrencySelector.jsx'
import { convertFromUsd } from '../../utils/currency.js'
import { formatCurrency } from '../../utils/format.js'

function calcSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.priceUsd) || 0), 0)
}

export default function InvoiceModal({ open, mode = 'detail', invoice, currency, onClose, onCreate }) {
  const [draft, setDraft] = useState(invoice || null)
  const [newInvoice, setNewInvoice] = useState(() => {
    const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const rand = Math.floor(1000 + Math.random() * 9000)
    return {
      invoiceNumber: `INV-${rand}`,
      customerName: '',
      customerEmail: '',
      items: [{ name: 'Service', qty: 1, priceUsd: 100 }],
      taxRate: 0.0,
      currency: currency || 'USD',
      status: 'Pending',
      dueDate: due,
      recurring: false,
    }
  })

  useEffect(() => {
    if (!open) return
    if (invoice) Promise.resolve().then(() => setDraft(invoice))
  }, [open, invoice])

  const subtotalUsd = calcSubtotal(newInvoice.items)
  const taxAmountUsd = subtotalUsd * (Number(newInvoice.taxRate) || 0)
  const totalUsd = subtotalUsd + taxAmountUsd

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl"
          >
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {mode === 'create' ? 'Create Invoice' : 'Invoice Detail'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    PDF export and subscription billing are placeholders.
                  </p>
                </div>
                <Badge variant="purple">Invoice</Badge>
              </div>

              {mode === 'detail' && draft ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Invoice</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.invoiceNumber}</p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.status}</p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Customer</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {draft.customerName} — {draft.customerEmail}
                    </p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(convertFromUsd(draft.totalUsd, currency), currency)}
                    </p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Due</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.dueDate}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Items</p>
                    <div className="mt-2 space-y-2">
                      {draft.items.map((it, idx) => (
                        <div key={idx} className="glass-muted flex items-center justify-between gap-3 rounded-2xl p-3">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{it.name}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {it.qty} × ${it.priceUsd}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : mode === 'create' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Invoice Number</label>
                    <Input className="mt-1" value={newInvoice.invoiceNumber} onChange={(e) => setNewInvoice((s) => ({ ...s, invoiceNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Currency</label>
                    <div className="mt-1">
                      <CurrencySelector value={newInvoice.currency} onChange={(v) => setNewInvoice((s) => ({ ...s, currency: v }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Name</label>
                    <Input className="mt-1" value={newInvoice.customerName} onChange={(e) => setNewInvoice((s) => ({ ...s, customerName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Email</label>
                    <Input className="mt-1" type="email" value={newInvoice.customerEmail} onChange={(e) => setNewInvoice((s) => ({ ...s, customerEmail: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Due Date</label>
                    <Input className="mt-1" type="date" value={newInvoice.dueDate} onChange={(e) => setNewInvoice((s) => ({ ...s, dueDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tax Rate</label>
                    <Input className="mt-1" inputMode="decimal" value={newInvoice.taxRate} onChange={(e) => setNewInvoice((s) => ({ ...s, taxRate: Number(e.target.value || 0) }))} />
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Totals (USD base)</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div className="glass-muted rounded-2xl p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Subtotal</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${subtotalUsd.toFixed(2)}</p>
                      </div>
                      <div className="glass-muted rounded-2xl p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Tax</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${taxAmountUsd.toFixed(2)}</p>
                      </div>
                      <div className="glass-muted rounded-2xl p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Total</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${totalUsd.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {mode === 'create' ? (
                  <Button
                    className="rounded-2xl"
                    type="button"
                    onClick={() => {
                      onCreate?.({
                        ...newInvoice,
                        subtotalUsd,
                        taxAmountUsd,
                        totalUsd,
                        total: totalUsd,
                        subtotal: subtotalUsd,
                        taxAmount: taxAmountUsd,
                        currency: newInvoice.currency,
                        status: 'Pending',
                        createdAt: new Date().toISOString().slice(0, 10),
                      })
                      onClose?.()
                    }}
                  >
                    Create
                  </Button>
                ) : null}
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Close
                </Button>
                <Button variant="ghost" className="rounded-2xl" type="button">
                  Export PDF (Placeholder)
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
