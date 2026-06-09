import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { LEAD_SOURCES, LEAD_STAGES, normalizePhone, toNumber } from '../lib/whatsappManual.js'

const COLLECTION = 'whatsappLeads'

function normalizeStage(value) {
  const match = LEAD_STAGES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'New'
}

function normalizeSource(value) {
  const match = LEAD_SOURCES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'WhatsApp'
}

function normalizeLead(record) {
  return {
    id: record.id,
    name: record.name || 'WhatsApp lead',
    phone: record.phone || '',
    email: record.email || '',
    company: record.company || '',
    stage: normalizeStage(record.stage),
    source: normalizeSource(record.source),
    value: Math.max(toNumber(record.value, 0), 0),
    currency: record.currency || 'PKR',
    assignedTo: record.assignedTo || '',
    contactId: record.contactId || '',
    notes: record.notes || '',
    nextActionAt: record.nextActionAt || '',
    createdBy: record.createdBy || record.userId || '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

function sanitizeLead(payload) {
  return {
    name: String(payload.name || '').trim(),
    phone: normalizePhone(payload.phone),
    email: String(payload.email || '').trim(),
    company: String(payload.company || '').trim(),
    stage: normalizeStage(payload.stage),
    source: normalizeSource(payload.source),
    value: Math.max(toNumber(payload.value, 0), 0),
    currency: String(payload.currency || 'PKR').trim() || 'PKR',
    assignedTo: String(payload.assignedTo || '').trim(),
    contactId: String(payload.contactId || '').trim(),
    notes: String(payload.notes || '').trim(),
    nextActionAt: String(payload.nextActionAt || '').trim(),
  }
}

export function useWhatsappLeads({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setLeads([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setLeads([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setLeads([])
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
        setLeads((Array.isArray(rows) ? rows : []).map(normalizeLead))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load WhatsApp leads.'))
        setLeads([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

  return useMemo(
    () => ({
      leads,
      loading,
      source,
      error,
      async createLead(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeLead(payload)
        if (!record.name) return { ok: false, error: 'Lead name is required' }
        if (!record.phone) return { ok: false, error: 'A valid WhatsApp number is required' }
        try {
          const ref = await createUserDoc(workspaceId, COLLECTION, { ...record, createdBy: userId }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp lead created',
            module: 'WhatsApp Leads',
            description: `${record.name} was added to WhatsApp leads.`,
            targetId: ref.id,
            targetName: record.name,
            metadata: { stage: record.stage, value: record.value },
          })
          return { ok: true, id: ref.id }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create lead.') }
        }
      },
      async updateLead(id, payload) {
        if (!id) return { ok: false, error: 'Lead not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeLead(payload)
        if (!record.name) return { ok: false, error: 'Lead name is required' }
        if (!record.phone) return { ok: false, error: 'A valid WhatsApp number is required' }
        try {
          await patchUserDoc(workspaceId, COLLECTION, id, record, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp lead updated',
            module: 'WhatsApp Leads',
            description: `${record.name} was updated.`,
            targetId: id,
            targetName: record.name,
            metadata: { stage: record.stage, value: record.value },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update lead.') }
        }
      },
      async setStage(lead, stage) {
        if (!lead?.id) return { ok: false, error: 'Lead not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const nextStage = normalizeStage(stage)
        try {
          await patchUserDoc(workspaceId, COLLECTION, lead.id, { stage: nextStage }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: `WhatsApp lead ${nextStage.toLowerCase()}`,
            module: 'WhatsApp Leads',
            description: `${lead.name || 'Lead'} moved to ${nextStage}.`,
            targetId: lead.id,
            targetName: lead.name || 'Lead',
            metadata: { stage: nextStage },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update lead.') }
        }
      },
      async deleteLead(lead) {
        if (!lead?.id) return { ok: false, error: 'Lead not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, COLLECTION, lead.id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp lead deleted',
            module: 'WhatsApp Leads',
            description: `${lead.name || 'Lead'} was removed.`,
            targetId: lead.id,
            targetName: lead.name || 'Lead',
            metadata: {},
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete lead.') }
        }
      },
    }),
    [leads, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
