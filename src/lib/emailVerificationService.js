import { buildNexoraVerificationEmail } from './emailTemplates/nexoraVerificationEmail.js'
import { sendEmailVerification } from 'firebase/auth'

const resendApiKey = import.meta.env.VITE_RESEND_API_KEY
const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY
const resendEmailEndpoint = 'https://api.resend.com/emails'
const firebaseOobEndpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey || ''}`
const technicalLogPrefix = '[Nexora email verification]'

export function getEmailVerificationServiceError() {
  if (!resendApiKey) return 'Email service unavailable'
  if (!firebaseApiKey) return 'Email verification is not configured.'
  return null
}

export async function sendCustomVerificationEmail(user) {
  const serviceError = getEmailVerificationServiceError()
  if (serviceError) return sendDefaultVerificationEmail(user, serviceError)

  const to = String(user?.email || '').trim()
  if (!to) return { ok: false, error: 'Email address is missing.' }

  try {
    const verificationUrl = await createFirebaseVerificationLink(user)
    if (!verificationUrl) return sendDefaultVerificationEmail(user, 'Custom Firebase verification link was not returned.')

    const template = buildNexoraVerificationEmail({ verificationUrl })
    const response = await fetch(resendEmailEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nexora Solutions <onboarding@resend.dev>',
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.id) {
      console.warn(technicalLogPrefix, 'Resend verification email failed.', {
        status: response.status,
        response: data,
        hasResendApiKey: Boolean(resendApiKey),
      })
      return sendDefaultVerificationEmail(user, 'Resend did not return an email id.')
    }

    return { ok: true, id: data.id, provider: 'resend' }
  } catch (error) {
    console.warn(technicalLogPrefix, 'Custom verification email failed before fallback.', {
      message: error?.message,
      name: error?.name,
    })
    return sendDefaultVerificationEmail(user, error?.message || 'Custom verification email failed.')
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

async function sendDefaultVerificationEmail(user, reason) {
  if (reason) {
    console.warn(technicalLogPrefix, 'Using Firebase default verification email fallback.', { reason })
  }

  try {
    await sendEmailVerification(user, {
      url: `${window.location.origin}/workspace`,
      handleCodeInApp: false,
    })
    return {
      ok: true,
      fallback: true,
      provider: 'firebase',
      message: 'Verification email sent using default provider.',
    }
  } catch (error) {
    console.warn(technicalLogPrefix, 'Firebase default verification email failed.', {
      code: error?.code,
      message: error?.message,
      name: error?.name,
    })
    return {
      ok: false,
      error: friendlyFirebaseVerificationError(error),
      technicalCode: error?.code,
    }
  }
}

function friendlyFirebaseVerificationError(error) {
  if (error?.code === 'auth/too-many-requests') return 'Too many verification emails were requested. Please wait a few minutes and try again.'
  if (error?.code === 'auth/network-request-failed') return 'Network error while sending verification email. Please check your connection and try again.'
  if (error?.code === 'auth/unauthorized-continue-uri') return 'Verification redirect is not authorized for this domain.'
  if (error?.code === 'auth/invalid-continue-uri') return 'Verification redirect URL is invalid.'
  if (error?.code === 'auth/user-token-expired') return 'Your session expired. Please sign in again.'
  return 'Could not send verification email right now. Please try again.'
}
