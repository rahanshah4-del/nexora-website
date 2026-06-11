// Meta Embedded Signup / Coexistence — frontend SDK loader and launcher.
//
// This module loads the Facebook/Meta JS SDK ONLY when the Connect WhatsApp
// wizard needs it, and exposes startEmbeddedSignup() which opens Meta's
// Embedded Signup flow. The client existing WhatsApp Business number is
// selected/entered inside Meta's own popup; Meta shows a QR / verification code
// that the client confirms from the WhatsApp Business App, then returns the
// phone_number_id + WABA id (and an auth code) back to us.
//
// SECURITY: No Meta access tokens, app secrets, or permanent tokens are ever
// handled here. The auth `code` returned by Embedded Signup is short-lived and
// is forwarded to the Nexora backend worker for the secure exchange — it is
// never persisted in the browser or Firestore.
//
// SAFETY: If the SDK is unavailable, blocked, or not configured, every export
// fails soft so the wizard can fall back to Manual Advanced Setup without ever
// breaking the app.

const META_GRAPH_VERSION = 'v21.0'
const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js'
const SDK_LOAD_TIMEOUT_MS = 12000

// Non-secret public configuration. App ID and Config ID are public client IDs
// (safe to expose); they are NOT secrets. Real values come from env at deploy.
export const META_APP_ID = String(import.meta.env.VITE_META_APP_ID || '').trim()
export const META_CONFIG_ID = String(import.meta.env.VITE_META_CONFIG_ID || '').trim()

// Temporary debug logs — confirm the public IDs were loaded from env.
if (META_APP_ID) console.log('[Meta] Meta App ID loaded')
if (META_CONFIG_ID) console.log('[Meta] Meta Config ID loaded')
if (META_APP_ID && META_CONFIG_ID) console.log('[Meta] Embedded Signup Ready')

// Embedded Signup is only usable when both public IDs are configured.
export function isEmbeddedSignupConfigured() {
  return Boolean(META_APP_ID && META_CONFIG_ID)
}

let sdkPromise = null

// Load the Meta JS SDK exactly once. Resolves with window.FB or rejects if the
// SDK cannot load (offline, blocked by an extension, CSP, timeout, …). Callers
// must catch and fall back to Manual Advanced Setup.
export function loadMetaSdk() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Meta SDK is only available in the browser.'))
  }
  if (!isEmbeddedSignupConfigured()) {
    return Promise.reject(new Error('Meta Embedded Signup is not configured.'))
  }
  if (window.FB) return Promise.resolve(window.FB)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    let settled = false
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      sdkPromise = null
      reject(new Error('Meta SDK load timed out.'))
    }, SDK_LOAD_TIMEOUT_MS)

    const finish = (error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      if (error || !window.FB) {
        sdkPromise = null
        reject(error || new Error('Meta SDK failed to initialize.'))
        return
      }
      resolve(window.FB)
    }

    window.fbAsyncInit = function fbAsyncInit() {
      try {
        window.FB.init({
          appId: META_APP_ID,
          autoLogAppEvents: true,
          xfbml: false,
          version: META_GRAPH_VERSION,
        })
        finish()
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Meta SDK init failed.'))
      }
    }

    const existing = document.getElementById('meta-jssdk')
    if (existing) {
      // Script tag already present; wait for fbAsyncInit or FB to appear.
      if (window.FB) finish()
      return
    }

    const script = document.createElement('script')
    script.id = 'meta-jssdk'
    script.src = SDK_SRC
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.onerror = () => finish(new Error('Meta SDK script failed to load.'))
    document.body.appendChild(script)
  })

  return sdkPromise
}

// Parse the WA_EMBEDDED_SIGNUP postMessage payload Meta posts during the flow.
function parseSignupMessage(event) {
  if (!event || typeof event.data !== 'string') return null
  if (!/facebook\.com$/i.test(new URL(event.origin || 'https://invalid').hostname || '')) {
    // Only trust messages from a facebook.com origin.
    return null
  }
  try {
    const parsed = JSON.parse(event.data)
    if (parsed?.type !== 'WA_EMBEDDED_SIGNUP') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Launch the Meta Embedded Signup / Coexistence popup.
 *
 * @param {object}   options
 * @param {function} [options.onStatus] called with a verification status string:
 *   'waiting' | 'qr_pending' | 'code_pending' | 'verified' | 'failed'
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, error?: string,
 *   phoneNumberId?: string, wabaId?: string, businessName?: string, code?: string }>}
 *
 * Resolves (never throws) so the wizard can branch cleanly. On an incomplete
 * Meta response the caller should fall back to Manual Advanced Setup.
 */
export async function startEmbeddedSignup({ onStatus } = {}) {
  const setStatus = (value) => {
    try {
      onStatus?.(value)
    } catch {
      /* ignore status callback errors */
    }
  }

  console.log('[WhatsApp Embedded Signup] start')
  setStatus('waiting')

  let FB
  try {
    FB = await loadMetaSdk()
  } catch (error) {
    console.log('[WhatsApp Embedded Signup] failed', error?.message || error)
    setStatus('failed')
    return { ok: false, error: error?.message || 'Meta SDK unavailable.', sdkUnavailable: true }
  }

  return new Promise((resolve) => {
    let captured = { phoneNumberId: '', wabaId: '', businessName: '' }
    let done = false

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
    }

    const onMessage = (event) => {
      const data = parseSignupMessage(event)
      if (!data) return
      const payload = data.data || {}
      if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
        captured = {
          phoneNumberId: String(payload.phone_number_id || captured.phoneNumberId || ''),
          wabaId: String(payload.waba_id || captured.wabaId || ''),
          businessName: String(payload.business_name || captured.businessName || ''),
        }
        // QR / code confirmed inside the WhatsApp Business App.
        setStatus('verified')
      } else if (data.event === 'CANCEL') {
        setStatus('failed')
      } else {
        // Intermediate steps: number entry, QR display, code confirmation.
        setStatus('code_pending')
      }
    }

    window.addEventListener('message', onMessage)
    setStatus('qr_pending')

    const finalize = (result) => {
      if (done) return
      done = true
      cleanup()
      resolve(result)
    }

    try {
      FB.login(
        (response) => {
          const code = response?.authResponse?.code || ''
          if (response?.status === 'connected' || code) {
            console.log('[WhatsApp Embedded Signup] success')
            finalize({
              ok: true,
              code: String(code || ''),
              phoneNumberId: captured.phoneNumberId,
              wabaId: captured.wabaId,
              businessName: captured.businessName,
            })
            return
          }
          console.log('[WhatsApp Embedded Signup] cancelled')
          setStatus('failed')
          finalize({ ok: false, cancelled: true, error: 'Meta setup was cancelled.' })
        },
        {
          config_id: META_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding' },
        },
      )
    } catch (error) {
      console.log('[WhatsApp Embedded Signup] failed', error?.message || error)
      setStatus('failed')
      finalize({ ok: false, error: error?.message || 'Could not open Meta setup.' })
    }
  })
}
