const footerUrl = 'www.nexorasolution.online'

export function buildNexoraVerificationEmail({ verificationUrl }) {
  const safeUrl = escapeHtml(verificationUrl)

  return {
    subject: 'Verify your Nexora Solution Account',
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Verify your Nexora Solution Account</title>
        </head>
        <body style="margin:0;background:#f4f7fb;padding:0;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0">
                  <tr>
                    <td style="padding:32px 32px 12px;text-align:center">
                      <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#0f172a">Nexora Solution</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px 8px">
                      <h1 style="margin:0;font-size:28px;line-height:1.2;color:#0f172a;text-align:center">Verify your email</h1>
                      <p style="margin:20px 0 0;font-size:16px;line-height:1.7;color:#334155">Welcome to Nexora Solution.</p>
                      <p style="margin:12px 0 0;font-size:16px;line-height:1.7;color:#334155">Please verify your email address to activate your account and start your 1-month free trial.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:24px 32px">
                      <a href="${safeUrl}" style="display:inline-block;border-radius:14px;background:#0f172a;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 24px">Verify My Account</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 26px">
                      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;text-align:center">If the button does not work, copy and paste this link into your browser:</p>
                      <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#475569;word-break:break-all;text-align:center">${safeUrl}</p>
                      <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#64748b;text-align:center">If you did not create this account, you can ignore this email.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f8fafc;padding:22px 32px;text-align:center">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a">Nexora Solution</p>
                      <p style="margin:6px 0 0;font-size:13px;color:#64748b">${footerUrl}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: [
      'Nexora Solution',
      '',
      'Welcome to Nexora Solution.',
      '',
      'Please verify your email address to activate your account and start your 1-month free trial.',
      '',
      `Verify My Account: ${verificationUrl}`,
      '',
      'If you did not create this account, you can ignore this email.',
      '',
      'Nexora Solution',
      footerUrl,
    ].join('\n'),
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
