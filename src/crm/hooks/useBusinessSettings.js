import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { clientSafeMessage } from '../utils/messages.js'

export const defaultBusinessSettings = {
  businessName: '',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
  taxNumber: '',
  currency: 'PKR',
  invoicePrefix: '',
  reportPrefix: '',
  receiptFooter: '',
  signatureUrl: '',
  themeColor: '#2563eb',
}

export function businessSettingsId(businessType) {
  return encodeURIComponent(normalizeBusinessType(businessType || 'General CRM'))
}

export function useBusinessSettings() {
  const { workspaceId, businessType, userId, userDoc, firebaseUser } = useUser()
  const access = useWorkspaceAccess()
  const [settings, setSettings] = useState(defaultBusinessSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const normalizedBusinessType = normalizeBusinessType(businessType)
  const docId = useMemo(() => businessSettingsId(normalizedBusinessType), [normalizedBusinessType])

  useEffect(() => {
    if (!db || !workspaceId || !docId) {
      Promise.resolve().then(() => {
        setSettings(defaultBusinessSettings)
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return undefined
    }

    setLoading(true)
    const ref = doc(db, 'workspaces', workspaceId, 'businessSettings', docId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const fallbackName = userDoc?.company || userDoc?.workspaceName || ''
        const fallbackEmail = userDoc?.email || firebaseUser?.email || ''
        setSettings({
          ...defaultBusinessSettings,
          businessName: fallbackName,
          email: fallbackEmail,
          phone: userDoc?.phone || '',
          address: userDoc?.companyAddress || userDoc?.address || '',
          ...(snap.exists() ? snap.data() : {}),
          businessType: normalizedBusinessType,
        })
        setLoading(false)
        setError('')
      },
      (err) => {
        setSettings(defaultBusinessSettings)
        setLoading(false)
        setError(clientSafeMessage(err, 'Unable to load business settings.'))
      },
    )

    return () => unsub()
  }, [docId, firebaseUser?.email, normalizedBusinessType, userDoc, workspaceId])

  const saveSettings = useCallback(
    async (patch = {}) => {
      if (!db || !workspaceId || !docId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
      if (!access.canManageSettings) {
        return { ok: false, error: 'You have view access only. Contact your workspace administrator to modify settings.' }
      }
      try {
        await setDoc(
          doc(db, 'workspaces', workspaceId, 'businessSettings', docId),
          {
            ...defaultBusinessSettings,
            ...patch,
            workspaceId,
            businessType: normalizedBusinessType,
            updatedBy: userId || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to save business settings.') }
      }
    },
    [access.canManageSettings, docId, normalizedBusinessType, userId, workspaceId],
  )

  return useMemo(
    () => ({
      settings,
      loading,
      error,
      businessType: normalizedBusinessType,
      saveSettings,
      canManageSettings: access.canManageSettings,
    }),
    [access.canManageSettings, error, loading, normalizedBusinessType, saveSettings, settings],
  )
}
