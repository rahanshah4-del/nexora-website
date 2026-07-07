export function safeTrackMetaEvent(eventName, params) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function' || !eventName) return false
  window.fbq('track', eventName, params)
  return true
}

export function safeTrackMetaEventOnce(eventName, params, storageKey, storage = 'local') {
  if (typeof window === 'undefined' || !storageKey) return
  const store = storage === 'session' ? window.sessionStorage : window.localStorage
  if (store.getItem(storageKey) === '1') return
  if (safeTrackMetaEvent(eventName, params)) store.setItem(storageKey, '1')
}
