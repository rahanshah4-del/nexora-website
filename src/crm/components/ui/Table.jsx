import { cn } from '../../utils/cn.js'

export default function Table({ columns, rows, className }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-white/20 dark:border-white/10', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15 bg-white/30 dark:divide-white/10 dark:bg-slate-900/25">
            {rows.map((row, idx) => (
              <tr key={row.id ?? idx} className="hover:bg-white/40 dark:hover:bg-white/5">
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

