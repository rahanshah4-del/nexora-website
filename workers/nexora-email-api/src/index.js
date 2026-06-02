const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'
const SENDER = 'Nexora Solutions <support@nexorasolution.online>'
const ALLOWED_ORIGINS = new Set([
  'https://nexorasolution.online',
  'http://localhost:5173',
])

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://nexorasolution.online'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
    },
  })
}

function getString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getErrorMessage(data) {
  if (typeof data?.message === 'string') return data.message
  if (typeof data?.error === 'string') return data.error
  if (typeof data?.error?.message === 'string') return data.error.message
  return 'Email could not be sent.'
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      })
    }

    if (url.pathname !== '/send-email') {
      return jsonResponse(request, { success: false, error: 'Not found' }, 404)
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, { success: false, error: 'Method not allowed' }, 405)
    }

    if (!ALLOWED_ORIGINS.has(request.headers.get('Origin') || '')) {
      return jsonResponse(request, { success: false, error: 'Origin not allowed' }, 403)
    }

    if (!env.RESEND_API_KEY) {
      return jsonResponse(request, { success: false, error: 'Email service is not configured.' }, 500)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return jsonResponse(request, { success: false, error: 'Invalid JSON body.' }, 400)
    }

    const to = getString(body?.to)
    const subject = getString(body?.subject)
    const html = getString(body?.html)

    if (!to || !subject || !html) {
      return jsonResponse(request, { success: false, error: 'Missing required fields: to, subject, html.' }, 400)
    }

    try {
      const resendResponse = await fetch(RESEND_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: SENDER,
          to,
          subject,
          html,
        }),
      })

      const data = await resendResponse.json().catch(() => null)
      if (!resendResponse.ok) {
        return jsonResponse(request, { success: false, error: getErrorMessage(data) }, resendResponse.status)
      }

      return jsonResponse(request, { success: true })
    } catch (error) {
      return jsonResponse(request, { success: false, error: error?.message || 'Email could not be sent.' }, 500)
    }
  },
}

