/**
 * Form primitives for the studio. Every input has a visible <label>, shows
 * validateDocument() issues for its path underneath (red errors, amber
 * warnings) once touched, and never blocks typing: invalid drafts stay in the
 * input while the document keeps its last valid value.
 */

import { useId, useState } from 'react'
import {
  currencyExponent, localeSeparators, normalizeDecimalInput, parseMoneyInput, parseScaledDecimal, scaledToDecimalString,
} from '../engine/index.js'
import { fieldId } from '../ui/issues.js'
import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'

export const inputBase = 'block w-full min-w-0 rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:bg-slate-50 disabled:text-slate-400'

function toneBorder(issues) {
  if (issues.some((i) => i.severity === 'error')) return 'border-rose-400'
  if (issues.length) return 'border-amber-400'
  return 'border-slate-200'
}

export function IssueList({ issues, id }) {
  if (!issues?.length) return null
  return (
    <ul id={id} className="mt-1 space-y-0.5" aria-live="polite">
      {issues.map((issue) => (
        <li key={`${issue.path}-${issue.code}`} className={`flex items-start gap-1 text-xs ${issue.severity === 'error' ? 'text-rose-600' : 'text-amber-700'}`}>
          <Icon name={issue.severity === 'error' ? 'alert' : 'info'} className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  )
}

/** Label + control + issues. `children(props)` receives the ids/aria wiring. */
export function Field({ label, path, hint, className = '', srOnlyLabel = false, labelClassName, prefixIssues = false, children }) {
  const { issuesFor, markTouched } = useStudio()
  const autoId = useId()
  const id = path ? fieldId(path) : autoId
  const issues = path ? issuesFor(path, { prefix: prefixIssues }) : []
  const describedBy = issues.length ? `${id}-issues` : hint ? `${id}-hint` : undefined
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={labelClassName || (srOnlyLabel ? 'sr-only' : 'mb-1 block text-xs font-semibold text-slate-600')}>{label}</label>
      {children({
        id,
        'aria-invalid': issues.some((i) => i.severity === 'error') || undefined,
        'aria-describedby': describedBy,
        onBlur: path ? () => markTouched(path) : undefined,
        borderClass: toneBorder(issues),
      })}
      {hint && !issues.length ? <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      <IssueList issues={issues} id={`${id}-issues`} />
    </div>
  )
}

export function TextInput({ label, path, value, onChange, hint, className, srOnlyLabel, labelClassName, type = 'text', ...rest }) {
  return (
    <Field label={label} path={path} hint={hint} className={className} srOnlyLabel={srOnlyLabel} labelClassName={labelClassName}>
      {({ borderClass, ...wiring }) => (
        <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`${inputBase} ${borderClass}`} {...wiring} {...rest} />
      )}
    </Field>
  )
}

export function TextArea({ label, path, value, onChange, hint, className, srOnlyLabel, labelClassName, rows = 2, ...rest }) {
  return (
    <Field label={label} path={path} hint={hint} className={className} srOnlyLabel={srOnlyLabel} labelClassName={labelClassName}>
      {({ borderClass, ...wiring }) => (
        <textarea value={value ?? ''} rows={rows} onChange={(e) => onChange(e.target.value)} className={`${inputBase} ${borderClass} ds-autosize resize-y`} {...wiring} {...rest} />
      )}
    </Field>
  )
}

export function SelectInput({ label, path, value, onChange, options, className, srOnlyLabel, labelClassName, ...rest }) {
  return (
    <Field label={label} path={path} className={className} srOnlyLabel={srOnlyLabel} labelClassName={labelClassName}>
      {({ borderClass, ...wiring }) => (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputBase} ${borderClass} pr-8`} {...wiring} {...rest}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  )
}

export function DateInput({ label, path, value, onChange, className, ...rest }) {
  return (
    <Field label={label} path={path} className={className}>
      {({ borderClass, ...wiring }) => (
        <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value || null)} className={`${inputBase} ${borderClass}`} {...wiring} {...rest} />
      )}
    </Field>
  )
}

function editable(value, digits, decimal, { trim = false, blankZero = false } = {}) {
  if (blankZero && !value) return ''
  let s = scaledToDecimalString(BigInt(Math.trunc(Number(value) || 0)), digits)
  if (trim && s.includes('.')) s = s.replace(/\.?0+$/, '')
  return decimal === '.' ? s : s.replace('.', decimal)
}

/**
 * Decimal text box bound to an integer. While focused the typed text is kept
 * verbatim; the model updates whenever the text parses.
 */
function DecimalBox({ value, toText, parse, onChange, wiring, borderClass, align = 'right', allowEmpty = true, ...rest }) {
  const [draft, setDraft] = useState(null)
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft ?? toText(value)}
      onFocus={(e) => { setDraft(toText(value)); requestAnimationFrame(() => e.target.select?.()) }}
      onChange={(e) => {
        setDraft(e.target.value)
        const parsed = parse(e.target.value)
        if (parsed !== null) onChange(parsed)
        else if (allowEmpty && e.target.value.trim() === '') onChange(0)
      }}
      onBlur={(e) => { setDraft(null); wiring.onBlur?.(e) }}
      className={`${inputBase} ${borderClass} ${align === 'right' ? 'text-right tabular-nums' : ''}`}
      id={wiring.id}
      aria-invalid={wiring['aria-invalid']}
      aria-describedby={wiring['aria-describedby']}
      {...rest}
    />
  )
}

/** Money in the document currency, typed in the document locale. */
export function MoneyInput({ label, path, value, onChange, className, srOnlyLabel, labelClassName, hint, ...rest }) {
  const { doc } = useStudio()
  const exponent = currencyExponent(doc.currency)
  const { decimal } = localeSeparators(doc.locale)
  return (
    <Field label={label} path={path} className={className} srOnlyLabel={srOnlyLabel} labelClassName={labelClassName} hint={hint}>
      {({ borderClass, ...wiring }) => (
        <DecimalBox
          value={value}
          toText={(v) => editable(v, exponent, decimal, { blankZero: true })}
          parse={(text) => {
            const r = parseMoneyInput(text, doc.currency, doc.locale)
            return r.ok ? r.minor : null
          }}
          placeholder={editable(0, exponent, decimal)}
          onChange={onChange}
          wiring={wiring}
          borderClass={borderClass}
          {...rest}
        />
      )}
    </Field>
  )
}

/** Scaled decimal: digits=3 for qty_milli, digits=4 for percent → rate_micro. */
export function DecimalInput({ label, path, value, onChange, digits, className, srOnlyLabel, labelClassName, suffix, hint, blankZero = false, ...rest }) {
  const { doc } = useStudio()
  const { decimal } = localeSeparators(doc.locale)
  return (
    <Field label={label} path={path} className={className} srOnlyLabel={srOnlyLabel} labelClassName={labelClassName} hint={hint}>
      {({ borderClass, ...wiring }) => (
        <div className="relative">
          <DecimalBox
            value={value}
            toText={(v) => editable(v, digits, decimal, { trim: true, blankZero })}
            parse={(text) => {
              const normalized = normalizeDecimalInput(text, doc.locale)
              const scaled = normalized === null ? null : parseScaledDecimal(normalized, digits)
              return scaled === null ? null : Number(scaled)
            }}
            onChange={onChange}
            wiring={wiring}
            borderClass={`${borderClass} ${suffix ? 'pr-7' : ''}`}
            {...rest}
          />
          {suffix ? <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-400" aria-hidden="true">{suffix}</span> : null}
        </div>
      )}
    </Field>
  )
}

export function Toggle({ label, checked, onChange, description, id: idProp }) {
  const autoId = useId()
  const id = idProp || autoId
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium text-slate-800">{label}</p>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 ${checked ? 'bg-brand' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

/** Radio-group styled as a segmented control; arrow keys move the selection. */
export function Segmented({ label, value, onChange, options, size = 'md', className = '', srOnlyLabel = false }) {
  const labelId = useId()
  const onKeyDown = (event) => {
    const index = options.findIndex((o) => o.value === value)
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = options[(index + delta + options.length) % options.length]
    onChange(next.value)
    event.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus()
  }
  return (
    <div className={className}>
      <p id={labelId} className={srOnlyLabel ? 'sr-only' : 'mb-1 text-xs font-semibold text-slate-600'}>{label}</p>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown} className="inline-flex w-full rounded-xl bg-slate-100 p-1">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              data-value={o.value}
              onClick={() => onChange(o.value)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {o.icon ? <Icon name={o.icon} className="h-4 w-4" /> : null}
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
