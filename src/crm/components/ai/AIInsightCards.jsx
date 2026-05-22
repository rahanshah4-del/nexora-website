import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import { convertFromUsd } from '../../utils/currency.js'
import { formatCurrency } from '../../utils/format.js'
import { usePreferences } from '../../hooks/usePreferences.js'

export default function AIInsightCards({ insights }) {
  const { currency } = usePreferences()

  const expected = formatCurrency(convertFromUsd(insights.expectedRevenueUsd, currency), currency)

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Best Lead Source</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{insights.bestLeadSource.source}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{insights.bestLeadSource.count} leads</p>
          </div>
          <Badge variant="purple">AI Insight</Badge>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Expected Revenue</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{expected}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Win-probability weighted</p>
          </div>
          <Badge variant="info">Forecast</Badge>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Risky Deals</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{insights.riskyDeals.length}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Low win probability</p>
          </div>
          <Badge variant={insights.riskyDeals.length ? 'warning' : 'default'}>
            {insights.riskyDeals.length ? 'Attention' : 'OK'}
          </Badge>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Low Activity Leads</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{insights.lowActivityLeads.length}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Needs re-engagement</p>
          </div>
          <Badge variant={insights.lowActivityLeads.length ? 'warning' : 'default'}>
            {insights.lowActivityLeads.length ? 'Follow up' : 'OK'}
          </Badge>
        </div>
      </Card>
    </div>
  )
}

