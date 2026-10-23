/**
 * Turns raw check results into incidents. Pure: previous state + results in,
 * new state + events out (the previous state is never mutated).
 *
 *  - An incident opens after OPEN_AFTER consecutive failures (one blip is not an
 *    outage), or when a check keeps flapping: FLAP_FAILS of the last FLAP_WINDOW
 *    runs failed even though it never failed twice in a row.
 *  - It closes only after RESOLVE_AFTER consecutive successes, so a flapping
 *    service does not send an open/resolved email pair every ten minutes.
 *  - While open it is re-announced every REMIND_MS.
 *  - Open incidents are never pruned; only resolved history is trimmed.
 */
export const OPEN_AFTER = 2
export const RESOLVE_AFTER = 2
export const FLAP_WINDOW = 12
export const FLAP_FAILS = 6
export const REMIND_MS = 6 * 3600 * 1000
export const HISTORY_MAX = 30
export const RESOLVED_KEEP = 30

export function emptyState() {
  return { checks: {}, incidents: [], runs: 0, lastRunAt: 0 }
}

const cloneIncident = (i) => ({ ...i, fixes: [...(i.fixes || [])] })

function isFlapping(history) {
  const recent = history.slice(-FLAP_WINDOW)
  return recent.length >= FLAP_WINDOW && recent.filter((h) => !h).length >= FLAP_FAILS
}

export function applyResults(prev, results, now = Date.now()) {
  const base = { ...emptyState(), ...(prev || {}) }
  const incidents = (base.incidents || []).map(cloneIncident)
  const byId = new Map(incidents.map((i) => [i.id, i]))
  const checks = {}
  const events = []

  for (const r of results) {
    const old = base.checks?.[r.id] || { fails: 0, oks: 0, history: [] }
    const history = [...(old.history || []), r.ok ? 1 : 0].slice(-HISTORY_MAX)
    // An id that points at a pruned or missing incident is treated as no incident.
    let incident = old.incidentId ? byId.get(old.incidentId) : null
    if (incident?.resolvedAt) incident = null
    const cur = {
      id: r.id, label: r.label, group: r.group, ok: r.ok, slow: Boolean(r.slow), ms: r.ms, status: r.status || 0,
      error: r.ok ? '' : r.error || 'Failed', lastCheckedAt: now,
      lastOkAt: r.ok ? now : old.lastOkAt || 0,
      fails: r.ok ? 0 : (old.fails || 0) + 1,
      oks: r.ok ? (old.oks || 0) + 1 : 0,
      history,
      incidentId: incident ? incident.id : '',
    }

    if (!r.ok && !incident && (cur.fails >= OPEN_AFTER || isFlapping(history))) {
      incident = {
        id: `${r.id}-${now}`, checkId: r.id, label: r.label, group: r.group, openedAt: now,
        lastError: cur.error, lastNotifiedAt: now, fixes: [], resolvedAt: 0,
        flapping: cur.fails < OPEN_AFTER, mailed: null,
      }
      incidents.unshift(incident)
      byId.set(incident.id, incident)
      cur.incidentId = incident.id
      events.push({ type: 'opened', incidentId: incident.id })
    } else if (!r.ok && incident) {
      incident.lastError = cur.error
      if (now - (incident.lastNotifiedAt || 0) >= REMIND_MS) {
        incident.lastNotifiedAt = now
        events.push({ type: 'reminder', incidentId: incident.id })
      }
    } else if (r.ok && incident && cur.oks >= RESOLVE_AFTER) {
      incident.resolvedAt = now
      cur.incidentId = ''
      events.push({ type: 'resolved', incidentId: incident.id })
    }
    checks[r.id] = cur
  }

  // Checks that no longer exist close quietly instead of keeping the status "down" forever.
  for (const id of Object.keys(base.checks || {})) {
    if (checks[id]) continue
    const stale = byId.get(base.checks[id].incidentId)
    if (stale && !stale.resolvedAt) { stale.resolvedAt = now; stale.lastError = `${stale.lastError} (check removed)` }
  }

  const open = incidents.filter((i) => !i.resolvedAt)
  const resolved = incidents.filter((i) => i.resolvedAt).sort((a, b) => b.resolvedAt - a.resolvedAt).slice(0, RESOLVED_KEEP)
  const state = {
    ...base,
    checks,
    incidents: [...open, ...resolved].sort((a, b) => b.openedAt - a.openedAt),
    runs: (base.runs || 0) + 1,
    lastRunAt: now,
  }
  // Events carry the incident object of the NEW state, so later edits (fixes, mailed) land in it.
  const finalById = new Map(state.incidents.map((i) => [i.id, i]))
  return { state, events: events.map((e) => ({ type: e.type, incident: finalById.get(e.incidentId) })) }
}

export function overallStatus(state) {
  const checks = Object.values(state.checks || {})
  if (!checks.length) return 'unknown'
  if (checks.some((c) => c.incidentId)) return 'down'
  if (checks.some((c) => !c.ok || c.slow)) return 'degraded'
  return 'healthy'
}

/** Did anything change that is worth a KV write? (KV free plan: 1,000 writes a day.) */
export function needsPersist(prev, state, { events = [], fixes = 0, heartbeatMs = 15 * 60 * 1000 } = {}) {
  if (events.length || fixes) return true
  if (!prev?.lastPersistAt || state.lastRunAt - prev.lastPersistAt >= heartbeatMs) return true
  const before = prev.checks || {}
  for (const c of Object.values(state.checks)) {
    const p = before[c.id]
    if (!p || p.ok !== c.ok || p.slow !== c.slow) return true
    if (!c.ok) return true // keep failure counters exact during trouble
  }
  return Object.keys(before).length !== Object.keys(state.checks).length
}
