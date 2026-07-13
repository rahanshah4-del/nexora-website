import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { calculateEarnedPoints, calculateReversePoints, LOYALTY_SETTINGS_DEFAULTS } from '../lib/loyaltyCalculations.js'
import { validatePointsAdjustment } from '../lib/loyaltyValidation.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const DEFAULT_LIMIT = 100

export function useLoyaltyPoints({ accountId = null, limitCount = DEFAULT_LIMIT, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const path = workspaceCollectionPath(workspaceId, 'loyaltyPointsLedger')
    const q = accountId
      ? query(collection(db, path), where('accountId', '==', accountId), orderBy('createdAt', 'desc'), limit(limitCount))
      : query(collection(db, path), orderBy('createdAt', 'desc'), limit(limitCount))
    const unsub = onSnapshot(q, (snap) => {
      setLedger(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => { setError(clientSafeMessage(err, 'Unable to load points ledger.')); setLoading(false) })
    return () => unsub()
  }, [accountId, businessType, enabled, limitCount, userId, workspaceId])

  const api = useMemo(() => ({
    ledger, loading, error,

    async awardPoints({ accountId: acctId, points, type = 'earned', description = '', orderId = '', metadata = {} } = {}) {
      if (!userId || !workspaceId || !db || !acctId || !points || points <= 0) return { ok: false, error: 'Invalid parameters' }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyPointsLedger', {
          accountId: acctId, points: Math.abs(points), type, description, orderId, metadata,
          workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        })
        // Update account current/lifetime points
        const accountRef = doc(db, workspaceCollectionPath(workspaceId, 'loyaltyAccounts'), acctId)
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(accountRef)
          if (!snap.exists()) { throw new Error('Account not found') }
          tx.update(accountRef, {
            currentPoints: Number(snap.data().currentPoints || 0) + points,
            lifetimePoints: Number(snap.data().lifetimePoints || 0) + points,
            lastActivityAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        })
        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Points awarded', module: 'Loyalty',
          description: `${points} points awarded${description ? ': ' + description : ''}`,
          targetId: acctId, metadata: { points, type, orderId },
        })
        return { ok: true, id: ref.id, points }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to award points.') }
      }
    },

    async redeemPoints({ accountId: acctId, points, rewardId = '', rewardName = '', redemptionId = '' } = {}) {
      if (!userId || !workspaceId || !db || !acctId || !points || points <= 0) return { ok: false, error: 'Invalid parameters' }
      try {
        const accountRef = doc(db, workspaceCollectionPath(workspaceId, 'loyaltyAccounts'), acctId)
        const result = await runTransaction(db, async (tx) => {
          const snap = await tx.get(accountRef)
          if (!snap.exists()) throw new Error('Account not found')
          const currentPoints = Number(snap.data().currentPoints || 0)
          if (currentPoints < points) throw new Error(`Insufficient points. Have ${currentPoints}, need ${points}`)
          tx.update(accountRef, {
            currentPoints: currentPoints - points,
            lastActivityAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          const ledgerRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'loyaltyPointsLedger')))
          tx.set(ledgerRef, {
            accountId: acctId, points: -Math.abs(points), type: 'redeemed',
            description: `Redeemed for ${rewardName || 'reward'}`,
            rewardId, redemptionId,
            workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          })
          return { remainingPoints: currentPoints - points }
        })
        return { ok: true, ...result }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to redeem points.') }
      }
    },

    async reversePoints(accountId, refundAmount, orderId = '') {
      if (!workspaceId || !db || !accountId || !refundAmount) return { ok: false }
      const pointsToReverse = calculateReversePoints(refundAmount)
      if (pointsToReverse <= 0) return { ok: false, error: 'No points to reverse' }
      return api.awardPoints({ accountId, points: -pointsToReverse, type: 'reversal', description: `Points reversed on refund (order ${orderId})`, orderId })
    },

    async manualAdjustment({ accountId: acctId, points, reason = '' } = {}) {
      const val = validatePointsAdjustment({ accountId: acctId, points, reason })
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      const type = points > 0 ? 'manual_adjustment' : 'manual_deduction'
      return api.awardPoints({ accountId: acctId, points: Math.abs(points), type, description: reason })
    },
  }), [ledger, loading, error, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
