import { useCallback, useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { generateCouponCode, generateBarcodeData, generateQRData, isCouponValid, applyCouponDiscount } from '../lib/loyaltyCalculations.js'
import { validateCouponDefinition, checkDuplicateCoupon } from '../lib/loyaltyValidation.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

const DEFAULT_LIMIT = 100

export function useLoyaltyCoupons({ limitCount = DEFAULT_LIMIT, enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser, role } = useUser()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoading(false); return }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId, collectionName: 'loyaltyCoupons', businessType, limitCount,
      diagnostics: { currentUserUid: userId, role },
      onData: (data) => { setCoupons(Array.isArray(data) ? data : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err, 'Unable to load coupons.')); setLoading(false) },
    })
    return () => unsub?.()
  }, [businessType, enabled, limitCount, role, userId, workspaceId])

  const api = useMemo(() => ({
    coupons, loading, error,

    async createCoupon(payload = {}) {
      if (!userId || !workspaceId || !db) return { ok: false, error: 'Please login first' }
      const val = validateCouponDefinition(payload)
      if (!val.valid) return { ok: false, error: val.errors.join(', ') }
      const code = payload.code || generateCouponCode({ prefix: payload.codePrefix || 'LOY' })
      const dup = checkDuplicateCoupon(coupons, code)
      if (dup.isDuplicate) return { ok: false, error: `Coupon code ${code} already exists` }
      try {
        const ref = await createUserDoc(workspaceId, 'loyaltyCoupons', {
          ...payload,
          code, name: String(payload.name).trim(),
          description: String(payload.description || '').trim(),
          discountType: payload.discountType,
          discountValue: Math.max(0, Number(payload.discountValue || 0)),
          maxDiscount: Math.max(0, Number(payload.maxDiscount || 0)),
          minOrderAmount: Math.max(0, Number(payload.minOrderAmount || 0)),
          type: payload.type || 'discount',
          usageLimit: Math.max(0, Number(payload.usageLimit || 0)),
          usedCount: 0,
          active: payload.active !== false,
          accountId: payload.accountId || '',
          singleUse: payload.singleUse !== false,
          qrData: generateQRData({ couponCode: code, workspaceId, type: 'coupon' }),
          barcodeData: generateBarcodeData(code),
          startsAt: payload.startsAt || serverTimestamp(),
          expiresAt: payload.expiresAt || null,
          freeProductName: payload.freeProductName || '',
          createdBy: userId,
        }, { businessType, diagnostics: { currentUserUid: userId, role } })
        await logActivity({
          workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
          action: 'Coupon created', module: 'Loyalty',
          description: `Coupon ${code} created (${payload.discountType}: ${payload.discountValue})`,
          targetId: ref.id, metadata: { code, type: payload.discountType, value: payload.discountValue },
        })
        return { ok: true, id: ref.id, code }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to create coupon.') } }
    },

    async updateCoupon(id, payload) {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        await patchUserDoc(workspaceId, 'loyaltyCoupons', id, payload, { businessType, diagnostics: { currentUserUid: userId, role } })
        setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, ...payload } : c))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to update coupon.') } }
    },

    async deleteCoupon(id) {
      if (!id) return { ok: false }
      try {
        const { removeUserDoc } = await import('../lib/firestore.js')
        await removeUserDoc(workspaceId, 'loyaltyCoupons', id, { diagnostics: { currentUserUid: userId, role } })
        setCoupons((prev) => prev.filter((c) => c.id !== id))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to delete coupon.') } }
    },

    validateCoupon(codeOrCoupon) {
      const coupon = typeof codeOrCoupon === 'string' ? coupons.find((c) => c.code === codeOrCoupon) : codeOrCoupon
      return { valid: isCouponValid(coupon), coupon }
    },

    applyCoupon(cartTotal, codeOrCoupon) {
      const coupon = typeof codeOrCoupon === 'string' ? coupons.find((c) => c.code === codeOrCoupon) : codeOrCoupon
      return applyCouponDiscount(cartTotal, coupon)
    },

    async markUsed(id) {
      if (!id || !workspaceId || !db) return { ok: false }
      try {
        const coupon = coupons.find((c) => c.id === id)
        const usedCount = (coupon?.usedCount || 0) + 1
        await patchUserDoc(workspaceId, 'loyaltyCoupons', id, { usedCount, updatedAt: serverTimestamp() }, { businessType, diagnostics: { currentUserUid: userId, role } })
        setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, usedCount } : c))
        return { ok: true }
      } catch (e) { return { ok: false, error: clientSafeMessage(e, 'Unable to mark coupon used.') } }
    },
  }), [coupons, loading, error, userId, workspaceId, businessType, userDoc, firebaseUser, role])

  return api
}
