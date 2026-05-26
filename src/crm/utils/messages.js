const TECHNICAL_WORDS = /\b(firebase|firestore|backend|database|collection|developer|debug)\b/i

export function clientSafeMessage(error, fallback = 'Something went wrong. Please try again.') {
  const raw = typeof error === 'string' ? error : error?.message
  const message = typeof raw === 'string' ? raw.trim() : ''
  if (!message || TECHNICAL_WORDS.test(message)) return fallback
  return message.replace(/\s*Error\s*\([^)]*\)\.?/gi, '').trim() || fallback
}
