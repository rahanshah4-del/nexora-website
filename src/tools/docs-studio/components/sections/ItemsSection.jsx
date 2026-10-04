/**
 * Line items: a table on wider editors (sm+), stacked cards on phones.
 * Drag the grip (or focus it and press ↑/↓) to reorder; Enter in the last
 * row's numeric fields adds a row; pasting tab-separated cells from a
 * spreadsheet adds one row per line.
 */

import { useMemo, useState } from 'react'
import { formatMoney, getDocumentType } from '../../engine/index.js'
import { isTabularText, parseTabularRows } from '../../io/pasteRows.js'
import { usePrefersReducedMotion } from '../../ui/hooks.js'
import { fieldId } from '../../ui/issues.js'
import { useStudio } from '../../ui/StudioContext.js'
import Combobox from '../Combobox.jsx'
import { DecimalInput, IssueList, MoneyInput, TextArea, TextInput } from '../fields.jsx'
import Icon from '../Icon.jsx'
import SectionCard from '../SectionCard.jsx'

const compactLabel = 'mb-1 block text-xs font-semibold text-slate-600 sm:sr-only'
const mobileIconButton = 'inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-30'
const iconButton = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
// Numeric columns: qty, unit, price, discount, amount.
const numericGrid = 'grid grid-cols-2 gap-3 sm:grid-cols-[4.5rem_4.5rem_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-2'

function focusField(path) {
  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(fieldId(path))?.focus()))
}

function ItemRow({ line, index, count, calc, pricing, discountEnabled, onEnterLast, drag }) {
  const { doc, actions, commands, issuesFor, markTouched } = useStudio()
  const reduced = usePrefersReducedMotion()
  const [leaving, setLeaving] = useState(false)
  const path = `lines[${index}]`
  const update = (patch) => actions.updateLine(line.id, patch)
  const isLast = index === count - 1
  const enterAdds = (event) => {
    if (event.key === 'Enter' && isLast && !event.shiftKey) {
      event.preventDefault()
      onEnterLast()
    }
  }
  const remove = () => {
    if (reduced) { actions.removeLine(line.id); return }
    setLeaving(true)
    setTimeout(() => actions.removeLine(line.id), 160)
  }
  const move = (delta) => {
    const to = index + delta
    if (to >= 0 && to < count) actions.moveLine(line.id, to)
  }
  const discount = line.discount || { kind: 'percent', value: 0 }
  const taxIssues = issuesFor(`${path}.taxIds`, { prefix: true })

  return (
    <li
      data-line-index={index}
      draggable={drag.armed === line.id}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', line.id); drag.start(line.id) }}
      onDragEnd={drag.end}
      onDragOver={(e) => { if (drag.active) { e.preventDefault(); drag.over(index) } }}
      onDrop={(e) => { e.preventDefault(); drag.drop(index) }}
      className={`ds-row-enter relative rounded-2xl border bg-white p-3 transition-[opacity,transform,border-color] duration-150 motion-reduce:transition-none sm:rounded-xl sm:p-2.5 ${leaving ? 'ds-row-leave' : ''} ${drag.active === line.id ? 'opacity-40' : ''} ${drag.target === index && drag.active && drag.active !== line.id ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200'}`}
    >
      <div className="flex items-start gap-1.5">
        <div className="hidden shrink-0 flex-col items-center pt-0.5 sm:flex">
          <button
            type="button"
            className={`${iconButton} cursor-grab active:cursor-grabbing`}
            aria-label={`Reorder item ${index + 1}. Use arrow up or down to move.`}
            onPointerDown={() => drag.arm(line.id)}
            onPointerUp={drag.disarm}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
              if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
            }}
          >
            <Icon name="grip" className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-semibold tabular-nums text-slate-400" aria-hidden="true">{index + 1}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Phones: number + actions in one row on top, so the fields get the full width. */}
          <div className="-mt-1 flex items-center justify-between sm:hidden">
            <span className="text-xs font-semibold text-slate-500">Item {index + 1}</span>
            <div className="-mr-1 flex items-center">
              <button type="button" className={mobileIconButton} aria-label={`Move item ${index + 1} up`} disabled={index === 0} onClick={() => move(-1)}><Icon name="arrowUp" className="h-4 w-4" /></button>
              <button type="button" className={mobileIconButton} aria-label={`Move item ${index + 1} down`} disabled={isLast} onClick={() => move(1)}><Icon name="arrowDown" className="h-4 w-4" /></button>
              <button type="button" className={mobileIconButton} aria-label={`Duplicate item ${index + 1}`} onClick={() => actions.duplicateLine(line.id)}><Icon name="copy" className="h-4 w-4" /></button>
              {pricing ? <button type="button" className={mobileIconButton} aria-label={`Save item ${index + 1} as a product`} onClick={() => commands.saveProduct(line)}><Icon name="save" className="h-4 w-4" /></button> : null}
              <button type="button" className={`${mobileIconButton} hover:bg-rose-50 hover:text-rose-600`} aria-label={`Delete item ${index + 1}`} onClick={remove}><Icon name="trash" className="h-4 w-4" /></button>
            </div>
          </div>
          <TextArea
            label={`Item ${index + 1} description`}
            labelClassName="sr-only"
            path={`${path}.description`}
            value={line.description}
            onChange={(v) => update({ description: v })}
            rows={1}
            placeholder="Description of product or service"
          />
          <div className={numericGrid}>
            <DecimalInput label="Qty" labelClassName={compactLabel} path={`${path}.qty_milli`} value={line.qty_milli} digits={3} onChange={(v) => update({ qty_milli: v })} onKeyDown={enterAdds} />
            <TextInput label="Unit" labelClassName={compactLabel} path={`${path}.unit`} value={line.unit} onChange={(v) => update({ unit: v })} placeholder="pcs" onKeyDown={enterAdds} autoComplete="off" />
            {pricing ? (
              <>
                <MoneyInput label="Unit price" labelClassName={compactLabel} path={`${path}.unitPrice_minor`} value={line.unitPrice_minor} onChange={(v) => update({ unitPrice_minor: v })} onKeyDown={enterAdds} />
                <div className="min-w-0">
                  <span className={compactLabel} aria-hidden="true">Discount</span>
                  <div className="flex min-w-0 gap-1">
                    {discountEnabled ? (
                      <>
                        <label className="sr-only" htmlFor={`${fieldId(`${path}.discount`)}-kind`}>Item {index + 1} discount type</label>
                        <select
                          id={`${fieldId(`${path}.discount`)}-kind`}
                          value={discount.kind}
                          onChange={(e) => update({ discount: { kind: e.target.value, value: 0 } })}
                          className="w-16 shrink-0 rounded-xl sm:w-12 border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-600 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                        >
                          <option value="percent">%</option>
                          <option value="amount">{doc.currency}</option>
                        </select>
                        {discount.kind === 'percent' ? (
                          <DecimalInput label={`Item ${index + 1} discount percent`} srOnlyLabel className="flex-1" path={`${path}.discount.value`} value={discount.value} digits={4} onChange={(v) => update({ discount: v ? { kind: 'percent', value: v } : null })} onKeyDown={enterAdds} />
                        ) : (
                          <MoneyInput label={`Item ${index + 1} discount amount`} srOnlyLabel className="flex-1" path={`${path}.discount.value`} value={discount.value} onChange={(v) => update({ discount: v ? { kind: 'amount', value: v } : null })} onKeyDown={enterAdds} />
                        )}
                      </>
                    ) : <span className="py-2 text-xs text-slate-400">—</span>}
                  </div>
                </div>
                <div className="col-span-2 flex min-w-0 items-baseline justify-between gap-3 border-t border-slate-100 pt-2 sm:col-span-1 sm:block sm:border-0 sm:pt-0">
                  <span className={compactLabel}>Amount</span>
                  <p className="break-all text-right text-base font-semibold tabular-nums text-slate-900 sm:truncate sm:py-2 sm:text-sm" aria-label={`Item ${index + 1} amount`}>{formatMoney(calc ? calc.net : 0, doc.currency, doc.locale)}</p>
                </div>
              </>
            ) : null}
          </div>

          {pricing && doc.taxes.length ? (
            <div id={fieldId(`${path}.taxIds`)} tabIndex={-1} className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Taxes on item ${index + 1}`}>
              {doc.taxes.map((tax) => {
                const on = line.taxIds.includes(tax.id)
                return (
                  <button
                    key={tax.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { actions.toggleLineTax(line.id, tax.id); markTouched(`${path}.taxIds`) }}
                    className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors sm:min-h-0 sm:px-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${on ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                  >
                    {on ? <Icon name="check" className="h-3 w-3" /> : null}
                    {tax.name || 'Tax'}
                  </button>
                )
              })}
              <IssueList issues={taxIssues} />
            </div>
          ) : null}
        </div>

        <div className="hidden shrink-0 flex-col gap-0.5 sm:flex">
          <button type="button" className={iconButton} aria-label={`Duplicate item ${index + 1}`} title="Duplicate" onClick={() => actions.duplicateLine(line.id)}><Icon name="copy" className="h-4 w-4" /></button>
          {pricing ? <button type="button" className={iconButton} aria-label={`Save item ${index + 1} as a product`} title="Save as product" onClick={() => commands.saveProduct(line)}><Icon name="save" className="h-4 w-4" /></button> : null}
          <button type="button" className={`${iconButton} hover:bg-rose-50 hover:text-rose-600`} aria-label={`Delete item ${index + 1}`} title="Delete" onClick={remove}><Icon name="trash" className="h-4 w-4" /></button>
        </div>
      </div>
    </li>
  )
}

export default function ItemsSection() {
  const { doc, totals, actions, repo, commands, toggleSection, issuesFor } = useStudio()
  const config = getDocumentType(doc.type)
  const pricing = config.features.pricing
  const [products, setProducts] = useState([])
  const [productQuery, setProductQuery] = useState('')
  const [drag, setDrag] = useState({ armed: null, active: null, target: null })
  const calcById = useMemo(() => new Map(totals.lines.map((l) => [l.id, l])), [totals.lines])
  const defaultTaxIds = () => (doc.lines.length ? [...doc.lines[doc.lines.length - 1].taxIds] : [])

  const addLine = (fields = {}, index) => {
    actions.addLine({ taxIds: defaultTaxIds(), ...fields }, index)
    focusField(`lines[${index ?? doc.lines.length}].description`)
  }

  const dragApi = {
    ...drag,
    arm: (id) => setDrag((d) => ({ ...d, armed: id })),
    disarm: () => setDrag((d) => (d.active ? d : { ...d, armed: null })),
    start: (id) => setDrag({ armed: id, active: id, target: null }),
    over: (index) => setDrag((d) => (d.target === index ? d : { ...d, target: index })),
    drop: (index) => {
      if (drag.active) actions.moveLine(drag.active, index)
      setDrag({ armed: null, active: null, target: null })
    },
    end: () => setDrag({ armed: null, active: null, target: null }),
  }

  const onPaste = (event) => {
    const text = event.clipboardData?.getData('text/plain')
    if (!isTabularText(text)) return
    event.preventDefault()
    const { rows } = parseTabularRows(text, { currency: doc.currency, locale: doc.locale })
    if (!rows.length) return
    const rowEl = event.target.closest?.('[data-line-index]')
    const at = rowEl ? Number(rowEl.dataset.lineIndex) : doc.lines.length - 1
    const target = doc.lines[at]
    const replaceTarget = target && !target.description.trim() && !target.unitPrice_minor
    const taxIds = target ? [...target.taxIds] : defaultTaxIds()
    rows.forEach((row, i) => actions.addLine({ ...row, taxIds }, at + 1 + i))
    if (replaceTarget) actions.removeLine(target.id)
    commands.toast(`Added ${rows.length} item${rows.length === 1 ? '' : 's'} from the clipboard`, 'success')
  }

  const pickProduct = (id) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    let price = product.unitPrice_minor
    if (product.currency !== doc.currency) price = 0
    addLine({ description: product.description, sku: product.sku, unit: product.unit, unitPrice_minor: price })
    if (product.currency !== doc.currency) commands.toast(`Price not copied: saved in ${product.currency}, this document is in ${doc.currency}.`)
    setProductQuery('')
  }

  const listIssues = issuesFor('lines')
  return (
    <SectionCard id="items" title="Items" icon="list" summary={`${doc.lines.length} item${doc.lines.length === 1 ? '' : 's'}`}>
      <div onPaste={onPaste}>
        {doc.lines.length ? (
          <div className="mb-2 hidden items-end gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:flex" aria-hidden="true">
            <span className="w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="mb-1">Description</p>
              <div className={`${numericGrid} normal-case`}>
                <span>Qty</span><span>Unit</span>
                {pricing ? <><span className="text-right">Unit price</span><span>Discount</span><span className="text-right">Amount</span></> : null}
              </div>
            </div>
            <span className="w-8 shrink-0" />
          </div>
        ) : null}
        <ol className="space-y-2" aria-label="Line items">
          {doc.lines.map((line, index) => (
            <ItemRow
              key={line.id}
              line={line}
              index={index}
              count={doc.lines.length}
              calc={calcById.get(line.id)}
              pricing={pricing}
              discountEnabled={config.features.discount}
              onEnterLast={() => addLine({}, doc.lines.length)}
              drag={dragApi}
            />
          ))}
        </ol>
        {!doc.lines.length ? <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No items yet. Add one below, or paste rows from a spreadsheet.</p> : null}
        <IssueList issues={listIssues} />

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <button type="button" onClick={() => addLine({}, doc.lines.length)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2">
            <Icon name="plus" className="h-4 w-4" /> Add item
          </button>
          {pricing ? (
            <Combobox
              className="flex-1"
              label="Add a saved product"
              srOnlyLabel
              value={productQuery}
              onChange={setProductQuery}
              onQuery={(q) => { repo.searchProducts(q).then(setProducts).catch(() => {}) }}
              options={products.map((p) => ({ key: p.id, label: p.description.split('\n')[0], detail: `${formatMoney(p.unitPrice_minor, p.currency, doc.locale)}${p.unit ? ` / ${p.unit}` : ''}` }))}
              onPick={pickProduct}
              placeholder="Search saved products…"
              emptyText={productQuery ? 'No saved products match' : 'Save an item as a product to reuse it here'}
            />
          ) : null}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tip: paste rows from Excel or Google Sheets (description, qty, unit, price) to add them all at once.
          {pricing && !doc.taxes.length ? <> No taxes yet — <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" onClick={() => { toggleSection('taxes', true); requestAnimationFrame(() => document.getElementById('ds-section-taxes')?.scrollIntoView({ block: 'start', behavior: 'smooth' })) }}>add one</button>.</> : null}
        </p>
      </div>
    </SectionCard>
  )
}
