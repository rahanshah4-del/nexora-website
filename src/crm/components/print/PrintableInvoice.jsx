import NexoraLogo from '../../../components/brand/NexoraLogo.jsx'
import InvoiceQrCode from '../invoices/InvoiceQrCode.jsx'
import { dateLabel, invoiceIssueDate, statusBadge } from '../../lib/invoiceHelpers.js'
import {
  invoiceDocumentLabel,
  invoiceItemRows,
  invoiceNumberLabel,
  invoicePartyLabel,
  invoicePaymentRows,
  normalizeInvoiceTotals,
  safePrintText,
} from '../../lib/printDocuments.js'
import { formatCurrency } from '../../utils/format.js'
import { useLanguage, tx } from '../../../lib/i18n.jsx'

function InfoLine({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{safePrintText(value)}</p>
    </div>
  )
}

function TotalLine({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? 'text-base font-black text-slate-950' : 'text-sm text-slate-700'}`}>
      <span>{label}</span>
      <span className={strong ? 'font-black' : 'font-bold'}>{value}</span>
    </div>
  )
}

export default function PrintableInvoice({
  invoice = {},
  company = {},
  payments = [],
  businessType,
  className = '',
}) {
  const { language, meta } = useLanguage()
  const t = (key, fallback = '') => tx(key, language, fallback)
  const currency = invoice.currency || 'PKR'
  const totals = normalizeInvoiceTotals(invoice)
  const status = statusBadge(invoice.status || invoice.paymentStatus)
  const documentLabel = invoiceDocumentLabel(businessType, invoice)
  const numberLabel = invoiceNumberLabel(businessType, invoice)
  const partyLabel = invoicePartyLabel(businessType || invoice.businessType)
  const itemRows = invoiceItemRows(invoice)
  const paymentRows = invoicePaymentRows(invoice, payments)
  const customerName = invoice.customerName || invoice.studentName || invoice.tenantName || invoice.clientName
  const customerAddress = invoice.customerAddress || invoice.billingAddress || invoice.tenantAddress || invoice.studentAddress
  const customerTaxId = invoice.customerTaxId || invoice.customerNtn || invoice.tenantTaxId || invoice.cnic
  const companyName = company.name || 'Nexora Solution'

  const partyFields = [
    [partyLabel, customerName],
    [t('phone'), invoice.customerPhone || invoice.studentPhone || invoice.tenantPhone],
    [t('email'), invoice.customerEmail || invoice.studentEmail || invoice.tenantEmail],
    [t('address'), customerAddress],
    [t('ntnCnic'), customerTaxId],
    [t('classSection'), [invoice.className, invoice.section].filter(Boolean).join(' - ')],
    [t('rollAdmissionNo'), [invoice.rollNo, invoice.admissionNo].filter(Boolean).join(' / ')],
    [t('feeMonth'), invoice.feeMonth],
    [t('propertyUnit'), [invoice.propertyName, invoice.unitNo || invoice.unitNumber].filter(Boolean).join(' - ')],
    [t('rentPeriod'), invoice.rentPeriod || invoice.billingPeriod],
    [t('tableOrder'), [invoice.tableNo || invoice.tableNumber, invoice.orderNo || invoice.orderNumber].filter(Boolean).join(' / ')],
  ].filter(([, value]) => safePrintText(value, '') !== '')

  return (
    <article
      dir={meta.dir}
      lang={meta.htmlLang}
      style={{ fontFamily: meta.fontFamily }}
      className={`print-document printable-invoice nexora-i18n mx-auto w-full max-w-[794px] bg-white p-0 text-slate-950 ${className}`}
    >
      <header className="print-avoid-break border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Business logo" className="h-14 w-14 rounded-xl border border-slate-200 object-contain p-1" />
              ) : (
                <div className="shrink-0">
                  <NexoraLogo compact textClassName="text-slate-950" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="break-words text-xl font-black text-slate-950">{companyName}</h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('businessBillingDocument')}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-1 text-xs leading-5 text-slate-600">
              {company.address ? <span>{company.address}</span> : null}
              <span>{[company.phone, company.email].filter(Boolean).join(' | ') || t('contactDetailsMissing')}</span>
              {company.taxId ? <span>{t('taxId')}: {company.taxId}</span> : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{status.label}</p>
            <h2 className="mt-1 text-2xl font-black uppercase text-slate-950">{documentLabel}</h2>
            <p className="mt-2 text-sm font-bold text-slate-700">{numberLabel}: {safePrintText(invoice.invoiceNumber || invoice.id || invoice.invoiceId)}</p>
          </div>
        </div>
      </header>

      <section className="print-avoid-break mt-5 grid gap-5 md:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t('billFrom')}</p>
            <p className="mt-3 text-base font-black text-slate-950">{companyName}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{safePrintText(company.address, t('addressMissing'))}</p>
            <p className="text-sm text-slate-600">{safePrintText(company.phone, '')}</p>
            <p className="text-sm text-slate-600">{safePrintText(company.email, '')}</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t('billTo')}</p>
            <div className="mt-3 grid gap-3">
              {partyFields.length ? partyFields.map(([label, value]) => <InfoLine key={label} label={label} value={value} />) : (
                <InfoLine label={partyLabel} value={customerName || `${partyLabel} ${t('detailsMissing')}`} />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 text-center">
          <InvoiceQrCode invoice={{ ...invoice, businessType: businessType || invoice.businessType }} totals={totals} />
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{t('qrCode')}</p>
        </div>
      </section>

      <section className="print-avoid-break mt-5 grid gap-3 border-y border-slate-200 py-4 text-sm sm:grid-cols-4">
        <InfoLine label={documentLabel === 'Bill' ? t('billDate') : t('issueDate')} value={dateLabel(invoiceIssueDate(invoice))} />
        <InfoLine label={t('dueDate')} value={dateLabel(invoice.dueDate)} />
        <InfoLine label={t('paymentTerms')} value={invoice.paymentTerms || (documentLabel === 'Bill' ? t('dueOnReceipt') : t('net14Days'))} />
        <InfoLine label={t('paymentMethod')} value={invoice.paymentMethod || t('bankTransfer')} />
      </section>

      <section className="mt-5">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.1em] text-slate-600">
              <tr>
                <th className="w-10 px-3 py-3 font-black">#</th>
                <th className="px-3 py-3 font-black">{t('itemDescription')}</th>
                <th className="px-3 py-3 text-right font-black">{t('qty')}</th>
                <th className="px-3 py-3 text-right font-black">{t('rate')}</th>
                <th className="px-3 py-3 text-right font-black">{t('discount')}</th>
                <th className="px-3 py-3 text-right font-black">{t('tax')}</th>
                <th className="px-3 py-3 text-right font-black">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.map(({ item, index, line, description }) => (
                <tr key={`${item.name || 'item'}-${index}`} className="border-t border-slate-200">
                  <td className="px-3 py-3 align-top font-bold">{index + 1}</td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-bold text-slate-950">{safePrintText(item.name, t('invoiceItem'))}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{description}</p>
                  </td>
                  <td className="px-3 py-3 text-right align-top">{line.quantity} {item.unit || ''}</td>
                  <td className="px-3 py-3 text-right align-top">{formatCurrency(line.price, currency)}</td>
                  <td className="px-3 py-3 text-right align-top">{line.discountPercent}%</td>
                  <td className="px-3 py-3 text-right align-top">{line.taxRate}%</td>
                  <td className="px-3 py-3 text-right align-top font-black">{formatCurrency(line.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-[1fr_290px]">
        <div className="print-avoid-break rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-black text-slate-950">{t('paymentHistory')}</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.1em] text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-black">{t('invoiceDate')}</th>
                  <th className="px-3 py-2 font-black">{t('paymentMethod')}</th>
                  <th className="px-3 py-2 font-black">Reference</th>
                  <th className="px-3 py-2 text-right font-black">{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.length ? paymentRows.map((payment) => (
                  <tr key={payment.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{dateLabel(payment.date)}</td>
                    <td className="px-3 py-2">{safePrintText(payment.method)}</td>
                    <td className="px-3 py-2">{safePrintText(payment.reference)}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(payment.amount, payment.currency || currency)}</td>
                  </tr>
                )) : (
                  <tr className="border-t border-slate-200">
                    <td className="px-3 py-2">{dateLabel(invoiceIssueDate(invoice))}</td>
                    <td className="px-3 py-2">{t('documentCreated')}</td>
                    <td className="px-3 py-2">-</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(0, currency)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-avoid-break rounded-xl border border-slate-200 p-4">
          <div className="space-y-2">
            <TotalLine label={t('subtotal')} value={formatCurrency(totals.subtotal, currency)} />
            <TotalLine label={t('discount')} value={`- ${formatCurrency(totals.discountTotal, currency)}`} />
            <TotalLine label={t('tax')} value={`+ ${formatCurrency(totals.taxTotal, currency)}`} />
            <TotalLine label={t('rounding')} value={formatCurrency(totals.roundOff, currency)} />
            <div className="my-3 border-t border-slate-200" />
            <TotalLine label={t('total')} value={formatCurrency(totals.grandTotal, currency)} strong />
            <TotalLine label={t('paid')} value={formatCurrency(totals.amountPaid, currency)} />
            <TotalLine label={t('balance')} value={formatCurrency(totals.balanceDue, currency)} strong />
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <p className="font-black text-slate-950">{t('amountInWords')}</p>
            <p className="mt-1">{totals.amountInWords}</p>
          </div>
        </div>
      </section>

      <footer className="mt-6 grid gap-5 border-t border-slate-200 pt-5 md:grid-cols-[1fr_230px]">
        <div>
          <p className="text-sm font-black text-slate-950">{t('terms')}</p>
          <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-600">
            {invoice.terms || invoice.termsConditions || t('paymentDueText')}
          </p>
          {invoice.notes ? <p className="mt-3 whitespace-pre-line text-xs leading-6 text-slate-600">{invoice.notes}</p> : null}
          {company.footer ? <p className="mt-4 text-[11px] font-semibold text-slate-500">{company.footer}</p> : null}
        </div>
        <div className="text-center">
          {company.signatureUrl ? (
            <img src={company.signatureUrl} alt="Authorized signature" className="mx-auto h-14 max-w-44 object-contain" />
          ) : (
            <div className="mx-auto h-14 max-w-44 border-b border-slate-300 text-2xl italic text-slate-500">
              {invoice.signatureName || company.signature || ''}
            </div>
          )}
          <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">{t('authorizedSignature')}</p>
        </div>
      </footer>
    </article>
  )
}
