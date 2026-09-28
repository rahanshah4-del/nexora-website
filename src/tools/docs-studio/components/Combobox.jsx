/**
 * Text input with a suggestion list (ARIA combobox pattern). The input stays
 * a normal field — typing always edits the value — and suggestions are an
 * optional shortcut: ↓/↑ to move, Enter to pick, Escape to dismiss.
 */

import { useId, useState } from 'react'
import { fieldId } from '../ui/issues.js'
import { useStudio } from '../ui/StudioContext.js'
import { IssueList, inputBase } from './fields.jsx'

/**
 * @param {{
 *   label: string, path?: string, value: string, onChange: (v: string) => void,
 *   options: { key: string, label: string, detail?: string }[],
 *   onQuery?: (q: string) => void, onPick: (key: string) => void,
 *   placeholder?: string, srOnlyLabel?: boolean, className?: string, emptyText?: string,
 *   openOnFocus?: boolean, inputProps?: object,
 * }} props
 */
export default function Combobox({ label, path, value, onChange, options, onQuery, onPick, placeholder, srOnlyLabel = false, className = '', emptyText = '', openOnFocus = true, inputProps = {} }) {
  const { issuesFor, markTouched } = useStudio()
  const autoId = useId()
  const id = path ? fieldId(path) : autoId
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const issues = path ? issuesFor(path) : []
  const showList = open && (options.length > 0 || emptyText)

  const pick = (option) => {
    onPick(option.key)
    setOpen(false)
    setActive(-1)
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <label htmlFor={id} className={srOnlyLabel ? 'sr-only' : 'mb-1 block text-xs font-semibold text-slate-600'}>{label}</label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={issues.some((i) => i.severity === 'error') || undefined}
        aria-describedby={issues.length ? `${id}-issues` : undefined}
        autoComplete="off"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          onQuery?.(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => { if (openOnFocus) { onQuery?.(value || ''); setOpen(true) } }}
        onBlur={() => { setTimeout(() => setOpen(false), 120); if (path) markTouched(path) }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, options.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((i) => Math.max(i - 1, -1))
          } else if (event.key === 'Enter' && open && active >= 0 && options[active]) {
            event.preventDefault()
            pick(options[active])
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            setOpen(false)
          }
        }}
        className={`${inputBase} ${issues.some((i) => i.severity === 'error') ? 'border-rose-400' : issues.length ? 'border-amber-400' : 'border-slate-200'}`}
        {...inputProps}
      />
      {showList ? (
        <ul id={listId} role="listbox" aria-label={label} className="ds-pop absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
          {options.length ? options.map((option, i) => (
            <li
              key={option.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => { e.preventDefault(); pick(option) }}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? 'bg-blue-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span className="block truncate font-medium">{option.label}</span>
              {option.detail ? <span className="block truncate text-xs text-slate-500">{option.detail}</span> : null}
            </li>
          )) : <li className="px-3 py-2 text-xs text-slate-500">{emptyText}</li>}
        </ul>
      ) : null}
      <IssueList issues={issues} id={`${id}-issues`} />
    </div>
  )
}
