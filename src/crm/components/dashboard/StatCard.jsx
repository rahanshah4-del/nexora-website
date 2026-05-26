import { memo } from 'react'
import Card from '../ui/Card.jsx'
import { cn } from '../../utils/cn.js'

function StatCard({ icon: Icon, label, value, delta, tone = 'indigo' }) {
  const toneMap = {
    indigo: 'from-indigo-500/20 via-fuchsia-500/10 to-sky-500/10',
    emerald: 'from-emerald-500/20 via-sky-500/10 to-indigo-500/10',
    amber: 'from-amber-500/20 via-fuchsia-500/10 to-indigo-500/10',
    sky: 'from-sky-500/20 via-indigo-500/10 to-fuchsia-500/10',
  }

  return (
    <div className="min-w-0">
      <Card className="h-full p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
            <p className="mt-1 break-words text-[1.35rem] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white sm:h-11 sm:w-11',
              toneMap[tone],
            )}
          >
            <Icon className="text-xl text-slate-900/85 dark:text-white" />
          </div>
        </div>
        {delta ? (
          <p className="mt-3 truncate text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{delta}</span> vs last month
          </p>
        ) : null}
      </Card>
    </div>
  )
}

export default memo(StatCard)
