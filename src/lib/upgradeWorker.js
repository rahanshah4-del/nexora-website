const UPGRADE_WORKER_URL = String(
  import.meta.env.VITE_UPGRADE_WORKER_URL ||
    import.meta.env.VITE_NOWPAYMENTS_WORKER_URL ||
    'https://nexora-payments-api.rahanshah4.workers.dev',
).replace(/\/$/, '')

function clean(value) {
  return typeof value === 'string' ? value.trim() : value || ''
}

async function parseWorkerResponse(response, fallbackError) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || fallbackError)
  }
  return payload
}

export function upgradeWorkerBaseUrl() {
  return UPGRADE_WORKER_URL
}

export async function submitManualUpgradeRequest({ idToken, fields = {}, screenshotFile }) {
  if (!UPGRADE_WORKER_URL) throw new Error('Upgrade worker URL is not configured.')
  if (!idToken) throw new Error('Sign in again before submitting the upgrade request.')
  if (!screenshotFile) throw new Error('Payment screenshot is required.')
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value))
  })
  form.append('screenshot', screenshotFile)
  const response = await fetch(`${UPGRADE_WORKER_URL}/api/upgrades/manual`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  })
  return parseWorkerResponse(response, 'Unable to submit upgrade request.')
}

export async function listWorkerUpgradeRequests(idToken, limit = 150) {
  if (!UPGRADE_WORKER_URL || !idToken) return []
  const response = await fetch(`${UPGRADE_WORKER_URL}/api/upgrades/requests?limit=${encodeURIComponent(limit)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  const payload = await parseWorkerResponse(response, 'Unable to load Worker upgrade requests.')
  return Array.isArray(payload.requests) ? payload.requests : []
}

export async function updateWorkerUpgradeRequestStatus(idToken, requestId, status) {
  if (!UPGRADE_WORKER_URL) throw new Error('Upgrade worker URL is not configured.')
  if (!idToken) throw new Error('Backend admin sign-in required.')
  const response = await fetch(`${UPGRADE_WORKER_URL}/api/upgrades/requests/${encodeURIComponent(requestId)}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: clean(status) }),
  })
  return parseWorkerResponse(response, 'Unable to update Worker upgrade request.')
}
