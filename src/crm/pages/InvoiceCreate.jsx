import { motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineDocumentArrowDown,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineTrash,
} from 'react-icons/hi2'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import CurrencySelector from '../components/invoices/CurrencySelector.jsx'
import { useInvoices } from '../hooks/useInvoices.js'
import { useProducts } from '../hooks/useProducts.js'
import { formatCurrency } from '../utils/format.js'
import { cn } from '../utils/cn.js'

const today = new Date()
const dueDefault = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

function invoiceNumber() {
  const date = today.toISOString().slice(0, 10).replaceAll('-', '')
  return `INV-${date}-${Math.floor(1000 + Math.random() * 9000)}`
}

function money(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function blankItem() {
  return {
    productId: '',
    name: '',
    sku: '',
    type: 'service',
    quantity: 1,
    qty: 1,
    price: 0,
    taxRate: 0,
    discount: 0,
    stockQuantity: null,
  }
}

function createBlankInvoice() {
  return {
    invoiceNumber: invoiceNumber(),
    currency: 'PKR',
    template: 'Neon Slate',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    billingAddress: '',
    issueDate: today.toISOString().slice(0, 10),
    dueDate: dueDefault,
    recurring: false,
    recurringCycle: 'monthly',
    paymentTerms: 'Due in 7 days',
    paymentInstructions: 'Bank transfer, cash, card, or wallet payment accepted.',
    notes: 'Thank you for your business.',
    terms: 'Payment is due according to the selected billing terms.',
    amountPaid: 0,
    items: [blankItem()],
  }
}

function calcLine(item) {
  const quantity = Math.max(money(item.quantity ?? item.qty), 0)
  const price = Math.max(money(item.price), 0)
  const base = quantity * price
  const tax = base * (Math.max(money(item.taxRate), 0) / 100)
  const discount = Math.min(Math.max(money(item.discount), 0), base + tax)
  return { base, tax, discount, total: Math.max(base + tax - discount, 0) }
}

function Field({ label, children, className = '' }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function Panel({ title, kicker, children, className = '' }) {
  return (
    <section className={cn('rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[0_24px_80px_-55px_rgba(59,130,246,0.7)] backdrop-blur-xl', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {kicker ? <p className="mt-0.5 text-xs text-slate-400">{kicker}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const { createInvoice } = useInvoices()
  const { products } = useProducts()
  const [invoice, setInvoice] = useState(createBlankInvoice)
  const [productQuery, setProductQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const previewRef = useRef(null)

  const totals = useMemo(() => {
    const lines = invoice.items.map(calcLine)
    const subtotal = lines.reduce((sum, line) => sum + line.base, 0)
    const taxAmount = lines.reduce((sum, line) => sum + line.tax, 0)
    const discount = lines.reduce((sum, line) => sum + line.discount, 0)
    const total = Math.max(subtotal + taxAmount - discount, 0)
    const amountPaid = Math.min(Math.max(money(invoice.amountPaid), 0), total)
    return {
      subtotal,
      taxableAmount: subtotal,
      taxRate: subtotal ? (taxAmount / subtotal) * 100 : 0,
      taxAmount,
      discount,
      total,
      amountPaid,
      balanceDue: Math.max(total - amountPaid, 0),
    }
  }, [invoice.amountPaid, invoice.items])

  const filteredProducts = useMemo(() => {
    const needle = productQuery.trim().toLowerCase()
    return products
      .filter((product) => {
        if (!needle) return true
        return [product.name, product.sku, product.category, product.productType].join(' ').toLowerCase().includes(needle)
      })
      .slice(0, 8)
  }, [productQuery, products])

  function update(key, value) {
    setInvoice((current) => ({ ...current, [key]: value }))
  }

  function updateItem(index, patch) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  function selectProduct(index, productId) {
    const product = products.find((item) => item.id === productId)
    if (!product) {
      updateItem(index, { productId: '', name: '', sku: '', type: 'service', price: 0, taxRate: 0, stockQuantity: null })
      return
    }
    setInvoice((current) => ({
      ...current,
      currency: product.currency || current.currency || 'PKR',
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId: product.id,
              name: product.name,
              sku: product.sku,
              type: product.productType || 'product',
              price: money(product.price),
              taxRate: money(product.taxRate),
              stockQuantity: product.stockQuantity,
            }
          : item,
      ),
    }))
  }

  function showToast(nextToast) {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), 2200)
  }

  function saveDraft() {
    localStorage.setItem('nexora-invoice-draft', JSON.stringify({ ...invoice, totals, savedAt: new Date().toISOString() }))
    showToast({ tone: 'success', message: 'Draft saved' })
  }

  function printInvoice() {
    window.print()
  }

  function previewInvoice() {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submitInvoice(nextStatus = 'pending') {
    setSubmitting(true)
    const cleanItems = invoice.items
      .filter((item) => item.name || item.productId)
      .map((item) => ({
        ...item,
        quantity: Math.max(money(item.quantity ?? item.qty), 0),
        qty: Math.max(money(item.quantity ?? item.qty), 0),
        price: Math.max(money(item.price), 0),
      }))
    const res = await createInvoice({
      ...invoice,
      items: cleanItems,
      ...totals,
      subtotalUsd: totals.subtotal,
      taxAmountUsd: totals.taxAmount,
      totalUsd: totals.total,
      status: nextStatus,
      paymentStatus: totals.amountPaid > 0 ? 'partial' : nextStatus,
      approvalStatus: nextStatus === 'approved' ? 'approved' : 'pending',
      requiresApproval: nextStatus !== 'approved',
    })
    setSubmitting(false)
    if (res?.ok) {
      showToast({ tone: 'success', message: nextStatus === 'approved' ? 'Invoice saved and approved' : 'Invoice created' })
      window.setTimeout(() => navigate('/app/invoices'), 700)
    } else {
      showToast({ tone: 'error', message: res?.error || 'Unable to create invoice' })
    }
  }

  return (
    <motion.div
      className="invoice-workspace -m-3 min-h-[calc(100vh-5rem)] rounded-3xl bg-[#080b1a] p-3 text-white sm:-m-4 sm:p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: absolute !important; inset: 0 !important; width: 210mm !important; min-height: 297mm !important; background: #ffffff !important; color: #0f172a !important; box-shadow: none !important; border: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            title="Back"
            aria-label="Back"
            onClick={() => navigate('/app/invoices')}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/15"
          >
            <HiOutlineArrowLeft />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Billing Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Create Invoice</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" className="h-10 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15" type="button" onClick={saveDraft}>
            Save Draft
          </Button>
          <Button variant="subtle" className="h-10 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15" type="button" onClick={previewInvoice}>
            <HiOutlineEye />
            Preview Invoice
          </Button>
          <Button variant="subtle" className="h-10 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15" type="button" onClick={() => submitInvoice('pending')} disabled={submitting}>
            <HiOutlinePaperAirplane />
            Send Invoice
          </Button>
          <Button variant="subtle" className="h-10 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15" type="button" onClick={printInvoice}>
            <HiOutlineDocumentArrowDown />
            Download PDF
          </Button>
          <Button className="h-10 rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300" type="button" onClick={printInvoice}>
            <HiOutlinePrinter />
            Print Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_390px]">
        <div className="no-print space-y-3">
          <Panel title="Invoice Details" kicker="Numbering, dates, currency">
            <div className="grid gap-3">
              <Field label="Invoice Number">
                <Input className="h-9 border-white/10 bg-white/10 text-white" value={invoice.invoiceNumber} onChange={(event) => update('invoiceNumber', event.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Issue Date">
                  <Input className="h-9 border-white/10 bg-white/10 text-white [color-scheme:dark]" type="date" value={invoice.issueDate} onChange={(event) => update('issueDate', event.target.value)} />
                </Field>
                <Field label="Due Date">
                  <Input className="h-9 border-white/10 bg-white/10 text-white [color-scheme:dark]" type="date" value={invoice.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
                </Field>
              </div>
              <Field label="Currency">
                <CurrencySelector className="h-9 border-white/10 bg-white/10 text-white" value={invoice.currency} onChange={(value) => update('currency', value)} />
              </Field>
              <Field label="Template">
                <Select className="h-9 border-white/10 bg-white/10 text-white" value={invoice.template} onChange={(event) => update('template', event.target.value)}>
                  <option>Neon Slate</option>
                  <option>Executive White</option>
                  <option>Compact Finance</option>
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel title="Customer Details" kicker="Bill-to information">
            <div className="grid gap-3">
              <Field label="Customer Name">
                <Input className="h-9 border-white/10 bg-white/10 text-white" value={invoice.customerName} onChange={(event) => update('customerName', event.target.value)} />
              </Field>
              <Field label="Customer Email">
                <Input className="h-9 border-white/10 bg-white/10 text-white" type="email" value={invoice.customerEmail} onChange={(event) => update('customerEmail', event.target.value)} />
              </Field>
              <Field label="Customer Phone">
                <Input className="h-9 border-white/10 bg-white/10 text-white" value={invoice.customerPhone} onChange={(event) => update('customerPhone', event.target.value)} />
              </Field>
              <Field label="Billing Address">
                <textarea className="focus-ring min-h-20 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none" value={invoice.billingAddress} onChange={(event) => update('billingAddress', event.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title="Billing Settings" kicker="Terms, recurrence, payments">
            <div className="grid gap-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white">
                Recurring Billing
                <input className="h-4 w-4 accent-cyan-400" type="checkbox" checked={invoice.recurring} onChange={(event) => update('recurring', event.target.checked)} />
              </label>
              <Field label="Recurring Cycle">
                <Select className="h-9 border-white/10 bg-white/10 text-white" value={invoice.recurringCycle} disabled={!invoice.recurring} onChange={(event) => update('recurringCycle', event.target.value)}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </Field>
              <Field label="Payment Terms">
                <Select className="h-9 border-white/10 bg-white/10 text-white" value={invoice.paymentTerms} onChange={(event) => update('paymentTerms', event.target.value)}>
                  <option>Due on receipt</option>
                  <option>Due in 7 days</option>
                  <option>Due in 15 days</option>
                  <option>Due in 30 days</option>
                </Select>
              </Field>
              <Field label="Amount Paid">
                <Input className="h-9 border-white/10 bg-white/10 text-white" inputMode="decimal" value={invoice.amountPaid} onChange={(event) => update('amountPaid', money(event.target.value))} />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="no-print space-y-3">
          <Panel title="Products, Services & Subscriptions" kicker="Search products, set quantity, tax, discounts, and stock-aware lines">
            <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(12rem,1fr)_auto]">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input className="h-10 border-white/10 bg-white/10 pl-9 text-white" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} aria-label="Search product catalog" />
              </div>
              <Button
                variant="subtle"
                className="h-10 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15"
                type="button"
                onClick={() => setInvoice((current) => ({ ...current, items: [...current.items, blankItem()] }))}
              >
                <HiOutlinePlus />
                Add Line
              </Button>
            </div>

            {filteredProducts.length ? (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(0, product.id)}
                    className="min-w-[11rem] rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-3 text-left transition hover:bg-cyan-300/15"
                  >
                    <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{product.sku || product.productType || 'Item'}</p>
                    <p className="mt-2 text-xs font-semibold text-cyan-200">{formatCurrency(product.price, product.currency || invoice.currency)}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="space-y-2">
              {invoice.items.map((item, index) => {
                const line = calcLine(item)
                return (
                  <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                    <div className="grid gap-2 xl:grid-cols-[1.15fr_1.3fr_72px_96px_84px_96px_92px_auto]">
                      <Select className="h-9 border-white/10 bg-white/10 text-white" value={item.productId} onChange={(event) => selectProduct(index, event.target.value)}>
                        <option value="">Manual item</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </Select>
                      <Input className="h-9 border-white/10 bg-white/10 text-white" value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} aria-label="Item name" />
                      <Input className="h-9 border-white/10 bg-white/10 text-white" inputMode="numeric" value={item.quantity} onChange={(event) => {
                        const quantity = money(event.target.value)
                        updateItem(index, { quantity, qty: quantity })
                      }} aria-label="Quantity" />
                      <Input className="h-9 border-white/10 bg-white/10 text-white" inputMode="decimal" value={item.price} onChange={(event) => updateItem(index, { price: money(event.target.value) })} aria-label="Unit price" />
                      <Input className="h-9 border-white/10 bg-white/10 text-white" inputMode="decimal" value={item.taxRate} onChange={(event) => updateItem(index, { taxRate: money(event.target.value) })} aria-label="Tax rate" />
                      <Input className="h-9 border-white/10 bg-white/10 text-white" inputMode="decimal" value={item.discount} onChange={(event) => updateItem(index, { discount: money(event.target.value) })} aria-label="Discount" />
                      <div className="flex h-9 items-center rounded-xl border border-white/10 bg-white/10 px-3 text-xs text-slate-300">
                        {item.stockQuantity === null || item.stockQuantity === undefined ? 'No stock' : `${item.stockQuantity} stock`}
                      </div>
                      <button
                        type="button"
                        title="Remove"
                        aria-label="Remove"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-rose-300/20 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/20"
                        onClick={() => setInvoice((current) => ({ ...current, items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : current.items }))}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="capitalize">{item.type || 'service'}</span>
                      <span className="font-semibold text-cyan-200">{formatCurrency(line.total, invoice.currency)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
            <Panel title="Notes & Terms">
              <div className="grid gap-3">
                <Field label="Custom Notes">
                  <textarea className="focus-ring min-h-20 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none" value={invoice.notes} onChange={(event) => update('notes', event.target.value)} />
                </Field>
                <Field label="Terms">
                  <textarea className="focus-ring min-h-20 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none" value={invoice.terms} onChange={(event) => update('terms', event.target.value)} />
                </Field>
                <Field label="Payment Instructions">
                  <textarea className="focus-ring min-h-20 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none" value={invoice.paymentInstructions} onChange={(event) => update('paymentInstructions', event.target.value)} />
                </Field>
              </div>
            </Panel>

            <Panel title="Totals">
              <div className="space-y-2 text-sm">
                {[
                  ['Subtotal', totals.subtotal],
                  ['Tax', totals.taxAmount],
                  ['Discount', totals.discount],
                  ['Amount Paid', totals.amountPaid],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-semibold text-white">{formatCurrency(value, invoice.currency)}</span>
                  </div>
                ))}
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3">
                  <p className="text-xs text-cyan-100">Balance Due</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(totals.balanceDue, invoice.currency)}</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="sticky bottom-3 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-2xl backdrop-blur-xl">
            <Button variant="subtle" className="h-10 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15" type="button" onClick={saveDraft}>
              Save Draft
            </Button>
            <Button variant="subtle" className="h-10 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15" type="button" disabled={submitting} onClick={() => submitInvoice('approved')}>
              <HiOutlineCheckCircle />
              Save & Approve
            </Button>
            <Button className="h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20" type="button" disabled={submitting} onClick={() => submitInvoice('pending')}>
              {submitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>

        <aside ref={previewRef} className="space-y-3">
          <div id="invoice-print" className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-[0_24px_100px_-52px_rgba(34,211,238,0.75)]">
            <div className="flex items-start justify-between gap-4">
              <NexoraLogo compact textClassName="text-slate-950" />
              <div className="text-right">
                <p className="text-2xl font-semibold tracking-tight">INVOICE</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{invoice.invoiceNumber}</p>
                <div className="mt-2"><Badge variant={totals.balanceDue <= 0 ? 'success' : totals.amountPaid > 0 ? 'info' : 'warning'}>{totals.balanceDue <= 0 ? 'Paid' : totals.amountPaid > 0 ? 'Partial' : 'Pending'}</Badge></div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 border-y border-slate-200 py-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Bill To</p>
                <p className="mt-2 font-semibold">{invoice.customerName || 'Customer'}</p>
                <p className="text-slate-500">{invoice.customerEmail || 'customer@email.com'}</p>
                <p className="text-slate-500">{invoice.customerPhone || ''}</p>
                <p className="mt-1 whitespace-pre-line text-slate-500">{invoice.billingAddress}</p>
              </div>
              <div className="sm:text-right">
                <p><span className="text-slate-500">Issue:</span> {invoice.issueDate}</p>
                <p><span className="text-slate-500">Due:</span> {invoice.dueDate}</p>
                <p><span className="text-slate-500">Terms:</span> {invoice.paymentTerms}</p>
                <p><span className="text-slate-500">Recurring:</span> {invoice.recurring ? invoice.recurringCycle : 'No'}</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit</th>
                    <th className="px-3 py-2 text-right">Tax</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.filter((item) => item.name || item.productId).map((item, index) => {
                    const line = calcLine(item)
                    return (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <p className="font-semibold">{item.name || 'Invoice item'}</p>
                          <p className="text-xs text-slate-500">{item.sku || item.type}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{money(item.quantity ?? item.qty)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.price, invoice.currency)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(line.tax, invoice.currency)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(line.total, invoice.currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_220px]">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold">Payment Instructions</p>
                <p className="mt-2 whitespace-pre-line text-slate-600">{invoice.paymentInstructions}</p>
                <p className="mt-4 font-semibold">Notes</p>
                <p className="mt-2 whitespace-pre-line text-slate-600">{invoice.notes}</p>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['Subtotal', totals.subtotal],
                  ['Tax', totals.taxAmount],
                  ['Discount', totals.discount],
                  ['Paid', totals.amountPaid],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold">{formatCurrency(value, invoice.currency)}</span>
                  </div>
                ))}
                <div className="mt-3 rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-xs text-slate-300">Balance Due</p>
                  <p className="mt-1 text-xl font-semibold">{formatCurrency(totals.balanceDue, invoice.currency)}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                QR / payment reference
              </div>
              <div className="pt-8 text-right">
                <div className="ml-auto h-px w-40 bg-slate-300" />
                <p className="mt-2 text-sm font-semibold">Authorized Signature</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  )
}
