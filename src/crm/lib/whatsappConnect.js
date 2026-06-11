// WhatsApp Connect — Nexora backend (Cloudflare Worker) client.
//
// Bridges the Connect WhatsApp wizard to the Nexora WhatsApp worker. The worker
// validates the caller's Firebase ID token, confirms workspace access, and (when
// ready) exchanges the Embedded Signup auth `code` for a Meta access token that
// is stored ONLY in the worker's secure secret store — never in the browser or
// Firestore.
//
// This module sends only non-secret metadata plus the short-lived auth code and
// the user's Firebase ID token (Authorization: Bearer). It returns the safe
// connection metadata the frontend should persist via useWhatsappSettings.

// Worker base URL ALWAYS comes from the VITE_WHATSAPP_WORKER_URL env variable —
// never hardcoded. No localhost fallback: in production a missing value simply
// disables worker calls (the wizard still saves a safe pending record locally).
const WORKER_URL = String(import.meta.env.VITE_WHATSAPP_WORKER_URL || '').trim().replace(/\/+$/, '')
const CONNECT_TIMEOUT_MS = 15000
const HEALTH_TIMEOUT_MS = 8000

export function isWorkerConfigured() {
  return Boolean(WORKER_URL)
}

// Expose the configured worker base URL (read-only) for status displays such as
// the Control Centre. Returns '' when not configured.
export function workerBaseUrl() {
  return WORKER_URL
}

// Public webhook URL Meta should call for this workspace. Shown (and copyable)
// in the Connect wizard / Control Centre. Returns '' when the worker URL is not
// configured yet so the UI can show a "configure worker" hint instead.
export function webhookUrlForWorkspace(workspaceId) {
  if (!WORKER_URL || !workspaceId) return ''
  return `${WORKER_URL}/webhooks/whatsapp/${encodeURIComponent(workspaceId)}`
}

// Human-facing reference label for the verify token (NOT the secret itself). The
// real verify token lives only in the worker environment.
export function defaultVerifyTokenLabel(workspaceId) {
  return workspaceId ? `nexora-wa-${String(workspaceId).slice(0, 8)}` : 'nexora-wa-verify'
}

async function fetchWithTimeout(url, options, timeoutMs = CONNECT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ping the deployed worker's GET /health endpoint to confirm reachability.
 * Used by the Connect wizard, WhatsApp Dashboard, and Control Centre status cards.
 *
 * @returns {Promise<{ online: boolean, configured: boolean, url: string,
 *   service?: string, hasProjectId?: boolean, hasVerifyToken?: boolean,
 *   hasAppSecret?: boolean, error?: string }>}
 *
 * Resolves (never throws). online:false with configured:false means no env URL;
 * online:false with configured:true means the worker is unreachable/offline.
 */
export async function checkWhatsappWorker() {
  console.log('[WhatsApp Worker] request', `${WORKER_URL || '(unconfigured)'} /health`)
  if (!isWorkerConfigured()) {
    console.log('[WhatsApp Worker] failed', 'worker url not configured')
    return { online: false, configured: false, url: '', error: 'WhatsApp worker URL is not configured.' }
  }

  try {
    const response = await fetchWithTimeout(`${WORKER_URL}/health`, { method: 'GET' }, HEALTH_TIMEOUT_MS)
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) {
      console.log('[WhatsApp Worker] failed', `health status ${response.status}`)
      return { online: false, configured: true, url: WORKER_URL, error: `Worker responded ${response.status}.` }
    }
    console.log('[WhatsApp Worker] success', data.service || 'health ok')
    return {
      online: true,
      configured: true,
      url: WORKER_URL,
      service: data.service || '',
      hasProjectId: Boolean(data.hasProjectId),
      hasVerifyToken: Boolean(data.hasVerifyToken),
      hasAppSecret: Boolean(data.hasAppSecret),
    }
  } catch (error) {
    const timedOut = error?.name === 'AbortError' || String(error?.message || '').includes('timeout')
    const message = timedOut ? 'Worker health check timed out.' : (error?.message || 'Worker unreachable.')
    console.log('[WhatsApp Worker] failed', message)
    return { online: false, configured: true, url: WORKER_URL, error: message }
  }
}

/**
 * Send the Embedded Signup result to the Nexora worker for the secure exchange.
 *
 * @returns {Promise<{ ok: boolean, error?: string, code?: string,
 *   connectionStatus?: string, phoneNumberId?: string, businessAccountId?: string,
 *   businessName?: string, webhookStatus?: string }>}
 *
 * Resolves (never throws). When the worker is not configured or the exchange is
 * not ready yet, returns ok:false so the wizard can still persist a safe
 * pending_verification record locally.
 */
export async function exchangeConnection({
  firebaseUser,
  workspaceId,
  phoneNumberId = '',
  wabaId = '',
  businessName = '',
  displayName = '',
  connectedNumber = '',
  code = '',
} = {}) {
  console.log('[WhatsApp Connect] backend exchange start')

  if (!isWorkerConfigured()) {
    console.log('[WhatsApp Connect] backend exchange failed', 'worker url not configured')
    return { ok: false, error: 'WhatsApp worker URL is not configured.', code: 'worker_unconfigured' }
  }
  if (!firebaseUser || typeof firebaseUser.getIdToken !== 'function') {
    return { ok: false, error: 'Please sign in again to connect WhatsApp.', code: 'no_auth' }
  }
  if (!workspaceId) {
    return { ok: false, error: 'No active workspace.', code: 'no_workspace' }
  }

  let idToken
  try {
    idToken = await firebaseUser.getIdToken()
  } catch {
    return { ok: false, error: 'Could not verify your session. Please sign in again.', code: 'token_failed' }
  }

  try {
    console.log('[WhatsApp Worker] request', `${WORKER_URL} /api/whatsapp/connect`)
    const response = await fetchWithTimeout(`${WORKER_URL}/api/whatsapp/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        workspaceId,
        phoneNumberId,
        wabaId,
        businessName,
        displayName,
        connectedNumber,
        // Short-lived Embedded Signup auth code; exchanged server-side only.
        code,
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) {
      const error = data?.error || `Backend exchange failed (${response.status}).`
      console.log('[WhatsApp Worker] failed', error)
      console.log('[WhatsApp Connect] backend exchange failed', error)
      return { ok: false, error, code: data?.code || 'exchange_failed' }
    }

    console.log('[WhatsApp Worker] success', 'connect accepted')
    console.log('[WhatsApp Connect] backend exchange success')
    return {
      ok: true,
      connectionStatus: data.connectionStatus || 'pending_verification',
      verificationStatus: data.verificationStatus || '',
      phoneNumberId: data.phoneNumberId || phoneNumberId,
      businessAccountId: data.businessAccountId || wabaId,
      businessName: data.businessName || businessName,
      webhookStatus: data.webhookStatus || 'pending',
    }
  } catch (error) {
    const timedOut = error?.name === 'AbortError' || String(error?.message || '').includes('timeout')
    const message = timedOut ? 'Backend exchange timed out.' : (error?.message || 'Backend exchange failed.')
    console.log('[WhatsApp Worker] failed', message)
    console.log('[WhatsApp Connect] backend exchange failed', message)
    return { ok: false, error: message, code: timedOut ? 'timeout' : 'network_error' }
  }
}
