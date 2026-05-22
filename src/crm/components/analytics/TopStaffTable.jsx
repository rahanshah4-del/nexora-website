import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Table from '../ui/Table.jsx'

export default function TopStaffTable({ staff }) {
  const columns = [
    { key: 'name', header: 'Staff', cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'role', header: 'Role', cell: (r) => <Badge variant="purple">{r.role}</Badge> },
    { key: 'performanceScore', header: 'Score', cell: (r) => <span className="font-semibold">{r.performanceScore}</span> },
    { key: 'lastActive', header: 'Last Active', cell: (r) => <span className="text-xs">{r.lastActive}</span> },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Top Performing Staff</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Performance tracking (demo)</p>
        </div>
        <Badge variant="purple">Team</Badge>
      </div>
      <div className="mt-4">
        <Table columns={columns} rows={staff} />
      </div>
    </Card>
  )
}

