import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import AdvancedTable from '../system/AdvancedTable.jsx'

function variantForStatus(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending') return 'warning'
  return 'default'
}

export default function SubscriptionHistory({ rows, loading }) {
  const columns = [
    { key: 'changedAt', header: 'Date' },
    { key: 'plan', header: 'Plan', cell: (r) => <span className="font-semibold">{r.plan}</span> },
    { key: 'billingCycle', header: 'Billing' },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={variantForStatus(r.status)}>{r.status}</Badge> },
    { key: 'note', header: 'Note' },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Subscription History</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Approved upgrades and plan changes (demo fallback)</p>
        </div>
        <Badge variant="purple">History</Badge>
      </div>
      <div className="mt-4">
        <AdvancedTable
          columns={columns}
          rows={rows}
          loading={loading}
          emptyTitle="No subscription history"
          emptyDescription="Approved upgrades will show here."
        />
      </div>
    </Card>
  )
}

