/**
 * Find the Nexora customer behind an inbox sender so support sees which service/plan they use.
 * Read-only. `summarizeCustomer` is pure (tested); `findCustomerByEmail` reads Firestore.
 */
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { moduleLabel } from './moduleRegistry.js'

const text = (v) => String(v ?? '').trim()

function toDate(value) {
  if (!value) return null
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value?.seconds ? value.seconds * 1000 : value)
  return Number.isNaN(date.getTime()) ? null : date
}

const pretty = (v) => text(v).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Plain, display-ready summary from a workspace doc and (optionally) its user doc. */
export function summarizeCustomer(workspace = {}, user = {}) {
  const type = text(workspace.primaryBusinessType || workspace.businessType || user.primaryBusinessType || user.businessType || workspace.selectedBusinessType)
  const allowed = Array.isArray(workspace.moduleAccess?.allowed) ? workspace.moduleAccess.allowed : (Array.isArray(workspace.enabledModules) ? workspace.enabledModules : [])
  const modules = [...new Set([type, ...allowed].filter(Boolean))].map((m) => { try { return moduleLabel(m) } catch { return pretty(m) } })
  const trial = toDate(workspace.trialEndsAt)
  const renewal = toDate(workspace.nextBillingDate || workspace.subscriptionExpiresAt)
  return {
    workspaceId: text(workspace.id),
    company: text(workspace.companyName || workspace.clientName || workspace.name || user.companyName),
    owner: text(workspace.contactPerson || workspace.ownerName || user.displayName || user.name),
    phone: text(workspace.phone || workspace.phoneNumber || user.phone),
    service: type ? (() => { try { return moduleLabel(type) } catch { return pretty(type) } })() : '',
    modules,
    plan: pretty(workspace.plan || workspace.selectedPlan || workspace.planId),
    status: pretty(workspace.subscriptionStatus || workspace.planStatus || workspace.status || workspace.accountStatus) || 'Active',
    trialEnds: trial ? trial.toLocaleDateString() : '',
    renewal: renewal ? renewal.toLocaleDateString() : '',
    joined: (toDate(workspace.createdAt || user.createdAt))?.toLocaleDateString() || '',
    lastLogin: (toDate(user.lastLoginAt || workspace.lastLoginAt || workspace.lastActiveAt))?.toLocaleString() || '',
  }
}

const cache = new Map()

/** Customer for this email address, or null when the sender is not a registered client. */
export async function findCustomerByEmail(address) {
  const email = text(address).toLowerCase()
  if (!email || !db) return null
  if (cache.has(email)) return cache.get(email)
  const run = async (name, field) => {
    try { return (await getDocs(query(collection(db, name), where(field, '==', email), limit(1)))).docs[0] || null } catch { return null }
  }
  const [a, b, c, userDoc] = await Promise.all([run('workspaces', 'ownerEmail'), run('workspaces', 'email'), run('workspaces', 'adminEmail'), run('users', 'email')])
  const ws = a || b || c
  let result = null
  if (ws || userDoc) {
    const user = userDoc ? { id: userDoc.id, ...userDoc.data() } : {}
    let workspace = ws ? { id: ws.id, ...ws.data() } : null
    if (!workspace) {
      const id = text(user.workspaceId || user.tenantId)
      if (id) {
        try {
          const snap = await getDocs(query(collection(db, 'workspaces'), where('__name__', '==', id), limit(1)))
          if (snap.docs[0]) workspace = { id: snap.docs[0].id, ...snap.docs[0].data() }
        } catch { /* user without a readable workspace */ }
      }
    }
    result = { email, ...summarizeCustomer(workspace || {}, user), registered: true }
  }
  cache.set(email, result)
  return result
}
