import { HiOutlineArrowTrendingUp, HiOutlineChartBarSquare, HiOutlineCurrencyDollar, HiOutlineDocumentText } from 'react-icons/hi2'
import StatCard from '../dashboard/StatCard.jsx'
import { usePreferences } from '../../hooks/usePreferences.js'
import { convertFromUsd } from '../../utils/currency.js'
import { formatCurrency } from '../../utils/format.js'

export default function KPICards({ kpis }) {
  const { currency } = usePreferences()
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <StatCard
        icon={HiOutlineCurrencyDollar}
        label="Monthly Revenue"
        value={formatCurrency(convertFromUsd(kpis.monthlyRevenueUsd, currency), currency)}
        delta={`+${kpis.salesGrowthPct}%`}
        tone="indigo"
      />
      <StatCard
        icon={HiOutlineArrowTrendingUp}
        label="Sales Growth"
        value={`${kpis.salesGrowthPct}%`}
        delta="+0.6%"
        tone="emerald"
      />
      <StatCard
        icon={HiOutlineChartBarSquare}
        label="Conversion Rate"
        value={`${kpis.conversionRatePct}%`}
        delta="+0.3%"
        tone="sky"
      />
      <StatCard
        icon={HiOutlineDocumentText}
        label="Pending Invoices"
        value={`${kpis.pendingInvoices}`}
        delta="+2"
        tone="amber"
      />
    </div>
  )
}

