import { cn } from '../../utils/cn.js'

export default function Table({ columns, rows, className }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 dark:border-white/10', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
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
              <tr key={row.id ?? idx} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                {columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3 text-slate-800 dark:text-slate-100">
                    {c.cell ? c.cell(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
