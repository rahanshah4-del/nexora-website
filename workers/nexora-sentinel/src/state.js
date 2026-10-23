/**
 * Turns raw check results into incidents. Pure: previous state + results in,
 * new state + events out. An incident opens only after OPEN_AFTER consecutive
 * failures (one blip is not an outage), is reminded every REMIND_MS while it
 * lasts, and closes on the first success.
 */
export const OPEN_AFTER = 2
export const REMIND_MS = 6 * 3600 * 1000
export const HISTORY_MAX = 30

export function emptyState() {
  return { checks: {}, incidents: [], runs: 0, lastRunAt: 0 }
}

export function applyResults(prev, results, now = Date.now()) {
  const state = { ...emptyState(), ...prev, checks: { ...(prev?.checks || {}) }, incidents: [...(prev?.incidents || [])] }
  const events = []
  for (const r of results) {
    const old = state.checks[r.id] || { fails: 0, history: [] }
    const history = [...(old.history || []), r.ok ? 1 : 0].slice(-HISTORY_MAX)
    const cur = {
      id: r.id, label: r.label, group: r.group, ok: r.ok, slow: Boolean(r.slow), ms: r.ms, status: r.status || 0,
      error: r.ok ? '' : r.error || 'Failed', lastCheckedAt: now,
      lastOkAt: r.ok ? now : old.lastOkAt || 0,
      fails: r.ok ? 0 : (old.fails || 0) + 1,
      history,
      incidentId: old.incidentId || '',
    }
    if (!r.ok && cur.fails >= OPEN_AFTER && !cur.incidentId) {
      const incident = { id: `${r.id}-${now}`, checkId: r.id, label: r.label, group: r.group, openedAt: now, lastError: cur.error, lastNotifiedAt: now, fixes: [], resolvedAt: 0 }
      state.incidents.unshift(incident)
      cur.incidentId = incident.id
      events.push({ type: 'opened', incident })
    } else if (!r.ok && cur.incidentId) {
      const incident = state.incidents.find((i) => i.id === cur.incidentId)
      if (incident) {
        incident.lastError = cur.error
        if (now - incident.lastNotifiedAt >= REMIND_MS) {
          incident.lastNotifiedAt = now
          events.push({ type: 'reminder', incident })
        }
      }
    } else if (r.ok && cur.incidentId) {
      const incident = state.incidents.find((i) => i.id === cur.incidentId)
      if (incident) {
        incident.resolvedAt = now
        events.push({ type: 'resolved', incident })
      }
      cur.incidentId = ''
    }
    state.checks[r.id] = cur
  }
  state.incidents = state.incidents.slice(0, 40)
  state.runs = (state.runs || 0) + 1
  state.lastRunAt = now
  return { state, events }
}

export function overallStatus(state) {
  const checks = Object.values(state.checks || {})
  if (!checks.length) return 'unknown'
  if (checks.some((c) => c.incidentId)) return 'down'
  if (checks.some((c) => !c.ok || c.slow)) return 'degraded'
  return 'healthy'
}
