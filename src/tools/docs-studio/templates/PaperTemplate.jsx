/**
 * HTML page paper (A4 / Letter) for every page template. Content comes from
 * buildPaperModel(); every size, spacing and colour comes from the template
 * spec via CSS variables (specs.js → cssVarsForPage → paper.css). Styled only
 * with dsp-* classes, never Tailwind colour utilities, so the site's dark mode
 * cannot reach the paper.
 */

import { cssVarsForPage } from './specs.js'

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

/**
 * @param {{ model: ReturnType<import('./paperModel.js').buildPaperModel>, layout: { spec: object, paper: object }, logoUrl?: string | null }} props
 */
export default function PaperTemplate({ model, layout, logoUrl = null }) {
  const { spec, paper } = layout
  const h = spec.header
  const classes = [
    'dsp',
    `dsp--head-${h.style}`,
    `dsp--title-${h.titleColor}`,
    h.titleUppercase ? 'dsp--title-upper' : '',
    `dsp--thead-${spec.table.head}`,
    spec.table.zebra ? 'dsp--zebra' : '',
    `dsp--balance-${spec.totals.balance}`,
  ].filter(Boolean).join(' ')

  return (
    <article className={classes} data-paper={paper.id} data-template={spec.id} style={cssVarsForPage(spec, paper, model.accent)} aria-label={`${model.title} preview`}>
      {h.style === 'band' ? <div className="dsp-band" /> : null}
      {model.stamp ? <div className={`dsp-stamp dsp-stamp--${model.stamp.tone}`} aria-hidden="true">{model.stamp.label}</div> : null}

      <header className="dsp-head">
        <div className="dsp-brand">
          {logoUrl ? (
            <img className="dsp-logo" src={logoUrl} alt={model.brandName ? `${model.brandName} logo` : 'Logo'} />
          ) : (
            <p className={`dsp-brand-name${model.brandName ? '' : ' dsp-placeholder'}`}>{model.brandName || 'Your business'}</p>
          )}
        </div>
        <div className="dsp-title-block">
          <h2 className="dsp-title">{model.title}</h2>
          <p className="dsp-number">{model.number ? `# ${model.number}` : <span className="dsp-placeholder"># —</span>}</p>
        </div>
      </header>

      <section className="dsp-parties">
        {model.parties.map((party) => <Party key={party.label} party={party} />)}
      </section>

      {model.meta.length ? (
        <dl className="dsp-meta">
          {model.meta.map((m) => (
            <div key={m.label} className="dsp-meta-item">
              <dt className="dsp-label">{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <table className="dsp-items">
        <colgroup>
          {model.columns.map((c) => <col key={c.key} style={c.widthMm ? { width: `${c.widthMm}mm` } : undefined} />)}
        </colgroup>
        <thead>
          <tr>{model.columns.map((c) => <th key={c.key} scope="col" className={`dsp-${c.align}`}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {model.rows.length ? model.rows.map((row) => (
            <tr key={row.id}>
              {model.columns.map((c) => (
                <td key={c.key} className={`dsp-${c.align} dsp-col-${c.key}`}>
                  {c.key === 'description' && row.descriptionEmpty ? <span className="dsp-placeholder">Item description</span> : <span className="dsp-pre">{row.cells[c.key]}</span>}
                </td>
              ))}
            </tr>
          )) : <tr><td colSpan={model.columns.length} className="dsp-empty">No items yet</td></tr>}
        </tbody>
      </table>

      {model.totals.length || model.words || model.reason ? (
        <section className="dsp-summary">
          <div className="dsp-summary-side">
            {model.words ? <div><p className="dsp-label">Amount in words</p><p>{model.words}</p></div> : null}
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
      ) : null}

      {model.notes || model.terms ? (
        <section className="dsp-notes">
          {model.notes ? <div><p className="dsp-label">Notes</p><p className="dsp-pre">{model.notes}</p></div> : null}
          {model.terms ? <div><p className="dsp-label">Terms</p><p className="dsp-pre">{model.terms}</p></div> : null}
        </section>
      ) : null}

      {model.footer ? <footer className="dsp-footer dsp-pre">{model.footer}</footer> : null}
    </article>
  )
}
