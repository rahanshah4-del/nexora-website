import { formatRestaurantCurrency } from '../../lib/restaurantPosCalculations.js'

function receiptText(value, fallback = '-') {
  const text = value == null ? '' : String(value).trim()
  return text || fallback
}

function PrintLogo({ settings }) {
  if (settings?.showLogo === false) return null
  const logo = settings?.logoUrl || settings?.restaurantLogo || settings?.logoDataUrl
  return (
    <div className="mx-auto mb-2 grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-xs font-black text-slate-900">
      {logo ? <img src={logo} alt="Restaurant logo" className="h-full w-full object-cover" /> : 'NX'}
    </div>
  )
}

function ReceiptHeader({ data, type }) {
  const settings = data.settings || {}
  return (
    <div className="text-center">
      <PrintLogo settings={settings} />
      <p className="text-[15px] font-black uppercase tracking-wide text-slate-950">{receiptText(data.restaurantName || settings.restaurantName, 'Nexora Restaurant')}</p>
      {settings.branchName || settings.branchCode ? (
        <p className="mt-0.5 text-[10px] font-bold leading-4 text-slate-600">
          {[settings.branchName, settings.branchCode].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{receiptText(settings.address || data.address, 'Restaurant address')}</p>
      <p className="text-[10px] leading-4 text-slate-500">{receiptText(settings.phone || data.phone, 'Phone')} {settings.taxNumber ? ` | Tax ${settings.taxNumber}` : ''}</p>
      {settings.salesTaxNumber || settings.fbrPosId || settings.foodLicenseNumber ? (
        <p className="text-[9px] leading-3 text-slate-500">
          {[
            settings.salesTaxNumber ? `STRN ${settings.salesTaxNumber}` : '',
            settings.fbrPosId ? `POS ${settings.fbrPosId}` : '',
            settings.foodLicenseNumber ? `Food ${settings.foodLicenseNumber}` : '',
          ].filter(Boolean).join(' | ')}
        </p>
      ) : null}
      <div className="my-2 border-t border-dashed border-slate-300" />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-950">{type === 'kot' ? 'Kitchen Copy' : '58mm Bill'}</p>
    </div>
  )
}

function ReceiptRows({ rows = [], kot = false }) {
  return (
    <div className="space-y-1.5">
      {rows.map((row, index) => (
        <div key={`${row.item?.id || row.name || 'row'}-${index}`} className="text-[11px]">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 font-bold text-slate-950">{row.quantity || row.qty} x {row.item?.name || row.name}</span>
            {!kot ? <span className="shrink-0 font-bold text-slate-950">{formatRestaurantCurrency(row.lineTotal)}</span> : null}
          </div>
          {!kot ? <p className="text-[10px] text-slate-500">@ {formatRestaurantCurrency(row.unitPrice)}</p> : null}
          {row.note ? <p className="text-[10px] text-slate-500">Note: {row.note}</p> : null}
        </div>
      ))}
    </div>
  )
}

function ReceiptQr({ settings, enabledKey }) {
  if (!settings?.[enabledKey]) return null
  return (
    <div className="mx-auto mt-3 grid h-16 w-16 place-items-center rounded-lg border border-dashed border-slate-400 bg-white text-center text-[9px] font-bold uppercase tracking-wide text-slate-500">
      QR
      <span className="sr-only">{settings.qrValue || 'Restaurant QR'}</span>
    </div>
  )
}

export function RestaurantBillPreview({ data }) {
  const settings = data.settings || {}
  const totals = data.totals || {}
  const paidAmount = Number.isFinite(Number(data.paidAmount)) ? Number(data.paidAmount) : totals.total
  const dueAmount = Math.max(0, Number(totals.total || 0) - Number(paidAmount || 0))
  const changeAmount = Math.max(0, Number(paidAmount || 0) - Number(totals.total || 0))

  return (
    <div className="mx-auto w-[260px] rounded-2xl border border-slate-200 bg-white p-4 font-mono text-slate-900 shadow-sm">
      <ReceiptHeader data={data} type="bill" />
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between gap-2"><span>Order</span><b>{receiptText(data.orderNumber)}</b></div>
        <div className="flex justify-between gap-2"><span>Bill</span><b>{receiptText(data.billNumber, `BILL-${String(data.orderNumber || '').replace(/^#/, '')}`)}</b></div>
        <div className="flex justify-between gap-2"><span>Type</span><b>{receiptText(data.orderType)}</b></div>
        <div className="flex justify-between gap-2"><span>Table</span><b>{receiptText(data.table)}</b></div>
        <div className="flex justify-between gap-2"><span>Customer</span><b>{receiptText(data.customerName, 'Walk-in Guest')}</b></div>
        <div className="flex justify-between gap-2"><span>Phone</span><b>{receiptText(data.customerPhone)}</b></div>
      </div>
      <div className="my-2 border-t border-dashed border-slate-300" />
      <ReceiptRows rows={data.rows} />
      <div className="my-2 border-t border-dashed border-slate-300" />
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between"><span>Subtotal</span><b>{formatRestaurantCurrency(totals.subtotal)}</b></div>
        <div className="flex justify-between"><span>Discount</span><b>{formatRestaurantCurrency(totals.discount)}</b></div>
        <div className="flex justify-between"><span>Service</span><b>{formatRestaurantCurrency(totals.serviceCharges)}</b></div>
        <div className="flex justify-between"><span>Tax</span><b>{formatRestaurantCurrency(totals.tax)}</b></div>
        <div className="flex justify-between border-t border-slate-200 pt-1 text-sm"><span>Total</span><b>{formatRestaurantCurrency(totals.total)}</b></div>
        <div className="flex justify-between"><span>Paid</span><b>{formatRestaurantCurrency(paidAmount)}</b></div>
        <div className="flex justify-between"><span>{changeAmount ? 'Change' : 'Due'}</span><b>{formatRestaurantCurrency(changeAmount || dueAmount)}</b></div>
        <div className="flex justify-between"><span>Payment</span><b>{receiptText(data.paymentMethod)}</b></div>
      </div>
      <ReceiptQr settings={settings} enabledKey="enableBillQr" />
      <p className="mt-3 text-center text-[10px] leading-4 text-slate-500">{receiptText(settings.footerMessage || data.footerMessage, 'Thank you for dining with us')}</p>
      <p className="mt-1 text-center text-[10px] font-bold text-slate-700">NEXORA SOLUTION - All rights reserved 2019-2026.</p>
    </div>
  )
}

export function RestaurantKotPreview({ data }) {
  const settings = data.settings || {}
  return (
    <div className="mx-auto w-[260px] rounded-2xl border border-slate-200 bg-white p-4 font-mono text-slate-900 shadow-sm">
      <ReceiptHeader data={data} type="kot" />
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between gap-2"><span>KOT</span><b>{receiptText(data.kotNumber)}</b></div>
        <div className="flex justify-between gap-2"><span>Order</span><b>{receiptText(data.orderNumber)}</b></div>
        <div className="flex justify-between gap-2"><span>Type/Table</span><b>{receiptText(data.orderType)} / {receiptText(data.table)}</b></div>
        <div className="flex justify-between gap-2"><span>Time</span><b>{new Date(data.date || Date.now()).toLocaleString()}</b></div>
        <div className="flex justify-between gap-2"><span>Priority</span><b>{receiptText(data.priority, 'Normal')}</b></div>
      </div>
      <div className="my-2 border-t border-dashed border-slate-300" />
      <ReceiptRows rows={data.rows} kot />
      {data.notes ? <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[10px] font-bold text-slate-700">Note: {data.notes}</p> : null}
      <ReceiptQr settings={settings} enabledKey="enableKotQr" />
      <p className="mt-3 text-center text-[10px] leading-4 text-slate-500">{receiptText(settings.footerMessage || data.footerMessage, 'Kitchen copy')}</p>
      <p className="mt-1 text-center text-[10px] font-bold text-slate-700">NEXORA SOLUTION - All rights reserved 2019-2026.</p>
    </div>
  )
}
