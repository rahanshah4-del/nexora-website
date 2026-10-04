/**
 * Accessible dropdown menu: button with aria-haspopup, role="menu" list,
 * arrow/Home/End navigation, Escape and outside-click to close. Items are
 * { label, icon?, onSelect?, disabled?, danger?, hint? } or { heading } or
 * { separator: true }.
 *
 * Phones (< 640 px): the list opens as a bottom sheet in a portal, above the
 * sticky toolbar and the totals bar, instead of a dropdown that can be clipped
 * or hidden behind them.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

const PHONE_QUERY = '(max-width: 639px)'

function isPhone() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
}

export default function Menu({ label, buttonContent, buttonClassName, items, align = 'right', onOpen, menuClassName = 'w-64' }) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    const first = menuRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')
    first?.focus({ preventScroll: true })
    // A sheet covers the page: keep the page itself from scrolling underneath.
    const previousOverflow = document.body.style.overflow
    if (sheet) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      if (sheet) document.body.style.overflow = previousOverflow
    }
  }, [open, sheet])

  const show = () => {
    setSheet(isPhone())
    setOpen(true)
    onOpen?.()
  }

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus({ preventScroll: true })
  }

  const onKeyDown = (event) => {
    const itemsEls = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') || [])]
    const index = itemsEls.indexOf(document.activeElement)
    const move = (i) => { event.preventDefault(); itemsEls[(i + itemsEls.length) % itemsEls.length]?.focus() }
    if (event.key === 'ArrowDown') move(index + 1)
    else if (event.key === 'ArrowUp') move(index - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(itemsEls.length - 1)
    else if (event.key === 'Escape') { event.preventDefault(); close() }
    else if (event.key === 'Tab') setOpen(false)
  }

  const list = items.map((item, i) => {
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
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 text-left focus:outline-none focus-visible:bg-slate-100 ${sheet ? 'min-h-[48px] py-2.5 text-[15px]' : 'py-2 text-sm'} ${item.disabled ? 'cursor-not-allowed text-slate-300' : item.danger ? 'text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'} ${item.active ? 'bg-blue-50 font-semibold text-brand' : ''}`}
      >
        {item.icon ? <Icon name={item.icon} className={`${sheet ? 'h-5 w-5' : 'h-4 w-4'} shrink-0`} /> : null}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.hint ? <span className="shrink-0 text-xs text-slate-400">{item.hint}</span> : null}
      </button>
    )
  })

  let popup = null
  if (open && sheet && typeof document !== 'undefined') {
    popup = createPortal(
      <div className="fixed inset-0 z-[90]" onKeyDown={onKeyDown}>
        <button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 h-full w-full cursor-default bg-slate-950/40" onClick={() => close()} />
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className="ds-pop absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-lift"
        >
          <div className="sticky top-0 z-10 -mx-2 flex items-center justify-between bg-white px-4 pb-1 pt-1">
            <span className="text-sm font-semibold text-slate-900">{label}</span>
            <button type="button" onClick={() => close()} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
          {list}
        </div>
      </div>,
      document.body,
    )
  } else if (open) {
    popup = (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={label}
        className={`ds-pop absolute z-50 mt-2 max-h-[70vh] max-w-[calc(100vw-1.5rem)] overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift ${align === 'right' ? 'right-0' : 'left-0'} ${menuClassName}`}
      >
        {list}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={open && !sheet ? onKeyDown : undefined}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => { if (open) setOpen(false); else show() }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) { event.preventDefault(); show() }
        }}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {popup}
    </div>
  )
}
