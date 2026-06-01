export const FIREBASE_ERROR_MESSAGES = {
  'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
  'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
  'auth/user-not-found': 'Account not found.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/network-request-failed': 'Internet connection problem. Please try again.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/unauthorized-domain': 'Login configuration issue. Contact support.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Contact support.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
  'permission-denied': 'You do not have permission to perform this action.',
  'firestore/permission-denied': 'You do not have permission to perform this action.',
  'storage/unauthorized': 'You do not have permission to perform this action.',
  unavailable: 'Service is temporarily unavailable. Please try again.',
  unauthenticated: 'Please sign in to continue.',
}

const MESSAGE_MATCHERS = [
  {
    pattern: /missing or insufficient permissions/i,
    message: 'Your account does not have access to this feature. Contact your administrator.',
  },
  {
    pattern: /failed to fetch|networkerror|network error|load failed/i,
    message: 'Unable to connect to server. Check your internet connection.',
  },
  {
    pattern: /permission-denied|permission denied/i,
    message: 'You do not have permission to perform this action.',
  },
  {
    pattern: /auth\/popup-closed-by-user/i,
    message: 'Sign-in cancelled. Please try again.',
  },
]

const TECHNICAL_WORDS = /\b(firebase|firestore|backend|database|collection|debug|stack|sdk)\b/i

export function handledErrorCodes() {
  return Object.keys(FIREBASE_ERROR_MESSAGES)
}

function technicalLogEnabled() {
  return typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)
}

export function reportTechnicalError(error, context = 'Application error') {
  if (!technicalLogEnabled() || !error) return
  console.error(`[Nexora] ${context}`, error)
}

export function getErrorCode(error) {
  if (!error) return ''
  if (typeof error?.code === 'string') return error.code
  if (typeof error?.name === 'string' && FIREBASE_ERROR_MESSAGES[error.name]) return error.name

  const raw = typeof error === 'string' ? error : error?.message
  if (typeof raw !== 'string') return ''

  const authMatch = raw.match(/auth\/[a-z0-9-]+/i)
  if (authMatch) return authMatch[0].toLowerCase()
  const permissionMatch = raw.match(/permission-denied/i)
  if (permissionMatch) return 'permission-denied'
  return ''
}

export function friendlyErrorMessage(error, fallback = 'Something went wrong. Please try again.', options = {}) {
  const { context = 'Application error', report = true } = options
  if (report) reportTechnicalError(error, context)

  const raw = typeof error === 'string' ? error : error?.message
  const message = typeof raw === 'string' ? raw.trim() : ''
  if (message && MESSAGE_MATCHERS[0].pattern.test(message)) return MESSAGE_MATCHERS[0].message

  const code = getErrorCode(error)
  if (code && FIREBASE_ERROR_MESSAGES[code]) return FIREBASE_ERROR_MESSAGES[code]

  if (!message) return fallback

  for (const matcher of MESSAGE_MATCHERS) {
    if (matcher.pattern.test(message)) return matcher.message
  }

  const cleaned = message.replace(/\s*Firebase:\s*/gi, '').replace(/\s*Error\s*\([^)]*\)\.?/gi, '').trim()
  if (!cleaned || TECHNICAL_WORDS.test(cleaned)) return fallback
  return cleaned
}

export function clientSafeMessage(error, fallback = 'Something went wrong. Please try again.', options = {}) {
  return friendlyErrorMessage(error, fallback, options)
}

export function errorTone(error) {
  const code = getErrorCode(error)
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'warning'
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'warning'
  if (code === 'unauthenticated') return 'info'
  return 'error'
}
