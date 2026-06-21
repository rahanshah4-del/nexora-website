import { formatCurrency } from '../utils/format.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function transactionTypeLabel(type) {
  const labels = {
    income: 'Income',
    expense: 'Expense Payment',
    bank_transfer: 'Bank Transfer',
    cash_withdrawal: 'Cash Withdrawal',
    cash_payment: 'Cash Payment',
    adjustment: 'Adjustment',
  }
  return labels[String(type || '').toLowerCase()] || 'Account Transaction'
}

export function transactionDateLabel(value, includeTime = true) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return includeTime ? date.toLocaleString() : date.toLocaleDateString()
}

export function transactionDetailRows(transaction = {}) {
  const rows = [
    ['Transaction ID', transaction.transactionId || transaction.id],
    ['Type', transactionTypeLabel(transaction.type)],
    ['Title', transaction.title],
    ['Amount', formatCurrency(transaction.amount || 0, transaction.currency || 'PKR')],
    ['Payment Method', transaction.method || transaction.paymentMethod],
    ['Status', transaction.approvalStatus || transaction.status],
    ['Bank Name', transaction.bankName],
    ['Account Title', transaction.accountTitle],
    ['Account Number', transaction.accountNumber],
    ['Receiver Name', transaction.receiverName],
    ['Paid To', transaction.paidTo],
    ['Reason', transaction.reason],
    ['Expense / Related ID', transaction.expenseId || transaction.relatedId],
    ['Invoice Number', transaction.invoiceNumber],
    ['Invoice ID', transaction.invoiceId],
    ['Payment ID', transaction.paymentId],
    ['Customer / Client', transaction.customerName || transaction.clientName || transaction.studentName],
    ['Reference', transaction.reference || transaction.receiptReference || transaction.transactionReference],
    ['Submitted By', transaction.submittedByName || transaction.submittedByEmail || transaction.createdBy],
    ['Created Date', transactionDateLabel(transaction.createdAt || transaction.paymentSubmittedAt)],
    ['Approved By', transaction.approvedByName || transaction.approvedBy],
    ['Approved Date', transaction.approvedAt ? transactionDateLabel(transaction.approvedAt) : ''],
    ['Rejected By', transaction.rejectedByName || transaction.rejectedBy],
    ['Rejected Date', transaction.rejectedAt ? transactionDateLabel(transaction.rejectedAt) : ''],
    ['Description', transaction.description],
    ['Notes', transaction.notes],
  ]

  return rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
}

function receiptNumber(transaction = {}) {
  const value = String(transaction.transactionId || transaction.id || 'TRANSACTION')
  return value.length > 18 ? value.slice(-18).toUpperCase() : value.toUpperCase()
}

function thermalCenter(value, width = 32) {
  const text = String(value || '').slice(0, width)
  return `${' '.repeat(Math.max(0, Math.floor((width - text.length) / 2)))}${text}`
}

function thermalPair(label, value, width = 32) {
  const left = String(label || '').trim()
  const right = String(value || '').trim()
  if (!right) return ''
  const available = Math.max(1, width - left.length - 1)
  if (right.length <= available) return `${left}${' '.repeat(Math.max(1, width - left.length - right.length))}${right}`
  return `${left}\n${right.match(new RegExp(`.{1,${width}}`, 'g'))?.join('\n') || right}`
}

export function buildAccountTransactionThermalText(transaction = {}, settings = {}) {
  const divider = '-'.repeat(32)
  const status = String(transaction.approvalStatus || transaction.status || 'pending').replaceAll('_', ' ').toUpperCase()
  const details = transactionDetailRows(transaction)
    .filter(([label]) => !['Transaction ID', 'Type', 'Title', 'Amount', 'Status', 'Created Date'].includes(label))
    .map(([label, value]) => thermalPair(label, value))
    .filter(Boolean)

  return [
    thermalCenter(settings.businessName || settings.workspaceName || 'NEXORA SOLUTION'),
    settings.phone ? thermalCenter(settings.phone) : '',
    settings.address ? thermalCenter(String(settings.address).slice(0, 32)) : '',
    divider,
    thermalCenter('TRANSACTION RECEIPT'),
    thermalPair('Receipt', receiptNumber(transaction)),
    thermalPair('Date', transactionDateLabel(transaction.createdAt || transaction.paymentSubmittedAt)),
    thermalPair('Type', transactionTypeLabel(transaction.type)),
    thermalPair('Status', status),
    divider,
    thermalCenter('AMOUNT'),
    thermalCenter(formatCurrency(transaction.amount || 0, transaction.currency || settings.currency || 'PKR')),
    divider,
    ...details,
    divider,
    'Prepared By: ________________',
    'Approved By: ________________',
    divider,
    thermalCenter(settings.receiptFooter || 'Thank you'),
    thermalCenter('Powered by Nexora'),
  ].filter(Boolean).join('\n')
}

export function buildAccountTransactionHtml(transaction = {}, settings = {}, paperSize = 'a4') {
  const compact = paperSize === '58mm'
  const businessName = settings.businessName || settings.workspaceName || 'NEXORA SOLUTION'
  const status = String(transaction.approvalStatus || transaction.status || 'pending').replaceAll('_', ' ')
  const rows = transactionDetailRows(transaction).filter(([label]) => compact
    ? !['Transaction ID', 'Type', 'Amount', 'Status', 'Created Date'].includes(label)
    : true)
  const detailHtml = rows
    .map(([label, value]) => `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('')

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(transactionTypeLabel(transaction.type))} Receipt</title>
      <style>
        @page { size: ${compact ? '58mm auto' : 'A4'}; margin: ${compact ? '2.5mm' : '14mm'}; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; color: #0f172a; font-family: Arial, sans-serif; font-size: ${compact ? '9px' : '13px'}; }
        .doc { width: 100%; max-width: ${compact ? '53mm' : '760px'}; margin: 0 auto; padding: ${compact ? '0' : '24px'}; border: ${compact ? '0' : '1px solid #cbd5e1'}; }
        .brand { text-align: center; border-bottom: ${compact ? '1px dashed' : '2px solid'} #0f172a; padding-bottom: ${compact ? '8px' : '12px'}; }
        .logo { display: block; max-width: ${compact ? '25mm' : '42mm'}; max-height: ${compact ? '12mm' : '20mm'}; margin: 0 auto 6px; object-fit: contain; }
        .brand h1 { margin: 0; font-size: ${compact ? '14px' : '23px'}; letter-spacing: 0; }
        .brand p { margin: 4px 0 0; color: #475569; line-height: 1.4; }
        .heading { margin: ${compact ? '9px' : '16px'} 0 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
        .heading h2 { margin: 0; font-size: ${compact ? '11px' : '18px'}; text-transform: uppercase; }
        .status { border: 1px solid #0f172a; padding: ${compact ? '3px 4px' : '4px 7px'}; font-size: ${compact ? '7px' : '10px'}; font-weight: 700; text-transform: uppercase; }
        .receipt-meta { display: flex; justify-content: space-between; gap: 6px; color: #475569; font-size: ${compact ? '7.5px' : '11px'}; }
        .amount { margin: ${compact ? '9px' : '10px'} 0 ${compact ? '9px' : '14px'}; padding: ${compact ? '8px 4px' : '14px'}; border: ${compact ? '1.5px solid #0f172a' : '1px solid #cbd5e1'}; text-align: center; }
        .amount small { display: block; color: #64748b; font-weight: 700; text-transform: uppercase; }
        .amount strong { display: block; margin-top: 4px; font-size: ${compact ? '18px' : '25px'}; }
        .row { display: grid; grid-template-columns: ${compact ? '38% 62%' : '150px 1fr'}; gap: ${compact ? '4px' : '14px'}; border-bottom: ${compact ? '1px dashed' : '1px solid'} #cbd5e1; padding: ${compact ? '5px 0' : '7px 0'}; }
        .row span { color: #64748b; font-weight: 700; }
        .row strong { overflow-wrap: anywhere; text-align: right; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: ${compact ? '16px' : '28px'}; text-align: center; font-size: ${compact ? '7px' : '10px'}; }
        .signature { border-top: 1px solid #64748b; padding-top: 4px; }
        .footer { margin-top: ${compact ? '12px' : '18px'}; border-top: ${compact ? '1px dashed' : '1px solid'} #94a3b8; padding-top: 8px; text-align: center; color: #64748b; line-height: 1.5; }
        .powered { display: block; margin-top: 4px; font-size: ${compact ? '7px' : '9px'}; text-transform: uppercase; }
        @media print { .doc { border: 0; padding: 0; } }
      </style>
    </head>
    <body>
      <section class="doc">
        <header class="brand">
          ${settings.logoUrl ? `<img class="logo" src="${escapeHtml(settings.logoUrl)}" alt="" />` : ''}
          <h1>${escapeHtml(businessName)}</h1>
          ${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ''}
          ${settings.phone || settings.email ? `<p>${escapeHtml([settings.phone, settings.email].filter(Boolean).join(' | '))}</p>` : ''}
        </header>
        <div class="heading">
          <h2>${escapeHtml(transactionTypeLabel(transaction.type))} Receipt</h2>
          <span class="status">${escapeHtml(status)}</span>
        </div>
        <div class="receipt-meta">
          <span>Receipt #${escapeHtml(receiptNumber(transaction))}</span>
          <span>${escapeHtml(transactionDateLabel(transaction.createdAt || transaction.paymentSubmittedAt))}</span>
        </div>
        <div class="amount">
          <small>Transaction Amount</small>
          <strong>${escapeHtml(formatCurrency(transaction.amount || 0, transaction.currency || settings.currency || 'PKR'))}</strong>
        </div>
        ${detailHtml}
        <div class="signatures"><span class="signature">Prepared by</span><span class="signature">Approved by</span></div>
        <footer class="footer">
          ${escapeHtml(settings.receiptFooter || 'Thank you')}
          <span class="powered">Powered by Nexora</span>
        </footer>
      </section>
    </body>
  </html>`
}
