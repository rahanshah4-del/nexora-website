import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { FOLLOWUP_STATUSES, PRIORITIES, normalizePhone } from '../lib/whatsappManual.js'

const COLLECTION = 'whatsappFollowUps'

function normalizeStatus(value) {
  const match = FOLLOWUP_STATUSES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'Pending'
}

function normalizePriority(value) {
  const match = PRIORITIES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'Medium'
}

function normalizeFollowUp(record) {
  return {
    id: record.id,
    title: record.title || 'Follow-up',
    contactName: record.contactName || '',
    phone: record.phone || '',
    linkType: record.linkType || '',
    linkId: record.linkId || '',
    dueDate: record.dueDate || '',
    priority: normalizePriority(record.priority),
    status: normalizeStatus(record.status),
    assignedTo: record.assignedTo || '',
    notes: record.notes || '',
    completedAt: record.completedAt || '',
    createdBy: record.createdBy || record.userId || '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

function sanitizeFollowUp(payload) {
  return {
    title: String(payload.title || '').trim(),
    contactName: String(payload.contactName || '').trim(),
    phone: normalizePhone(payload.phone),
    linkType: String(payload.linkType || '').trim(),
    linkId: String(payload.linkId || '').trim(),
    dueDate: String(payload.dueDate || '').trim(),
    priority: normalizePriority(payload.priority),
    status: normalizeStatus(payload.status),
    assignedTo: String(payload.assignedTo || '').trim(),
    notes: String(payload.notes || '').trim(),
  }
}

export function useWhatsappFollowUps({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setFollowUps([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setFollowUps([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setFollowUps([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })

    const unsub = subscribeUserCollection(
      workspaceId,
      COLLECTION,
      (rows) => {
        setFollowUps((Array.isArray(rows) ? rows : []).map(normalizeFollowUp))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load follow-ups.'))
        setFollowUps([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

  return useMemo(
    () => ({
      followUps,
      loading,
      source,
      error,
      async createFollowUp(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeFollowUp(payload)
        if (!record.title) return { ok: false, error: 'Follow-up title is required' }
        if (!record.dueDate) return { ok: false, error: 'Due date is required' }
        try {
          const ref = await createUserDoc(workspaceId, COLLECTION, { ...record, createdBy: userId }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp follow-up created',
            module: 'WhatsApp Follow-Ups',
            description: `${record.title}${record.contactName ? ` for ${record.contactName}` : ''} scheduled for ${record.dueDate}.`,
            targetId: ref.id,
            targetName: record.title,
            metadata: { priority: record.priority, dueDate: record.dueDate },
          })
          return { ok: true, id: ref.id }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create follow-up.') }
        }
      },
      async updateFollowUp(id, payload) {
        if (!id) return { ok: false, error: 'Follow-up not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeFollowUp(payload)
        if (!record.title) return { ok: false, error: 'Follow-up title is required' }
        if (!record.dueDate) return { ok: false, error: 'Due date is required' }
        try {
          await patchUserDoc(workspaceId, COLLECTION, id, record, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp follow-up updated',
            module: 'WhatsApp Follow-Ups',
            description: `${record.title} was updated.`,
            targetId: id,
            targetName: record.title,
            metadata: { priority: record.priority, status: record.status },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update follow-up.') }
        }
      },
      async setStatus(followUp, status) {
        if (!followUp?.id) return { ok: false, error: 'Follow-up not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const nextStatus = normalizeStatus(status)
        const patch = { status: nextStatus }
        if (nextStatus === 'Completed' && !followUp.completedAt) {
          patch.completedAt = new Date().toISOString().slice(0, 10)
        }
        try {
          await patchUserDoc(workspaceId, COLLECTION, followUp.id, patch, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: `WhatsApp follow-up ${nextStatus.toLowerCase()}`,
            module: 'WhatsApp Follow-Ups',
            description: `${followUp.title || 'Follow-up'} marked ${nextStatus}.`,
            targetId: followUp.id,
            targetName: followUp.title || 'Follow-up',
            metadata: { status: nextStatus },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update follow-up.') }
        }
      },
      async deleteFollowUp(followUp) {
        if (!followUp?.id) return { ok: false, error: 'Follow-up not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, COLLECTION, followUp.id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp follow-up deleted',
            module: 'WhatsApp Follow-Ups',
            description: `${followUp.title || 'Follow-up'} was removed.`,
            targetId: followUp.id,
            targetName: followUp.title || 'Follow-up',
            metadata: {},
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete follow-up.') }
        }
      },
    }),
    [followUps, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
