/**
 * Site-wide double-click / double-submit guard.
 *
 * Runs in the capture phase on `document`, before React's own listeners, so a
 * duplicate event is dropped before any handler sees it. Two rules, both
 * deliberately narrow so normal fast interaction (quantity steppers, toggles,
 * tabs) is never affected:
 *
 *  1. A <form> that fires `submit` again within FORM_WINDOW_MS is a double submit.
 *  2. A button whose label is an action that must run once (Save, Pay, Place
 *     order, Confirm, Delete…) ignores a second click on the same element within
 *     CLICK_WINDOW_MS. "Add" is not in the list: adding the same item twice
 *     quickly can be intentional.
 *
 * A button can opt out with data-allow-rapid, or opt in with data-once.
 */

export const FORM_WINDOW_MS = 700
export const CLICK_WINDOW_MS = 600

const ONCE_LABEL = /^\s*(save|submit|pay|checkout|check out|place order|place|confirm|create|send|approve|reject|complete|finish|record|refund|delete|remove|sign ?up|sign ?in|log ?in|register|book|publish|import|upload|update|apply|continue to pay|proceed|generate|download|print)\b/i

export function isOnceButtonLabel(text) {
  return ONCE_LABEL.test(String(text || '').trim())
}

/** Pure rule used by the listeners (and unit tests). */
export function shouldDropEvent(lastMs, nowMs, windowMs) {
  return typeof lastMs === 'number' && nowMs - lastMs >= 0 && nowMs - lastMs < windowMs
}

export function installDoubleClickGuard(doc = typeof document !== 'undefined' ? document : null, now = () => Date.now()) {
  if (!doc || doc.__nexoraDoubleClickGuard) return () => {}
  doc.__nexoraDoubleClickGuard = true
  const lastSubmit = new WeakMap()
  const lastClick = new WeakMap()

  const onSubmit = (event) => {
    const form = event.target
    if (!form || typeof form !== 'object') return
    const t = now()
    if (shouldDropEvent(lastSubmit.get(form), t, FORM_WINDOW_MS)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    lastSubmit.set(form, t)
  }

  const onClick = (event) => {
    const target = event.target
    const button = target && typeof target.closest === 'function' ? target.closest('button') : null
    if (!button || button.disabled || button.hasAttribute('data-allow-rapid')) return
    const optedIn = button.hasAttribute('data-once')
    if (!optedIn && !isOnceButtonLabel(button.textContent || button.getAttribute('aria-label'))) return
    const t = now()
    if (shouldDropEvent(lastClick.get(button), t, CLICK_WINDOW_MS)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    lastClick.set(button, t)
  }

  doc.addEventListener('submit', onSubmit, true)
  doc.addEventListener('click', onClick, true)
  return () => {
    doc.removeEventListener('submit', onSubmit, true)
    doc.removeEventListener('click', onClick, true)
    delete doc.__nexoraDoubleClickGuard
  }
}
