/**
 * HTML page paper (A4 / Letter) for every page template. Content comes from
 * buildPaperModel(); layout comes from the resolved template (specs.js →
 * resolvePageLayout): section order, visibility flags and style enums become
 * dsp--* modifier classes, every size / spacing / colour a CSS variable
 * (cssVarsForPage → paper.css). Nothing in a template spec is ever inserted as
 * markup or CSS text. Styled only with dsp-* classes, never Tailwind, so the
 * site's dark mode cannot reach the paper.
 */

import { cssVarsForPage, fitColumns } from './specs.js'
import { qrPath } from './qr.js'

function Party({ party }) {
  return (
    <div className="dsp-party">
      <p className="dsp-label">{party.label}</p>
      {party.empty ? <p className="dsp-party-name dsp-placeholder">{party.placeholder}</p> : (
        <>
          {party.name ? <p className="dsp-party-name">{party.name}</p> : null}
          {party.lines.map((line, i) => <p key={i} className="dsp-party-line dsp-pre">{line}</p>)}
        </>
      )}
    </div>
  )
}

function Logo({ model, logoUrl, className = 'dsp-logo' }) {
  return <img className={className} src={logoUrl} alt={model.brandName ? `${model.brandName} logo` : 'Logo'} />
}

function Brand({ model, logoUrl }) {
  return (
    <div className="dsp-brand">
      {logoUrl ? <Logo model={model} logoUrl={logoUrl} /> : (
        <p className={`dsp-brand-name${model.brandName ? '' : ' dsp-placeholder'}`}>{model.brandName || 'Your business'}</p>
      )}
    </div>
  )
}

function TitleBlock({ model }) {
  return (
    <div className="dsp-title-block">
      <h2 className="dsp-title">{model.title}</h2>
      <p className="dsp-number">{model.number ? `# ${model.number}` : <span className="dsp-placeholder"># —</span>}</p>
    </div>
  )
}

function Meta({ model }) {
  if (!model.meta.length) return null
  return (
    <dl className="dsp-meta">
      {model.meta.map((m) => (
        <div key={m.label} className="dsp-meta-item">
          <dt className="dsp-label">{m.label}</dt>
          <dd>{m.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function cellText(row, key, unitInQty) {
  if (key === 'qty' && unitInQty && row.cells.unit) return `${row.cells.qty} ${row.cells.unit}`
  return row.cells[key]
}

function Items({ model, columns, unitInQty }) {
  return (
    <table className="dsp-items">
      <colgroup>
        {columns.map((c) => <col key={c.key} style={c.widthMm ? { width: `${c.widthMm}mm` } : undefined} />)}
      </colgroup>
      <thead>
        <tr>{columns.map((c) => <th key={c.key} scope="col" className={`dsp-${c.align}`}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {model.rows.length ? model.rows.map((row, index) => (
          <tr key={row.id} style={{ '--dsp-row': index }}>
            {columns.map((c) => (
              <td key={c.key} className={`dsp-${c.align} dsp-col-${c.key}`}>
                {c.key === 'description' && row.descriptionEmpty ? <span className="dsp-placeholder">Item description</span> : <span className="dsp-pre">{cellText(row, c.key, unitInQty)}</span>}
              </td>
            ))}
          </tr>
        )) : <tr><td colSpan={columns.length} className="dsp-empty">No items yet</td></tr>}
      </tbody>
    </table>
  )
}

function Summary({ model, show }) {
  const words = show.amountInWords ? model.words : ''
  if (!model.totals.length && !words && !model.reason) return null
  return (
    <section className="dsp-summary">
      <div className="dsp-summary-side">
        {words ? <div><p className="dsp-label">Amount in words</p><p>{words}</p></div> : null}
        {model.reason ? <div><p className="dsp-label">Reason</p><p className="dsp-pre">{model.reason}</p></div> : null}
      </div>
      {model.totals.length ? (
        <table className="dsp-totals">
          <tbody>
            {model.totals.map((row) => (
              <tr key={row.key} className={`dsp-total-${row.tone}`}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  )
}

function QrCode({ matrix, caption }) {
  if (!matrix) return null
  const quiet = 2
  const box = matrix.size + quiet * 2
  return (
    <figure className="dsp-qr">
      <svg viewBox={`${-quiet} ${-quiet} ${box} ${box}`} role="img" aria-label={caption} shapeRendering="crispEdges">
        <rect x={-quiet} y={-quiet} width={box} height={box} fill="#fff" />
        <path d={qrPath(matrix)} fill="#000" />
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/** How to pay (bank, wallet, link, QR) and the signature / company stamp. */
function PaymentAndSignoff({ model, signatureUrl, sealUrl }) {
  const pay = model.payment
  const so = model.signoff
  const signature = so?.hasSignature ? signatureUrl : null
  const seal = so?.hasSeal ? sealUrl : null
  const showSign = so && (signature || seal || so.name || so.title)
  if (!pay && !showSign) return null
  return (
    <section className="dsp-payblock">
      {pay ? (
        <div className="dsp-pay">
          <div className="dsp-pay-text">
            <p className="dsp-label">Payment details</p>
            {pay.rows.length ? (
              <dl className="dsp-pay-rows">
                {pay.rows.map((row) => (
                  <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
                ))}
              </dl>
            ) : null}
            {pay.instructions ? <p className="dsp-pre dsp-pay-note">{pay.instructions}</p> : null}
          </div>
          <QrCode matrix={pay.qr} caption={pay.qrCaption} />
        </div>
      ) : <div />}
      {showSign ? (
        <div className="dsp-sign">
          <div className="dsp-sign-art">
            {seal ? <img className="dsp-seal" src={seal} alt="Company stamp" /> : null}
            {signature ? <img className="dsp-signature" src={signature} alt="Signature" /> : null}
          </div>
          <div className="dsp-sign-line" />
          <p className="dsp-label">{so.label}</p>
          {so.name ? <p className="dsp-sign-name">{so.name}</p> : null}
          {so.title ? <p className="dsp-sign-title">{so.title}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

function Notes({ model, show }) {
  const notes = show.notes ? model.notes : ''
  const terms = show.terms ? model.terms : ''
  if (!notes && !terms) return null
  return (
    <section className="dsp-notes">
      {notes ? <div><p className="dsp-label">Notes</p><p className="dsp-pre">{notes}</p></div> : null}
      {terms ? <div><p className="dsp-label">Terms</p><p className="dsp-pre">{terms}</p></div> : null}
    </section>
  )
}

// Pages of letterhead drawn behind a long document on screen (the paper clips the rest).
const LETTERHEAD_PREVIEW_PAGES = 10

/**
 * The letterhead behind the content: one image per page, placed exactly like
 * the PDF (specs.js letterheadPlacement — filled, or fitted without
 * stretching). In print, "all pages" becomes one fixed image repeated on every
 * sheet, "first page only" one image on page 1.
 */
function LetterheadLayer({ url, fit, pages }) {
  const count = pages === 'all' ? LETTERHEAD_PREVIEW_PAGES : 1
  const style = { left: `${fit.x}mm`, top: `${fit.y}mm`, width: `${fit.w}mm`, height: `${fit.h}mm` }
  return (
    <div className="dsp-lh" data-fit={fit.mode} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="dsp-lh-page"><img className="dsp-lh-img" src={url} alt="" style={style} /></div>
      ))}
    </div>
  )
}

/**
 * @param {{
 *   model: ReturnType<import('./paperModel.js').buildPaperModel>,
 *   layout: ReturnType<import('./specs.js').resolveLayout>,
 *   logoUrl?: string | null,
 *   letterheadUrl?: string | null,
 *   signatureUrl?: string | null,
 *   sealUrl?: string | null,
 * }} props
 */
export default function PaperTemplate({ model, layout, logoUrl = null, letterheadUrl = null, signatureUrl = null, sealUrl = null }) {
  const { spec, paper } = layout
  const h = spec.header
  const show = spec.show
  const lh = spec.letterhead
  const logo = show.logo ? logoUrl : null
  const { columns, unitInQty } = fitColumns(show.itemNumbers ? model.columns : model.columns.filter((c) => c.key !== 'index'), spec.contentWidthMm)
  const parties = h.showBrand ? model.parties : model.parties.filter((p) => p.role !== 'from')
  const sections = new Set(spec.sections)

  const classes = [
    'dsp',
    `dsp--layout-${spec.layout}`,
    `dsp--head-${h.htmlStyle}`,
    `dsp--align-${h.align}`,
    `dsp--title-${h.titleColor}`,
    h.titleUppercase ? 'dsp--title-upper' : '',
    spec.labelUppercase ? 'dsp--label-upper' : '',
    `dsp--meta-${spec.metaStyle}`,
    `dsp--table-${spec.table.style}`,
    spec.table.zebra ? 'dsp--zebra' : '',
    `dsp--totals-${spec.totals.style}`,
    `dsp--balance-${spec.totals.balance}`,
    `dsp--side-${spec.sidebar.fill}`,
    lh ? `dsp--letterhead dsp--lh-${lh.pages}` : '',
    lh?.preprinted ? 'dsp--lh-preprinted' : '',
  ].filter(Boolean).join(' ')

  const render = {
    header: () => (
      <div key="header" className="dsp-section-header">
        {h.htmlStyle === 'band' ? <div className="dsp-band" /> : null}
        <header className="dsp-head">
          {h.showBrand ? <Brand model={model} logoUrl={logo} /> : null}
          <TitleBlock model={model} />
        </header>
      </div>
    ),
    parties: () => (parties.length ? (
      <section key="parties" className="dsp-parties">
        {parties.map((party) => <Party key={party.role} party={party} />)}
      </section>
    ) : null),
    meta: () => <Meta key="meta" model={model} />,
    items: () => <Items key="items" model={model} columns={columns} unitInQty={unitInQty} />,
    summary: () => <Summary key="summary" model={model} show={show} />,
    notes: () => (
      <div key="notes" className="dsp-notes-wrap">
        <Notes model={model} show={show} />
        <PaymentAndSignoff model={model} signatureUrl={signatureUrl} sealUrl={sealUrl} />
      </div>
    ),
    footer: () => (show.footer && model.footer ? <footer key="footer" className="dsp-footer dsp-pre">{model.footer}</footer> : null),
  }

  let body
  if (spec.layout === 'sidebar') {
    const clientParties = model.parties.filter((p) => p.role !== 'from')
    const seller = model.parties.find((p) => p.role === 'from')
    body = (
      <div className="dsp-sheet">
        <aside className="dsp-side">
          <div className="dsp-side-brand">
            {logo ? <span className="dsp-logo-tile"><Logo model={model} logoUrl={logo} /></span> : null}
            <p className={`dsp-brand-name${model.brandName ? '' : ' dsp-placeholder'}`}>{model.brandName || 'Your business'}</p>
            {seller?.lines.map((line, i) => <p key={i} className="dsp-party-line dsp-pre">{line}</p>)}
          </div>
          {sections.has('parties') ? clientParties.map((party) => <Party key={party.role} party={party} />) : null}
          {sections.has('meta') ? <Meta model={model} /> : null}
        </aside>
        <div className="dsp-main">
          <header className="dsp-head"><TitleBlock model={model} /></header>
          {spec.sections.filter((id) => !['header', 'parties', 'meta'].includes(id)).map((id) => render[id]())}
        </div>
      </div>
    )
  } else {
    const content = spec.sections.map((id) => render[id]())
    // Letterhead: the safe area is a repeating table header/footer, so it is
    // kept on every printed page (Chromium repeats thead/tfoot per page).
    // "First page only": the top safe area is a one-off spacer (later pages use
    // the template's own margin, set by @page in Preview.jsx).
    body = lh ? (
      <table className="dsp-flow">
        {lh.pages === 'all' ? <thead><tr><td><div className="dsp-flow-top" /></td></tr></thead> : null}
        <tfoot><tr><td><div className="dsp-flow-bottom" /></td></tr></tfoot>
        <tbody><tr><td className="dsp-flow-body">{lh.pages === 'all' ? null : <div className="dsp-flow-top" />}{content}</td></tr></tbody>
      </table>
    ) : content
  }

  return (
    <article className={classes} data-paper={paper.id} data-template={spec.id} style={cssVarsForPage(spec, paper, model.accent)} aria-label={`${model.title} preview`}>
      {lh && letterheadUrl ? <LetterheadLayer url={letterheadUrl} fit={spec.letterheadFit} pages={lh.pages} /> : null}
      {show.stamp && model.stamp ? <div className={`dsp-stamp dsp-stamp--${model.stamp.tone}`} aria-hidden="true">{model.stamp.label}</div> : null}
      {body}
    </article>
  )
}
