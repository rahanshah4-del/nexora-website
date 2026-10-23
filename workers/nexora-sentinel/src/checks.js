/**
 * What the Sentinel watches. Each check is a small, read-only probe with a time
 * limit. Pure apart from the injected fetch, so tests run in plain Node.
 */
const WORKERS = 'rahanshah4.workers.dev'

export function buildChecks(env = {}) {
  const site = String(env.SITE_URL || 'https://nexorasolution.us').replace(/\/+$/, '')
  const w = (name) => `https://${name}.${WORKERS}`
  const page = (id, label, path, mustContain) => ({ id, label, group: 'Website', kind: 'page', url: `${site}${path}`, mustContain })
  const health = (id, label, name, path = '/health', field = 'status', okValues = ['ok', 'healthy']) =>
    ({ id, label, group: 'API Workers', kind: 'json', url: `${w(name)}${path}`, field, okValues })
  return [
    page('site_home', 'Homepage', '/', '<div id="root"'),
    page('site_pricing', 'Pricing page', '/pricing/', '<div id="root"'),
    page('site_blog', 'Blog', '/blog/', '<div id="root"'),
    page('site_login', 'Login page', '/login/', '<div id="root"'),
    page('site_tempmail', 'Temp Mail page', '/tools/temp-mail/', '<div id="root"'),
    health('api_email', 'Email API', 'nexora-email-api'),
    health('api_jobs', 'Background jobs', 'nexora-background-jobs'),
    health('api_passkeys', 'Passkeys API', 'nexora-passkeys-api', '/health', 'ok', [true]),
    health('api_payments', 'Payments API', 'nexora-payments-api'),
    health('api_ai', 'AI gateway', 'nexora-ai-gateway'),
    { id: 'api_tempmail', label: 'Temp Mail service', group: 'Temp Mail', kind: 'json', url: `${w('nexora-temp-mail')}/api/config`, field: 'domains', okValues: null, nonEmpty: true },
    { id: 'firebase_auth', label: 'Firebase sign-in keys', group: 'Firebase', kind: 'json', url: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com', field: 'keys', okValues: null, nonEmpty: true },
    { id: 'firestore', label: 'Firestore database', group: 'Firebase', kind: 'reachable', url: `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID || 'nexora-business-suite'}/databases/(default)/documents/__sentinel__/ping` },
  ]
}

const SLOW_MS = 4000
const TIMEOUT_MS = 10000

/** Run one check. Never throws: a failure is a result. */
export async function runCheck(check, fetchFn = fetch, now = () => Date.now()) {
  const started = now()
  const base = { id: check.id, label: check.label, group: check.group, at: started }
  let timer
  try {
    const ctl = new AbortController()
    timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    const res = await fetchFn(check.url, { signal: ctl.signal, headers: { 'user-agent': 'NexoraSentinel/1.0', 'cache-control': 'no-cache' }, redirect: 'follow' })
    const ms = now() - started
    const out = { ...base, ms, status: res.status }
    if (check.kind === 'reachable') {
      // 200/401/403/404 all prove the service answers; 5xx or no answer does not.
      return res.status < 500 ? { ...out, ok: true, slow: ms > SLOW_MS } : { ...out, ok: false, error: `HTTP ${res.status}` }
    }
    if (!res.ok) return { ...out, ok: false, error: `HTTP ${res.status}` }
    if (check.kind === 'page') {
      const text = await res.text()
      if (check.mustContain && !text.includes(check.mustContain)) return { ...out, ok: false, error: 'Page loaded but its content is missing' }
      return { ...out, ok: true, slow: ms > SLOW_MS }
    }
    const body = await res.json()
    const value = body?.[check.field]
    const good = check.nonEmpty
      ? (Array.isArray(value) ? value.length > 0 : Boolean(value))
      : check.okValues.includes(value)
    return good ? { ...out, ok: true, slow: ms > SLOW_MS } : { ...out, ok: false, error: `Unexpected answer (${check.field}=${JSON.stringify(value)})` }
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    return { ...base, ms: now() - started, ok: false, error: aborted ? `No answer within ${TIMEOUT_MS / 1000}s` : String(error?.message || error).slice(0, 160) }
  } finally {
    clearTimeout(timer)
  }
}

export async function runAllChecks(checks, fetchFn = fetch, now = () => Date.now()) {
  return Promise.all(checks.map((c) => runCheck(c, fetchFn, now)))
}
