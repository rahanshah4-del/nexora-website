import { useMemo } from 'react'
import {
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineCurrencyDollar,
  HiOutlineExclamationTriangle,
  HiOutlineLightBulb,
  HiOutlineShoppingCart,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineReceiptRefund,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
} from 'react-icons/hi2'

/* ── Helpers ─────────────────────────────────────────────────────── */

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function pct(v, t) { return t > 0 ? (v / t) * 100 : 0 }
function fmt(n) { return Math.round(num(n)).toLocaleString() }

function scoreColor(score) {
  if (score >= 90) return { bg: 'from-emerald-500 to-green-500', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-500/30', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', label: 'Excellent' }
  if (score >= 70) return { bg: 'from-blue-500 to-sky-500', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-200 dark:ring-blue-500/30', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', label: 'Good' }
  if (score >= 50) return { bg: 'from-amber-500 to-orange-500', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-500/30', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', label: 'Average' }
  return { bg: 'from-red-500 to-rose-500', text: 'text-red-700 dark:text-red-300', ring: 'ring-red-200 dark:ring-red-500/30', badge: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300', label: 'Needs Attention' }
}

function verdictInfo(score) {
  if (score >= 90) return { label: 'Excellent Day', emoji: '🌟', color: 'text-emerald-600 dark:text-emerald-400' }
  if (score >= 75) return { label: 'Good Performance', emoji: '✅', color: 'text-blue-600 dark:text-blue-400' }
  if (score >= 50) return { label: 'Needs Attention', emoji: '⚠️', color: 'text-amber-600 dark:text-amber-400' }
  return { label: 'Critical Review Needed', emoji: '🚨', color: 'text-red-600 dark:text-red-400' }
}

/* ── Sub-components ──────────────────────────────────────────────── */

function InsightCard({ icon: Icon, title, children, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200/60 dark:border-slate-700/60',
    emerald: 'border-emerald-200/60 dark:border-emerald-700/40',
    blue: 'border-blue-200/60 dark:border-blue-700/40',
    amber: 'border-amber-200/60 dark:border-amber-700/40',
    red: 'border-red-200/60 dark:border-red-700/40',
    violet: 'border-violet-200/60 dark:border-violet-700/40',
  }
  return (
    <div className={`rounded-2xl border ${tones[tone] || tones.slate} bg-white/80 dark:bg-slate-800/60 p-5 backdrop-blur-sm shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.2)]`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      </div>
      <div className="text-[13px] leading-[1.7] text-slate-600 dark:text-slate-400">
        {children}
      </div>
    </div>
  )
}

function AlertBadge({ type, children }) {
  const styles = {
    critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${styles[type] || styles.info}`}>
      {children}
    </span>
  )
}

/* ── Main Component ──────────────────────────────────────────────── */

/**
 * Restaurant Daily AI Analysis Card
 *
 * Reads the existing businessIntelligence data from the report model
 * and presents a narrative, consultant-style analysis. No external API needed —
 * all analytics are already computed by the BI engine.
 */
export default function RestaurantDailyAIAnalysis({ report = {}, orders = [], prevReport }) {
  const bi = report?.model?.businessIntelligence
  const model = report?.model || {}

  const analysis = useMemo(() => {
    if (!bi) return null

    const health = bi.health // { score, level, factors, subScores }
    const forecast = bi.forecast // { tomorrow, nextWeek, confidence, confidenceScore }
    const alerts = bi.alerts || [] // [{ type, severity, message, category }]
    const trends = bi.trends // { salesTrend, profitTrend, customerGrowth, etc. }
    const prodIntel = bi.productIntelligence // { bestSelling, slowMoving, deadItems, etc. }
    const custIntel = bi.customerIntelligence // { vip, returning, newCustomers, segments }

    const netSales = num(report?.netSales)
    const grossProfit = num(report?.grossProfit)
    const netProfit = num(report?.netProfit)
    const totalOrders = num(report?.totalOrders)
    const cancelledOrders = num(report?.cancelledOrders)
    const avgOrder = num(report?.averageOrderValue)
    const discounts = num(report?.discounts)
    const expenses = num(report?.totalExpenses)
    const totalCustomers = num(custIntel?.totalCustomers)
    const onlineSales = num(report?.onlineSales)
    const cashSales = num(report?.salesByPayment?.Cash)

    const salesByType = report?.salesByType || {}
    const dineIn = num(salesByType['Dine-in'])
    const takeaway = num(salesByType.Takeaway)
    const delivery = num(salesByType.Delivery)

    // ── Executive Summary ─────────────────────────────────────────
    const profitMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0
    const score = health?.score || 50
    const scoreInfo = scoreColor(score)
    const verdict = verdictInfo(score)
    const cancelRate = totalOrders > 0 ? (cancelledOrders / (totalOrders + cancelledOrders)) * 100 : 0

    const execSummary = [
      `Today's business performance scored **${score}/100** (${scoreInfo.label}).`,
      netSales > 0
        ? `Total revenue of **PKR ${fmt(netSales)}** with a **${profitMargin.toFixed(1)}% profit margin**${profitMargin > 15 ? ' — a healthy return.' : profitMargin > 5 ? ' — moderate but sustainable.' : ' — needs margin improvement.'}`
        : 'No sales recorded today.',
      totalOrders > 0
        ? `**${totalOrders} orders** processed across dine-in, takeaway, and delivery channels${cancelledOrders > 0 ? ` (${cancelledOrders} cancelled).` : '.'}`
        : '',
      `Average order value: **PKR ${fmt(avgOrder)}**.`,
    ].filter(Boolean).join(' ')

    // ── Revenue Analysis ──────────────────────────────────────────
    const revenueNotes = []
    if (netSales > 0) {
      const cashPct = pct(cashSales, netSales)
      const onlinePct = pct(onlineSales, netSales)
      revenueNotes.push(`Revenue composition: **${cashPct.toFixed(0)}% cash**, **${onlinePct.toFixed(0)}% digital** payments.`)
      if (dineIn > takeaway + delivery) revenueNotes.push('Dine-in is the primary revenue driver today.')
      if (delivery > dineIn) revenueNotes.push('Delivery sales are dominating — consider delivery-specific promotions.')
      if (takeaway > dineIn) revenueNotes.push('Takeaway demand is strong — ensure packaging efficiency.')
      if (discounts > 0 && netSales > 0) revenueNotes.push(`Discounts of **PKR ${fmt(discounts)}** issued (${pct(discounts, netSales + discounts).toFixed(1)}% of gross).`)
    } else {
      revenueNotes.push('No revenue data available for this period.')
    }

    // ── Menu Insights ─────────────────────────────────────────────
    const menuNotes = []
    const bestItems = (prodIntel?.bestSelling || []).slice(0, 5)
    const slowItems = (prodIntel?.slowMoving || [])
    if (bestItems.length > 0) {
      menuNotes.push(`**Top items:** ${bestItems.map(i => i.name).join(', ')}.`)
    }
    if (slowItems.length > 0) {
      menuNotes.push(`**Slow movers:** ${slowItems.map(i => i.name).join(', ')} — consider bundling or promotion.`)
    }
    if ((prodIntel?.deadItems || []).length > 0) {
      menuNotes.push(`${prodIntel.deadItems.length} item(s) had **zero sales** — review for menu removal.`)
    }
    if (!menuNotes.length) menuNotes.push('Menu performance data not available.')

    // ── Customer Insights ─────────────────────────────────────────
    const custNotes = []
    if (totalCustomers > 0) {
      const vips = (custIntel?.segments?.vip || 0)
      const returning = (custIntel?.segments?.returning || 0)
      const newCust = (custIntel?.segments?.new || 0)
      custNotes.push(`**${totalCustomers} customers** served today.`)
      if (vips > 0) custNotes.push(`**${vips} VIP customers** with 3+ orders — consider loyalty rewards.`)
      if (returning > 0) custNotes.push(`**${returning} returning customers** — retention is strong.`)
      if (newCust > 0) custNotes.push(`**${newCust} new customers** — first impressions matter.`)
    } else {
      custNotes.push('Customer data not available for this period.')
    }

    // ── Risk Detection ────────────────────────────────────────────
    const riskItems = []
    if (cancelRate > 10) riskItems.push({ type: 'critical', text: `High cancellation rate: ${cancelRate.toFixed(1)}%` })
    else if (cancelRate > 5) riskItems.push({ type: 'warning', text: `Elevated cancellations: ${cancelRate.toFixed(1)}%` })
    const refundTotal = num(report?.closing?.cashRefunds || model?.cashReconciliation?.cashRefunds)
    if (refundTotal > 0) riskItems.push({ type: 'info', text: `Refunds: PKR ${fmt(refundTotal)}` })
    const expenseRatio = netSales > 0 ? pct(expenses, netSales) : 0
    if (expenseRatio > 40) riskItems.push({ type: 'critical', text: `Expenses at ${expenseRatio.toFixed(0)}% of sales` })
    else if (expenseRatio > 25) riskItems.push({ type: 'warning', text: `Expenses at ${expenseRatio.toFixed(0)}% of sales` })
    if (discounts > netSales * 0.15) riskItems.push({ type: 'warning', text: 'High discount rate — possible abuse' })

    // ── Smart Recommendations ─────────────────────────────────────
    const recs = bi.executive?.recommendations || []
    const smartRecs = [...recs]
    if (bestItems.length >= 2) {
      smartRecs.push(`Promote **${bestItems[0].name}** + **${bestItems[1].name}** as a combo deal to boost basket size.`)
    }
    if (delivery > dineIn && delivery > 0) {
      smartRecs.push('Delivery is your top channel — invest in delivery packaging and driver efficiency.')
    }
    if (dineIn > delivery + takeaway) {
      smartRecs.push('Dine-in strong — add table-turnover incentives during peak hours.')
    }
    if (profitMargin < 10 && netSales > 0) {
      smartRecs.push('Profit margins are thin — review menu pricing and reduce ingredient waste.')
    }
    if (cancelRate > 5) {
      smartRecs.push('Reduce cancellations — verify order accuracy and decrease kitchen wait times.')
    }
    if (expenseRatio > 25 && netSales > 0) {
      smartRecs.push(`Expenses at ${expenseRatio.toFixed(0)}% — audit non-essential spending and renegotiate supplier contracts.`)
    }
    if (smartRecs.length < 5) {
      smartRecs.push('Track daily performance consistently to build better trend data for AI predictions.')
      smartRecs.push('Encourage customer feedback/reviews to improve service quality.')
    }

    // ── Tomorrow Forecast ─────────────────────────────────────────
    const fc = forecast?.tomorrow
    const forecastText = fc && fc.sales > 0
      ? `Tomorrow: ~PKR **${fmt(fc.sales)}** revenue, **${fc.orders}** orders expected (${forecast?.confidenceLabel || 'Medium'} confidence).`
      : 'Insufficient data for tomorrow\'s forecast — collect more order history.'

    return {
      score, scoreInfo, verdict, execSummary,
      revenueNotes, menuNotes, custNotes,
      riskItems, smartRecs: smartRecs.slice(0, 10),
      forecast, forecastText, bi, model,
      totalOrders, netSales, netProfit, avgOrder, totalCustomers,
    }
  }, [bi, report, model])

  if (!analysis || !bi) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200/60 bg-slate-50/80 dark:bg-slate-800/40 p-8 text-center">
        <HiOutlineSparkles className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">
          AI analysis requires at least one order to generate insights.
        </p>
      </div>
    )
  }

  const { score, scoreInfo, verdict, execSummary, revenueNotes, menuNotes, custNotes, riskItems, smartRecs, forecastText } = analysis

  return (
    <div className="mt-6 space-y-5">
      {/* ── Section Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-violet-200/60 bg-violet-50/80 dark:bg-violet-500/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300 shadow-[0_0_20px_-4px_rgba(139,92,246,0.15)] backdrop-blur-xl">
          <img src="/nexora-ai-logo.png" alt="Nexora AI" className="h-4 w-4 rounded object-cover" />
          Nexora AI Business Analysis
        </div>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Real-time</span>
      </div>

      {/* ── Score + Verdict Row ────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        {/* Score Circle */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 p-6 backdrop-blur-sm shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
          <div className={`relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br ${scoreInfo.bg} shadow-[0_8px_28px_-8px_rgba(0,0,0,0.2)]`}>
            <span className="text-3xl font-black text-white">{score}</span>
            <span className="absolute -bottom-1 rounded-full bg-white dark:bg-slate-900 px-2.5 py-0.5 text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm">/100</span>
          </div>
          <span className={`mt-3 text-sm font-black ${scoreInfo.text}`}>{scoreInfo.label}</span>
        </div>

        {/* Executive Summary */}
        <div className="flex flex-col justify-center rounded-2xl border border-violet-100/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/50 dark:from-violet-500/5 dark:via-slate-800/60 dark:to-purple-500/5 p-6 backdrop-blur-sm shadow-[0_4px_20px_-8px_rgba(139,92,246,0.06)]">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
              <HiOutlineLightBulb className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">AI Executive Summary</h3>
          </div>
          <p className="text-[14px] leading-[1.75] text-slate-700 dark:text-slate-300">
            {execSummary}
          </p>
        </div>
      </div>

      {/* ── Insight Cards Grid ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Analysis */}
        <InsightCard icon={HiOutlineCurrencyDollar} title="Revenue Analysis" tone="emerald">
          <ul className="space-y-1.5">
            {revenueNotes.map((n, i) => <li key={i} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{n}</li>)}
          </ul>
        </InsightCard>

        {/* Sales Insights */}
        <InsightCard icon={HiOutlineShoppingCart} title="Sales Insights" tone="blue">
          <ul className="space-y-1.5 text-[13px]">
            <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />Total orders: <strong className="font-bold text-slate-800 dark:text-slate-200">{analysis.totalOrders}</strong></li>
            <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />Avg order value: <strong className="font-bold text-slate-800 dark:text-slate-200">PKR {fmt(analysis.avgOrder)}</strong></li>
            {num(report?.salesByType?.['Dine-in']) > 0 && <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />Dine-in: PKR {fmt(report?.salesByType?.['Dine-in'])}</li>}
            {num(report?.salesByType?.Takeaway) > 0 && <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />Takeaway: PKR {fmt(report?.salesByType?.Takeaway)}</li>}
            {num(report?.salesByType?.Delivery) > 0 && <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />Delivery: PKR {fmt(report?.salesByType?.Delivery)}</li>}
          </ul>
        </InsightCard>

        {/* Menu Insights */}
        <InsightCard icon={HiOutlineClipboardDocumentList} title="Menu Insights" tone="violet">
          <ul className="space-y-1.5">
            {menuNotes.map((n, i) => <li key={i} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />{n}</li>)}
          </ul>
        </InsightCard>

        {/* Customer Insights */}
        <InsightCard icon={HiOutlineUsers} title="Customer Insights" tone="blue">
          <ul className="space-y-1.5">
            {custNotes.map((n, i) => <li key={i} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />{n}</li>)}
          </ul>
        </InsightCard>

        {/* Expense Analysis */}
        <InsightCard icon={HiOutlineReceiptRefund} title="Expense & Profit" tone="amber">
          <ul className="space-y-1.5 text-[13px]">
            <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Expenses: <strong className="font-bold text-slate-800 dark:text-slate-200">PKR {fmt(num(report?.totalExpenses))}</strong></li>
            <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Gross profit: <strong className="font-bold text-slate-800 dark:text-slate-200">PKR {fmt(num(report?.grossProfit))}</strong></li>
            <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Net profit: <strong className={`font-bold ${num(report?.netProfit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>PKR {fmt(num(report?.netProfit))}</strong></li>
            <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Discounts: PKR {fmt(num(report?.discounts))}</li>
          </ul>
        </InsightCard>

        {/* Risk Detection */}
        <InsightCard icon={HiOutlineExclamationTriangle} title="Risk Detection" tone={riskItems.some(r => r.type === 'critical') ? 'red' : 'amber'}>
          {riskItems.length > 0 ? (
            <div className="space-y-1.5">
              {riskItems.map((r, i) => (
                <AlertBadge key={i} type={r.type}>{r.text}</AlertBadge>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <HiOutlineCheckCircle className="h-4 w-4" /> No significant risks detected.
            </p>
          )}
        </InsightCard>
      </div>

      {/* ── Tomorrow Forecast ──────────────────────────────────── */}
      <div className="rounded-2xl border border-sky-100/60 dark:border-sky-700/40 bg-gradient-to-r from-sky-50/80 to-blue-50/50 dark:from-sky-500/5 dark:to-blue-500/5 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineClock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">Tomorrow Forecast</h3>
          {analysis.forecast?.confidenceScore ? (
            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              analysis.forecast.confidenceScore >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
              analysis.forecast.confidenceScore >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {analysis.forecast.confidenceScore}% confidence
            </span>
          ) : null}
        </div>
        <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          {forecastText}
        </p>
      </div>

      {/* ── AI Recommendations ─────────────────────────────────── */}
      {smartRecs.length > 0 && (
        <div className="rounded-2xl border border-violet-100/60 dark:border-violet-700/40 bg-white/80 dark:bg-slate-800/60 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
              <HiOutlineSparkles className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">AI Recommendations</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {smartRecs.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-violet-100/40 dark:border-violet-700/30 bg-violet-50/50 dark:bg-violet-500/5 p-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-violet-200 dark:bg-violet-500/25 text-[10px] font-black text-violet-700 dark:text-violet-300">{i + 1}</span>
                <p className="text-[12px] leading-[1.6] text-slate-600 dark:text-slate-400">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overall Verdict ────────────────────────────────────── */}
      <div className={`flex items-center gap-3 rounded-2xl border p-5 backdrop-blur-sm ${
        score >= 90 ? 'border-emerald-200/60 bg-emerald-50/80 dark:bg-emerald-500/10 dark:border-emerald-500/30' :
        score >= 75 ? 'border-blue-200/60 bg-blue-50/80 dark:bg-blue-500/10 dark:border-blue-500/30' :
        score >= 50 ? 'border-amber-200/60 bg-amber-50/80 dark:bg-amber-500/10 dark:border-amber-500/30' :
        'border-red-200/60 bg-red-50/80 dark:bg-red-500/10 dark:border-red-500/30'
      }`}>
        <span className="text-3xl">{verdict.emoji}</span>
        <div>
          <p className={`text-lg font-black ${verdict.color}`}>{verdict.label}</p>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            Business Health Score: {score}/100 · {analysis.totalOrders} orders · PKR {fmt(analysis.netSales)} revenue
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <img src="/nexora-ai-logo.png" alt="Nexora AI" className="h-5 w-5 rounded object-cover" />
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Nexora AI</span>
        </div>
      </div>
    </div>
  )
}
