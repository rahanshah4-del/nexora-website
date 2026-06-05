import { useEffect, useMemo, useState } from 'react'
import { safePrintText } from '../../lib/printDocuments.js'

function ReportQrCode({ payload }) {
  const [src, setSrc] = useState('')
  const value = useMemo(() => JSON.stringify(payload || {}), [payload])

  useEffect(() => {
    let active = true
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(value, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 132,
          color: { dark: '#0f172a', light: '#ffffff' },
        }),
      )
      .then((dataUrl) => {
        if (active) setSrc(dataUrl)
      })
      .catch(() => {
        if (active) setSrc('')
      })
    return () => {
      active = false
    }
  }, [value])

  if (!src) return <div className="grid h-24 w-24 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500">QR</div>
  return <img src={src} alt="Report QR code" className="h-24 w-24 rounded-lg border border-slate-200 bg-white p-1" />
}

function cellValue(column, row) {
  try {
    return typeof column.value === 'function' ? column.value(row) : row?.[column.key]
  } catch {
    return ''
  }
}

export default function PrintableReport({ report = {}, className = '' }) {
  const branding = report.branding || {}
  const logo = branding.logoUrl || branding.logo || '/nexora-logo.jpg'
  const summary = Array.isArray(report.summary) ? report.summary : []
  const tables = Array.isArray(report.tables) ? report.tables : []

  return (
    <article className={`print-document printable-report-template mx-auto w-full max-w-[794px] bg-white text-slate-950 ${className}`}>
      <header className="print-avoid-break border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            {logo ? (
              <img
                src={logo}
                alt="Workspace logo"
                className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Workspace Report</p>
              <h1 className="mt-1 break-words text-2xl font-black text-slate-950">{safePrintText(report.title, 'Workspace Report')}</h1>
              <p className="mt-2 text-sm font-semibold text-slate-700">{safePrintText(report.workspaceName, 'Workspace')}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <ReportQrCode payload={report.qrPayload} />
            <p className="mt-2 text-[11px] font-bold text-slate-600">{safePrintText(report.reportId, 'RPT')}</p>
          </div>
        </div>
      </header>

      <section className="print-avoid-break mt-5 grid gap-3 border-b border-slate-200 pb-4 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Workspace Name</p>
          <p className="mt-1 font-semibold text-slate-950">{safePrintText(report.workspaceName)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Business Type</p>
          <p className="mt-1 font-semibold text-slate-950">{safePrintText(report.businessType)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Date Range</p>
          <p className="mt-1 font-semibold text-slate-950">{safePrintText(report.dateRange)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Generated</p>
          <p className="mt-1 font-semibold text-slate-950">{safePrintText(report.generatedBy)} | {safePrintText(report.generatedAt)}</p>
        </div>
      </section>

      <section className="print-avoid-break mt-5">
        <p className="text-sm font-black text-slate-950">Summary</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {summary.length ? summary.map((row) => (
            <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{safePrintText(row.label)}</p>
              <p className="mt-2 break-words text-sm font-black text-slate-950">{safePrintText(row.value)}</p>
            </div>
          )) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">No summary data</div>
          )}
        </div>
      </section>

      <section className="mt-5 space-y-5">
        {tables.length ? tables.map((table) => (
          <div key={table.title} className="print-avoid-break">
            <p className="text-sm font-black text-slate-950">{safePrintText(table.title, 'Data Table')}</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.1em] text-slate-600">
                  <tr>
                    {(table.columns || []).map((column) => (
                      <th key={column.label || column.key} className="px-3 py-3 font-black">{safePrintText(column.label)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(table.rows || []).length ? (table.rows || []).slice(0, 24).map((row, rowIndex) => (
                    <tr key={row.id || `${table.title}-${rowIndex}`} className="border-t border-slate-200">
                      {(table.columns || []).map((column) => (
                        <td key={column.label || column.key} className="break-words px-3 py-2 align-top">
                          {safePrintText(cellValue(column, row))}
                        </td>
                      ))}
                    </tr>
                  )) : (
                    <tr className="border-t border-slate-200">
                      <td className="px-3 py-3 text-slate-500" colSpan={Math.max((table.columns || []).length, 1)}>
                        No data for this table.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )) : (
          <div className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-600">No report table data</div>
        )}
      </section>

      <footer className="print-avoid-break mt-6 border-t border-slate-200 pt-4 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{safePrintText(branding.receiptFooter, 'Powered by Nexora Solutions')}</span>
          <span>Report ID: {safePrintText(report.reportId)}</span>
          <span>{safePrintText(report.businessType)}</span>
        </div>
      </footer>
    </article>
  )
}
