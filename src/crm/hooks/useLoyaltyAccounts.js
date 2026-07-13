import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, removeUserDoc, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { calculateTier, generateMembershipId, generateQRPayload, LOYALTY_SETTINGS_DEFAULTS } from '../lib/loyaltyCalculations.js'
import { checkDuplicateEnrollment, validateLoyaltyEnrollment } from '../lib/loyaltyValidation.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

const DEFAULT_LIMIT = 50

function normalizeAccount(a) {
  const tier = calculateTier(a)
  return {
    ...a,
    id: a.id,
    customerId: a.customerId || '',
    customerName: a.customerName || a.name || 'Unknown',
    customerEmail: a.customerEmail || '',
    customerPhone: a.customerPhone || '',
    membershipId: a.membershipId || '',
    currentTier: a.currentTier || tier.id,
    tierLabel: a.tierLabel || tier.label,
    lifetimePoints: Number(a.lifetimePoints || 0),
    currentPoints: Number(a.currentPoints || 0),
    lifetimeSpend: Number(a.lifetimeSpend || 0),
    posOrdersCount: Number(a.posOrdersCount || 0),
    visits: Number(a.visits || a.posOrdersCount || 0),
    status: a.status || 'active',
    enrollmentSource: a.enrollmentSource || 'manual',
    lastActivityAt: a.lastActivityAt || null,
    dateOfBirth: a.dateOfBirth || null,
    qrData: a.qrData || '',
    barcodeData: a.barcodeData || '',
    notes: a.notes || '',
    createdBy: a.createdBy || '',
    createdAt: a.createdAt || null,
  }
}

export function useLoyaltyAccounts({ limitCount = DEFAULT_LIMIT, paginated = false, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const cursorRef = useRef(null)
  const requestRef = useRef(0)

  const loadPage = useCallback(async ({ reset = false } = {}) => {
    if (!enabled || !workspaceId) {
      setRows([]); setHasMore(false); setPage(0); setLoading(false); setError(''); return { ok: true }
    }
    if (!db) { setSource('none'); setLoading(false); return { ok: false, error: 'Cloud Sync not available' } }
    const reqId = ++requestRef.current
    if (reset) { cursorRef.current = null; setRows([]); setHasMore(false); setPage(0); setLoading(true) } else { setPaginationLoading(true) }
    try {
      const pageResult = await fetchWorkspaceCollectionPage({
        workspaceId, collectionName: 'loyaltyAccounts', businessType, orderByField: 'createdAt', orderDirection: 'desc',
        limitCount: Math.min(limitCount, DEFAULT_LIMIT), startAfterDoc: reset ? null : cursorRef.current, diagnostics: { currentUserUid: userId, role },
      })
      if (reqId !== requestRef.current) return { ok: false }
      const nextRows = (Array.isArray(pageResult.rows) ? pageResult.rows : []).map(normalizeAccount)
      setRows((prev) => reset ? nextRows : [...prev, ...nextRows])
      cursorRef.current = pageResult.lastDoc
      setHasMore(pageResult.hasMore)
      setPage((p) => reset ? 1 : p + 1)
      setSource('firestore'); setError('')
      return { ok: true }
    } catch (err) {
      if (reqId !== requestRef.current) return { ok: false }
      setError(clientSafeMessage(err, 'Unable to load loyalty accounts.'))
      if (reset) setRows([])
      return { ok: false, error: clientSafeMessage(err, 'Unable to load loyalty accounts.') }
    } finally {
      if (reqId === requestRef.current) { if (reset) setLoading(false); else setPaginationLoading(false) }
    }
  }, [businessType, enabled, limitCount, role, userId, workspaceId])

  const loadMore = useCallback(() => {
    if (loading || paginationLoading || !hasMore) return
    return loadPage({ reset: false })
  }, [hasMore, loadPage, loading, paginationLoading])

  useEffect(() => {
    if (!enabled || !workspaceId || !db) {
      setRows([]); setLoading(false); setSource(db ? 'firestore' : 'none'); return
    }
    if (paginated) { loadPage({ reset: true }); return () => { requestRef.current += 1 } }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'loyaltyAccounts', businessType, limitCount,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setRows((Array.isArray(data) ? data : []).map(normalizeAccount)); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load loyalty accounts.')); setRows([]); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, limitCount, loadPage, paginated, role, userId, workspaceId])

  const api = useMemo(() => ({
    accounts: rows, loading, paginationLoading, hasMore, page, pageSize: limitCount,
    loadMore, source, error,

    async enrollCustomer(payload = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateLoyaltyEnrollment(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }

      // Check duplicate
      const duplicateCheck = checkDuplicateEnrollment(rows, payload.customerId)
      if (duplicateCheck.isDuplicate) return { ok: false, error: 'Customer is already enrolled', existingAccount: duplicateCheck.existingAccount }

      const membershipId = generateMembershipId({ workspaceCode: workspaceId.slice(-4).toUpperCase(), counter: rows.length + 1 })
      const qrData = generateQRPayload({ workspaceId, accountId: `pending-${Date.now()}`, membershipId })
      const tier = calculateTier(payload)

      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyAccounts', {
          ...payload,
          customerId: payload.customerId,
          customerName: String(payload.customerName || '').trim(),
          customerEmail: String(payload.customerEmail || '').trim(),
          customerPhone: String(payload.customerPhone || '').trim(),
          membershipId,
          qrData,
          barcodeData: `*${membershipId}*`,
          currentTier: tier.id,
          tierLabel: tier.label,
          lifetimePoints: 0, currentPoints: 0,
          lifetimeSpend: Number(payload.lifetimeSpend || 0),
          posOrdersCount: Number(payload.posOrdersCount || 0),
          visits: Number(payload.visits || payload.posOrdersCount || 0),
          status: 'active',
          enrollmentSource: payload.enrollmentSource || 'manual',
          dateOfBirth: payload.dateOfBirth || null,
          notes: String(payload.notes || '').trim(),
          autoEnrolled: Boolean(payload.autoEnrolled),
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })

        const signupPoints = Number(LOYALTY_SETTINGS_DEFAULTS.signupBonusPoints || 100)
        if (signupPoints > 0) {
          const pointsRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'loyaltyPointsLedger')))
          await batchWritePoints(pointsRef, ref.id, signupPoints, 'signup_bonus', 'Signup bonus points', userId, workspaceId, businessType)
        }

        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Loyalty enrollment', module: 'Loyalty',
          description: `${payload.customerName} enrolled as ${tier.label} member.`,
          targetId: ref.id, targetName: payload.customerName,
          metadata: { membershipId, tier: tier.id },
        })

        return { ok: true, id: ref.id, membershipId }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to enroll customer.') }
      }
    },

    async updateAccount(id, payload) {
      if (!userId || !workspaceId || !db || !id) return { ok: false, error: 'Invalid request' }
      try {
        const tier = calculateTier({ ...payload, lifetimeSpend: payload.lifetimeSpend, posOrdersCount: payload.posOrdersCount })
        const patch = {
          ...payload,
          currentTier: tier.id,
          tierLabel: tier.label,
        }
        await patchUserDoc(workspaceId, 'loyaltyAccounts', id, patch, { businessType, diagnostics: { currentUserUid: userId, role } })
        setRows((prev) => prev.map((a) => a.id === id ? normalizeAccount({ ...a, ...patch }) : a))
        return { ok: true }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to update account.') }
      }
    },

    async deleteAccount(id) {
      if (!userId || !workspaceId || !db || !id) return { ok: false, error: 'Invalid request' }
      try {
        await removeUserDoc(workspaceId, 'loyaltyAccounts', id, { diagnostics: { currentUserUid: userId, role } })
        setRows((prev) => prev.filter((a) => a.id !== id))
        return { ok: true }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to delete account.') }
      }
    },

    async recalculateTiers() {
      if (!workspaceId || !db) return { ok: false }
      try {
        const updated = rows.map((a) => {
          const tier = calculateTier(a)
          return { ...a, currentTier: tier.id, tierLabel: tier.label }
        })
        setRows(updated)
        const batch = writeBatch(db)
        updated.forEach((a) => {
          const ref = doc(db, workspaceCollectionPath(workspaceId, 'loyaltyAccounts'), a.id)
          batch.update(ref, { currentTier: a.currentTier, tierLabel: a.tierLabel, updatedAt: serverTimestamp() })
        })
        await batch.commit()
        return { ok: true }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to recalculate tiers.') }
      }
    },
  }), [rows, loading, paginationLoading, hasMore, page, limitCount, loadMore, source, error, businessType, firebaseUser, role, userDoc, userId, workspaceId])

  return api
}

async function batchWritePoints(pointsRef, accountId, points, type, description, userId, workspaceId, businessType) {
  const { serverTimestamp: ts } = await import('firebase/firestore')
  await (await import('firebase/firestore')).writeBatch(db).set(pointsRef, {
    accountId, points: Math.abs(points), type, description,
    workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
    createdAt: ts(), updatedAt: ts(),
  }).commit()
}
