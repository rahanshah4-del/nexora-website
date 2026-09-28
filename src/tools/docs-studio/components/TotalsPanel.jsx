/**
 * Totals: a sticky card at the bottom of the editor on desktop, a collapsible
 * bottom sheet on phones. Rows come from buildTotalsRows(), i.e. straight from
 * calculateDocument() — nothing is recomputed here.
 */

import { useState } from 'react'
import { formatMoney, getDocumentType } from '../engine/index.js'
import { buildTotalsRows } from '../templates/summary.js'
import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'

const TONES = {
  default: 'text-slate-600',
  muted: 'text-slate-400 text-xs',
  strong: 'font-semibold text-slate-900',
  grand: 'border-t border-slate-200 pt-2 mt-1 font-bold text-slate-900 text-base',
  balance: 'rounded-xl bg-blue-50 px-2 py-1.5 -mx-2 mt-1 font-bold text-brand',
}

function Rows({ rows, currency, locale }) {
  return (
    <dl className="space-y-1 text-sm">
      {rows.map((row) => (
        <div key={row.key} className={`flex items-baseline justify-between gap-3 ${TONES[row.tone]}`}>
          <dt className="min-w-0 truncate">{row.label}</dt>
          <dd className="shrink-0 tabular-nums">{formatMoney(row.amount, currency, locale)}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function TotalsPanel() {
  const { previewDocument, totals, mobileView } = useStudio()
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const config = getDocumentType(previewDocument.type)
  if (!config.features.pricing) return null
  const rows = buildTotalsRows(previewDocument, totals)
  const money = (m) => formatMoney(m, previewDocument.currency, previewDocument.locale)
  const headline = config.features.payments ? { label: 'Balance due', amount: totals.balanceDue } : totals.withholdingTotal ? { label: 'Amount payable', amount: totals.amountPayable } : { label: 'Total', amount: totals.total }

  return (
    <>
      <div className="sticky bottom-3 z-20 mt-4 hidden lg:block">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lift backdrop-blur">
          <button
            type="button"
            aria-expanded={desktopOpen}
            aria-controls="ds-totals-desktop"
            onClick={() => setDesktopOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <span className="font-display text-sm font-semibold text-slate-900">Totals</span>
            <span className="flex items-center gap-2 text-sm">
              {!desktopOpen ? <span className="font-bold tabular-nums text-slate-900">{headline.label} {money(headline.amount)}</span> : null}
              <Icon name={desktopOpen ? 'chevronDown' : 'chevronUp'} className="h-4 w-4 text-slate-400" />
            </span>
          </button>
          <div id="ds-totals-desktop" className={`ds-collapse ${desktopOpen ? 'ds-collapse-open' : ''}`}>
            <div className="ds-collapse-inner"><div className="pt-3"><Rows rows={rows} currency={previewDocument.currency} locale={previewDocument.locale} /></div></div>
          </div>
        </div>
      </div>

      {mobileView === 'edit' ? (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div className="mx-auto max-w-2xl rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.25)]">
            <button
              type="button"
              aria-expanded={sheetOpen}
              aria-controls="ds-totals-sheet"
              onClick={() => setSheetOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
            >
              <span className="text-sm text-slate-600">{headline.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-base font-bold tabular-nums text-slate-900">{money(headline.amount)}</span>
                <Icon name={sheetOpen ? 'chevronDown' : 'chevronUp'} className="h-4 w-4 text-slate-400" />
              </span>
            </button>
            <div id="ds-totals-sheet" className={`ds-collapse ${sheetOpen ? 'ds-collapse-open' : ''}`}>
              <div className="ds-collapse-inner">
                <div className="max-h-[55vh] overflow-auto border-t border-slate-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                  <Rows rows={rows} currency={previewDocument.currency} locale={previewDocument.locale} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
