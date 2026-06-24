import { memo } from 'react'
import { cn } from '../../utils/cn.js'

const TableRow = memo(function TableRow({ row, columns }) {
  return (
    <tr className="transition hover:bg-slate-50 dark:hover:bg-white/5">
      {columns.map((c) => (
        <td key={c.key} className="whitespace-nowrap px-4 py-3 text-slate-800 dark:text-slate-100">
          {c.cell ? c.cell(row) : row[c.key]}
        </td>
      ))}
    </tr>
  )
})

function MobileTableRow({ row, columns }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
      <div className="grid gap-2 sm:grid-cols-2">
        {columns.map((column) => (
          <div key={column.key} className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{column.header}</p>
            <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
              {column.cell ? column.cell(row) : row[column.key]}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Table({ columns, rows, className }) {
  return (
    <div className={cn('min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 dark:border-white/10', className)}>
      <div className="crm-table-stack">
        <div className="crm-table-scroll">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-200">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/10 dark:bg-slate-900/25">
              {rows.map((row, idx) => (
                <TableRow key={row.id ?? idx} row={row} columns={columns} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="crm-table-mobile space-y-3">
          {rows.map((row, idx) => (
            <MobileTableRow key={row.id ?? idx} row={row} columns={columns} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default memo(Table)
