import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { workspaceDocPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'
import { normalizePhone } from '../lib/whatsappManual.js'
import {
  WHATSAPP_SETTINGS_COLLECTION,
  WHATSAPP_SETTINGS_DOC_ID,
  defaultWhatsappConfig,
  evaluateWhatsappAction,
  normalizeWhatsappConfig,
  stripSecretFields,
  trialMessagesRemaining,
} from '../lib/whatsappApiTrial.js'

// Per-workspace WhatsApp API settings, stored workspace-isolated at
// workspaces/{workspaceId}/whatsappSettings/config. The frontend never reads or
// writes Meta token material — stripSecretFields guards every write path.
export function useWhatsappSettings({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const access = useWorkspaceAccess()
  const canManage = access.canManageSettings
  const [config, setConfig] = useState(() => defaultWhatsappConfig())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !db || !workspaceId) {
      Promise.resolve().then(() => {
        setConfig(defaultWhatsappConfig())
        setLoading(false)
        setError('')
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const ref = doc(db, workspaceDocPath(workspaceId, WHATSAPP_SETTINGS_COLLECTION, WHATSAPP_SETTINGS_DOC_ID))
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setConfig(normalizeWhatsappConfig(snap.exists() ? snap.data() : {}))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load WhatsApp settings.'))
        setConfig(defaultWhatsappConfig())
        setLoading(false)
      },
    )
    return () => unsub?.()
  }, [enabled, workspaceId])

  return useMemo(() => {
    const configRef = () => doc(db, workspaceDocPath(workspaceId, WHATSAPP_SETTINGS_COLLECTION, WHATSAPP_SETTINGS_DOC_ID))

    async function writeConfig(patch, { action, description, metadata } = {}) {
      if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
      if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
      if (!canManage) return { ok: false, error: 'You have view access only. Contact your workspace administrator.' }
      // Defense-in-depth: tokens/secrets can never be persisted from the client.
      const safePatch = stripSecretFields(patch)
      try {
        await setDoc(
          configRef(),
          {
            ...safePatch,
            workspaceId,
            updatedAt: serverTimestamp(),
            updatedBy: userId,
          },
          { merge: true },
        )
        if (action) {
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action,
            module: 'WhatsApp Settings',
            description: description || 'WhatsApp settings updated.',
            targetId: WHATSAPP_SETTINGS_DOC_ID,
            targetName: 'WhatsApp API config',
            metadata: metadata || {},
          }).catch(() => {})
        }
        return { ok: true }
      } catch (e) {
        return { ok: false, error: clientSafeMessage(e, 'Unable to save WhatsApp settings.') }
      }
    }

    return {
      config,
      loading,
      error,
      canManage,

      // Generic settings save (integration config). Secrets are stripped.
      async saveConfig(patch) {
        return writeConfig(patch, {
          action: 'WhatsApp settings updated',
          description: 'WhatsApp integration settings were updated.',
        })
      },

      // Connect a single WhatsApp Business number (trial enforces one number).
      async connectNumber(rawPhone, label = '') {
        const phone = normalizePhone(rawPhone)
        if (!phone) return { ok: false, error: 'Enter a valid WhatsApp Business number.' }
        const gate = evaluateWhatsappAction('connectNumber', config, { phoneNumber: phone })
        if (!gate.ok) return gate
        return writeConfig(
          { connectedNumber: phone, connectedNumberLabel: String(label || '').trim(), webhookVerified: false },
          {
            action: 'WhatsApp number connected',
            description: `WhatsApp Business number connected (${phone}).`,
            metadata: { connectedNumber: phone },
          },
        )
      },

      // Best-effort webhook verification flag. Real token verification happens
      // server-side; the frontend only records the verified status.
      async verifyWebhook() {
        if (!config.connectedNumber) return { ok: false, error: 'Connect a WhatsApp Business number first.' }
        return writeConfig(
          { webhookVerified: true },
          { action: 'WhatsApp webhook verified', description: 'WhatsApp webhook connection verified.' },
        )
      },

      // Enforce trial limits, then increment usage. Used by the (limited) inbox
      // send path. Returns { ok, error } and never persists secrets.
      async recordApiMessage(count = 1) {
        const gate = evaluateWhatsappAction('send', config)
        if (!gate.ok) return gate
        const increment = Math.max(1, Math.floor(Number(count) || 1))
        const remaining = trialMessagesRemaining(config)
        // Paid mode has Infinity remaining; trial is capped at the limit.
        if (Number.isFinite(remaining) && increment > remaining) {
          return { ok: false, error: 'This send would exceed your trial message limit.', code: 'limit_reached' }
        }
        const nextUsed = Math.max(0, Number(config.whatsappTrialMessagesUsed) || 0) + increment
        return writeConfig(
          { whatsappTrialMessagesUsed: nextUsed },
          {
            action: 'WhatsApp message sent',
            description: `${increment} WhatsApp API message(s) sent.`,
            metadata: { whatsappTrialMessagesUsed: nextUsed },
          },
        )
      },

      // Policy check without writing (for disabling buttons / showing reasons).
      can(action, context) {
        return evaluateWhatsappAction(action, config, context)
      },
    }
  }, [config, loading, error, canManage, businessType, firebaseUser, userDoc, userId, workspaceId])
}
