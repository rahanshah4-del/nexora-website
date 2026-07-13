import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { useLoyaltyPoints } from './useLoyaltyPoints.js'
import { clientSafeMessage } from '../utils/messages.js'
import { LOYALTY_SETTINGS_DEFAULTS, calculateReferralReward, referralEarnings } from '../lib/loyaltyCalculations.js'
import { checkDuplicateReferral } from '../lib/loyaltyValidation.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const DEFAULT_LIMIT = 100

export function useLoyaltyReferrals({ limitCount = DEFAULT_LIMIT, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pointsApi = useLoyaltyPoints({ enabled: false })

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'loyaltyReferrals', businessType, limitCount,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setReferrals(Array.isArray(data) ? data : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load referrals.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, limitCount, role, userId, workspaceId])

  const api = useMemo(() => ({
    referrals, loading, error,
    totalEarnings: referralEarnings(referrals),

    async createReferral(payload = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      if (!payload.referrerId || !payload.invitedEmail) return { ok: false, error: 'Referrer and invited email are required' }
      const dup = checkDuplicateReferral(referrals, payload.invitedEmail, payload.referrerId)
      if (dup.isDuplicate) return { ok: false, error: 'Referral already exists for this email' }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyReferrals', {
          ...payload,
          referrerId: payload.referrerId,
          referrerName: String(payload.referrerName || '').trim(),
          invitedEmail: String(payload.invitedEmail).trim().toLowerCase(),
          invitedName: String(payload.invitedName || '').trim(),
          invitedPhone: String(payload.invitedPhone || '').trim(),
          status: 'pending', // pending, converted, rewarded
          rewardStatus: 'pending',
          rewardPoints: 0,
          conversionDate: null,
          notes: String(payload.notes || '').trim(),
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create referral.') } }
    },

    async markConverted(id, invitedCustomerId = '') {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        const referral = referrals.find((r) => r.id === id)
        const rewardPoints = Math.max(0, Number(LOYALTY_SETTINGS_DEFAULTS.referralBonusPoints || 200))
        const patch = {
          status: 'converted',
          conversionDate: serverTimestamp(),
          invitedCustomerId,
          rewardPoints,
          rewardStatus: 'awarded',
        }
        await patchUserDoc(workspaceId, 'loyaltyReferrals', id, patch, { businessType, diagnostics: { currentUserUid: userId, role } })
        // Award points to referrer
        await pointsApi.awardPoints({
          accountId: referral.referrerId, points: rewardPoints, type: 'referral',
          description: `Referral reward for ${referral.invitedEmail}`,
        })
        setReferrals((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))
        return { ok: true, rewardPoints }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to mark referral converted.') } }
    },
  }), [referrals, loading, error, userId, workspaceId, businessType, userDoc, firebaseUser, role, pointsApi])

  return api
}
