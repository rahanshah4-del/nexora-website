import { useCallback, useEffect, useMemo, useState } from 'react'
import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { walletSummary } from '../lib/loyaltyCalculations.js'
import { validateWalletTransaction, validateNegativeBalance } from '../lib/loyaltyValidation.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const DEFAULT_LIMIT = 200

export function useLoyaltyWallet({ accountId = null, limitCount = DEFAULT_LIMIT, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'loyaltyWallet', businessType, limitCount,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => {
        const list = Array.isArray(data) ? data : []
        setEntries(accountId ? list.filter((e) => e.accountId === accountId) : list)
        setLoading(false)
      },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load wallet.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [accountId, businessType, enabled, limitCount, role, userId, workspaceId])

  const summary = useMemo(() => walletSummary(entries), [entries])

  const api = useMemo(() => ({
    entries, loading, error, summary,

    async addTransaction(payload = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateWalletTransaction(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyWallet', {
          ...payload,
          accountId: payload.accountId,
          type: payload.type,
          direction: payload.direction,
          amount: Math.max(0, Number(payload.amount)),
          description: String(payload.description || '').trim(),
          referenceType: payload.referenceType || '',
          referenceId: payload.referenceId || '',
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to add wallet transaction.') } }
    },

    async spendBalance({ accountId: acctId, amount, type = 'store_credit', description = '', referenceType = '', referenceId = '' } = {}) {
      if (!workspaceId || !db || !acctId || !amount) return { ok: false, error: 'Invalid request' }
      const bal = type === 'store_credit' ? summary.storeCredit : type === 'gift' ? summary.giftBalance : type === 'refund_credit' ? summary.refundCredit : summary.rewardBalance
      const nb = validateNegativeBalance(bal, amount)
      if (!nb.valid) return { ok: false, error: nb.error }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyWallet', {
          accountId: acctId, type, direction: 'debit', amount: Math.max(0, Number(amount)),
          description, referenceType, referenceId,
          workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to process wallet debit.') } }
    },

    async creditBalance({ accountId: acctId, amount, type = 'store_credit', description = '', referenceType = '', referenceId = '' } = {}) {
      if (!workspaceId || !db || !acctId || !amount) return { ok: false }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyWallet', {
          accountId: acctId, type, direction: 'credit', amount: Math.max(0, Number(amount)),
          description, referenceType, referenceId,
          workspaceId, ownerId: workspaceId, businessType, createdBy: userId,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        })
        return { ok: true, id: ref.id }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to credit wallet.') } }
    },
  }), [entries, loading, error, summary, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
