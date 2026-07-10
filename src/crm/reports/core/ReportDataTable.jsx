import Table from '../../components/ui/Table.jsx'

function defaultCell(row, column) {
  if (typeof column.render === 'function') return column.render(row)
  if (typeof column.cell === 'function') return column.cell(row)
  return row?.[column.key]
}

function resolveRowId(row, getRowId) {
  if (typeof getRowId === 'function') return getRowId(row)
  return row?.id || row?.key || row?.orderNumber || row?.name || ''
}

export default function ReportDataTable({
  columns = [],
  rows = [],
  emptyState = 'No report rows yet.',
  getRowId,
  className = '',
}) {
  const adaptedColumns = columns.map((column) => ({
    key: column.key,
    header: column.header || column.label || column.key,
    cell: (row) => (
      <div className={`${column.numeric ? 'text-right tabular-nums' : 'text-left'} ${column.className || ''}`}>
        {defaultCell(row, column)}
      </div>
    ),
  }))
  const adaptedRows = rows.map((row) => {
    const id = resolveRowId(row, getRowId)
    return id && !row.id ? { ...row, id } : row
  })

  return (
    <div className={`min-w-0 ${className}`}>
      {adaptedRows.length ? (
        <div className="min-w-0 overflow-x-auto">
          <Table columns={adaptedColumns} rows={adaptedRows} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
          {emptyState}
        </div>
      )}
    </div>
  )
}
