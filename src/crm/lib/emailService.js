const resendApiKey = import.meta.env.VITE_RESEND_API_KEY

export const emailServiceConfigured = Boolean(resendApiKey)

export function getEmailServiceError() {
  return emailServiceConfigured ? null : 'Email service is not configured.'
}
