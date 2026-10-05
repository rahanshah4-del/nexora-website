/**
 * Client onboarding journey for the admin Control Centre (pure: no Firebase or
 * React). Answers "did this client pick a module, and how far did setup get?"
 * without ever inventing a module: a record with no stored module is reported
 * as "not selected yet", never as "General CRM".
 */
import { resolveAdminModule, storedBusinessType } from './controlCentreModules.js'

export const MODULE_STATE = Object.freeze({
  SELECTED: 'selected',
  NOT_SELECTED: 'not_selected',
  UNRECOGNISED: 'unrecognised',
})

export const STAGE = Object.freeze({
  EMAIL_UNVERIFIED: 'email_unverified',
  NO_MODULE: 'no_module',
  SETUP_PENDING: 'setup_pending',
  COMPLETE: 'complete',
})

export const STAGE_LABELS = Object.freeze({
  [STAGE.EMAIL_UNVERIFIED]: 'Email not verified',
  [STAGE.NO_MODULE]: 'Module not chosen',
  [STAGE.SETUP_PENDING]: 'Module chosen, setup unfinished',
  [STAGE.COMPLETE]: 'Setup complete',
})

export const STAGE_TONES = Object.freeze({
  [STAGE.EMAIL_UNVERIFIED]: 'rose',
  [STAGE.NO_MODULE]: 'amber',
  [STAGE.SETUP_PENDING]: 'sky',
  [STAGE.COMPLETE]: 'emerald',
})

const flag = (...values) => values.some((value) => value === true)

/** Journey for one client from its workspace record and/or user record. */
export function clientJourney(workspace = {}, user = {}) {
  const raw = String(storedBusinessType(workspace) || storedBusinessType(user) || '').trim()
  const resolved = raw ? resolveAdminModule(raw) : null
  const moduleState = !raw ? MODULE_STATE.NOT_SELECTED : resolved.recognised ? MODULE_STATE.SELECTED : MODULE_STATE.UNRECOGNISED
  const emailVerified = flag(user.emailVerified, workspace.emailVerified)
  const onboardingCompleted = flag(workspace.onboardingCompleted, user.onboardingCompleted)
  const hasModule = moduleState !== MODULE_STATE.NOT_SELECTED

  let stage
  if (!hasModule && !emailVerified) stage = STAGE.EMAIL_UNVERIFIED
  else if (!hasModule) stage = STAGE.NO_MODULE
  else if (!onboardingCompleted) stage = STAGE.SETUP_PENDING
  else stage = STAGE.COMPLETE

  return {
    moduleState,
    moduleType: resolved?.type || '',
    moduleLabel: resolved ? resolved.label : '',
    moduleColor: resolved?.color || '',
    rawModule: raw,
    emailVerified,
    onboardingCompleted,
    stage,
    stageLabel: STAGE_LABELS[stage],
    tone: STAGE_TONES[stage],
  }
}

function idsOf(row = {}) {
  return [row.workspaceId, row.currentWorkspaceId, row.ownerId, row.userId, row.uid, row.id].filter(Boolean)
}

/**
 * One journey row per person: every user (joined to its workspace by
 * workspaceId / uid), plus workspaces that have no user record loaded.
 */
export function buildClientJourneys(users = [], workspaces = []) {
  const byId = new Map()
  workspaces.forEach((workspace) => idsOf(workspace).forEach((id) => { if (!byId.has(id)) byId.set(id, workspace) }))
  const usedWorkspaces = new Set()
  const rows = users.map((user) => {
    const workspace = idsOf(user).map((id) => byId.get(id)).find(Boolean) || null
    if (workspace) usedWorkspaces.add(workspace)
    return { key: user.uid || user.id, user, workspace, ...clientJourney(workspace || {}, user) }
  })
  workspaces.forEach((workspace) => {
    if (usedWorkspaces.has(workspace)) return
    rows.push({ key: workspace.workspaceId || workspace.id, user: null, workspace, ...clientJourney(workspace, {}) })
  })
  return rows
}

/** Counts per stage / module state, for the Clients KPI cards. */
export function journeySummary(journeys = []) {
  const summary = { total: journeys.length, noModule: 0, setupPending: 0, complete: 0, emailUnverified: 0, unrecognised: 0 }
  journeys.forEach((row) => {
    if (row.stage === STAGE.NO_MODULE) summary.noModule += 1
    if (row.stage === STAGE.EMAIL_UNVERIFIED) summary.emailUnverified += 1
    if (row.stage === STAGE.SETUP_PENDING) summary.setupPending += 1
    if (row.stage === STAGE.COMPLETE) summary.complete += 1
    if (row.moduleState === MODULE_STATE.UNRECOGNISED) summary.unrecognised += 1
  })
  return summary
}

/**
 * Accounts that signed up but have no workspace document yet (they stopped
 * before picking a module). The Clients tab lists them as their own rows so a
 * new client is visible from the moment the account exists.
 *
 * Skipped: platform admins, and staff whose profile points at another
 * workspace (they belong to that workspace, not a client of their own).
 */
export function signupOnlyRows(journeys = [], { isAdminUid = () => false } = {}) {
  return journeys
    .filter((row) => !row.workspace && row.user)
    .filter((row) => {
      const user = row.user
      const uid = user.uid || user.id
      if (!uid || isAdminUid(uid)) return false
      const linked = user.workspaceId || user.currentWorkspaceId || ''
      return !linked || linked === uid
    })
    .map((row) => {
      const user = row.user
      const uid = user.uid || user.id
      return {
        id: uid,
        uid,
        ownerId: uid,
        workspaceId: '',
        email: user.email || '',
        companyName: user.companyName || user.businessName || '',
        displayName: user.displayName || user.fullName || user.name || '',
        phone: user.phone || user.phoneNumber || '',
        createdAt: user.createdAt || null,
        lastActiveAt: user.lastActiveAt || user.lastLoginAt || null,
        signupOnly: true,
        journey: row,
      }
    })
}
