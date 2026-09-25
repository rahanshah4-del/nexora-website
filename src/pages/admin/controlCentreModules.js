/**
 * Pure module helpers for the admin Control Centre (chart, labels,
 * announcement targeting, System Health). No Firebase or React imports:
 * tested directly in tests/control-centre-modules.test.mjs.
 */
import { MODULE_REGISTRY, normalizeBusinessType, resolveModuleStrict } from '../../lib/moduleRegistry.js'

export const UNRECOGNISED_MODULE_KEY = 'unrecognised'
export const UNRECOGNISED_MODULE_LABEL = 'Unrecognised'
export const UNRECOGNISED_MODULE_COLOR = '#94a3b8'

const DEFAULT_MODULE = MODULE_REGISTRY.find((module) => module.type === 'General CRM')

function rawValue(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/**
 * Resolve any stored business-type value to a registry module. Explicit
 * values (type, id, label, legacy type, alias) resolve strictly; anything else
 * falls back to the app's normalizeBusinessType() — the module the client app
 * would actually run — and is marked `recognised: false`.
 */
export function resolveAdminModule(value) {
  const raw = rawValue(value)
  const strict = raw ? resolveModuleStrict(raw) : null
  const fallbackType = strict ? '' : normalizeBusinessType(raw)
  const module = strict || MODULE_REGISTRY.find((item) => item.type === fallbackType) || DEFAULT_MODULE
  return {
    type: module.type,
    label: module.label,
    color: module.color,
    raw,
    recognised: Boolean(strict),
  }
}

/** Display label for a stored business-type value; '-' when nothing is stored. */
export function adminModuleLabel(value) {
  return rawValue(value) ? resolveAdminModule(value).label : '-'
}

/** Announcement "selected businessType" dropdown: one option per registry module. */
export function announcementModuleOptions() {
  return MODULE_REGISTRY.map((module) => ({ value: module.type, label: module.label }))
}

/**
 * Whether a workspace's business type matches an announcement's target. The
 * stored target keeps its existing format ('General CRM', 'Restaurant POS', …)
 * and both sides are resolved through the registry, so a Nexora Sales Hub
 * announcement no longer reaches PharmaFlow clients.
 */
export function announcementTargetsModule(announcementBusinessType, workspaceBusinessType) {
  return resolveAdminModule(announcementBusinessType).type === resolveAdminModule(workspaceBusinessType).type
}

/**
 * "Clients by Module" rows: one per registry module (zeros kept), grouped by
 * the resolved registry type, plus an "Unrecognised" row only when some
 * values (including empty ones) did not resolve strictly.
 */
export function buildModuleBreakdown(values = []) {
  const rows = MODULE_REGISTRY.map((module) => ({
    key: module.type,
    type: module.type,
    name: module.label,
    color: module.color,
    value: 0,
  }))
  const byType = new Map(rows.map((row) => [row.type, row]))
  const unrecognised = new Map()
  values.forEach((value) => {
    const resolved = resolveAdminModule(value)
    if (resolved.recognised) {
      byType.get(resolved.type).value += 1
      return
    }
    const key = resolved.raw || '(not set)'
    unrecognised.set(key, (unrecognised.get(key) || 0) + 1)
  })
  if (!unrecognised.size) return rows
  return [
    ...rows,
    {
      key: UNRECOGNISED_MODULE_KEY,
      type: '',
      name: UNRECOGNISED_MODULE_LABEL,
      color: UNRECOGNISED_MODULE_COLOR,
      value: [...unrecognised.values()].reduce((sum, count) => sum + count, 0),
      rawValues: [...unrecognised.entries()].map(([raw, count]) => ({ raw, count })),
    },
  ]
}

/**
 * Registry type for a stored `selectedWorkspace` / workspace id value
 * (e.g. 'medical-store-pos' -> 'PharmaFlow'); '' when empty.
 */
export function businessTypeForWorkspaceId(value) {
  const raw = rawValue(value)
  if (!raw) return ''
  const byId = MODULE_REGISTRY.find((module) => module.id === raw.toLowerCase())
  return byId ? byId.type : resolveAdminModule(raw).type
}

export const ALL_MODULES_FILTER = 'all'

/** Raw business type stored on a workspace/user record, in the order the Control Centre reads it ('' if none). */
export function storedBusinessType(row = {}) {
  return row.primaryBusinessType || row.selectedBusinessType || row.currentBusinessType || row.businessType || row.module || ''
}

/**
 * Filter key for a stored value, matching the "Clients by Module" chart:
 * the registry type when recognised, else UNRECOGNISED_MODULE_KEY.
 */
export function moduleKeyForValue(value) {
  const resolved = resolveAdminModule(value)
  return resolved.recognised ? resolved.type : UNRECOGNISED_MODULE_KEY
}

function recognisedModule(value) {
  const resolved = resolveAdminModule(value)
  return resolved.recognised ? { type: resolved.type, label: resolved.label, color: resolved.color } : null
}

function lookupWorkspace(workspacesById, id) {
  if (!id || !workspacesById) return null
  return (workspacesById instanceof Map ? workspacesById.get(id) : workspacesById[id]) || null
}

/**
 * Module behind an upgrade request / transaction row: the row's own
 * business-type (or plan) fields first, else the workspace it belongs to.
 * Returns { type, label, color } or null when nothing resolves.
 */
export function moduleForRow(row = {}, workspacesById) {
  const ownValues = [
    row.businessType, row.selectedBusinessType, row.primaryBusinessType, row.currentBusinessType, row.module,
    row.plan, row.requestedPlan, row.selectedPlan, row.planName,
  ]
  for (const value of ownValues) {
    const module = recognisedModule(value)
    if (module) return module
  }
  const ids = [row.workspaceId, row.userId, row.uid, row.ownerId].filter(Boolean)
  for (const id of ids) {
    const workspace = lookupWorkspace(workspacesById, id)
    const module = workspace ? recognisedModule(storedBusinessType(workspace)) : null
    if (module) return module
  }
  return null
}

/** Rows whose resolved module key equals moduleType; everything for "All modules". */
export function filterByModule(rows = [], moduleType = ALL_MODULES_FILTER, resolveFn = () => '') {
  if (!moduleType || moduleType === ALL_MODULES_FILTER) return rows
  return rows.filter((row) => resolveFn(row) === moduleType)
}

/** Module dropdown options: All modules, the 8 registry modules, and Unrecognised when needed. */
export function moduleFilterOptions({ includeUnrecognised = false } = {}) {
  return [
    { value: ALL_MODULES_FILTER, label: 'All modules' },
    ...MODULE_REGISTRY.map((module) => ({ value: module.type, label: module.label })),
    ...(includeUnrecognised ? [{ value: UNRECOGNISED_MODULE_KEY, label: UNRECOGNISED_MODULE_LABEL }] : []),
  ]
}
