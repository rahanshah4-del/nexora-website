import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { NOTE_LINK_TYPES } from '../lib/whatsappManual.js'

const COLLECTION = 'whatsappNotes'

function normalizeLinkType(value) {
  const match = NOTE_LINK_TYPES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'contact'
}

function normalizeNote(record) {
  return {
    id: record.id,
    body: record.body || '',
    linkType: normalizeLinkType(record.linkType),
    linkId: record.linkId || '',
    linkName: record.linkName || '',
    authorName: record.authorName || '',
    createdBy: record.createdBy || record.userId || '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

export function useWhatsappNotes({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setNotes([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setNotes([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const unsub = subscribeUserCollection(
      workspaceId,
      COLLECTION,
      (rows) => {
        setNotes((Array.isArray(rows) ? rows : []).map(normalizeNote))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load notes.'))
        setNotes([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

  return useMemo(
    () => ({
      notes,
      loading,
      error,
      // Notes for one contact/lead, newest first.
      notesFor(linkId) {
        if (!linkId) return []
        return notes
          .filter((note) => note.linkId === linkId)
          .sort((a, b) => {
            const at = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime()
            const bt = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime()
            return bt - at
          })
      },
      async addNote({ body, linkType = 'contact', linkId = '', linkName = '' } = {}) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const text = String(body || '').trim()
        if (!text) return { ok: false, error: 'Note cannot be empty' }
        try {
          const ref = await createUserDoc(
            workspaceId,
            COLLECTION,
            {
              body: text,
              linkType: normalizeLinkType(linkType),
              linkId: String(linkId || '').trim(),
              linkName: String(linkName || '').trim(),
              authorName: userDoc?.name || userDoc?.displayName || firebaseUser?.displayName || firebaseUser?.email || '',
              createdBy: userId,
            },
            { businessType },
          )
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'WhatsApp note added',
            module: 'WhatsApp Inbox',
            description: `Note added${linkName ? ` to ${linkName}` : ''}.`,
            targetId: String(linkId || ref.id),
            targetName: linkName || 'Note',
            metadata: { linkType: normalizeLinkType(linkType) },
          })
          return { ok: true, id: ref.id }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to add note.') }
        }
      },
      async deleteNote(note) {
        if (!note?.id) return { ok: false, error: 'Note not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, COLLECTION, note.id)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete note.') }
        }
      },
    }),
    [notes, loading, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
