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
