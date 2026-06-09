import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { CONTACT_STATUSES, normalizePhone } from '../lib/whatsappManual.js'

const COLLECTION = 'whatsappContacts'

function normalizeStatus(value) {
  const match = CONTACT_STATUSES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'New'
}

function normalizeContact(record) {
  return {
    id: record.id,
    name: record.name || 'WhatsApp contact',
    phone: record.phone || '',
    email: record.email || '',
    company: record.company || '',
    status: normalizeStatus(record.status),
    assignedTo: record.assignedTo || '',
    tags: Array.isArray(record.tags) ? record.tags : [],
    source: record.source || 'WhatsApp',
    lastContactedAt: record.lastContactedAt || '',
    notes: record.notes || '',
    createdBy: record.createdBy || record.userId || '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

function sanitizeContact(payload) {
  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
  return {
    name: String(payload.name || '').trim(),
    phone: normalizePhone(payload.phone),
    email: String(payload.email || '').trim(),
    company: String(payload.company || '').trim(),
    status: normalizeStatus(payload.status),
    assignedTo: String(payload.assignedTo || '').trim(),
    tags,
    source: String(payload.source || 'WhatsApp').trim() || 'WhatsApp',
    lastContactedAt: String(payload.lastContactedAt || '').trim(),
    notes: String(payload.notes || '').trim(),
  }
}

export function useWhatsappContacts({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setContacts([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setContacts([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setContacts([])
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
        setContacts((Array.isArray(rows) ? rows : []).map(normalizeContact))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load WhatsApp contacts.'))
        setContacts([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

  return useMemo(
    () => ({
      contacts,
      loading,
      source,
      error,
      async createContact(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeContact(payload)
        if (!record.name) return { ok: false, error: 'Contact name is required' }
        if (!record.phone) return { ok: false, error: 'A valid WhatsApp number is required' }
        try {
          const ref = await createUserDoc(workspaceId, COLLECTION, { ...record, createdBy: userId }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp contact created',
            module: 'WhatsApp Inbox',
            description: `${record.name} was added to WhatsApp contacts.`,
            targetId: ref.id,
            targetName: record.name,
            metadata: { status: record.status, assignedTo: record.assignedTo },
          })
          return { ok: true, id: ref.id }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create contact.') }
        }
      },
      async updateContact(id, payload) {
        if (!id) return { ok: false, error: 'Contact not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeContact(payload)
        if (!record.name) return { ok: false, error: 'Contact name is required' }
        if (!record.phone) return { ok: false, error: 'A valid WhatsApp number is required' }
        try {
          await patchUserDoc(workspaceId, COLLECTION, id, record, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp contact updated',
            module: 'WhatsApp Inbox',
            description: `${record.name} was updated.`,
            targetId: id,
            targetName: record.name,
            metadata: { status: record.status, assignedTo: record.assignedTo },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update contact.') }
        }
      },
      async setStatus(contact, status) {
        if (!contact?.id) return { ok: false, error: 'Contact not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await patchUserDoc(workspaceId, COLLECTION, contact.id, { status: normalizeStatus(status) }, { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update contact.') }
        }
      },
      async assignContact(contact, assignedTo) {
        if (!contact?.id) return { ok: false, error: 'Contact not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await patchUserDoc(workspaceId, COLLECTION, contact.id, { assignedTo: String(assignedTo || '').trim() }, { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to assign contact.') }
        }
      },
      async markContacted(contact) {
        if (!contact?.id) return { ok: false, error: 'Contact not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await patchUserDoc(workspaceId, COLLECTION, contact.id, { lastContactedAt: new Date().toISOString() }, { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update contact.') }
        }
      },
      async deleteContact(contact) {
        if (!contact?.id) return { ok: false, error: 'Contact not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, COLLECTION, contact.id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp contact deleted',
            module: 'WhatsApp Inbox',
            description: `${contact.name || 'Contact'} was removed.`,
            targetId: contact.id,
            targetName: contact.name || 'Contact',
            metadata: {},
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete contact.') }
        }
      },
    }),
    [contacts, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
