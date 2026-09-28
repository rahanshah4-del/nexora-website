#!/usr/bin/env node
/**
 * READ-ONLY: lists users/{uid} and workspaces/{id} docs whose billing or
 * entitlement fields look self-granted — a paid plan, an active subscription,
 * multi-module access or an over-long trial — with no platformPayments /
 * approved upgradeRequests / platformSubscriptions record behind it.
 *
 * It never writes. Run it with credentials that can read the project:
 *
 *   cd functions && npm ci && cd ..
 *   gcloud auth application-default login        # or GOOGLE_APPLICATION_CREDENTIALS=key.json
 *   node scripts/audit-suspicious-billing.mjs [--project nexora-business-suite] [--csv]
 *
 * firebase-admin is loaded from functions/node_modules (the site package does
 * not depend on it).
 */
import { createRequire } from 'node:module'

const require = createRequire(new URL('../functions/package.json', import.meta.url))
const admin = require('firebase-admin')

const args = process.argv.slice(2)
const projectId = args.includes('--project') ? args[args.indexOf('--project') + 1] : 'nexora-business-suite'
const asCsv = args.includes('--csv')

// Same list as firestore.rules isAdmin() / functions/adminUids.js.
const { ADMIN_UIDS } = await import(new URL('../functions/adminUids.js', import.meta.url))

const TRIAL_PLANS = new Set(['basic', 'free', 'trial', ''])
const PAID_STATUSES = new Set(['active', 'paid', 'approved', 'current'])
const MAX_TRIAL_DAYS = 31
const DAY = 86400000

admin.initializeApp({ projectId, credential: admin.credential.applicationDefault() })
const db = admin.firestore()

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function lower(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function all(name) {
  const rows = []
  let last = null
  for (;;) {
    let q = db.collection(name).orderBy(admin.firestore.FieldPath.documentId()).limit(500)
    if (last) q = q.startAfter(last)
    const snap = await q.get()
    snap.docs.forEach((d) => rows.push({ id: d.id, ...d.data() }))
    if (snap.size < 500) return rows
    last = snap.docs[snap.docs.length - 1]
  }
}

function reasons(row) {
  const out = []
  const now = Date.now()
  const plan = lower(row.plan)
  const status = lower(row.subscriptionStatus || row.planStatus)
  if (!TRIAL_PLANS.has(plan)) out.push(`plan=${row.plan}`)
  if (PAID_STATUSES.has(status)) out.push(`status=${status}`)
  if (row.allModulesAccess === true) out.push('allModulesAccess')
  if (row.specialModuleAccess === true) out.push('specialModuleAccess')
  if (Array.isArray(row.allowedBusinessTypes) && row.allowedBusinessTypes.length > 1) out.push(`allowedBusinessTypes=${row.allowedBusinessTypes.length}`)
  if (row.isAdmin === true) out.push('isAdmin')
  const created = toDate(row.createdAt)
  const trialStart = toDate(row.trialStartAt || row.trialStartedAt)
  const trialEnd = toDate(row.trialEndsAt)
  const base = trialStart || created
  if (trialEnd && base && trialEnd.getTime() - base.getTime() > MAX_TRIAL_DAYS * DAY) out.push(`trial=${Math.round((trialEnd - base) / DAY)}d`)
  if (trialEnd && !base && trialEnd.getTime() - now > MAX_TRIAL_DAYS * DAY) out.push('trialEndsAt far ahead, no start/created date')
  if (created && created.getTime() > now + DAY) out.push('createdAt in future')
  if (trialStart && trialStart.getTime() > now + DAY) out.push('trialStartAt in future')
  return out
}

const [users, workspaces, payments, upgrades, subscriptions] = await Promise.all([
  all('users'), all('workspaces'), all('platformPayments'), all('upgradeRequests'), all('platformSubscriptions'),
])

const paidFor = new Set()
payments.filter((p) => ['paid', 'approved'].includes(lower(p.paymentStatus || p.status))).forEach((p) => {
  if (p.workspaceId) paidFor.add(p.workspaceId)
})
upgrades.filter((u) => lower(u.approvalStatus || u.status) === 'approved').forEach((u) => {
  ;[u.workspaceId, u.userId, u.ownerId].filter(Boolean).forEach((id) => paidFor.add(id))
})
subscriptions.forEach((s) => {
  paidFor.add(s.id)
  if (s.workspaceId) paidFor.add(s.workspaceId)
})

const findings = []
for (const [kind, rows] of [['workspace', workspaces], ['user', users]]) {
  for (const row of rows) {
    if (kind === 'user' && ADMIN_UIDS.includes(row.id)) continue
    const why = reasons(row)
    if (!why.length) continue
    const keyIds = [row.id, row.workspaceId, row.ownerId].filter(Boolean)
    const evidence = keyIds.some((id) => paidFor.has(id))
    const adminTouched = ADMIN_UIDS.includes(row.updatedBy) || ADMIN_UIDS.includes(row.approvedBy)
    findings.push({
      kind,
      id: row.id,
      email: row.email || row.ownerEmail || '',
      plan: row.plan || '',
      status: row.subscriptionStatus || row.planStatus || '',
      trialEndsAt: toDate(row.trialEndsAt)?.toISOString() || '',
      reasons: why.join('; '),
      paymentEvidence: evidence ? 'yes' : 'NO',
      adminUpdated: adminTouched ? 'yes' : 'no',
    })
  }
}

// Most suspicious first: no payment and not last updated by the admin.
findings.sort((a, b) => (a.paymentEvidence === 'NO' ? 0 : 1) - (b.paymentEvidence === 'NO' ? 0 : 1)
  || (a.adminUpdated === 'no' ? 0 : 1) - (b.adminUpdated === 'no' ? 0 : 1))

if (asCsv) {
  const cols = Object.keys(findings[0] || { kind: '' })
  console.log(cols.join(','))
  findings.forEach((f) => console.log(cols.map((c) => `"${String(f[c]).replaceAll('"', '""')}"`).join(',')))
} else {
  console.log(`Scanned ${workspaces.length} workspaces, ${users.length} users, ${payments.length} platformPayments, ${upgrades.length} upgradeRequests, ${subscriptions.length} platformSubscriptions.`)
  console.log(`${findings.length} flagged; ${findings.filter((f) => f.paymentEvidence === 'NO' && f.adminUpdated === 'no').length} with no payment evidence and no admin update.\n`)
  console.table(findings)
}
process.exit(0)
