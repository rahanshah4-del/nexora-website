import { useMemo, useState } from 'react'
import Table from '../../components/ui/Table.jsx'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'

function defaultCell(row, column) {
  if (typeof column.render === 'function') return column.render(row)
  if (typeof column.cell === 'function') return column.cell(row)
  return row?.[column.key]
}

function resolveRowId(row, getRowId) {
  if (typeof getRowId === 'function') return getRowId(row)
  return row?.id || row?.key || row?.orderNumber || row?.name || ''
}

function rowMatchesQuery(row, columns, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return columns.some((col) => {
    const val = typeof col.render === 'function' ? col.render(row) : row[col.key]
    return String(val ?? '').toLowerCase().includes(q)
  })
}

export default function ReportDataTable({
  columns = [],
  rows = [],
  emptyState = 'No report rows yet.',
  getRowId,
  className = '',
  searchable: searchableProp,
  searchPlaceholder = 'Search rows...',
}) {
  // Auto-enable search when there are more than 8 rows, unless explicitly disabled
  const searchable = searchableProp !== undefined ? searchableProp : rows.length > 8
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRows = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return rows
    return rows.filter((row) => rowMatchesQuery(row, columns, searchQuery))
  }, [rows, columns, searchable, searchQuery])

  const adaptedColumns = columns.map((column) => ({
    key: column.key,
    header: column.header || column.label || column.key,
    cell: (row) => (
      <div className={`${column.numeric ? 'text-right tabular-nums' : 'text-left'} ${column.className || ''}`}>
        {defaultCell(row, column)}
      </div>
    ),
  }))
  const adaptedRows = filteredRows.map((row) => {
    const id = resolveRowId(row, getRowId)
    return id && !row.id ? { ...row, id } : row
  })

  return (
    <div className={`min-w-0 ${className}`}>
      {/* ── Search ── */}
      {searchable && rows.length > 0 ? (
        <div className="relative mb-3">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-1 focus:ring-sky-200"
          />
          {searchQuery ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              {filteredRows.length}/{rows.length}
            </span>
          ) : null}
        </div>
      ) : null}

      {adaptedRows.length ? (
        <div className="min-w-0 overflow-x-auto">
          <Table columns={adaptedColumns} rows={adaptedRows} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
          {searchQuery ? `No rows match "${searchQuery}"` : emptyState}
        </div>
      )}
    </div>
  )
}
