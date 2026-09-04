import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { workspaceCollectionPath } from './firestore.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { enqueueBackgroundJob } from './backgroundJobs.js'

function cleanDocId(value) {
  const safe = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return safe.slice(0, 140) || `notification-${Date.now()}`
}

function uniqueValues(values = []) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function cleanObject(value) {
  if (Array.isArray(value)) return value.map(cleanObject).filter((item) => item !== undefined)
  if (value && typeof value === 'object' && ('_methodName' in value || String(value.constructor?.name || '').includes('FieldValue'))) {
    return value
  }
  if (value && typeof value === 'object' && typeof value.toDate !== 'function' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, cleanObject(entryValue)]),
    )
  }
  return value === undefined ? null : value
}

export function workspaceNotificationTargets(...groups) {
  return uniqueValues(groups.flat().filter(Boolean))
}

export async function createWorkspaceNotification({
  workspaceId,
  userId,
  userIds,
  businessType,
  title,
  message,
  type = 'System',
  priority = 'medium',
  relatedId = '',
  route = '',
  metadata = {},
  createdBy = '',
  createdByEmail = '',
  dedupeKey = '',
  // Every call site across the app (~50 of them — invoices, customers,
  // expenses, purchases, support tickets, payroll, approvals, ...) relies on
  // this default and none opt into queue:true explicitly. Routing every
  // notification through the Cloudflare background-jobs worker first meant
  // that whenever that worker's queue wasn't being consumed, every one of
  // these notifications silently never got created — createWorkspaceNotification
  // still returned {ok:true} because the *enqueue request* succeeded, not the
  // actual write. Direct Firestore writes below are simple, fast and don't
  // depend on an external worker at all, so that's the default now.
  queue = false,
} = {}) {
  if (!db || !workspaceId || !title) return { ok: false, skipped: true }

  const targetUserIds = workspaceNotificationTargets(userIds?.length ? userIds : userId)
  if (!targetUserIds.length) return { ok: false, skipped: true }

  try {
    if (queue && createdBy) {
      const queued = await enqueueBackgroundJob({
        workspaceId,
        userId: createdBy,
        businessType,
        createdByEmail,
        type: 'notification.generate',
        label: title,
        route,
        priority,
        payload: {
          userId,
          userIds: targetUserIds,
          businessType,
          title,
          message,
          type,
          priority,
          relatedId,
          route,
          metadata,
          createdBy,
          createdByEmail,
          dedupeKey,
        },
        metadata: { total: targetUserIds.length },
      })
      if (queued.ok) return { ok: true, queued: true, jobId: queued.jobId, count: targetUserIds.length }
    }

    const batch = writeBatch(db)
    const ref = collection(db, workspaceCollectionPath(workspaceId, 'notifications'))
    const normalizedBusinessType = normalizeBusinessType(businessType)
    targetUserIds.forEach((targetUserId) => {
      const notificationRef = dedupeKey
        ? doc(db, workspaceCollectionPath(workspaceId, 'notifications'), cleanDocId(`${dedupeKey}-${targetUserId}`))
        : doc(ref)
      batch.set(notificationRef, cleanObject({
        workspaceId,
        ownerId: workspaceId,
        userId: targetUserId,
        businessType: normalizedBusinessType,
        type,
        title,
        message: message || title,
        priority,
        relatedId,
        route,
        metadata,
        read: false,
        createdBy,
        createdByEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }), { merge: true })
    })
    await batch.commit()
    return { ok: true, count: targetUserIds.length }
  } catch (error) {
    console.warn('[Notifications] create workspace notification failed', {
      workspaceId,
      title,
      code: error?.code || '',
      message: error?.message || '',
    })
    return { ok: false, error }
  }
}

export async function upsertWorkspaceNotification(payload = {}) {
  return createWorkspaceNotification(payload)
}
