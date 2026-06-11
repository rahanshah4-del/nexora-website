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

      // Save WhatsApp Business connection metadata from the Connect wizard.
      // Only non-secret fields are written; the access token is configured
      // securely from the Nexora backend and never stored here. The existing
      // whatsappApiMode (set by the admin) is intentionally preserved.
      async saveConnection(details = {}) {
        const displayName = String(details.displayName || '').trim()
        const phone = normalizePhone(details.connectedNumber)
        const phoneNumberId = String(details.phoneNumberId || '').trim()
        const businessAccountId = String(details.businessAccountId || '').trim()
        const webhookVerifyLabel = String(details.webhookVerifyLabel || '').trim()
        const missing = []
        if (!displayName) missing.push('WhatsApp Business Display Name')
        if (!phone) missing.push('Business Phone Number')
        if (!phoneNumberId) missing.push('Meta Phone Number ID')
        if (!businessAccountId) missing.push('Meta Business Account ID')
        if (missing.length) {
          return { ok: false, error: `Required field(s) missing: ${missing.join(', ')}.`, code: 'validation_failed' }
        }
        return writeConfig(
          {
            displayName,
            connectedNumber: phone,
            connectedNumberLabel: displayName,
            phoneNumberId,
            businessAccountId,
            webhookVerifyLabel,
            status: 'pending',
            connectionStatus: 'pending_verification',
            webhookStatus: 'pending',
            webhookVerified: false,
          },
          {
            action: 'WhatsApp Business connected',
            description: `WhatsApp Business details saved (${phone}).`,
            metadata: { connectedNumber: phone, phoneNumberId, businessAccountId, displayName },
          },
        )
      },

      // Persist a WhatsApp Business connection produced by the Meta Embedded
      // Signup / Coexistence flow. Only non-secret metadata is written — the Meta
      // access token is exchanged and stored server-side in the Nexora worker and
      // is never present here. The worker has already validated the Firebase ID
      // token and workspace access before returning this metadata.
      async saveEmbeddedConnection(details = {}) {
        const phone = normalizePhone(details.connectedNumber)
        const phoneNumberId = String(details.phoneNumberId || '').trim()
        const businessAccountId = String(details.businessAccountId || '').trim()
        const businessName = String(details.businessName || '').trim()
        const displayName = String(details.displayName || businessName || '').trim()
        if (!phoneNumberId && !businessAccountId) {
          return {
            ok: false,
            error: 'Meta did not return a Phone Number ID or WhatsApp Business Account ID. Use Manual Advanced Setup.',
            code: 'incomplete_signup',
          }
        }
        return writeConfig(
          {
            displayName,
            businessName,
            connectedNumber: phone,
            connectedNumberLabel: displayName,
            phoneNumberId,
            businessAccountId,
            webhookUrl: String(details.webhookUrl || '').trim(),
            webhookVerifyLabel: String(details.webhookVerifyLabel || '').trim(),
            status: 'pending',
            // Backend webhook verification flips this to 'connected'.
            connectionStatus: String(details.connectionStatus || 'pending_verification'),
            verificationStatus: String(details.verificationStatus || 'verified'),
            webhookStatus: String(details.webhookStatus || 'pending'),
            webhookVerified: false,
            connectedAt: serverTimestamp(),
            lastVerificationAt: serverTimestamp(),
          },
          {
            action: 'WhatsApp Business connected (Embedded Signup)',
            description: `WhatsApp Business connected via Meta Embedded Signup${phone ? ` (${phone})` : ''}.`,
            metadata: { connectedNumber: phone, phoneNumberId, businessAccountId, businessName },
          },
        )
      },

      // Reset the connection status back to a clean "not connected" state without
      // touching trial usage history. Used by the wizard "try again" path and by
      // the admin Control Centre "Reset connection status" action.
      async resetConnectionStatus() {
        return writeConfig(
          {
            status: 'not_connected',
            connectionStatus: 'not_connected',
            verificationStatus: '',
            webhookStatus: '',
            webhookVerified: false,
          },
          {
            action: 'WhatsApp connection status reset',
            description: 'WhatsApp connection status was reset to not connected.',
          },
        )
      },

      // Local validation only — does NOT call the Meta API. Confirms the saved
      // connection has all required fields, then marks it ready for backend
      // verification. Real verification happens server-side later.
      async testConnection() {
        const missing = []
        if (!String(config.displayName || '').trim()) missing.push('WhatsApp Business Display Name')
        if (!String(config.connectedNumber || '').trim()) missing.push('Business Phone Number')
        if (!String(config.phoneNumberId || '').trim()) missing.push('Meta Phone Number ID')
        if (!String(config.businessAccountId || '').trim()) missing.push('Meta Business Account ID')
        if (missing.length) {
          return { ok: false, error: `Save WhatsApp details first. Missing: ${missing.join(', ')}.`, code: 'validation_failed' }
        }
        return writeConfig(
          { connectionStatus: 'test_ready' },
          {
            action: 'WhatsApp connection test ready',
            description: 'WhatsApp Business details validated; backend verification required.',
          },
        )
      },

      // Disconnect: clear non-secret connection fields but keep usage history
      // (message counts, trial window, mode) intact.
      async disconnect() {
        return writeConfig(
          {
            status: 'disconnected',
            connectionStatus: 'disconnected',
            webhookStatus: 'disconnected',
            webhookVerified: false,
            phoneNumberId: '',
            businessAccountId: '',
            connectedNumber: '',
            connectedNumberLabel: '',
            displayName: '',
          },
          {
            action: 'WhatsApp Business disconnected',
            description: 'WhatsApp Business connection disconnected.',
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
