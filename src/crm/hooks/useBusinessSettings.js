import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  printerSettings: {
    mode: 'browser',
    defaultPaperSize: 'a4',
    receiptPaperSize: '58mm',
    a4PrinterName: '',
    thermalPrinterName: '',
    connectionType: 'webusb',
    autoPrintInvoices: false,
    autoPrintReports: false,
    autoPrintReceipts: false,
    webUsbVendorId: '',
    webUsbProductId: '',
    webUsbInterface: 0,
    webUsbEndpoint: 1,
  },
  barcodeScannerSettings: {
    enabled: true,
    mode: 'keyboard',
    autoAddToCart: true,
    submitKey: 'Enter',
    minLength: 4,
    scanTimeoutMs: 700,
    deviceName: '',
    lastTestCode: '',
  },
  retailPosPromos: null,
  defaultPosTaxRate: 0,
  defaultInvoiceTaxRate: 0,
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

  // Stable refs — onSnapshot callback reads latest data from refs,
  // so the subscription effect only re-runs when the Firestore doc PATH changes.
  const userDocRef = useRef(userDoc)
  userDocRef.current = userDoc
  const firebaseUserRef = useRef(firebaseUser)
  firebaseUserRef.current = firebaseUser
  const unsubRef = useRef(null)
  const lastPathRef = useRef('')

  // Subscription effect — only re-subscribes when path actually changes
  useEffect(() => {
    if (!db || !workspaceId || !docId) {
      Promise.resolve().then(() => {
        setSettings(defaultBusinessSettings)
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return
    }

    const pathKey = `workspaces/${workspaceId}/businessSettings/${docId}`
    if (lastPathRef.current === pathKey) return // path unchanged — keep existing subscription
    lastPathRef.current = pathKey

    // Tear down old subscription before creating new one
    unsubRef.current?.()
    unsubRef.current = null

    setLoading(true)
    const ref = doc(db, 'workspaces', workspaceId, 'businessSettings', docId)
    unsubRef.current = onSnapshot(
      ref,
      (snap) => {
        const ud = userDocRef.current || {}
        const fb = firebaseUserRef.current || {}
        const fallbackName = ud.company || ud.workspaceName || ''
        const fallbackEmail = ud.email || fb.email || ''
        setSettings({
          ...defaultBusinessSettings,
          businessName: fallbackName,
          email: fallbackEmail,
          phone: ud.phone || '',
          address: ud.companyAddress || ud.address || '',
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
  }, [docId, normalizedBusinessType, workspaceId])

  // Unmount-only cleanup — tears down the subscription when the component unmounts
  useEffect(() => () => {
    unsubRef.current?.()
    unsubRef.current = null
    lastPathRef.current = ''
  }, [])

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
