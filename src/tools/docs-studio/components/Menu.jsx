/**
 * Accessible dropdown menu: button with aria-haspopup, role="menu" list,
 * arrow/Home/End navigation, Escape and outside-click to close. Items are
 * { label, icon?, onSelect?, disabled?, danger?, hint? } or { heading } or
 * { separator: true }.
 */

import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'

export default function Menu({ label, buttonContent, buttonClassName, items, align = 'right', onOpen, menuClassName = 'w-64' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    const first = rootRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')
    first?.focus()
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const onKeyDown = (event) => {
    const itemsEls = [...(rootRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') || [])]
    const index = itemsEls.indexOf(document.activeElement)
    const move = (i) => { event.preventDefault(); itemsEls[(i + itemsEls.length) % itemsEls.length]?.focus() }
    if (event.key === 'ArrowDown') move(index + 1)
    else if (event.key === 'ArrowUp') move(index - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(itemsEls.length - 1)
    else if (event.key === 'Escape') { event.preventDefault(); close() }
    else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => { setOpen((v) => !v); if (!open) onOpen?.() }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) { event.preventDefault(); setOpen(true); onOpen?.() }
        }}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={`ds-pop absolute z-50 mt-2 max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift ${align === 'right' ? 'right-0' : 'left-0'} ${menuClassName}`}
        >
          {items.map((item, i) => {
            if (item.separator) return <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-slate-100" />
            if (item.heading) return <p key={`h-${i}`} className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.heading}</p>
            return (
              <button
                key={item.key || item.label}
                type="button"
                role="menuitem"
                data-key={item.key || item.label}
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  if (item.disabled) return
                  close(!item.keepFocus)
                  item.onSelect?.()
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm focus:outline-none focus-visible:bg-slate-100 ${item.disabled ? 'cursor-not-allowed text-slate-300' : item.danger ? 'text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'} ${item.active ? 'bg-blue-50 font-semibold text-brand' : ''}`}
              >
                {item.icon ? <Icon name={item.icon} className="h-4 w-4 shrink-0" /> : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint ? <span className="shrink-0 text-xs text-slate-400">{item.hint}</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
