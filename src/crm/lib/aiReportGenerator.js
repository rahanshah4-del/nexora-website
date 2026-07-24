/**
 * Nexora AI Report Generator
 *
 * Calls Nexora AI (via AI Gateway) to generate a narrative,
 * consultant-style business analysis from restaurant report data.
 */

const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function fmt(n) { return Math.round(num(n)).toLocaleString() }

/**
 * Build a prompt for the AI with restaurant data.
 * Keeps it concise to stay under token limits and get fast responses.
 */
function buildPrompt(reportData) {
  const totalOrders = num(reportData.totalOrders)
  const netSales = num(reportData.netSales)
  const netProfit = num(reportData.netProfit)
  const avgOrder = num(reportData.averageOrderValue)
  const expenses = num(reportData.totalExpenses)
  const discounts = num(reportData.discounts)
  const grossProfit = num(reportData.grossProfit)
  const cancelledOrders = num(reportData.cancelledOrders)
  const profitMargin = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) : '0'

  const salesByType = reportData.salesByType || {}
  const dineIn = num(salesByType['Dine-in'])
  const takeaway = num(salesByType.Takeaway)
  const delivery = num(salesByType.Delivery)

  const topItems = (reportData.topItems || []).slice(0, 5).map(i => `${i.name} (${i.quantity} sold, PKR ${fmt(i.revenue)})`).join(', ')
  const slowItems = (reportData.slowItems || []).slice(0, 3).map(i => `${i.name} (${i.quantity} sold)`).join(', ')

  return `Analyze this restaurant daily data and write a short business report:

DATA:
- Orders: ${totalOrders} (${cancelledOrders} cancelled)
- Net Sales: PKR ${fmt(netSales)}
- Gross Profit: PKR ${fmt(grossProfit)}
- Net Profit: PKR ${fmt(netProfit)} (${profitMargin}% margin)
- Expenses: PKR ${fmt(expenses)} | Discounts: PKR ${fmt(discounts)}
- Avg Order: PKR ${fmt(avgOrder)}
- Dine-in: PKR ${fmt(dineIn)} | Takeaway: PKR ${fmt(takeaway)} | Delivery: PKR ${fmt(delivery)}
${topItems ? `- Top Items: ${topItems}` : ''}
${slowItems ? `- Slow Items: ${slowItems}` : ''}

Write a concise report (under 200 words) with these sections:

### Executive Summary
### Revenue & Profit
### Key Insights
### Risk Flags (skip if none)
### Recommendations (3-5 numbered)
### Tomorrow Outlook

Use PKR. Be direct. No greetings or sign-offs.`
}

/**
 * Generate an AI-powered restaurant report analysis.
 * Uses the existing AI Gateway /chat endpoint (DeepSeek).
 *
 * @param {Object} reportData — restaurant report summary
 * @param {AbortSignal} [signal] — optional abort signal
 * @returns {Promise<{text: string, generatedAt: string}>}
 */
export async function generateAIReport(reportData, signal) {
  const prompt = buildPrompt(reportData)

  // Auto-timeout after 45 seconds (gateway typically responds in 3-8s)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)
  const effectiveSignal = signal || controller.signal

  try {
    const res = await fetch(`${AI_GATEWAY_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
      }),
      signal: effectiveSignal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      let msg = `AI generation failed: ${res.status}`
      try {
        const data = await res.json()
        msg = data.message || data.error || msg
      } catch {}
      throw new Error(msg)
    }

    const data = await res.json()
    return {
      text: data.text || '',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('AI request timed out. Please check your internet connection and try again.')
    }
    throw err
  }
}
