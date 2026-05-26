import { useMemo } from 'react'
import Badge from '../ui/Badge.jsx'
import AdvancedTable from '../system/AdvancedTable.jsx'

function badgeVariant(priority) {
  if (priority === 'high') return 'danger'
  if (priority === 'medium') return 'warning'
  return 'default'
}

export default function ActivityLogTable({ rows, loading }) {
  const columns = useMemo(
    () => [
      { key: 'createdAtLabel', header: 'Date' },
      { key: 'userName', header: 'User', cell: (r) => <span className="font-semibold">{r.userName}</span> },
      { key: 'module', header: 'Module', cell: (r) => <Badge variant="purple">{r.module}</Badge> },
      { key: 'action', header: 'Action', cell: (r) => <span className="font-semibold">{r.action}</span> },
      { key: 'priority', header: 'Priority', cell: (r) => <Badge variant={badgeVariant(r.priority)}>{r.priority}</Badge> },
      { key: 'description', header: 'Description' },
    ],
    [],
  )

  return (
    <AdvancedTable
      columns={columns}
      rows={rows}
      loading={loading}
      emptyTitle="No activity logs yet"
      emptyDescription="Your system activity will appear here as users perform actions."
    />
  )
}
