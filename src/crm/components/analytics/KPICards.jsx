import { memo, useMemo } from 'react'
import { HiOutlineArrowTrendingUp, HiOutlineChartBarSquare, HiOutlineCurrencyDollar, HiOutlineDocumentText } from 'react-icons/hi2'
import StatCard from '../dashboard/StatCard.jsx'
import { formatCurrency, formatPercentValue, toFiniteNumber } from '../../utils/format.js'
import { getActiveCurrencyCode } from '../../lib/workspaceCurrency.js'

function KPICards({ kpis = {} }) {
  const currency = getActiveCurrencyCode()
  const displayCurrency = currency || getActiveCurrencyCode()
  // Values are already in the workspace currency — no FX conversion (matches Dashboard).
  const monthlyRevenue = toFiniteNumber(kpis.monthlyRevenueUsd)
  const salesGrowth = toFiniteNumber(kpis.salesGrowthPct)
  const conversionRate = toFiniteNumber(kpis.conversionRatePct)
  const pendingInvoices = toFiniteNumber(kpis.pendingInvoices)
  const cards = useMemo(
    () => [
      {
        icon: HiOutlineCurrencyDollar,
        label: 'Monthly Revenue',
        value: formatCurrency(monthlyRevenue, displayCurrency),
        delta: formatPercentValue(salesGrowth, { signDisplay: 'exceptZero' }),
        tone: 'indigo',
      },
      {
        icon: HiOutlineArrowTrendingUp,
        label: 'Sales Growth',
        value: formatPercentValue(salesGrowth),
        delta: formatPercentValue(salesGrowth, { signDisplay: 'exceptZero' }),
        tone: 'emerald',
      },
      {
        icon: HiOutlineChartBarSquare,
        label: 'Conversion Rate',
        value: formatPercentValue(conversionRate),
        delta: formatPercentValue(conversionRate, { signDisplay: 'exceptZero' }),
        tone: 'sky',
      },
      {
        icon: HiOutlineDocumentText,
        label: 'Pending Invoices',
        value: String(pendingInvoices),
        delta: null,
        tone: 'amber',
      },
    ],
    [conversionRate, displayCurrency, monthlyRevenue, pendingInvoices, salesGrowth],
  )

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  )
}

export default memo(KPICards)
