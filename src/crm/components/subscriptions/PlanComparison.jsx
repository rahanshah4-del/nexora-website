import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import AdvancedTable from '../system/AdvancedTable.jsx'

export default function PlanComparison({ plans }) {
  const rows = plans.map((p) => ({
    id: p.id,
    plan: p.name,
    badge: p.badge,
    features: p.features.join(' • '),
  }))

  const columns = [
    { key: 'plan', header: 'Plan', cell: (r) => <span className="font-semibold">{r.plan}</span> },
    { key: 'badge', header: 'Tier', cell: (r) => <Badge variant="purple">{r.badge}</Badge> },
    { key: 'features', header: 'Highlights' },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Plan Comparison</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Comparison table (high-level)</p>
        </div>
        <Badge variant="purple">Plans</Badge>
      </div>
      <div className="mt-4">
        <AdvancedTable columns={columns} rows={rows} loading={false} emptyTitle="No plans" emptyDescription="Plan catalog is empty." />
      </div>
    </Card>
  )
}

