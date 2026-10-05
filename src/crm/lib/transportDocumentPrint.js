/**
 * Printable A4 HTML and a WhatsApp text for Transport / Rental quotations and
 * invoices. Pure: money formatting and business details are passed in, so it is
 * unit tested (tests/transport-documents.test.mjs).
 */
import { LINE_TYPES, TRIP_TYPES, lineAmount } from './transportDocuments.js'

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

const dateText = (iso) => {
  if (!iso) return ''
  const date = new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso)
  return Number.isNaN(date.getTime()) ? String(iso) : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const tripLabel = (id) => TRIP_TYPES.find((item) => item.id === id)?.label || ''
const lineLabel = (id) => LINE_TYPES.find((item) => item.id === id)?.label || 'Charge'

export const DEFAULT_QUOTE_TERMS = 'This quotation is valid until the date shown. Rates are for the trip and dates described above. A booking is confirmed on receipt of the advance. Fuel, tolls and parking are charged as shown unless stated as included.'
export const DEFAULT_INVOICE_TERMS = 'Payment is due by the due date shown. Vehicles must be returned in the condition they were handed over. Any damage, challans or fuel shortfall are charged separately. The security deposit is refundable on safe return.'

/** @param {object} doc @param {object} totals from computeDocumentTotals/documentTotals @param {{businessName?:string,address?:string,phone?:string,email?:string,taxNumber?:string,logoUrl?:string,themeColor?:string,receiptFooter?:string}} business @param {(n:number)=>string} fmt */
export function buildTransportDocumentHtml(doc, totals, business = {}, fmt = (n) => String(n), status = '') {
  const isQuote = doc.kind === 'quotation'
  const color = /^#[0-9a-f]{6}$/i.test(business.themeColor || '') ? business.themeColor : '#0f766e'
  const title = isQuote ? 'QUOTATION' : 'INVOICE'
  const rows = (doc.lines || []).map((line, index) => `
        <tr>
          <td class="c">${index + 1}</td>
          <td><strong>${esc(line.description || lineLabel(line.type))}</strong><div class="sub">${esc(lineLabel(line.type))}</div></td>
          <td class="r">${esc(line.qty)} ${esc(line.unit || '')}</td>
          <td class="r">${esc(fmt(line.unitRate))}</td>
          <td class="r"><strong>${esc(fmt(lineAmount(line)))}</strong></td>
        </tr>`).join('')
  const trip = [
    tripLabel(doc.tripType) && ['Trip', tripLabel(doc.tripType)],
    doc.pickupLocation && ['Pickup', doc.pickupLocation],
    doc.dropLocation && ['Drop-off', doc.dropLocation],
    doc.startAt && ['From', dateText(doc.startAt)],
    doc.endAt && ['To', dateText(doc.endAt)],
  ].filter(Boolean)
  const totalRows = [
    ['Subtotal', fmt(totals.subtotal)],
    totals.discount > 0 && ['Discount', `- ${fmt(totals.discount)}`],
    totals.tax > 0 && [`${doc.taxLabel || 'Tax'} (${doc.taxRate}%)`, fmt(totals.tax)],
  ].filter(Boolean)
  const payments = !isQuote && (doc.payments || []).length
    ? `<h4>Payments received</h4><table class="mini">${doc.payments.map((payment) => `<tr><td>${esc(dateText(payment.date))}</td><td>${esc(payment.method)}</td><td class="r">${esc(fmt(payment.amount))}</td></tr>`).join('')}</table>`
    : ''
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)} ${esc(doc.number)}</title>
<style>
  *{box-sizing:border-box}body{margin:0;padding:28px;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;background:#fff;font-size:13px}
  .page{max-width:780px;margin:0 auto}
  .head{display:flex;justify-content:space-between;gap:20px;padding:22px 24px;border-radius:16px;background:${color};color:#fff}
  .biz{display:flex;gap:14px;align-items:center}.biz img{height:52px;width:52px;border-radius:12px;object-fit:cover;background:#fff}
  .biz h1{margin:0;font-size:20px}.biz p{margin:2px 0 0;font-size:12px;opacity:.9}
  .doc{text-align:right}.doc .t{font-size:24px;font-weight:800;letter-spacing:.14em}.doc .n{margin-top:4px;font-size:13px}
  .badge{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.2);font-size:11px;font-weight:700;text-transform:uppercase}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
  .box{border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px}.box h4{margin:0 0 8px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#64748b}
  .box div{display:flex;justify-content:space-between;gap:10px;padding:2px 0}.box span{color:#64748b}.box strong{text-align:right}
  table.items{width:100%;border-collapse:collapse;margin-top:16px}
  .items th{background:#f1f5f9;text-align:left;padding:9px 10px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#475569}
  .items td{padding:10px;border-bottom:1px solid #e2e8f0;vertical-align:top}.sub{font-size:11px;color:#94a3b8;margin-top:2px}
  .r{text-align:right}.c{text-align:center;width:34px;color:#94a3b8}
  .totals{margin-left:auto;margin-top:14px;width:300px}.totals div{display:flex;justify-content:space-between;padding:5px 0}
  .totals .grand{border-top:2px solid ${color};margin-top:4px;padding-top:9px;font-size:16px;font-weight:800;color:${color}}
  .totals .due{background:${color}12;border-radius:10px;padding:9px 12px;margin-top:8px;font-weight:800}
  .note{margin-top:14px;padding:11px 14px;border-radius:12px;background:#f8fafc;border:1px dashed #cbd5e1;color:#475569;font-size:12px}
  h4{margin:16px 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64748b}.mini{width:100%;border-collapse:collapse}.mini td{padding:4px 0;border-bottom:1px solid #f1f5f9}
  .terms{white-space:pre-wrap;color:#475569;font-size:12px;line-height:1.6}
  .sign{display:flex;justify-content:space-between;margin-top:42px}.sign div{width:200px;border-top:1px solid #94a3b8;padding-top:6px;text-align:center;color:#64748b;font-size:11px}
  .foot{margin-top:22px;text-align:center;color:#94a3b8;font-size:11px}
  @media print{body{padding:0}.head{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">
  <div class="head">
    <div class="biz">${business.logoUrl ? `<img src="${esc(business.logoUrl)}" alt="">` : ''}<div><h1>${esc(business.businessName || 'Transport / Rental')}</h1><p>${esc([business.address, business.phone, business.email].filter(Boolean).join(' | '))}</p>${business.taxNumber ? `<p>Tax no: ${esc(business.taxNumber)}</p>` : ''}</div></div>
    <div class="doc"><div class="t">${title}</div><div class="n">${esc(doc.number)}</div>${status ? `<span class="badge">${esc(status)}</span>` : ''}</div>
  </div>
  <div class="grid">
    <div class="box"><h4>${isQuote ? 'Quote for' : 'Bill to'}</h4>
      <div><strong>${esc(doc.customer)}</strong></div>
      ${doc.phone ? `<div><span>Phone</span><strong>${esc(doc.phone)}</strong></div>` : ''}
      ${doc.email ? `<div><span>Email</span><strong>${esc(doc.email)}</strong></div>` : ''}
      ${doc.address ? `<div><span>Address</span><strong>${esc(doc.address)}</strong></div>` : ''}
      ${doc.cnic ? `<div><span>CNIC / ID</span><strong>${esc(doc.cnic)}</strong></div>` : ''}
    </div>
    <div class="box"><h4>Details</h4>
      <div><span>Date</span><strong>${esc(dateText(doc.issueDate))}</strong></div>
      ${isQuote ? `<div><span>Valid until</span><strong>${esc(dateText(doc.validUntil))}</strong></div>` : `<div><span>Due date</span><strong>${esc(dateText(doc.dueDate))}</strong></div>`}
      ${doc.bookingNumber ? `<div><span>Booking</span><strong>${esc(doc.bookingNumber)}</strong></div>` : ''}
      ${trip.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
    </div>
  </div>
  <table class="items"><thead><tr><th class="c">#</th><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="c">No items</td></tr>'}</tbody></table>
  <div class="totals">
    ${totalRows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
    <div class="grand"><span>Total</span><span>${esc(fmt(totals.total))}</span></div>
    ${!isQuote ? `<div><span>Paid</span><strong>${esc(fmt(totals.paid))}</strong></div><div class="due"><span>Balance due</span><span>${esc(fmt(totals.balance))}</span></div>` : ''}
  </div>
  ${totals.securityDeposit > 0 ? `<div class="note">Refundable security deposit: <strong>${esc(fmt(totals.securityDeposit))}</strong>. It is collected separately, is not part of the total above and is returned on safe return of the vehicle.</div>` : ''}
  ${payments}
  ${doc.notes ? `<h4>Notes</h4><div class="terms">${esc(doc.notes)}</div>` : ''}
  <h4>Terms</h4><div class="terms">${esc(doc.terms || (isQuote ? DEFAULT_QUOTE_TERMS : DEFAULT_INVOICE_TERMS))}</div>
  <div class="sign"><div>Customer signature</div><div>Authorised signature</div></div>
  <div class="foot">${esc(business.receiptFooter || 'Thank you for choosing us.')}</div>
</div></body></html>`
}

export function buildTransportDocumentShareText(doc, totals, business = {}, fmt = (n) => String(n)) {
  const isQuote = doc.kind === 'quotation'
  const lines = (doc.lines || []).map((line) => `- ${line.description || lineLabel(line.type)}: ${line.qty} ${line.unit || ''} x ${fmt(line.unitRate)} = ${fmt(lineAmount(line))}`)
  return [
    `${business.businessName || 'Transport / Rental'}`,
    `${isQuote ? 'Quotation' : 'Invoice'} ${doc.number}`,
    `Customer: ${doc.customer}`,
    doc.pickupLocation || doc.dropLocation ? `Trip: ${[doc.pickupLocation, doc.dropLocation].filter(Boolean).join(' to ')}` : '',
    doc.startAt ? `Dates: ${dateText(doc.startAt)}${doc.endAt ? ` - ${dateText(doc.endAt)}` : ''}` : '',
    '',
    ...lines,
    '',
    `Total: ${fmt(totals.total)}`,
    isQuote ? `Valid until: ${dateText(doc.validUntil)}` : `Paid: ${fmt(totals.paid)} | Balance: ${fmt(totals.balance)}`,
    totals.securityDeposit > 0 ? `Refundable security deposit: ${fmt(totals.securityDeposit)}` : '',
  ].filter((line, index, all) => line !== '' || (all[index - 1] !== '' && index !== 0)).join('\n')
}
