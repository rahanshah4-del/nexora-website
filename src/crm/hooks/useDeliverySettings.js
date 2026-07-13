import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'
import { DELIVERY_SETTINGS_DEFAULTS } from '../lib/deliveryCalculations.js'

export function useDeliverySettings({ enabled = true } = {}) {
  const { workspaceId, businessType, userId } = useUser()
  const access = useWorkspaceAccess()
  const [settings, setSettings] = useState(DELIVERY_SETTINGS_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId || !enabled) { setLoading(false); return }
    setLoading(true)
    const ref = doc(db, 'workspaces', workspaceId, 'deliverySettings', 'default')
    const unsub = onSnapshot(ref, (snap) => {
      setSettings({ ...DELIVERY_SETTINGS_DEFAULTS, ...(snap.exists() ? snap.data() : {}) })
      setLoading(false)
    }, (err) => { setSettings(DELIVERY_SETTINGS_DEFAULTS); setLoading(false); setError(clientSafeMessage(err, 'Unable to load delivery settings.')) })
    return () => unsub()
  }, [enabled, workspaceId])

  const saveSettings = useCallback(async (patch = {}) => {
    if (!db || !workspaceId) return { ok: false, error: 'Cloud sync not available.' }
    if (!access.canManageSettings) return { ok: false, error: 'Permission denied.' }
    try {
      await setDoc(doc(db, 'workspaces', workspaceId, 'deliverySettings', 'default'),
        { ...DELIVERY_SETTINGS_DEFAULTS, ...patch, workspaceId, businessType, updatedBy: userId || '', updatedAt: serverTimestamp() },
        { merge: true })
      return { ok: true }
    } catch (err) { return { ok: false, error: clientSafeMessage(err, 'Unable to save settings.') } }
  }, [access.canManageSettings, businessType, userId, workspaceId])

  return useMemo(() => ({ settings, loading, error, saveSettings }), [settings, loading, error, saveSettings])
}
