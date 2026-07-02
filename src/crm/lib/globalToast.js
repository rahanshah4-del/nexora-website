export function showGlobalToast(tone, message, timeout = 2600) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('nexora:global-toast', {
    detail: { tone, message, timeout },
  }))
}
