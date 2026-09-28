/**
 * Thermal receipt (58 / 80 mm): one centred column, monochrome, greyscale
 * logo. Same content model as the page templates (paperModel.js); sizes from
 * RECEIPT_TEMPLATE via CSS variables.
 */

import { cssVarsForReceipt } from './specs.js'

function Row({ left, right, strong = false }) {
  return (
    <div className={`dsr-row${strong ? ' dsr-strong' : ''}`}>
      <span className="dsr-row-left">{left}</span>
      <span className="dsr-row-right">{right}</span>
    </div>
  )
}

export default function ReceiptTemplate({ model, layout, logoUrl = null }) {
  const { spec, paper } = layout
  const seller = model.parties[0]
  return (
    <article className="dsr" data-paper={paper.id} data-template="receipt" style={cssVarsForReceipt(spec, paper)} aria-label={`${model.title} preview`}>
      <header className="dsr-center">
        {logoUrl ? <img className="dsr-logo" src={logoUrl} alt={model.brandName ? `${model.brandName} logo` : 'Logo'} /> : null}
        <p className={`dsr-brand${model.brandName ? '' : ' dsp-placeholder'}`}>{model.brandName || 'Your business'}</p>
        {seller.lines.map((line, i) => <p key={i} className="dsr-small dsp-pre">{line}</p>)}
      </header>
      <hr className="dsr-rule" />
      <div className="dsr-center">
        <p className="dsr-title">{model.title}</p>
        {model.number ? <p className="dsr-small">#{model.number}</p> : null}
        {model.stamp ? <p className="dsr-title">*** {model.stamp.label} ***</p> : null}
      </div>
      {model.meta.map((m) => <Row key={m.label} left={m.label} right={m.value} />)}
      {model.receipt.customer ? <Row left="Customer" right={model.receipt.customer} /> : null}
      <hr className="dsr-rule" />
      {model.receipt.items.length ? model.receipt.items.map((item, i) => (
        <div key={i} className="dsr-item">
          <p className="dsp-pre">{item.name || <span className="dsp-placeholder">Item</span>}</p>
          <Row left={item.detail} right={item.total} />
          {item.discount ? <Row left="  Discount" right={item.discount} /> : null}
        </div>
      )) : <p className="dsr-center dsr-small">No items yet</p>}
      {model.totals.length ? (
        <>
          <hr className="dsr-rule" />
          {model.totals.map((row) => <Row key={row.key} left={row.label} right={row.value} strong={row.tone === 'grand' || row.tone === 'balance' || row.tone === 'strong'} />)}
        </>
      ) : null}
      {model.receipt.payments.length ? (
        <>
          <hr className="dsr-rule" />
          <p className="dsr-small dsr-strong">Payments</p>
          {model.receipt.payments.map((p, i) => <Row key={i} left={p.label} right={p.value} />)}
        </>
      ) : null}
      {model.words || model.notes || model.terms || model.footer || model.reason ? <hr className="dsr-rule" /> : null}
      {model.words ? <p className="dsr-small dsr-center">{model.words}</p> : null}
      {model.reason ? <p className="dsr-small dsp-pre">{model.reason}</p> : null}
      {model.notes ? <p className="dsr-small dsr-center dsp-pre">{model.notes}</p> : null}
      {model.terms ? <p className="dsr-small dsp-pre">{model.terms}</p> : null}
      {model.footer ? <p className="dsr-small dsr-center dsp-pre">{model.footer}</p> : null}
    </article>
  )
}
