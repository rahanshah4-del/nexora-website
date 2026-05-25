import { HiOutlineArrowTrendingUp, HiOutlineChartBarSquare, HiOutlineCurrencyDollar, HiOutlineDocumentText } from 'react-icons/hi2'
import StatCard from '../dashboard/StatCard.jsx'
import { usePreferences } from '../../hooks/usePreferences.js'
import { convertFromUsd } from '../../utils/currency.js'
import { formatCurrency, formatPercentValue, toFiniteNumber } from '../../utils/format.js'

export default function KPICards({ kpis = {} }) {
  const { currency } = usePreferences()
  const displayCurrency = currency || 'PKR'
  const monthlyRevenue = convertFromUsd(toFiniteNumber(kpis.monthlyRevenueUsd), displayCurrency)
  const salesGrowth = toFiniteNumber(kpis.salesGrowthPct)
  const conversionRate = toFiniteNumber(kpis.conversionRatePct)
  const pendingInvoices = toFiniteNumber(kpis.pendingInvoices)

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={HiOutlineCurrencyDollar}
        label="Monthly Revenue"
        value={formatCurrency(monthlyRevenue, displayCurrency)}
        delta={formatPercentValue(salesGrowth, { signDisplay: 'exceptZero' })}
        tone="indigo"
      />
      <StatCard
        icon={HiOutlineArrowTrendingUp}
        label="Sales Growth"
        value={formatPercentValue(salesGrowth)}
        delta={formatPercentValue(salesGrowth, { signDisplay: 'exceptZero' })}
        tone="emerald"
      />
      <StatCard
        icon={HiOutlineChartBarSquare}
        label="Conversion Rate"
        value={formatPercentValue(conversionRate)}
        delta={formatPercentValue(conversionRate, { signDisplay: 'exceptZero' })}
        tone="sky"
      />
      <StatCard
        icon={HiOutlineDocumentText}
        label="Pending Invoices"
        value={String(pendingInvoices)}
        delta={null}
        tone="amber"
      />
    </div>
  )
}
