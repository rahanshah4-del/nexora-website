/**
 * "Classic" paper. Styled only by templates/paper.css (dsp-* classes and
 * CSS variables) — never Tailwind colour utilities — so the site's dark mode,
 * which remaps Tailwind classes, can never reach the paper.
 */

import {
  formatIsoDate, formatMoney, formatQuantity, getDocumentType,
} from '../../engine/index.js'
import { onAccentColor } from '../color.js'
import { STATUS_STAMPS, buildTotalsRows, paymentTermsLabel } from '../summary.js'
import { classicSpec } from './spec.js'

const spec = classicSpec

function PartyBlock({ label, party, placeholder }) {
  const empty = !party || !(party.name || party.company || party.address || party.email || party.phone || party.taxId)
  return (
    <div className="dsp-party">
      <p className="dsp-label">{label}</p>
      {empty ? <p className="dsp-party-name dsp-placeholder">{placeholder}</p> : (
        <>
          {party.name ? <p className="dsp-party-name">{party.name}</p> : null}
          {party.company && party.company !== party.name ? <p className="dsp-party-line">{party.company}</p> : null}
          {party.address ? <p className="dsp-party-line dsp-pre">{party.address}</p> : null}
          {party.email ? <p className="dsp-party-line">{party.email}</p> : null}
          {party.phone ? <p className="dsp-party-line">{party.phone}</p> : null}
          {party.taxId ? <p className="dsp-party-line">{party.taxIdLabel || 'Tax ID'}: {party.taxId}</p> : null}
        </>
      )}
    </div>
  )
}

/**
 * @param {{ doc: object, totals: object, logoUrl?: string | null, amountWords?: string }} props
 */
export default function ClassicTemplate({ doc, totals, logoUrl = null, amountWords = '' }) {
  const config = getDocumentType(doc.type) || getDocumentType('invoice')
  const f = config.features
  const locale = doc.locale
  const money = (minor) => formatMoney(minor, doc.currency, locale)
  const date = (iso) => formatIsoDate(iso, locale, { dateStyle: 'medium' })
  const accent = doc.appearance?.accentColor || '#0071e3'
  const size = spec.page[doc.appearance?.paperSize] || spec.page.A4

  const showUnit = doc.lines.some((l) => l.unit)
  const showDiscount = f.pricing && f.discount && totals.lines.some((l) => l.lineDiscount)
  const columns = spec.table.columns.filter((c) => {
    if (c.pricing && !f.pricing) return false
    if (c.key === 'unit') return showUnit
    if (c.key === 'discount') return showDiscount
    return true
  })
  const rows = buildTotalsRows(doc, totals)
  const stamp = STATUS_STAMPS[doc.status]

  const meta = [
    ['Issue date', date(doc.issueDate)],
    f.dueDate ? ['Due date', date(doc.dueDate)] : null,
    f.validUntil ? ['Valid until', date(doc.validUntil)] : null,
    f.deliveryDate ? ['Delivery date', date(doc.deliveryDate)] : null,
    f.dueDate && doc.paymentTermsDays !== null ? ['Terms', paymentTermsLabel(doc.paymentTermsDays)] : null,
    doc.reference ? [config.referenceLabel, doc.reference] : null,
    doc.sourceNumber && doc.sourceNumber !== doc.reference ? [`From ${getDocumentType(doc.sourceType)?.label.toLowerCase() || 'document'}`, doc.sourceNumber] : null,
  ].filter((m) => m && m[1])

  const cell = (line, calc, index, key) => {
    switch (key) {
      case 'index': return index + 1
      case 'description': return <span className="dsp-pre">{line.description || <span className="dsp-placeholder">Item description</span>}</span>
      case 'qty': return formatQuantity(line.qty_milli, locale)
      case 'unit': return line.unit
      case 'price': return money(line.unitPrice_minor)
      case 'discount': return calc?.lineDiscount ? money(-calc.lineDiscount) : ''
      case 'amount': return money(calc ? calc.net : 0)
      default: return ''
    }
  }

  return (
    <article
      className="dsp dsp--classic"
      data-paper={doc.appearance?.paperSize || 'A4'}
      style={{
        '--dsp-accent': accent,
        '--dsp-on-accent': onAccentColor(accent),
        '--dsp-width': `${size.widthMm}mm`,
        '--dsp-height': `${size.heightMm}mm`,
        '--dsp-margin-x': `${spec.page.marginXMm}mm`,
        '--dsp-margin-y': `${spec.page.marginYMm}mm`,
        '--dsp-text': spec.colors.text,
        '--dsp-muted': spec.colors.muted,
        '--dsp-faint': spec.colors.faint,
        '--dsp-border': spec.colors.border,
        '--dsp-zebra': spec.colors.zebra,
        '--dsp-paper': spec.colors.paper,
        '--dsp-font-body': `'${spec.fonts.body}', system-ui, sans-serif`,
        '--dsp-font-heading': `'${spec.fonts.heading}', '${spec.fonts.body}', system-ui, sans-serif`,
      }}
      aria-label={`${config.label} preview`}
    >
      <div className="dsp-band" style={{ height: `${spec.header.bandHeightMm}mm` }} />
      {stamp ? <div className={`dsp-stamp dsp-stamp--${stamp.tone}`} aria-hidden="true">{stamp.label}</div> : null}

      <header className="dsp-head">
        <div className="dsp-brand">
          {logoUrl ? (
            <img className="dsp-logo" src={logoUrl} alt={doc.seller.name ? `${doc.seller.name} logo` : 'Logo'} style={{ maxHeight: `${spec.header.logoMaxHeightMm}mm`, maxWidth: `${spec.header.logoMaxWidthMm}mm` }} />
          ) : (
            <p className={`dsp-brand-name${doc.seller.name ? '' : ' dsp-placeholder'}`}>{doc.seller.name || 'Your business'}</p>
          )}
        </div>
        <div className="dsp-title-block">
          <h2 className="dsp-title">{config.label}</h2>
          <p className="dsp-number">{doc.number ? `# ${doc.number}` : <span className="dsp-placeholder"># —</span>}</p>
        </div>
      </header>

      <section className="dsp-parties">
        <PartyBlock label={config.partyLabels.from} party={doc.seller} placeholder="Your business" />
        <PartyBlock label={config.partyLabels.to} party={doc.client} placeholder="Client name" />
        {f.shipTo && doc.shipTo && doc.shipTo.name ? <PartyBlock label={doc.type === 'purchase_order' ? 'Deliver to' : 'Ship to'} party={doc.shipTo} placeholder="" /> : null}
      </section>

      {meta.length ? (
        <dl className="dsp-meta">
          {meta.map(([label, value]) => (
            <div key={label} className="dsp-meta-item">
              <dt className="dsp-label">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <table className="dsp-items">
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key} className={`dsp-col-${c.key} dsp-${c.align}`} scope="col">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {doc.lines.length ? doc.lines.map((line, index) => (
            <tr key={line.id}>
              {columns.map((c) => <td key={c.key} className={`dsp-col-${c.key} dsp-${c.align}`}>{cell(line, totals.lines[index], index, c.key)}</td>)}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="dsp-empty">No items yet</td></tr>
          )}
        </tbody>
      </table>

      {rows.length || (doc.options?.showAmountInWords && amountWords) ? (
        <section className="dsp-summary">
          <div className="dsp-summary-side">
            {doc.options?.showAmountInWords && amountWords && f.pricing ? (
              <div className="dsp-words">
                <p className="dsp-label">Amount in words</p>
                <p>{amountWords}</p>
              </div>
            ) : null}
            {f.reason && doc.reason ? (
              <div className="dsp-words">
                <p className="dsp-label">Reason</p>
                <p className="dsp-pre">{doc.reason}</p>
              </div>
            ) : null}
          </div>
          {rows.length ? (
            <table className="dsp-totals" style={{ width: `${spec.totals.widthMm}mm` }}>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className={`dsp-total-${row.tone}`}>
                    <th scope="row">{row.label}</th>
                    <td>{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}

      {doc.notes || doc.terms ? (
        <section className="dsp-notes">
          {doc.notes ? <div><p className="dsp-label">Notes</p><p className="dsp-pre">{doc.notes}</p></div> : null}
          {doc.terms ? <div><p className="dsp-label">Terms</p><p className="dsp-pre">{doc.terms}</p></div> : null}
        </section>
      ) : null}

      {doc.footer ? <footer className="dsp-footer dsp-pre">{doc.footer}</footer> : null}
    </article>
  )
}
