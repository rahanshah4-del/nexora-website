// Live support launcher — reuses the existing Tawk.to instance.
//
// The website already loads Tawk.to (see src/pages/public/TawkChat.jsx). This
// helper opens that SAME widget without ever installing a second one: it shares
// the identical script id and property/widget IDs. On pages where Tawk is already
// loaded it simply calls Tawk_API.maximize(); elsewhere it lazily injects the same
// Tawk property on demand (guarded by the shared script id) and maximizes once
// the API is ready.

const TAWK_SCRIPT_ID = 'nexora-tawk-to-widget'
const TAWK_PROPERTY_ID = import.meta.env.VITE_TAWK_TO_PROPERTY_ID || '6a21bb86204aec1c2e8c2b59'
const TAWK_WIDGET_ID = import.meta.env.VITE_TAWK_TO_WIDGET_ID || '1jq9s92p1'

function safeMaximize() {
  try {
    window.Tawk_API?.maximize?.()
    return Boolean(window.Tawk_API?.maximize)
  } catch {
    return false
  }
}

// Open the live chat. Returns true if the existing widget was opened immediately.
export function openSupportChat() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  // Existing Tawk instance already on the page — just open it.
  if (window.Tawk_API?.maximize) {
    console.log('[Support] opening existing Tawk chat')
    return safeMaximize()
  }

  if (!TAWK_PROPERTY_ID) return false

  // Reuse the same Tawk property on demand (no second widget).
  window.Tawk_API = window.Tawk_API || {}
  window.Tawk_LoadStart = window.Tawk_LoadStart || new Date()
  const previousOnLoad = window.Tawk_API.onLoad
  window.Tawk_API.onLoad = function onLoad() {
    if (typeof previousOnLoad === 'function') {
      try { previousOnLoad() } catch { /* ignore */ }
    }
    safeMaximize()
  }

  if (!document.getElementById(TAWK_SCRIPT_ID)) {
    console.log('[Support] loading Tawk on demand')
    const script = document.createElement('script')
    script.id = TAWK_SCRIPT_ID
    script.async = true
    script.charset = 'UTF-8'
    script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`
    script.setAttribute('crossorigin', '*')
    document.body.appendChild(script)
  } else {
    // Script tag present but API not ready yet — retry maximize shortly.
    window.setTimeout(safeMaximize, 600)
  }
  return false
}
