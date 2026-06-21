let presentDialog = null

function normalizeOptions(options) {
  if (typeof options === 'string') return { message: options }
  return options || {}
}

export function setDialogPresenter(presenter) {
  presentDialog = presenter
  return () => {
    if (presentDialog === presenter) presentDialog = null
  }
}

export function confirmAction(options) {
  const next = normalizeOptions(options)
  if (!presentDialog) return Promise.resolve(window.confirm(next.message || next.title || 'Continue?'))
  return new Promise((resolve) => presentDialog({ ...next, mode: 'confirm' }, resolve))
}

export function alertAction(options) {
  const next = normalizeOptions(options)
  if (!presentDialog) {
    window.alert(next.message || next.title || '')
    return Promise.resolve(true)
  }
  return new Promise((resolve) => presentDialog({ ...next, mode: 'alert' }, resolve))
}
