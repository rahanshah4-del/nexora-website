/*
  NEXORA BUSINESS SUITE — AI Client (Placeholder)

  Security note:
  - Do NOT ship an OpenAI API key in the browser for production.
  - For production, proxy requests through your backend (API route / Cloud Functions).
  - This client uses mock responses by default. A direct browser call is only enabled when:
      VITE_OPENAI_BROWSER_DEMO === "true" AND VITE_OPENAI_API_KEY is set.
*/

const apiKey = import.meta.env.VITE_OPENAI_API_KEY
const browserDemo = import.meta.env.VITE_OPENAI_BROWSER_DEMO === 'true'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function bestFollowUpTime(task) {
  const pr = (task?.priority || 'Medium').toLowerCase()
  if (pr === 'high' || pr === 'urgent') return 'Today 4:00 PM'
  return 'Tomorrow 11:30 AM'
}

function suggestedNextAction(lead) {
  const score = Number(lead?.score ?? lead?.aiScore ?? 0)
  if (score >= 85) return 'Send proposal + schedule a closing call'
  if (score >= 70) return 'Book a meeting and share case studies'
  if (score >= 50) return 'Follow up with value summary + ask for availability'
  return 'Re-engage with a short WhatsApp + qualification questions'
}

function formatList(items, max = 5) {
  const rows = items.slice(0, max).map((x, i) => `${i + 1}. ${x}`)
  return rows.length ? rows.join('\n') : '—'
}

export async function generateMockMessage({ channel, contactName, company }) {
  await sleep(280)
  const name = contactName || 'there'
  const org = company ? ` at ${company}` : ''
  if (channel === 'whatsapp') {
    return `Hi ${name}! Quick follow-up${org} — I can share a short summary + next steps. What time today works for a 10‑min call?`
  }
  if (channel === 'email') {
    return `Subject: Quick follow-up${company ? ` — ${company}` : ''}\n\nHi ${name},\n\nFollowing up with a quick summary and next steps. If you’re available, I can walk you through the proposal and timelines.\n\nBest regards,\nNEXORA BUSINESS SUITE`
  }
  return `Hi ${name}${org} — here’s a proposal-ready message with clear next steps and timeline.`
}

export async function generateMockFollowUpSuggestion(task) {
  await sleep(260)
  const customerName = task?.customerName || 'Customer'
  const channel = (task?.type || 'WhatsApp').toLowerCase().includes('email') ? 'email' : 'whatsapp'
  const msg = await generateMockMessage({ channel, intent: 'followup', contactName: customerName, company: '' })
  return {
    bestTime: bestFollowUpTime(task),
    channel,
    message: msg,
    overdue: task?.status === 'Overdue',
  }
}

export async function answerMockCRMQuestion(question, data) {
  await sleep(320)
  const q = (question || '').trim().toLowerCase()
  const leads = data?.leads || []
  const tasks = data?.tasks || []
  const invoices = data?.invoices || []
  const deals = data?.deals || []

  if (!q) return { text: 'Ask me about leads, follow-ups, invoices, tasks, or the sales pipeline.' }

  if (q.includes('hottest') || q.includes('hot leads') || q.includes('top leads')) {
    const hot = [...leads]
      .sort((a, b) => (b.score ?? b.aiScore ?? 0) - (a.score ?? a.aiScore ?? 0))
      .slice(0, 5)
      .map((l) => `${l.name || '—'} (${l.scoreType || 'Lead'} — ${l.score ?? l.aiScore ?? 0}/100)`)
    return { text: `Top leads right now:\n${formatList(hot)}` }
  }

  if (q.includes('follow') || q.includes('overdue') || q.includes('tasks')) {
    const overdue = tasks.filter((t) => t.status === 'Overdue').slice(0, 5).map((t) => `${t.customerName} — ${t.type} — due ${t.dueDate} ${t.dueTime || ''}`.trim())
    const upcoming = tasks.filter((t) => t.status === 'Today' || t.status === 'Upcoming').slice(0, 5).map((t) => `${t.customerName} — ${t.type} — ${t.dueDate}`)
    return { text: `Overdue follow-ups:\n${formatList(overdue)}\n\nNext up:\n${formatList(upcoming)}` }
  }

  if (q.includes('invoice') || q.includes('invoices') || q.includes('pending invoices')) {
    const pending = invoices.filter((i) => i.status === 'Pending').slice(0, 5).map((i) => `${i.invoiceNumber || i.id} — ${i.customerName} — due ${i.dueDate}`)
    const overdue = invoices.filter((i) => i.status === 'Overdue').slice(0, 5).map((i) => `${i.invoiceNumber || i.id} — ${i.customerName} — overdue`)
    return { text: `Pending invoices:\n${formatList(pending)}\n\nOverdue invoices:\n${formatList(overdue)}` }
  }

  if (q.includes('pipeline') || q.includes('summarize') || q.includes('sales pipeline')) {
    const total = deals.reduce((sum, d) => sum + (Number(d.dealValueUsd ?? d.dealValue ?? 0) || 0), 0)
    const risky = deals.filter((d) => (d.winProbability ?? 100) < 40).slice(0, 5).map((d) => `${d.title} — ${d.winProbability}%`)
    return {
      text: `Pipeline summary:\n- Deals: ${deals.length}\n- Total pipeline value (USD base): $${Math.round(total).toLocaleString()}\n- Risky deals:\n${formatList(risky)}`,
    }
  }

  return { text: 'I can help with: hottest leads, overdue follow-ups, pending invoices, and pipeline summary.' }
}

async function callOpenAIChat({ messages }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `OpenAI error: ${res.status}`)
  }
  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content
  return String(content || '').trim()
}

export async function aiAnswerCRM({ question, data }) {
  if (browserDemo && apiKey) {
    const system =
      'You are NEXORA BUSINESS SUITE AI assistant. Answer using the provided CRM data. Be concise and list actionable items.'
    const content = await callOpenAIChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Question: ${question}\n\nCRM_DATA(JSON): ${JSON.stringify(data).slice(0, 8000)}` },
      ],
    })
    return { text: content, mode: 'openai' }
  }
  const out = await answerMockCRMQuestion(question, data)
  return { ...out, mode: 'mock' }
}

export async function aiGenerateMessage({ channel, contactName, company }) {
  // For now we keep message generation mock-first to avoid shipping keys in frontend.
  const text = await generateMockMessage({ channel, contactName, company })
  return { text, mode: 'mock' }
}

export async function aiLeadSummary(lead) {
  await sleep(220)
  const score = clamp(Number(lead?.score ?? lead?.aiScore ?? 0), 0, 100)
  return {
    score,
    conversionProbability: `${clamp(Math.round(score * 0.92), 0, 95)}%`,
    suggestedNextAction: suggestedNextAction({ score }),
    reasons: lead?.reasons || lead?.scoreReasons || [],
    mode: 'mock',
  }
}

export async function aiFollowUpSuggestion(task) {
  const out = await generateMockFollowUpSuggestion(task)
  return { ...out, mode: 'mock' }
}
