export const LOCAL_DATA_CHANGED_EVENT = 'nexora:localDataChanged'

export function notifyLocalDataChanged(storageKey) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT, { detail: { storageKey } }))
}
