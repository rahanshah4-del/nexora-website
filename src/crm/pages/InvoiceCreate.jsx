import { motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineDocumentArrowDown,
  HiOutlineEye,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineTrash,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import CurrencySelector from '../components/invoices/CurrencySelector.jsx'
import InvoicePreview from '../components/invoices/InvoicePreview.jsx'
import { useInvoices } from '../hooks/useInvoices.js'
import { useProducts } from '../hooks/useProducts.js'
import { useUser } from '../hooks/useUser.js'
import { formatCurrency } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { resolveWorkspaceName } from '../../lib/workspaceName.js'
import {
  INVOICE_STATUS_OPTIONS,
  INVOICE_TEMPLATES,
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  UNIT_OPTIONS,
  blankInvoiceItem,
  calculateInvoiceDraft,
  calculateInvoiceLine,
  createBlankInvoice,
  money,
} from '../lib/invoiceHelpers.js'

function StepBadge({ number }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
      {number}
    </span>
  )
}

function SectionCard({ number, title, action, children, className = '' }) {
  return (
    <section className={cn('rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-48px_rgba(79,70,229,0.45)]', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StepBadge number={number} />
          <h2 className="text-sm font-black text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, required, children, className = '' }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="text-xs font-bold text-slate-600">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function TextArea({ className = '', ...props }) {
  return (
    <textarea
      className={cn(
        'focus-ring min-h-20 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300',
        className,
      )}
      {...props}
    />
  )
}

function OptionTile({ title, detail, active, children }) {
  return (
    <div className={cn('rounded-2xl border p-3 transition', active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
      <div className="flex items-start gap-3">
        <span className={cn('mt-1 grid h-8 w-8 place-items-center rounded-xl', active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')}>
          {children || <HiOutlineCheckCircle className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-black text-slate-950">{title}</span>
          <span className="mt-1 block text-[11px] text-slate-500">{detail}</span>
        </span>
      </div>
    </div>
  )
}

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const { createInvoice } = useInvoices()
  const { products } = useProducts()
  const { userDoc, userId } = useUser()
  const [invoice, setInvoice] = useState(() => createBlankInvoice())
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewSeen, setPreviewSeen] = useState(false)
  const previewRef = useRef(null)

  const totals = useMemo(() => calculateInvoiceDraft(invoice), [invoice])
  const company = useMemo(
    () => ({
      name: resolveWorkspaceName({ accountData: userDoc, userId, fallback: userDoc?.company || 'Nexora Solutions' }),
      email: userDoc?.email || '',
      phone: userDoc?.phone || '',
      address: userDoc?.companyAddress || userDoc?.address || '',
      taxId: userDoc?.ntn || userDoc?.taxId || '',
      signature: userDoc?.fullName || userDoc?.name || '',
    }),
    [userDoc, userId],
  )

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
      updateItem(index, { productId: '', name: '', sku: '', code: '', description: '', price: 0, rate: 0 })
      return
    }
    updateItem(index, {
      productId: product.id,
      name: product.name,
      sku: product.sku || '',
      code: product.sku || '',
      description: product.description || product.category || '',
      price: money(product.price),
      rate: money(product.price),
      taxRate: money(product.taxRate),
      unit: product.unit || 'PCS',
    })
    if (product.currency) update('currency', product.currency)
  }

  function showToast(nextToast, timeout = 2200) {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), timeout)
  }

  function showPreview() {
    setPreviewSeen(true)
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submitInvoice(status = '', allowWithoutPreview = false) {
    const requestedStatus = status || String(invoice.status || 'pending').toLowerCase()
    if (!allowWithoutPreview && !previewSeen) {
      showPreview()
      showToast({ tone: 'info', message: 'Preview the invoice before saving final invoice.' })
      return
    }

    const cleanItems = invoice.items
      .filter((item) => item.name || item.productId)
      .map((item) => {
        const line = calculateInvoiceLine(item)
        return {
          ...item,
          quantity: line.quantity,
          qty: line.quantity,
          price: line.price,
          rate: line.price,
          discountPercent: line.discountPercent,
          discountAmount: line.discountAmount,
          taxableAmount: line.taxableAmount,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.total,
        }
      })

    setSubmitting(true)
    const finalAmountPaid = requestedStatus === 'paid' ? totals.grandTotal : totals.amountPaid
    const res = await createInvoice({
      ...invoice,
      items: cleanItems,
      status: requestedStatus,
      paymentStatus: requestedStatus === 'draft' ? 'draft' : finalAmountPaid >= totals.grandTotal ? 'paid' : finalAmountPaid > 0 ? 'partial' : 'pending',
      approvalStatus: requestedStatus === 'paid' ? 'approved' : requestedStatus === 'draft' ? 'draft' : 'pending',
      requiresApproval: requestedStatus !== 'draft' && requestedStatus !== 'paid',
      subtotal: totals.subtotal,
      discount: totals.discountTotal,
      discountTotal: totals.discountTotal,
      taxableAmount: totals.taxableAmount,
      taxRate: totals.averageTaxRate,
      taxAmount: totals.taxTotal,
      taxTotal: totals.taxTotal,
      roundOff: totals.roundOff,
      total: totals.grandTotal,
      amountPaid: finalAmountPaid,
      balanceDue: Math.max(totals.grandTotal - finalAmountPaid, 0),
      amountInWords: totals.amountInWords,
      subtotalUsd: totals.subtotal,
      taxAmountUsd: totals.taxTotal,
      totalUsd: totals.grandTotal,
    })
    setSubmitting(false)

    if (res?.ok) {
      showToast({ tone: 'success', message: requestedStatus === 'draft' ? 'Draft invoice saved' : 'Invoice created successfully' })
      window.setTimeout(() => navigate('/app/invoices'), 650)
    } else {
      showToast({ tone: 'error', message: res?.error || 'Unable to create invoice' }, 2800)
    }
  }

  return (
    <motion.div
      className="-m-3 min-h-[calc(100vh-5rem)] bg-slate-50 p-3 sm:-m-5 sm:p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: absolute !important; inset: 0 !important; width: 210mm !important; min-height: 297mm !important; border: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-[5.5rem] z-20 -mx-3 mb-4 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-[0_18px_50px_-44px_rgba(15,23,42,0.5)] backdrop-blur-sm sm:-mx-5 sm:px-5">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="focus-ring grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => navigate('/app/invoices')}
              aria-label="Back to invoices"
            >
              <HiOutlineArrowLeft />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-500">
                Invoices <span className="text-slate-300">/</span> <span className="font-black text-slate-950">Create Invoice</span>
              </p>
              <p className="mt-1 truncate text-xs font-medium text-slate-500">{company.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" className="h-10 rounded-xl" type="button" disabled={submitting} onClick={() => submitInvoice('draft', true)}>
              Save Draft
            </Button>
            <Button variant="subtle" className="h-10 rounded-xl" type="button" onClick={showPreview}>
              <HiOutlineEye className="h-4 w-4" />
              Preview
            </Button>
            <Button className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 shadow-lg shadow-indigo-600/20" type="button" disabled={submitting} onClick={() => submitInvoice()}>
              {previewSeen ? 'Save Final Invoice' : 'Next -> Preview'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)]">
        <main className="space-y-4">
          <SectionCard number="1" title="Customer Information">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Customer Name" required>
                <div className="flex gap-2">
                  <Input value={invoice.customerName} onChange={(event) => update('customerName', event.target.value)} placeholder="Tech Solutions PK" />
                  <Button variant="subtle" className="h-10 rounded-xl px-3 text-xs" type="button">+ New</Button>
                </div>
              </Field>
              <Field label="Phone">
                <Input value={invoice.customerPhone} onChange={(event) => update('customerPhone', event.target.value)} placeholder="+92 300 1234567" />
              </Field>
              <Field label="Email">
                <Input type="email" value={invoice.customerEmail} onChange={(event) => update('customerEmail', event.target.value)} placeholder="billing@example.com" />
              </Field>
              <Field label="NTN / CNIC">
                <Input value={invoice.customerTaxId} onChange={(event) => update('customerTaxId', event.target.value)} placeholder="9876543-2" />
              </Field>
              <Field label="Address" className="md:col-span-2">
                <Input value={invoice.customerAddress} onChange={(event) => update('customerAddress', event.target.value)} placeholder="Street, city, country" />
              </Field>
              <Field label="Customer Notes" className="md:col-span-3">
                <TextArea value={invoice.customerNotes} onChange={(event) => update('customerNotes', event.target.value)} placeholder="Add any notes for this customer..." />
              </Field>
            </div>
          </SectionCard>

          <SectionCard number="2" title="Invoice Information">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Invoice Number">
                <Input value={invoice.invoiceNumber} onChange={(event) => update('invoiceNumber', event.target.value)} />
              </Field>
              <Field label="Invoice Date">
                <Input type="date" value={invoice.issueDate} onChange={(event) => update('issueDate', event.target.value)} />
              </Field>
              <Field label="Due Date">
                <Input type="date" value={invoice.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
              </Field>
              <Field label="Currency">
                <CurrencySelector value={invoice.currency} onChange={(value) => update('currency', value)} />
              </Field>
              <Field label="Payment Terms">
                <Select value={invoice.paymentTerms} onChange={(event) => update('paymentTerms', event.target.value)}>
                  {PAYMENT_TERMS.map((term) => <option key={term}>{term}</option>)}
                </Select>
              </Field>
              <Field label="Invoice Status">
                <Select value={invoice.status} onChange={(event) => update('status', event.target.value)}>
                  {INVOICE_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </Select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            number="3"
            title="Items"
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Amounts are</span>
                <Select className="h-9 w-40 rounded-xl text-xs" value="Tax Exclusive" readOnly>
                  <option>Tax Exclusive</option>
                </Select>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-[1060px] w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    {['#', 'Item / Product', 'SKU / Code', 'Description', 'Qty', 'Unit', `Rate (${invoice.currency})`, 'Discount %', 'Tax %', `Total (${invoice.currency})`, 'Action'].map((heading) => (
                      <th key={heading} className="px-2 py-2 font-black">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, index) => {
                    const line = calculateInvoiceLine(item)
                    return (
                      <tr key={index}>
                        <td className="px-2 py-2 font-bold">{index + 1}</td>
                        <td className="px-2 py-2">
                          <Select className="h-10 min-w-[145px] rounded-xl" value={item.productId} onChange={(event) => selectProduct(index, event.target.value)}>
                            <option value="">Manual item</option>
                            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                          </Select>
                          <Input className="mt-1 h-10 min-w-[145px] rounded-xl" value={item.name} placeholder="Item name" onChange={(event) => updateItem(index, { name: event.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <Input className="h-10 min-w-[110px] rounded-xl" value={item.sku || item.code} onChange={(event) => updateItem(index, { sku: event.target.value, code: event.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <Input className="h-10 min-w-[150px] rounded-xl" value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <Input className="h-10 w-20 rounded-xl" inputMode="decimal" value={item.quantity} onChange={(event) => {
                            const quantity = money(event.target.value)
                            updateItem(index, { quantity, qty: quantity })
                          }} />
                        </td>
                        <td className="px-2 py-2">
                          <Select className="h-10 w-28 rounded-xl" value={item.unit || 'PCS'} onChange={(event) => updateItem(index, { unit: event.target.value })}>
                            {UNIT_OPTIONS.map((unit) => <option key={unit}>{unit}</option>)}
                          </Select>
                        </td>
                        <td className="px-2 py-2">
                          <Input className="h-10 w-28 rounded-xl" inputMode="decimal" value={item.price ?? item.rate} onChange={(event) => {
                            const price = money(event.target.value)
                            updateItem(index, { price, rate: price })
                          }} />
                        </td>
                        <td className="px-2 py-2">
                          <Input className="h-10 w-24 rounded-xl" inputMode="decimal" value={item.discountPercent} onChange={(event) => updateItem(index, { discountPercent: money(event.target.value) })} />
                        </td>
                        <td className="px-2 py-2">
                          <Input className="h-10 w-20 rounded-xl" inputMode="decimal" value={item.taxRate} onChange={(event) => updateItem(index, { taxRate: money(event.target.value) })} />
                        </td>
                        <td className="px-2 py-2 font-black text-slate-950">{formatCurrency(line.taxableAmount, invoice.currency)}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="grid h-9 w-9 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"
                            onClick={() => setInvoice((current) => ({ ...current, items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : current.items }))}
                            aria-label="Delete item"
                          >
                            <HiOutlineTrash />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="subtle" className="rounded-xl text-xs text-indigo-700" type="button" onClick={() => setInvoice((current) => ({ ...current, items: [...current.items, blankInvoiceItem()] }))}>
                <HiOutlinePlus className="h-4 w-4" />
                Add Item
              </Button>
              <Button variant="subtle" className="rounded-xl text-xs text-indigo-700" type="button" onClick={() => setInvoice((current) => ({ ...current, items: [...current.items, ...Array.from({ length: 5 }, blankInvoiceItem)] }))}>
                <HiOutlinePlus className="h-4 w-4" />
                Add Bulk Items
              </Button>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)_minmax(280px,0.8fr)]">
            <SectionCard number="4" title="Additional Options">
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <OptionTile title="Attach Document" detail={invoice.attachmentName || 'Upload files'} active={Boolean(invoice.attachmentName)}>
                    <HiOutlineDocumentArrowDown className="h-4 w-4" />
                  </OptionTile>
                  <input className="sr-only" type="file" onChange={(event) => update('attachmentName', event.target.files?.[0]?.name || '')} />
                </label>
                <label>
                  <OptionTile title="Recurring Invoice" detail="Set recurrence" active={invoice.recurring} />
                  <input className="sr-only" type="checkbox" checked={invoice.recurring} onChange={(event) => update('recurring', event.target.checked)} />
                </label>
                <OptionTile title="Invoice Template" detail={invoice.template}>
                  <HiOutlineEye className="h-4 w-4" />
                </OptionTile>
                <OptionTile title="Signature" detail={invoice.signatureName || 'Add signature'} />
                <Field label="Invoice Template" className="sm:col-span-2">
                  <Select value={invoice.template} onChange={(event) => update('template', event.target.value)}>
                    {INVOICE_TEMPLATES.map((template) => <option key={template}>{template}</option>)}
                  </Select>
                </Field>
                <Field label="Signature" className="sm:col-span-2">
                  <Input value={invoice.signatureName} onChange={(event) => update('signatureName', event.target.value)} placeholder="Authorized person" />
                </Field>
                <Field label="Terms & Conditions" className="sm:col-span-2">
                  <TextArea value={invoice.terms} onChange={(event) => update('terms', event.target.value)} />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <TextArea value={invoice.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Internal or customer-visible notes" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard number="5" title="Payment Method">
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="h-4 w-4 accent-indigo-600"
                      checked={invoice.paymentMethod === method}
                      onChange={() => update('paymentMethod', method)}
                    />
                    {method}
                    {method === 'Bank Transfer' ? <Badge variant="purple">Recommended</Badge> : null}
                  </label>
                ))}
              </div>
            </SectionCard>

            <SectionCard number="6" title="Smart Calculations">
              <div className="space-y-2 text-sm">
                {[
                  ['Subtotal', totals.subtotal],
                  ['Discount Total', -totals.discountTotal],
                  ['Taxable Amount', totals.taxableAmount],
                  ['Tax Total', totals.taxTotal],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <span className="font-black text-slate-950">{formatCurrency(value, invoice.currency)}</span>
                  </div>
                ))}
                <Field label="Round Off">
                  <Input value={invoice.roundOff} inputMode="decimal" onChange={(event) => update('roundOff', money(event.target.value))} />
                </Field>
                <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
                  <p className="text-xs font-bold text-white/75">Grand Total</p>
                  <p className="mt-1 text-2xl font-black">{formatCurrency(totals.grandTotal, invoice.currency)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-black text-slate-950">Amount in Words</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{totals.amountInWords}</p>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="no-print sticky bottom-3 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_24px_80px_-48px_rgba(79,70,229,0.65)] backdrop-blur-sm">
            <Button variant="subtle" className="h-10 rounded-xl" type="button" disabled={submitting} onClick={() => submitInvoice('draft', true)}>
              Save Draft
            </Button>
            <Button className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600" type="button" disabled={submitting} onClick={() => submitInvoice()}>
              {submitting ? 'Saving...' : previewSeen ? 'Save Final Invoice' : 'Next -> Preview'}
            </Button>
          </div>
        </main>

        <aside ref={previewRef} className="space-y-3 xl:sticky xl:top-[10rem] xl:self-start">
          <div className="no-print flex flex-wrap justify-between gap-2 rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-[0_18px_60px_-50px_rgba(79,70,229,0.5)]">
            <div className="flex items-center gap-3">
              <StepBadge number="6" />
              <p className="text-sm font-black text-slate-950">Invoice Preview</p>
            </div>
            <div className="flex gap-2">
              <Button variant="subtle" className="h-9 rounded-xl px-3 text-xs" type="button" onClick={() => window.print()}>
                <HiOutlineDocumentArrowDown className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="subtle" className="h-9 rounded-xl px-3 text-xs" type="button" onClick={() => window.print()}>
                <HiOutlinePrinter className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
          <InvoicePreview invoice={{ ...invoice, ...totals, total: totals.grandTotal }} company={company} />
          <div className="no-print grid gap-2 sm:grid-cols-3 xl:grid-cols-3">
            <Button variant="subtle" className="rounded-xl text-xs text-indigo-700" type="button">
              <HiOutlinePaperAirplane className="h-4 w-4" />
              Send via Email
            </Button>
            <Button variant="subtle" className="rounded-xl text-xs text-emerald-700" type="button">
              Send via WhatsApp
            </Button>
            <Button variant="subtle" className="rounded-xl text-xs text-indigo-700" type="button">
              Share Invoice Link
            </Button>
          </div>
        </aside>
      </div>
    </motion.div>
  )
}
