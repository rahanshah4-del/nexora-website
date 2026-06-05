import { useEffect, useMemo, useState } from 'react'
import { buildInvoiceQrPayload } from '../../lib/invoiceQr.js'

export default function InvoiceQrCode({ invoice, totals, className = '' }) {
  const [src, setSrc] = useState('')
  const qrValue = useMemo(() => JSON.stringify(buildInvoiceQrPayload(invoice, totals)), [invoice, totals])

  useEffect(() => {
    let active = true
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 160,
          color: { dark: '#0f172a', light: '#ffffff' },
        }),
      )
      .then((dataUrl) => {
        if (active) setSrc(dataUrl)
      })
      .catch((error) => {
        console.error('[Invoice QR] Failed to generate QR code.', error)
        if (active) setSrc('')
      })
    return () => {
      active = false
    }
  }, [qrValue])

  if (!src) {
    return (
      <div className={`grid h-24 w-24 place-items-center rounded-xl border border-slate-200 bg-white p-2 text-[10px] font-semibold text-slate-500 ${className}`}>
        QR unavailable
      </div>
    )
  }

  return (
    <img
      alt="Invoice QR code"
      className={`h-24 w-24 rounded-xl border border-slate-200 bg-white p-1 ${className}`}
      src={src}
    />
  )
}
