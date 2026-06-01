const resendApiKey = import.meta.env.VITE_RESEND_API_KEY
const resendEmailEndpoint = 'https://api.resend.com/emails'

export function getEmailVerificationServiceError() {
  return resendApiKey ? null : 'Email service is not configured.'
}

export async function sendResendVerificationEmail({ email, name, verificationUrl }) {
  const serviceError = getEmailVerificationServiceError()
  if (serviceError) return { ok: false, error: serviceError }

  const to = String(email || '').trim()
  if (!to) return { ok: false, error: 'Email address is missing.' }

  try {
    const response = await fetch(resendEmailEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nexora Solutions <onboarding@resend.dev>',
        to,
        subject: 'Verify your Nexora account',
        html: buildVerificationHtml({ name, verificationUrl }),
        text: buildVerificationText({ name, verificationUrl }),
      }),
    })

    if (!response.ok) {
      return { ok: false, error: 'Could not send verification email right now.' }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not send verification email right now.' }
  }
}

function buildVerificationHtml({ name, verificationUrl }) {
  const safeName = escapeHtml(name || 'there')
  const safeUrl = escapeHtml(verificationUrl || '')

  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:24px;margin:0 0 12px">Verify your Nexora account</h1>
      <p>Hi ${safeName},</p>
      <p>Use this temporary testing email to continue verifying your Nexora account.</p>
      <p>
        <a href="${safeUrl}" style="display:inline-block;border-radius:12px;background:#0f172a;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">
          Open Nexora verification
        </a>
      </p>
      <p>If the button does not work, open this link:</p>
      <p><a href="${safeUrl}">${safeUrl}</a></p>
    </div>
  `
}

function buildVerificationText({ name, verificationUrl }) {
  return [
    `Hi ${name || 'there'},`,
    '',
    'Use this temporary testing email to continue verifying your Nexora account.',
    '',
    `Open Nexora verification: ${verificationUrl || ''}`,
  ].join('\n')
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
