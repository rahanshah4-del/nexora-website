import { useCallback, useEffect, useMemo, useState } from 'react'
import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { useLoyaltyPoints } from './useLoyaltyPoints.js'
import { clientSafeMessage } from '../utils/messages.js'
import { isRewardEligible, calculateRequiredPointsForReward } from '../lib/loyaltyCalculations.js'
import { validateRewardDefinition, validatePointsRedemption } from '../lib/loyaltyValidation.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const DEFAULT_LIMIT = 100

export function useLoyaltyRewards({ limitCount = DEFAULT_LIMIT, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [rewards, setRewards] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [redemptionsLoading, setRedemptionsLoading] = useState(false)
  const [error, setError] = useState('')
  const pointsApi = useLoyaltyPoints({ enabled: false })

  // Load rewards
  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'loyaltyRewards', businessType, limitCount,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setRewards(Array.isArray(data) ? data : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load rewards.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, limitCount, role, userId, workspaceId])

  // Load redemptions
  const loadRedemptions = useCallback(async (accountId = null) => {
    if (!workspaceId || !db) return
    setRedemptionsLoading(true)
    try {
      const page = await fetchWorkspaceCollectionPage({
        workspaceId, collectionName: 'loyaltyRedemptions', businessType,
        orderByField: 'createdAt', orderDirection: 'desc', limitCount: 100,
        diagnostics: { currentUserUid: userId, role },
      })
      let list = Array.isArray(page.rows) ? page.rows : []
      if (accountId) list = list.filter((r) => r.accountId === accountId)
      setRedemptions(list)
    } catch (e) { setError(clientSafeMessage(e, 'Unable to load redemptions.')) }
    setRedemptionsLoading(false)
  }, [businessType, role, userId, workspaceId])

  const api = useMemo(() => ({
    rewards, redemptions, loading, redemptionsLoading, error,
    loadRedemptions,

    async createReward(payload) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateRewardDefinition(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyRewards', {
          ...payload,
          name: String(payload.name).trim(),
          type: payload.type,
          description: String(payload.description || '').trim(),
          pointsCost: Math.max(0, Number(payload.pointsCost || payload.minimumPoints || 0)),
          discountValue: Math.max(0, Number(payload.discountValue || 0)),
          requiredTier: payload.requiredTier || 'any',
          maxRedemptions: Math.max(0, Number(payload.maxRedemptions || 0)),
          currentRedemptions: 0,
          active: payload.active !== false,
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create reward.') } }
    },

    async updateReward(id, payload) {
      if (!id || !workspaceId || !db) return { ok: false, error: 'Invalid request' }
      try {
        await patchUserDoc(workspaceId, 'loyaltyRewards', id, payload, { businessType, diagnostics: { currentUserUid: userId, role } })
        setRewards((prev) => prev.map((r) => r.id === id ? { ...r, ...payload } : r))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update reward.') } }
    },

    async deleteReward(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'loyaltyRewards', id, { diagnostics: { currentUserUid: userId, role } })
        setRewards((prev) => prev.filter((r) => r.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete reward.') } }
    },

    async redeemReward({ account, reward, accountId, rewardId } = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const acctId = account?.id || accountId
      const rwdId = reward?.id || rewardId
      const acct = account || { id: accountId, currentPoints: 0 }
      const rwd = reward || rewards.find((r) => r.id === rwdId)
      if (!acctId || !rwd) return { ok: false, error: 'Account and reward are required' }
      const cost = calculateRequiredPointsForReward(rwd)
      const val = validatePointsRedemption(acct, { rewardId: rwdId, pointsCost: cost })
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      if (!isRewardEligible(acct, rwd)) return { ok: false, error: 'Not eligible for this reward' }
      try {
        // Create redemption record
        const ref = await createUserDoc(workspaceId, 'loyaltyRedemptions', {
          accountId: acctId, customerName: acct.customerName || 'Member',
          rewardId: rwdId, rewardName: rwd.name, rewardType: rwd.type,
          pointsCost: cost, discountValue: rwd.discountValue || 0,
          status: 'redeemed', redeemedBy: userId,
          workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        })
        // Deduct points via transaction
        const { db: fbDb, doc, runTransaction: txRun, collection, documentId } = await import('firebase/firestore')
        const { workspaceCollectionPath: wcp } = await import('../lib/firestore.js')
        const accountRef = doc(fbDb, wcp(workspaceId, 'loyaltyAccounts'), acctId)
        await txRun(fbDb, async (transaction) => {
          const snap = await transaction.get(accountRef)
          if (!snap.exists()) throw new Error('Account not found')
          const pts = Number(snap.data().currentPoints || 0)
          if (pts < cost) throw new Error(`Insufficient points. Have ${pts}, need ${cost}`)
          transaction.update(accountRef, {
            currentPoints: pts - cost, lastActivityAt: serverTimestamp(), updatedAt: serverTimestamp(),
          })
          const ledgerRef = doc(collection(fbDb, wcp(workspaceId, 'loyaltyPointsLedger')))
          transaction.set(ledgerRef, {
            accountId: acctId, points: -cost, type: 'redeemed',
            description: `Redeemed: ${rwd.name}`, rewardId: rwdId, redemptionId: ref.id,
            workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          })
        })
        // Update reward counter
        await patchUserDoc(workspaceId, 'loyaltyRewards', rwdId, {
          currentRedemptions: (rwd.currentRedemptions || 0) + 1,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })

        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Reward redeemed', module: 'Loyalty',
          description: `${acct.customerName || 'Member'} redeemed ${rwd.name} for ${cost} points`,
          targetId: acctId, metadata: { reward: rwd.name, points: cost },
        })
        return { ok: true, id: ref.id, pointsCost: cost }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to redeem reward.') } }
    },
  }), [rewards, redemptions, loading, redemptionsLoading, error, loadRedemptions, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
