// WhatsApp API — Trial Access policy.
//
// Pure, side-effect-free policy helpers shared by the workspace WhatsApp
// Settings UI, the Control Centre (admin), the useWhatsappSettings hook, and any
// future WhatsApp API worker. This module is the single source of truth for what
// a workspace may do with the WhatsApp API in each mode:
//
//   manual    — 100% frontend click-to-WhatsApp (wa.me). No Meta API calls.
//   trial-api — limited Meta Cloud API during the 7-day trial (see TRIAL_*).
//   paid-api  — full Meta Cloud API access, governed by the paid plan.
//
// IMPORTANT: Meta access tokens / app secrets / webhook verify tokens MUST NEVER
// be stored in the workspace-readable config doc or sent to the frontend. Token
// material lives only in a secure backend. `stripSecretFields` defends the write
// path so a client can never persist a secret into the config document.

export const WHATSAPP_API_MODES = ['manual', 'trial-api', 'paid-api']

// Lifecycle of a workspace's WhatsApp Business connection. Mirrored on the
// frontend status UIs (Dashboard, Settings, Connect wizard, Control Centre).
export const WHATSAPP_CONNECTION_STATUSES = [
  'not_connected',
  'pending_verification',
  'connected',
  'failed',
  'disconnected',
]

// Embedded Signup / Coexistence verification sub-states (QR / code handshake).
export const WHATSAPP_VERIFICATION_STATUSES = [
  'waiting',
  'qr_pending',
  'code_pending',
  'verified',
  'failed',
]

export const WHATSAPP_TRIAL_DAYS = 7
export const WHATSAPP_TRIAL_MESSAGE_LIMIT = 50
export const WHATSAPP_TRIAL_MAX_NUMBERS = 1
export const WHATSAPP_TRIAL_TEMPLATE_LIMIT = 5

// Firestore location for the per-workspace config doc.
export const WHATSAPP_SETTINGS_COLLECTION = 'whatsappSettings'
export const WHATSAPP_SETTINGS_DOC_ID = 'config'

const DAY_MS = 86400000

// Anything matching these (case-insensitive) is treated as secret and removed
// before any client-side write. The substring checks catch *Token / *Secret.
const SECRET_FIELD_NAMES = ['accesstoken', 'apikey', 'appsecret', 'systemusertoken', 'permanenttoken']

/* -------------------------------- utilities ------------------------------- */

export function toDateValue(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value?.seconds === 'number') {
    const date = new Date(value.seconds * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date) {
  const next = new Date(date.getTime())
  next.setHours(0, 0, 0, 0)
  return next
}

function isSecretFieldName(key) {
  const lower = String(key || '').toLowerCase()
  return lower.includes('token') || lower.includes('secret') || SECRET_FIELD_NAMES.includes(lower)
}

/** Remove any secret-looking keys from a patch before it is written. */
export function stripSecretFields(patch = {}) {
  const clean = {}
  for (const [key, value] of Object.entries(patch || {})) {
    if (isSecretFieldName(key)) continue
    clean[key] = value
  }
  return clean
}

/* ------------------------------ config shape ------------------------------ */

export function defaultWhatsappConfig() {
  return {
    whatsappApiTrialEnabled: false,
    whatsappApiMode: 'manual',
    whatsappTrialMessageLimit: WHATSAPP_TRIAL_MESSAGE_LIMIT,
    whatsappTrialMessagesUsed: 0,
    whatsappTrialStartedAt: null,
    whatsappTrialEndsAt: null,
    whatsappApiEnabledBy: '',
    // Non-secret connection metadata only (never tokens).
    connectedNumber: '',
    connectedNumberLabel: '',
    webhookVerified: false,
    // Connect-wizard metadata (non-secret). Token material is never stored here;
    // webhookVerifyLabel is a human label/reference only, not the verify token.
    displayName: '',
    businessName: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyLabel: '',
    status: '',
    connectionStatus: '',
    verificationStatus: '',
    webhookStatus: '',
    webhookUrl: '',
    templateStatus: '',
    connectedAt: null,
    lastVerificationAt: null,
    lastWebhookAt: null,
    updatedAt: null,
  }
}

export function normalizeWhatsappConfig(record = {}) {
  const safe = record || {}
  const mode = WHATSAPP_API_MODES.includes(safe.whatsappApiMode) ? safe.whatsappApiMode : 'manual'
  const rawLimit = Number(safe.whatsappTrialMessageLimit)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : WHATSAPP_TRIAL_MESSAGE_LIMIT
  const used = Math.max(0, Math.floor(Number(safe.whatsappTrialMessagesUsed) || 0))
  return {
    whatsappApiTrialEnabled: Boolean(safe.whatsappApiTrialEnabled),
    whatsappApiMode: mode,
    whatsappTrialMessageLimit: limit,
    whatsappTrialMessagesUsed: used,
    whatsappTrialStartedAt: safe.whatsappTrialStartedAt || null,
    whatsappTrialEndsAt: safe.whatsappTrialEndsAt || null,
    whatsappApiEnabledBy: String(safe.whatsappApiEnabledBy || ''),
    connectedNumber: String(safe.connectedNumber || ''),
    connectedNumberLabel: String(safe.connectedNumberLabel || ''),
    webhookVerified: Boolean(safe.webhookVerified),
    displayName: String(safe.displayName || ''),
    businessName: String(safe.businessName || ''),
    phoneNumberId: String(safe.phoneNumberId || ''),
    businessAccountId: String(safe.businessAccountId || ''),
    webhookVerifyLabel: String(safe.webhookVerifyLabel || ''),
    status: String(safe.status || ''),
    connectionStatus: String(safe.connectionStatus || ''),
    verificationStatus: String(safe.verificationStatus || ''),
    webhookStatus: String(safe.webhookStatus || ''),
    webhookUrl: String(safe.webhookUrl || ''),
    templateStatus: String(safe.templateStatus || ''),
    connectedAt: safe.connectedAt || null,
    lastVerificationAt: safe.lastVerificationAt || null,
    lastWebhookAt: safe.lastWebhookAt || null,
    updatedAt: safe.updatedAt || null,
  }
}

/* -------------------------------- modes ----------------------------------- */

export function isManualMode(config = {}) {
  return (config.whatsappApiMode || 'manual') === 'manual'
}

export function isTrialMode(config = {}) {
  return config.whatsappApiMode === 'trial-api'
}

export function isPaidMode(config = {}) {
  return config.whatsappApiMode === 'paid-api'
}

export function trialDaysRemaining(config = {}, now = new Date()) {
  const end = toDateValue(config.whatsappTrialEndsAt)
  if (!end) return 0
  return Math.max(0, Math.ceil((startOfDay(end).getTime() - startOfDay(now).getTime()) / DAY_MS))
}

export function trialMessagesRemaining(config = {}) {
  const limit = Math.max(0, Number(config.whatsappTrialMessageLimit) || 0)
  const used = Math.max(0, Number(config.whatsappTrialMessagesUsed) || 0)
  return Math.max(0, limit - used)
}

/** A trial is "active" only while enabled, in trial-api mode, and within the window. */
export function isTrialApiActive(config = {}, now = new Date()) {
  return Boolean(config.whatsappApiTrialEnabled) && isTrialMode(config) && trialDaysRemaining(config, now) > 0
}

/* ----------------------------- capabilities ------------------------------- */

// Capability matrix for the current config. Paid mode unlocks everything (the
// paid plan governs real limits server-side); trial mode is deliberately narrow.
export function whatsappCapabilities(config = {}, now = new Date()) {
  const paid = isPaidMode(config)
  const trialActive = isTrialApiActive(config, now)

  if (paid) {
    return {
      mode: 'paid-api',
      isManual: false,
      isTrial: false,
      isPaid: true,
      trialActive: false,
      canSendApi: true,
      canConnectNumber: true,
      maxNumbers: Infinity,
      canBroadcast: true,
      canBulkMessage: true,
      canAutomation: true,
      canAdvancedAutoReply: true,
      canUnlimitedTemplates: true,
      templateLimit: Infinity,
      messagesRemaining: Infinity,
      daysRemaining: Infinity,
    }
  }

  if (isTrialMode(config)) {
    return {
      mode: 'trial-api',
      isManual: false,
      isTrial: true,
      isPaid: false,
      trialActive,
      // Sending only while the trial window is open AND under the message cap.
      canSendApi: trialActive && trialMessagesRemaining(config) > 0,
      canConnectNumber: true,
      maxNumbers: WHATSAPP_TRIAL_MAX_NUMBERS,
      // Explicitly disabled during trial.
      canBroadcast: false,
      canBulkMessage: false,
      canAutomation: false,
      canAdvancedAutoReply: false,
      canUnlimitedTemplates: false,
      templateLimit: WHATSAPP_TRIAL_TEMPLATE_LIMIT,
      messagesRemaining: trialMessagesRemaining(config),
      daysRemaining: trialDaysRemaining(config, now),
    }
  }

  // manual (default): click-to-WhatsApp only, no Meta API surface.
  return {
    mode: 'manual',
    isManual: true,
    isTrial: false,
    isPaid: false,
    trialActive: false,
    canSendApi: false,
    canConnectNumber: false,
    maxNumbers: 0,
    canBroadcast: false,
    canBulkMessage: false,
    canAutomation: false,
    canAdvancedAutoReply: false,
    canUnlimitedTemplates: false,
    templateLimit: WHATSAPP_TRIAL_TEMPLATE_LIMIT,
    messagesRemaining: 0,
    daysRemaining: 0,
  }
}

// Enforcement gate usable on the client send path and by a future worker.
// `action` ∈ send | connectNumber | broadcast | bulk | automation |
//           advancedAutoReply | template. Returns { ok, error, code }.
export function evaluateWhatsappAction(action, config = {}, context = {}) {
  const now = context.now instanceof Date ? context.now : new Date()
  const caps = whatsappCapabilities(config, now)

  const deny = (error, code) => ({ ok: false, error, code })
  const allow = () => ({ ok: true, error: '', code: 'ok' })

  switch (action) {
    case 'send': {
      if (caps.isPaid) return allow()
      if (caps.isManual) return deny('Manual mode uses click-to-WhatsApp links, not API sending.', 'manual_only')
      if (!caps.trialActive) return deny('Your WhatsApp API trial has ended. Upgrade for full API access.', 'trial_ended')
      if (caps.messagesRemaining <= 0) {
        return deny(`Trial message limit reached (${config.whatsappTrialMessageLimit || WHATSAPP_TRIAL_MESSAGE_LIMIT}). Upgrade to keep sending.`, 'limit_reached')
      }
      return allow()
    }
    case 'connectNumber': {
      if (caps.isPaid) return allow()
      if (!caps.canConnectNumber) return deny('Enable the WhatsApp API trial to connect a number.', 'not_enabled')
      // One number only during trial: block connecting a different number.
      const current = String(config.connectedNumber || '')
      const next = String(context.phoneNumber || '')
      if (current && next && current !== next) {
        return deny('Trial mode allows one WhatsApp Business number. Upgrade to connect more.', 'multi_number')
      }
      return allow()
    }
    case 'broadcast':
      return caps.canBroadcast ? allow() : deny('Broadcast campaigns require a paid WhatsApp API plan.', 'trial_blocked')
    case 'bulk':
      return caps.canBulkMessage ? allow() : deny('Bulk messaging is not available during the WhatsApp API trial.', 'trial_blocked')
    case 'automation':
      return caps.canAutomation ? allow() : deny('AI automation requires a paid WhatsApp API plan.', 'trial_blocked')
    case 'advancedAutoReply':
      return caps.canAdvancedAutoReply ? allow() : deny('Advanced auto replies require a paid WhatsApp API plan.', 'trial_blocked')
    case 'template': {
      if (caps.canUnlimitedTemplates) return allow()
      const count = Math.max(0, Number(context.templateCount) || 0)
      if (count >= caps.templateLimit) {
        return deny(`Trial mode is limited to ${caps.templateLimit} templates. Upgrade for unlimited templates.`, 'template_limit')
      }
      return allow()
    }
    default:
      return deny('Unknown WhatsApp action.', 'unknown_action')
  }
}

// Compact summary for status UIs (Settings card, Control Centre badge).
export function whatsappTrialStatus(config = {}, now = new Date()) {
  const caps = whatsappCapabilities(config, now)
  const limit = Math.max(0, Number(config.whatsappTrialMessageLimit) || WHATSAPP_TRIAL_MESSAGE_LIMIT)
  const used = Math.max(0, Number(config.whatsappTrialMessagesUsed) || 0)
  return {
    mode: caps.mode,
    label: caps.isPaid ? 'Paid API' : caps.isTrial ? 'Trial API' : 'Manual',
    active: caps.isPaid || caps.trialActive,
    daysRemaining: caps.daysRemaining,
    messagesUsed: used,
    messageLimit: limit,
    messagesRemaining: caps.messagesRemaining,
    usagePercent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
    connectedNumber: String(config.connectedNumber || ''),
    webhookVerified: Boolean(config.webhookVerified),
  }
}
