import NexoraLogo from '../../../components/brand/NexoraLogo.jsx'
import Badge from '../ui/Badge.jsx'
import { formatCurrency } from '../../utils/format.js'
import {
  amountInWords,
  calculateInvoiceDraft,
  calculateInvoiceLine,
  dateLabel,
  invoiceIssueDate,
  invoicePaidAmount,
  invoiceTotal,
  statusBadge,
} from '../../lib/invoiceHelpers.js'

function QRPlaceholder() {
  return (
    <div className="grid h-24 w-24 grid-cols-5 gap-1 rounded-xl border border-slate-200 bg-white p-2">
      {Array.from({ length: 25 }).map((_, index) => (
        <span
          key={index}
          className={index % 2 === 0 || [6, 8, 16, 18].includes(index) ? 'rounded-sm bg-slate-950' : 'rounded-sm bg-slate-100'}
        />
      ))}
    </div>
  )
}

function normalizePreviewInvoice(invoice = {}) {
  const totals = invoice.items?.length ? calculateInvoiceDraft(invoice) : null
  const total = totals?.grandTotal ?? invoiceTotal(invoice)
  const amountPaid = totals?.amountPaid ?? invoicePaidAmount(invoice)
  const status = statusBadge(invoice.status || invoice.paymentStatus)
  return {
    totals: totals || {
      subtotal: invoice.subtotal ?? invoice.subtotalUsd ?? total,
      discountTotal: invoice.discountTotal ?? invoice.discount ?? 0,
      taxableAmount: invoice.taxableAmount ?? invoice.subtotal ?? total,
      taxTotal: invoice.taxTotal ?? invoice.taxAmount ?? invoice.taxAmountUsd ?? 0,
      roundOff: invoice.roundOff ?? 0,
      grandTotal: total,
      amountPaid,
      balanceDue: Math.max(total - amountPaid, 0),
      amountInWords: invoice.amountInWords || amountInWords(total, invoice.currency || 'PKR'),
    },
    status,
  }
}

export default function InvoicePreview({
  invoice,
  company,
  payments = [],
  compact = false,
  id = 'invoice-print',
}) {
  const { totals, status } = normalizePreviewInvoice(invoice)
  const currency = invoice.currency || 'PKR'
  const items = Array.isArray(invoice.items) && invoice.items.length ? invoice.items : []
  const paymentRows = payments.filter((payment) => {
    const invoiceKey = invoice.id || invoice.invoiceNumber
    return payment.invoiceId === invoiceKey || payment.invoiceNumber === invoice.invoiceNumber
  })

  return (
    <article
      id={id}
      className={`rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-[0_24px_90px_-60px_rgba(79,70,229,0.6)] ${
        compact ? 'p-4 text-[11px]' : 'p-6 text-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <NexoraLogo compact textClassName="text-slate-950" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Solutions</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-3">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">INVOICE</h2>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700">#{invoice.invoiceNumber || 'INV-DRAFT'}</p>
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1fr_auto]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">From</p>
          <p className="mt-2 font-bold text-slate-950">{company?.name || 'Nexora Solutions'}</p>
          <p className="mt-1 leading-6 text-slate-600">{company?.address || '123 Business Avenue, Suite 100, Lahore, Pakistan'}</p>
          <p className="text-slate-600">Phone: {company?.phone || '+92 300 1234567'}</p>
          <p className="text-slate-600">Email: {company?.email || 'info@nexora.com'}</p>
          <p className="text-slate-600">NTN: {company?.taxId || '1234567-8'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Bill To</p>
          <p className="mt-2 font-bold text-slate-950">{invoice.customerName || 'Customer Name'}</p>
          <p className="mt-1 leading-6 text-slate-600">{invoice.customerAddress || invoice.billingAddress || 'Customer address'}</p>
          <p className="text-slate-600">{invoice.customerPhone || ''}</p>
          <p className="text-slate-600">{invoice.customerEmail || ''}</p>
          <p className="text-slate-600">NTN/CNIC: {invoice.customerTaxId || invoice.customerNtn || '-'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
          <QRPlaceholder />
          <p className="mt-2 text-[11px] font-semibold text-slate-500">Scan to Pay</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 border-y border-slate-200 py-4 text-xs sm:grid-cols-4">
        <div>
          <p className="font-bold text-slate-400">Invoice Date</p>
          <p className="mt-1 font-semibold">{dateLabel(invoiceIssueDate(invoice))}</p>
        </div>
        <div>
          <p className="font-bold text-slate-400">Due Date</p>
          <p className="mt-1 font-semibold">{dateLabel(invoice.dueDate)}</p>
        </div>
        <div>
          <p className="font-bold text-slate-400">Payment Terms</p>
          <p className="mt-1 font-semibold">{invoice.paymentTerms || 'Net 14 Days'}</p>
        </div>
        <div>
          <p className="font-bold text-slate-400">Payment Method</p>
          <p className="mt-1 font-semibold">{invoice.paymentMethod || 'Bank Transfer'}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3 font-black">#</th>
              <th className="px-3 py-3 font-black">Item / Description</th>
              <th className="px-3 py-3 text-right font-black">Qty</th>
              <th className="px-3 py-3 text-right font-black">Unit</th>
              <th className="px-3 py-3 text-right font-black">Rate ({currency})</th>
              <th className="px-3 py-3 text-right font-black">Discount</th>
              <th className="px-3 py-3 text-right font-black">Tax</th>
              <th className="px-3 py-3 text-right font-black">Amount ({currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(items.length ? items : [{ name: 'Invoice item', quantity: 1, unit: 'Service', price: 0 }]).map((item, index) => {
              const line = calculateInvoiceLine(item)
              return (
                <tr key={`${item.name || 'item'}-${index}`}>
                  <td className="px-3 py-3 font-semibold">{index + 1}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-950">{item.name || 'Invoice item'}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{item.description || item.sku || item.code || '-'}</p>
                  </td>
                  <td className="px-3 py-3 text-right">{line.quantity}</td>
                  <td className="px-3 py-3 text-right">{item.unit || 'PCS'}</td>
                  <td className="px-3 py-3 text-right">{line.price.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right">{line.discountPercent}%</td>
                  <td className="px-3 py-3 text-right">{line.taxRate}%</td>
                  <td className="px-3 py-3 text-right font-bold">{line.taxableAmount.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_285px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-bold text-slate-950">Payment History</p>
          <div className="mt-4 space-y-3">
            {paymentRows.length ? (
              paymentRows.slice(0, 4).map((payment) => (
                <div key={payment.id || payment.reference} className="flex items-start gap-3 text-xs">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{dateLabel(payment.paidAt || payment.createdAt)}</span>
                    <span className="block text-slate-500">{payment.paymentMethod || 'Payment'} received</span>
                  </span>
                  <span className="font-bold">{formatCurrency(payment.amount || payment.amountPaid, payment.currency || currency)}</span>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 text-xs">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>
                  <span className="block font-semibold">{dateLabel(invoiceIssueDate(invoice))}</span>
                  <span className="block text-slate-500">Invoice created</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="space-y-2 p-4 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(totals.subtotal, currency)}</strong></div>
            <div className="flex justify-between"><span>Discount</span><strong>- {formatCurrency(totals.discountTotal, currency)}</strong></div>
            <div className="flex justify-between"><span>Taxable Amount</span><strong>{formatCurrency(totals.taxableAmount, currency)}</strong></div>
            <div className="flex justify-between"><span>Total Tax</span><strong>+ {formatCurrency(totals.taxTotal, currency)}</strong></div>
            <div className="flex justify-between"><span>Rounding</span><strong>{formatCurrency(totals.roundOff, currency)}</strong></div>
          </div>
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <span className="text-sm font-bold">Grand Total</span>
            <strong>{formatCurrency(totals.grandTotal, currency)}</strong>
          </div>
          <div className="p-4 text-xs">
            <p className="font-bold">Amount in Words</p>
            <p className="mt-1 text-slate-600">{totals.amountInWords}</p>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="font-bold">Terms & Conditions</p>
          <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-600">
            {invoice.terms || invoice.termsConditions || 'Payment is due within the specified terms.'}
          </p>
          {invoice.notes ? <p className="mt-4 text-xs leading-6 text-slate-600">{invoice.notes}</p> : null}
        </div>
        <div className="pt-6 text-center">
          <div className="mx-auto h-12 w-44 border-b border-slate-300 text-2xl italic text-slate-500">
            {invoice.signatureName || company?.signature || ''}
          </div>
          <p className="mt-2 text-xs font-bold">Authorized Signature</p>
        </div>
      </div>
    </article>
  )
}
