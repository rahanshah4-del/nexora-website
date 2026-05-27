import { memo } from 'react'
import Table from '../ui/Table.jsx'
import EmptyState from './EmptyState.jsx'
import SkeletonLoader from './SkeletonLoader.jsx'

function AdvancedTable({
  columns,
  rows,
  loading,
  emptyTitle,
  emptyDescription,
  className,
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/30 p-4 dark:border-white/10 dark:bg-slate-900/25">
        <SkeletonLoader lines={6} />
      </div>
    )
  }
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }
  return <Table columns={columns} rows={rows} className={className} />
}

export default memo(AdvancedTable)
