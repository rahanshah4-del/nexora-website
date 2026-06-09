import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { TEMPLATE_CATEGORIES, templateVariables } from '../lib/whatsappManual.js'

const COLLECTION = 'whatsappTemplates'

function normalizeCategory(value) {
  const match = TEMPLATE_CATEGORIES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'Other'
}

function normalizeTemplate(record) {
  const body = record.body || ''
  return {
    id: record.id,
    name: record.name || 'Template',
    category: normalizeCategory(record.category),
    body,
    variables: Array.isArray(record.variables) && record.variables.length ? record.variables : templateVariables(body),
    usageCount: Math.max(Number(record.usageCount) || 0, 0),
    createdBy: record.createdBy || record.userId || '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

function sanitizeTemplate(payload) {
  const body = String(payload.body || '').trim()
  return {
    name: String(payload.name || '').trim(),
    category: normalizeCategory(payload.category),
    body,
    variables: templateVariables(body),
  }
}

export function useWhatsappTemplates({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setTemplates([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setTemplates([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setTemplates([])
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
        setTemplates((Array.isArray(rows) ? rows : []).map(normalizeTemplate))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load templates.'))
        setTemplates([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

  return useMemo(
    () => ({
      templates,
      loading,
      source,
      error,
      async createTemplate(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeTemplate(payload)
        if (!record.name) return { ok: false, error: 'Template name is required' }
        if (!record.body) return { ok: false, error: 'Template message is required' }
        try {
          const ref = await createUserDoc(workspaceId, COLLECTION, { ...record, usageCount: 0, createdBy: userId }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp template created',
            module: 'WhatsApp Templates',
            description: `Template "${record.name}" was created.`,
            targetId: ref.id,
            targetName: record.name,
            metadata: { category: record.category },
          })
          return { ok: true, id: ref.id }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create template.') }
        }
      },
      async updateTemplate(id, payload) {
        if (!id) return { ok: false, error: 'Template not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeTemplate(payload)
        if (!record.name) return { ok: false, error: 'Template name is required' }
        if (!record.body) return { ok: false, error: 'Template message is required' }
        try {
          await patchUserDoc(workspaceId, COLLECTION, id, record, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp template updated',
            module: 'WhatsApp Templates',
            description: `Template "${record.name}" was updated.`,
            targetId: id,
            targetName: record.name,
            metadata: { category: record.category },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update template.') }
        }
      },
      // Best-effort usage counter — never blocks the click-to-WhatsApp action.
      async recordUsage(template) {
        if (!template?.id || !userId || !workspaceId || !db) return { ok: false }
        try {
          await patchUserDoc(workspaceId, COLLECTION, template.id, { usageCount: Math.max(Number(template.usageCount) || 0, 0) + 1 }, { businessType })
          return { ok: true }
        } catch {
          return { ok: false }
        }
      },
      async deleteTemplate(template) {
        if (!template?.id) return { ok: false, error: 'Template not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, COLLECTION, template.id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp template deleted',
            module: 'WhatsApp Templates',
            description: `Template "${template.name || 'Template'}" was removed.`,
            targetId: template.id,
            targetName: template.name || 'Template',
            metadata: {},
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete template.') }
        }
      },
    }),
    [templates, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
