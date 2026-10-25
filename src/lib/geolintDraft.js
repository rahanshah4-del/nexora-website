/**
 * The order wizard's draft: what the client already typed and what we already read from their site.
 * Saved in the browser (per account) so Back, a refresh or a closed tab never sends them to step 1 again.
 * Pure helpers plus a tiny storage wrapper; nothing here needs React, so it can be tested in plain Node.
 */

export const DRAFT_PREFIX = 'geolint:fix-draft:'
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const WIZARD_STEPS = Object.freeze(['site', 'market', 'business', 'competitors', 'scope', 'details', 'plan'])

export const emptyScore = Object.freeze({ status: 'idle', scorePercent: null, auditId: null, error: '' })

export const emptyForm = Object.freeze({ name: '', whatsapp: '', platform: '', accessMethod: 'invite-admin-user', accessNotes: '', notes: '', authorized: false, market: 'Canada', language: 'English', business: '', audience: '', fixOff: [] })

const draftKey = (uid) => `${DRAFT_PREFIX}${String(uid || 'anonymous')}`

/** A score that was still being measured when the page closed cannot resume; the engine audits it for the client instead. */
const settledScore = (score) => (score && score.status === 'done' ? { status: 'done', scorePercent: score.scorePercent ?? null, auditId: score.auditId ?? null, error: '' } : { ...emptyScore })

/** The ids of the fixes the client switched off; anything else in storage is ignored. */
const cleanOff = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string').slice(0, 60).map((v) => v.slice(0, 80)) : [])

/** Keeps only what is worth restoring. Competitors that never finished reading are dropped. */
export function serializeDraft({ step, site, rivals, form, plan }, now = Date.now()) {
  return {
    v: 1,
    savedAt: now,
    step: WIZARD_STEPS.includes(step) ? step : 'site',
    site: { input: String(site?.input || ''), profile: site?.profile || null, score: settledScore(site?.score) },
    rivals: (Array.isArray(rivals) ? rivals : []).filter((r) => r && r.profile).map((r) => ({ key: r.key, host: r.host || r.profile.host || '', profile: r.profile, error: '', score: settledScore(r.score) })),
    form: { ...emptyForm, ...(form || {}), fixOff: cleanOff(form?.fixOff) },
    plan: plan === 'seo' ? 'seo' : 'geo',
  }
}

/** Checks a stored value and turns it back into wizard state, or returns null when it is old, broken or from another version. */
export function parseDraft(raw, now = Date.now()) {
  let data = raw
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw) } catch { return null }
  }
  if (!data || typeof data !== 'object' || data.v !== 1) return null
  if (!Number.isFinite(data.savedAt) || now - data.savedAt > DRAFT_MAX_AGE_MS) return null
  const profile = data.site?.profile
  if (!profile || typeof profile.url !== 'string' || !profile.url) return null
  const rivals = (Array.isArray(data.rivals) ? data.rivals : []).filter((r) => r?.profile?.url).slice(0, 3)
  return {
    savedAt: data.savedAt,
    step: WIZARD_STEPS.includes(data.step) ? data.step : 'site',
    site: { input: String(data.site.input || profile.host || ''), status: 'ready', error: '', profile, score: settledScore(data.site.score) },
    rivals: rivals.map((r) => ({ key: String(r.key || r.profile.host), host: r.host || r.profile.host || '', profile: r.profile, error: '', score: settledScore(r.score) })),
    form: { ...emptyForm, ...(data.form && typeof data.form === 'object' ? data.form : {}), authorized: Boolean(data.form?.authorized), fixOff: cleanOff(data.form?.fixOff) },
    plan: data.plan === 'seo' ? 'seo' : 'geo',
  }
}

/** A draft only counts as progress once the site has been read; before that there is nothing to lose. */
export const draftHasProgress = (draft) => Boolean(draft?.site?.profile)

export function loadDraft(uid, storage = typeof window === 'undefined' ? null : window.localStorage) {
  try {
    return storage ? parseDraft(storage.getItem(draftKey(uid))) : null
  } catch {
    return null
  }
}

export function saveDraft(uid, state, storage = typeof window === 'undefined' ? null : window.localStorage) {
  try {
    if (!storage) return false
    if (!state?.site?.profile) { storage.removeItem(draftKey(uid)); return false }
    storage.setItem(draftKey(uid), JSON.stringify(serializeDraft(state)))
    return true
  } catch {
    return false
  }
}

export function clearDraft(uid, storage = typeof window === 'undefined' ? null : window.localStorage) {
  try { storage?.removeItem(draftKey(uid)) } catch { /* storage can be blocked; nothing to clear then */ }
}

/**
 * Which step the page may show. A step is only reachable when the ones before it are done, so a stale
 * or hand-typed ?step= never shows an empty step. `valid` tells whether the details form passes.
 */
export function reachableStep(wanted, { hasSite, detailsValid }) {
  const index = Math.max(0, WIZARD_STEPS.indexOf(wanted))
  if (index === 0 || !hasSite) return 'site'
  if (WIZARD_STEPS[index] === 'plan' && !detailsValid) return 'details'
  return WIZARD_STEPS[index]
}
