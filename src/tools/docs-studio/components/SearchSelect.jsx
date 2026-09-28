/**
 * Button that opens a searchable listbox (currency / locale pickers).
 * Type to filter, ↑/↓ to move, Enter to choose, Escape to close.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'

/**
 * @param {{ label: string, value: string, options: { value: string, label: string, detail?: string, search?: string }[], onChange: (v: string) => void, id?: string, renderValue?: (o) => any }} props
 */
export default function SearchSelect({ label, value, options, onChange, id: idProp, placeholder = 'Search…' }) {
  const autoId = useId()
  const id = idProp || autoId
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const inputRef = useRef(null)
  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => (o.search || `${o.value} ${o.label} ${o.detail || ''}`).toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const choose = (option) => {
    onChange(option.value)
    setOpen(false)
    setQuery('')
    buttonRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <p id={`${id}-label`} className="mb-1 block text-xs font-semibold text-slate-600">{label}</p>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => { setOpen((v) => !v); setActive(Math.max(0, options.findIndex((o) => o.value === value))) }}
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <span className="min-w-0 flex-1 truncate">{selected ? selected.label : value}{selected?.detail ? <span className="text-slate-500"> · {selected.detail}</span> : null}</span>
        <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open ? (
        <div className="ds-pop absolute left-0 right-0 z-40 mt-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-list`}
              aria-activedescendant={filtered[active] ? `${id}-opt-${active}` : undefined}
              aria-label={`Search ${label.toLowerCase()}`}
              placeholder={placeholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)) }
                else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
                else if (event.key === 'Enter') { event.preventDefault(); if (filtered[active]) choose(filtered[active]) }
                else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); buttonRef.current?.focus() }
                else if (event.key === 'Tab') setOpen(false)
              }}
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <ul id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="mt-1 max-h-64 overflow-auto">
            {filtered.length ? filtered.map((option, i) => (
              <li
                key={option.value}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={option.value === value}
                onPointerDown={(e) => { e.preventDefault(); choose(option) }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${i === active ? 'bg-blue-50' : ''} ${option.value === value ? 'font-semibold text-brand' : 'text-slate-700'}`}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}{option.detail ? <span className="font-normal text-slate-500"> · {option.detail}</span> : null}</span>
                {option.value === value ? <Icon name="check" className="h-4 w-4 shrink-0" /> : null}
              </li>
            )) : <li className="px-2.5 py-2 text-xs text-slate-500">No matches</li>}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
