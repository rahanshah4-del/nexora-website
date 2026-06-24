import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  maintenanceActualCost,
  maintenanceBalanceDue,
  maintenanceEstimatedCost,
  maintenancePaidAmount,
  normalizeCurrency,
} from '../lib/propertyCalculations.js'

function normalizePriority(value) {
  const match = MAINTENANCE_PRIORITIES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'Medium'
}

function normalizeStatus(value) {
  const match = MAINTENANCE_STATUSES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'Open'
}

function normalizeMaintenance(record) {
  return {
    id: record.id,
    title: record.title || 'Maintenance request',
    category: record.category || 'General',
    propertyId: record.propertyId || '',
    propertyName: record.propertyName || '',
    unit: record.unit || '',
    tenantId: record.tenantId || '',
    tenantName: record.tenantName || '',
    priority: normalizePriority(record.priority),
    status: normalizeStatus(record.status),
    assignedTo: record.assignedTo || '',
    assigneeType: record.assigneeType || 'Staff',
    estimatedCost: maintenanceEstimatedCost(record),
    actualCost: maintenanceActualCost(record),
    paidAmount: maintenancePaidAmount(record),
    balanceDue: maintenanceBalanceDue(record),
    currency: normalizeCurrency(record.currency),
    dueDate: record.dueDate || '',
    completionDate: record.completionDate || '',
    notes: record.notes || '',
    attachmentUrl: record.attachmentUrl || '',
    attachmentName: record.attachmentName || '',
    createdBy: record.createdBy || record.userId || '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

function sanitizeMaintenance(payload) {
  const status = normalizeStatus(payload.status)
  const estimatedCost = Math.max(Number(payload.estimatedCost) || 0, 0)
  const actualCost = Math.max(Number(payload.actualCost) || 0, 0)
  const paidAmount = Math.max(Number(payload.paidAmount) || 0, 0)
  return {
    title: String(payload.title || '').trim(),
    category: String(payload.category || 'General').trim() || 'General',
    propertyId: String(payload.propertyId || '').trim(),
    propertyName: String(payload.propertyName || '').trim(),
    unit: String(payload.unit || '').trim(),
    tenantId: String(payload.tenantId || '').trim(),
    tenantName: String(payload.tenantName || '').trim(),
    priority: normalizePriority(payload.priority),
    status,
    assignedTo: String(payload.assignedTo || '').trim(),
    assigneeType: String(payload.assigneeType || 'Staff').trim() || 'Staff',
    estimatedCost,
    actualCost,
    paidAmount: actualCost > 0 ? Math.min(paidAmount, actualCost) : paidAmount,
    currency: normalizeCurrency(payload.currency),
    dueDate: String(payload.dueDate || '').trim(),
    completionDate: String(payload.completionDate || '').trim(),
    notes: String(payload.notes || '').trim(),
    attachmentUrl: String(payload.attachmentUrl || '').trim(),
    attachmentName: String(payload.attachmentName || '').trim(),
  }
}

export function useMaintenance({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setRequests([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setRequests([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setRequests([])
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
      'propertyMaintenance',
      (rows) => {
        setRequests((Array.isArray(rows) ? rows : []).map(normalizeMaintenance))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load maintenance requests.'))
        setRequests([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

  return useMemo(
    () => ({
      requests,
      loading,
      source,
      error,
      async createRequest(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeMaintenance(payload)
        if (!record.title) return { ok: false, error: 'Request title is required' }
        if (!record.propertyName) return { ok: false, error: 'Property is required' }
        try {
          const ref = await createUserDoc(workspaceId, 'propertyMaintenance', {
            ...record,
            createdBy: userId,
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Maintenance request created',
            module: 'Maintenance',
            description: `${record.title} was logged for ${record.propertyName}.`,
            targetId: ref.id,
            targetName: record.title,
            metadata: { priority: record.priority, status: record.status, estimatedCost: record.estimatedCost },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Maintenance',
            priority: record.priority === 'High' || record.priority === 'Urgent' ? 'high' : 'medium',
            title: 'Maintenance request created',
            message: `${record.title} was logged for ${record.propertyName}.`,
            relatedId: ref.id,
            route: '/app/maintenance',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create maintenance request.') }
        }
      },
      async updateRequest(id, payload) {
        if (!id) return { ok: false, error: 'Request not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeMaintenance(payload)
        if (!record.title) return { ok: false, error: 'Request title is required' }
        if (!record.propertyName) return { ok: false, error: 'Property is required' }
        try {
          await patchUserDoc(workspaceId, 'propertyMaintenance', id, record, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Maintenance request updated',
            module: 'Maintenance',
            description: `${record.title} was updated.`,
            targetId: id,
            targetName: record.title,
            metadata: { priority: record.priority, status: record.status, actualCost: record.actualCost },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Maintenance',
            priority: record.priority === 'High' || record.priority === 'Urgent' ? 'high' : 'low',
            title: 'Maintenance request updated',
            message: `${record.title} was updated.`,
            relatedId: id,
            route: '/app/maintenance',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update maintenance request.') }
        }
      },
      async setStatus(request, status) {
        if (!request?.id) return { ok: false, error: 'Request not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const nextStatus = normalizeStatus(status)
        const patch = { status: nextStatus }
        if (nextStatus === 'Completed' && !request.completionDate) {
          patch.completionDate = new Date().toISOString().slice(0, 10)
        }
        try {
          await patchUserDoc(workspaceId, 'propertyMaintenance', request.id, patch, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: `Maintenance request ${nextStatus.toLowerCase()}`,
            module: 'Maintenance',
            description: `${request.title || 'Request'} marked ${nextStatus}.`,
            targetId: request.id,
            targetName: request.title || 'Request',
            metadata: { status: nextStatus },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Maintenance',
            priority: nextStatus === 'Completed' ? 'medium' : 'low',
            title: 'Maintenance status updated',
            message: `${request.title || 'Request'} marked ${nextStatus}.`,
            relatedId: request.id,
            route: '/app/maintenance',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update maintenance request.') }
        }
      },
      async deleteRequest(request) {
        if (!request?.id) return { ok: false, error: 'Request not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, 'propertyMaintenance', request.id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Maintenance request deleted',
            module: 'Maintenance',
            description: `${request.title || 'Request'} was removed.`,
            targetId: request.id,
            targetName: request.title || 'Request',
            metadata: { status: request.status },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Maintenance',
            priority: 'low',
            title: 'Maintenance request deleted',
            message: `${request.title || 'Request'} was removed.`,
            relatedId: request.id,
            route: '/app/maintenance',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete maintenance request.') }
        }
      },
    }),
    [requests, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
