import { buildInvoiceQrPayload } from './invoiceQr.js'
import { dateLabel, invoiceIssueDate, statusBadge } from './invoiceHelpers.js'
import {
  invoiceDocumentLabel,
  invoiceItemRows,
  invoiceNumberLabel,
  invoicePartyLabel,
  invoicePaymentRows,
  normalizeInvoiceTotals,
  safePrintText,
} from './printDocuments.js'
import { formatCurrency } from '../utils/format.js'

function fileSafe(value, fallback = 'invoice') {
  return safePrintText(value, fallback).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-')
}

function addDataUrlImage(doc, dataUrl, x, y, width, height) {
  if (!dataUrl || !String(dataUrl).startsWith('data:image')) return false
  try {
    doc.addImage(dataUrl, 'PNG', x, y, width, height)
    return true
  } catch {
    return false
  }
}

async function loadInvoicePdfDeps() {
  const [{ default: QRCode }, { jsPDF }, autoTableModule] = await Promise.all([
    import('qrcode'),
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { QRCode, jsPDF, autoTable: autoTableModule.default }
}

export async function exportInvoicePdf({
  invoice = {},
  company = {},
  payments = [],
  businessType,
} = {}) {
  const { QRCode, jsPDF, autoTable } = await loadInvoicePdfDeps()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const currency = invoice.currency || 'PKR'
  const totals = normalizeInvoiceTotals(invoice)
  const documentLabel = invoiceDocumentLabel(businessType, invoice)
  const numberLabel = invoiceNumberLabel(businessType, invoice)
  const partyLabel = invoicePartyLabel(businessType || invoice.businessType)
  const invoiceNumber = invoice.invoiceNumber || invoice.id || invoice.invoiceId || 'invoice'
  const status = statusBadge(invoice.status || invoice.paymentStatus)
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify(buildInvoiceQrPayload({ ...invoice, businessType: businessType || invoice.businessType }, totals)), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 132,
    color: { dark: '#0f172a', light: '#ffffff' },
  })

  doc.setTextColor('#0f172a')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(safePrintText(company.name, 'Nexora Solutions'), margin, 48)
  doc.setFontSize(26)
  doc.text(documentLabel.toUpperCase(), pageWidth - margin, 48, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor('#475569')
  const companyLines = [
    company.address,
    [company.phone, company.email].filter(Boolean).join(' | '),
    company.taxId ? `Tax ID: ${company.taxId}` : '',
  ].filter(Boolean)
  doc.text(companyLines.length ? companyLines : ['Business details not provided'], margin, 66)
  doc.text(`${numberLabel}: ${safePrintText(invoiceNumber)}\nStatus: ${status.label}`, pageWidth - margin, 66, { align: 'right' })
  addDataUrlImage(doc, company.logoUrl, margin, 86, 42, 42)
  doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 72, 92, 72, 72)

  autoTable(doc, {
    startY: 150,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: '#0f172a', lineColor: '#e2e8f0', lineWidth: 0.5 },
    headStyles: { fillColor: '#f1f5f9', textColor: '#334155', fontStyle: 'bold' },
    head: [['Bill From', 'Bill To', 'Document Dates']],
    body: [[
      [
        safePrintText(company.name, 'Nexora Solutions'),
        safePrintText(company.address),
        safePrintText(company.phone, ''),
        safePrintText(company.email, ''),
      ].filter(Boolean).join('\n'),
      [
        `${partyLabel}: ${safePrintText(invoice.customerName || invoice.studentName || invoice.tenantName || invoice.clientName)}`,
        invoice.customerPhone || invoice.studentPhone || invoice.tenantPhone ? `Phone: ${invoice.customerPhone || invoice.studentPhone || invoice.tenantPhone}` : '',
        invoice.customerEmail || invoice.studentEmail || invoice.tenantEmail ? `Email: ${invoice.customerEmail || invoice.studentEmail || invoice.tenantEmail}` : '',
        invoice.customerAddress || invoice.billingAddress || invoice.tenantAddress ? `Address: ${invoice.customerAddress || invoice.billingAddress || invoice.tenantAddress}` : '',
        invoice.customerTaxId || invoice.customerNtn || invoice.cnic ? `NTN/CNIC: ${invoice.customerTaxId || invoice.customerNtn || invoice.cnic}` : '',
        invoice.className || invoice.section ? `Class/Section: ${[invoice.className, invoice.section].filter(Boolean).join(' - ')}` : '',
        invoice.rollNo || invoice.admissionNo ? `Roll/Admission: ${[invoice.rollNo, invoice.admissionNo].filter(Boolean).join(' / ')}` : '',
        invoice.feeMonth ? `Fee Month: ${invoice.feeMonth}` : '',
        invoice.propertyName || invoice.unitNo ? `Property/Unit: ${[invoice.propertyName, invoice.unitNo].filter(Boolean).join(' - ')}` : '',
      ].filter(Boolean).join('\n'),
      [
        `Issue: ${dateLabel(invoiceIssueDate(invoice))}`,
        `Due: ${dateLabel(invoice.dueDate)}`,
        `Terms: ${safePrintText(invoice.paymentTerms, documentLabel === 'Bill' ? 'Due on receipt' : 'Net 14 Days')}`,
        `Method: ${safePrintText(invoice.paymentMethod, 'Bank Transfer')}`,
      ].join('\n'),
    ]],
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 18,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: '#0f172a', lineColor: '#e2e8f0', lineWidth: 0.5 },
    headStyles: { fillColor: '#f1f5f9', textColor: '#334155', fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    head: [['#', 'Item / Description', 'Qty', 'Rate', 'Discount', 'Tax', 'Amount']],
    body: invoiceItemRows(invoice).map(({ item, index, line, description }) => [
      index + 1,
      `${safePrintText(item.name, 'Invoice item')}\n${safePrintText(description)}`,
      `${line.quantity} ${item.unit || ''}`.trim(),
      formatCurrency(line.price, currency),
      `${line.discountPercent}%`,
      `${line.taxRate}%`,
      formatCurrency(line.total, currency),
    ]),
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    margin: { left: pageWidth - margin - 220, right: margin },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4, textColor: '#0f172a' },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    body: [
      ['Subtotal', formatCurrency(totals.subtotal, currency)],
      ['Discount', `- ${formatCurrency(totals.discountTotal, currency)}`],
      ['Tax', `+ ${formatCurrency(totals.taxTotal, currency)}`],
      ['Rounding', formatCurrency(totals.roundOff, currency)],
      ['Total', formatCurrency(totals.grandTotal, currency)],
      ['Paid', formatCurrency(totals.amountPaid, currency)],
      ['Balance', formatCurrency(totals.balanceDue, currency)],
    ],
  })

  const paymentRows = invoicePaymentRows(invoice, payments)
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 18,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: '#0f172a', lineColor: '#e2e8f0', lineWidth: 0.5 },
    headStyles: { fillColor: '#f1f5f9', textColor: '#334155', fontStyle: 'bold' },
    head: [['Payment Date', 'Method', 'Reference', 'Amount']],
    body: paymentRows.length
      ? paymentRows.map((payment) => [
          dateLabel(payment.date),
          safePrintText(payment.method),
          safePrintText(payment.reference),
          formatCurrency(payment.amount, payment.currency || currency),
        ])
      : [[dateLabel(invoiceIssueDate(invoice)), 'Document created', '-', formatCurrency(0, currency)]],
  })

  const footerY = Math.min(doc.lastAutoTable.finalY + 24, doc.internal.pageSize.getHeight() - 92)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor('#0f172a')
  doc.text('Terms', margin, footerY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#475569')
  doc.text(doc.splitTextToSize(invoice.terms || invoice.termsConditions || 'Payment is due within the specified terms.', 310), margin, footerY + 14)
  doc.setDrawColor('#94a3b8')
  doc.line(pageWidth - margin - 170, footerY + 44, pageWidth - margin, footerY + 44)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text('Authorized Signature', pageWidth - margin - 85, footerY + 58, { align: 'center' })

  doc.save(`${fileSafe(documentLabel)}-${fileSafe(invoiceNumber)}.pdf`)
}
