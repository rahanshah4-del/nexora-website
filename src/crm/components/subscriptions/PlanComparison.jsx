import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import AdvancedTable from '../system/AdvancedTable.jsx'

export default function PlanComparison({ plans }) {
  const rows = plans.map((p) => ({
    id: p.id,
    packageName: p.name,
    badge: p.badge,
    features: p.features.join(' • '),
  }))

  const columns = [
    { key: 'packageName', header: 'Package', cell: (r) => <span className="font-semibold">{r.packageName}</span> },
    { key: 'badge', header: 'Tier', cell: (r) => <Badge variant="purple">{r.badge}</Badge> },
    { key: 'features', header: 'Highlights' },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Package Comparison</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Comparison table (high-level)</p>
        </div>
        <Badge variant="purple">Packages</Badge>
      </div>
      <div className="mt-4">
        <AdvancedTable columns={columns} rows={rows} loading={false} emptyTitle="No packages" emptyDescription="Package catalog is empty." />
      </div>
    </Card>
  )
}
