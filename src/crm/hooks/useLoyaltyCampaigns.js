import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { isCampaignActive, activeCampaignsForToday, CAMPAIGN_TYPES } from '../lib/loyaltyCalculations.js'
import { validateCampaignDefinition } from '../lib/loyaltyValidation.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const DEFAULT_LIMIT = 100

export function useLoyaltyCampaigns({ limitCount = DEFAULT_LIMIT, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'loyaltyCampaigns', businessType, limitCount,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setCampaigns(Array.isArray(data) ? data : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load campaigns.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, limitCount, role, userId, workspaceId])

  const activeCampaigns = useMemo(() => activeCampaignsForToday(campaigns), [campaigns])

  const api = useMemo(() => ({
    campaigns, loading, error, activeCampaigns,
    campaignTypes: CAMPAIGN_TYPES,

    async createCampaign(payload = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateCampaignDefinition(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyCampaigns', {
          ...payload,
          name: String(payload.name).trim(),
          type: payload.type,
          description: String(payload.description || '').trim(),
          multiplier: Math.max(1, Number(payload.multiplier || 1)),
          startsAt: payload.startsAt || serverTimestamp(),
          endsAt: payload.endsAt || null,
          daysOfWeek: Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : [],
          happyHourStart: Number(payload.happyHourStart || 0),
          happyHourEnd: Number(payload.happyHourEnd || 24),
          applicableCategoryIds: Array.isArray(payload.applicableCategoryIds) ? payload.applicableCategoryIds : [],
          active: payload.active !== false,
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Campaign created', module: 'Loyalty',
          description: `Campaign "${payload.name}" created (${payload.type})`,
          targetId: ref.id,
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create campaign.') } }
    },

    async updateCampaign(id, payload) {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        await patchUserDoc(workspaceId, 'loyaltyCampaigns', id, payload, { businessType, diagnostics: { currentUserUid: userId, role } })
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, ...payload } : c))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update campaign.') } }
    },

    async deleteCampaign(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'loyaltyCampaigns', id, { diagnostics: { currentUserUid: userId, role } })
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete campaign.') } }
    },
  }), [campaigns, loading, error, activeCampaigns, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
