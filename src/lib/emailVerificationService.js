import { buildNexoraVerificationEmail } from './emailTemplates/nexoraVerificationEmail.js'
import { sendWorkerEmail } from './transactionalEmail.js'

const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY
const firebaseOobEndpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey || ''}`
const technicalLogPrefix = '[Nexora email verification]'

export function getEmailVerificationServiceError() {
  if (!firebaseApiKey) return 'Email verification is not configured.'
  return null
}

export async function sendCustomVerificationEmail(user) {
  const serviceError = getEmailVerificationServiceError()
  if (serviceError) return { ok: false, error: serviceError }

  const to = String(user?.email || '').trim()
  if (!to) return { ok: false, error: 'Email address is missing.' }

  try {
    const verificationUrl = await createFirebaseVerificationLink(user)
    if (!verificationUrl) return { ok: false, error: 'Email verification link was not returned.' }

    const template = buildNexoraVerificationEmail({ verificationUrl })
    const result = await sendWorkerEmail({
      to,
      subject: template.subject,
      html: template.html,
    })

    if (!result.ok) {
      console.warn(technicalLogPrefix, 'Worker verification email failed.', {
        response: result.error,
      })
      return { ok: false, error: result.error || 'Worker email did not confirm delivery.' }
    }

    return { ok: true, provider: 'worker' }
  } catch (error) {
    console.warn(technicalLogPrefix, 'Custom verification email failed.', {
      message: error?.message,
      name: error?.name,
    })
    return { ok: false, error: error?.message || 'Custom verification email failed.' }
  }
}

async function createFirebaseVerificationLink(user) {
  const idToken = await user.getIdToken(true)
  const continueUrl = `${window.location.origin}/workspace`
  const requestBody = {
    requestType: 'VERIFY_EMAIL',
    idToken,
    continueUrl,
    returnOobLink: true,
  }

  const response = await fetch(firebaseOobEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    console.warn(technicalLogPrefix, 'Identity Toolkit OOB link request failed.', {
      endpoint: 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=<redacted>',
      status: response.status,
      response: data,
      requestBody: {
        ...requestBody,
        idToken: '<redacted>',
      },
      hasFirebaseApiKey: Boolean(firebaseApiKey),
      continueUrl,
      authorizedDomainsHint: 'Verify this origin is listed in Firebase Auth > Settings > Authorized domains.',
    })
    return ''
  }
  if (!data?.oobLink) {
    console.warn(technicalLogPrefix, 'Identity Toolkit response did not include oobLink.', {
      response: data,
      requestBody: {
        ...requestBody,
        idToken: '<redacted>',
      },
      hasFirebaseApiKey: Boolean(firebaseApiKey),
      continueUrl,
    })
  }
  return String(data?.oobLink || '')
}
