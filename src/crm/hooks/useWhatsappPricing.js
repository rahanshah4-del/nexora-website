import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { clientSafeMessage } from '../utils/messages.js'
import {
  WHATSAPP_PRICING_COLLECTION,
  WHATSAPP_PRICING_DOC_ID,
  defaultWhatsappPricing,
  normalizeWhatsappPricing,
} from '../lib/whatsappPricing.js'

// Live global WhatsApp CRM pricing (settings/whatsappPricing). Read-safe for any
// authenticated user; savePricing / resetPricing succeed only for backend admins
// (Firestore rules enforce this). No secrets, no per-workspace data.
export function useWhatsappPricing({ enabled = true } = {}) {
  const [pricing, setPricing] = useState(() => defaultWhatsappPricing())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !db) {
      Promise.resolve().then(() => {
        setPricing(defaultWhatsappPricing())
        setLoading(false)
        setError('')
      })
      return undefined
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const ref = doc(db, WHATSAPP_PRICING_COLLECTION, WHATSAPP_PRICING_DOC_ID)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setPricing(normalizeWhatsappPricing(snap.exists() ? snap.data() : {}))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load WhatsApp pricing.'))
        setPricing(defaultWhatsappPricing())
        setLoading(false)
      },
    )
    return () => unsub?.()
  }, [enabled])

  return useMemo(() => {
    const ref = () => doc(db, WHATSAPP_PRICING_COLLECTION, WHATSAPP_PRICING_DOC_ID)

    async function write(values, meta = {}) {
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      const safe = normalizeWhatsappPricing(values)
      try {
        await setDoc(
          ref(),
          {
            ...safe,
            updatedBy: meta.updatedBy || '',
            updatedByEmail: meta.updatedByEmail || '',
            lastUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        return { ok: true }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to save WhatsApp pricing.') }
      }
    }

    return {
      pricing,
      loading,
      error,
      // Persist a full pricing object (admin only — Firestore-enforced).
      savePricing(values, meta) {
        return write(values, meta)
      },
      // Restore the canonical default pricing.
      resetPricing(meta) {
        return write(defaultWhatsappPricing(), meta)
      },
    }
  }, [pricing, loading, error])
}
