/**
 * Pure module-access helpers for the admin Client Command Center.
 *
 * Every business type written from Command Center goes through
 * resolveModuleStrict(), so a stored value that is not an explicit registry
 * type/id/label/alias is never rewritten as Nexora Sales Hub.
 *
 * No Firebase or React imports: tested directly in tests/command-center-modules.test.mjs.
 */
import { MODULE_REGISTRY, resolveModuleStrict } from '../../lib/moduleRegistry.js'

export const MODULE_TYPES = Object.freeze(MODULE_REGISTRY.map((module) => module.type))

// Where a client's primary module is read from, in priority order.
const PRIMARY_SOURCES = [
  ['workspace', 'primaryBusinessType'],
  ['workspace', 'businessType'],
  ['owner', 'primaryBusinessType'],
  ['owner', 'businessType'],
]

function rawValue(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Resolve registry types for a list of values, keeping first-seen order and dropping unknown values. */
export function resolveModuleTypes(values = []) {
  const types = []
  values.forEach((value) => {
    const type = resolveModuleStrict(value)?.type
    if (type && !types.includes(type)) types.push(type)
  })
  return types
}

/**
 * Primary module for a client from its workspace and owner user documents.
 * `type` is '' (unknown) when no stored value resolves strictly.
 */
export function resolvePrimaryModule({ workspace, owner } = {}) {
  const docs = { workspace: workspace || {}, owner: owner || {} }
  const storedValues = PRIMARY_SOURCES.map(([docName, field]) => {
    const raw = rawValue(docs[docName][field])
    return { doc: docName, field, raw, type: raw ? resolveModuleStrict(raw)?.type || '' : '' }
  })
  const hit = storedValues.find((entry) => entry.type)
  const firstRaw = storedValues.find((entry) => entry.raw)
  const resolvedTypes = Array.from(new Set(storedValues.map((entry) => entry.type).filter(Boolean)))
  const module = hit ? resolveModuleStrict(hit.type) : null
  return {
    type: module?.type || '',
    label: module?.label || '',
    source: hit ? `${hit.doc}.${hit.field}` : '',
    raw: hit?.raw || firstRaw?.raw || '',
    unknown: !module,
    storedValues,
    unresolved: storedValues.filter((entry) => entry.raw && !entry.type),
    resolvedTypes,
    conflict: resolvedTypes.length > 1,
  }
}

/** Current module access for display: primary module plus extra allowed modules. */
export function moduleAccessState({ workspace, owner } = {}) {
  const primary = resolvePrimaryModule({ workspace, owner })
  const row = { ...(owner || {}), ...(workspace || {}) }
  const storedAllowed = Array.isArray(row.allowedBusinessTypes) ? row.allowedBusinessTypes : []
  const allowed = row.allModulesAccess === true ? [...MODULE_TYPES] : resolveModuleTypes([primary.type, ...storedAllowed])
  return {
    primary: primary.type,
    primaryInfo: primary,
    allowed,
    all: row.allModulesAccess === true || allowed.length === MODULE_TYPES.length,
    special: row.specialModuleAccess === true || allowed.length > 1,
  }
}

export function unknownPrimaryWarning(primary) {
  return primary.raw
    ? `Unknown module value '${primary.raw}' — primary not changed`
    : 'No module value stored — primary not changed'
}

/**
 * Fields written to workspaces/{id} and users/{ownerId} by a module-access
 * save (the caller adds updatedAt/updatedBy/updatedByEmail). When the primary
 * module is unknown, primaryBusinessType is left out so it is never overwritten.
 */
export function buildModuleAccessPayload({ workspace, owner, nextModules = [] } = {}) {
  const primary = resolvePrimaryModule({ workspace, owner })
  const resolved = resolveModuleTypes([primary.type, ...nextModules])
  const allowedBusinessTypes = resolved.length ? resolved : primary.type ? [primary.type] : []
  const payload = {
    ...(primary.type ? { primaryBusinessType: primary.type } : {}),
    allowedBusinessTypes,
    specialModuleAccess: allowedBusinessTypes.length > 1,
    allModulesAccess: allowedBusinessTypes.length === MODULE_TYPES.length,
  }
  return {
    payload,
    primary,
    allowedBusinessTypes,
    warning: primary.type ? '' : unknownPrimaryWarning(primary),
    // Business type stamped on the "Module access updated" notification, so the
    // client app (which filters notifications by business type) can show it.
    notificationBusinessType: primary.type || primary.raw,
  }
}

function ownerIdForWorkspace(workspace = {}) {
  return rawValue(workspace.ownerId || workspace.userId || workspace.uid || workspace.workspaceId || workspace.id)
}

/**
 * Read-only damage check. Lists workspaces whose stored business-type fields
 * (workspace + owner user, primaryBusinessType + businessType) disagree or
 * contain values the registry does not recognise.
 */
export function findModuleMismatches(workspaces = [], users = []) {
  const usersById = new Map()
  users.forEach((user) => {
    ;[user.id, user.uid, user.userId].filter(Boolean).forEach((id) => {
      if (!usersById.has(String(id))) usersById.set(String(id), user)
    })
  })
  return workspaces.map((workspace) => {
    const owner = usersById.get(ownerIdForWorkspace(workspace)) || null
    const primary = resolvePrimaryModule({ workspace, owner })
    const byField = Object.fromEntries(primary.storedValues.map((entry) => [`${entry.doc}.${entry.field}`, entry]))
    const primaryTypes = resolveModuleTypes([byField['workspace.primaryBusinessType'].raw, byField['owner.primaryBusinessType'].raw])
    const businessTypes = resolveModuleTypes([byField['workspace.businessType'].raw, byField['owner.businessType'].raw])
    const issues = []
    const pharmacyLockedToSalesHub = primaryTypes.includes('General CRM') && businessTypes.includes('PharmaFlow')
    if (pharmacyLockedToSalesHub) issues.push('PharmaFlow client locked to Nexora Sales Hub')
    if (primary.conflict) issues.push(`Stored values disagree: ${primary.resolvedTypes.join(' vs ')}`)
    primary.unresolved.forEach((entry) => issues.push(`Unknown ${entry.doc}.${entry.field} '${entry.raw}'`))
    if (!issues.length) return null
    return {
      workspaceId: rawValue(workspace.workspaceId || workspace.id),
      workspaceName: rawValue(workspace.companyName || workspace.workspaceName || workspace.businessName || workspace.name),
      ownerId: ownerIdForWorkspace(workspace),
      ownerEmail: rawValue(owner?.email || workspace.email || workspace.ownerEmail),
      workspaceBusinessType: byField['workspace.businessType'].raw,
      workspacePrimaryBusinessType: byField['workspace.primaryBusinessType'].raw,
      ownerBusinessType: byField['owner.businessType'].raw,
      ownerPrimaryBusinessType: byField['owner.primaryBusinessType'].raw,
      ownerFound: Boolean(owner),
      pharmacyLockedToSalesHub,
      issues,
    }
  }).filter(Boolean)
    .sort((a, b) => Number(b.pharmacyLockedToSalesHub) - Number(a.pharmacyLockedToSalesHub) || a.workspaceId.localeCompare(b.workspaceId))
}

export const MISMATCH_CSV_COLUMNS = [
  ['workspaceId', 'Workspace ID'],
  ['workspaceName', 'Workspace name'],
  ['ownerEmail', 'Owner email'],
  ['ownerId', 'Owner user ID'],
  ['workspaceBusinessType', 'workspace.businessType'],
  ['workspacePrimaryBusinessType', 'workspace.primaryBusinessType'],
  ['ownerBusinessType', 'owner.businessType'],
  ['ownerPrimaryBusinessType', 'owner.primaryBusinessType'],
  ['issues', 'Issues'],
]

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('; ') : rawValue(value)
  // Neutralise spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

export function mismatchesToCsv(rows = []) {
  const header = MISMATCH_CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',')
  const lines = rows.map((row) => MISMATCH_CSV_COLUMNS.map(([key]) => csvCell(row[key])).join(','))
  return [header, ...lines].join('\n')
}
