import { cn } from '../../utils/cn.js'

export default function ProgressBar({ value = 0, tone = 'indigo', className }) {
  const toneMap = {
    indigo: 'from-indigo-500 to-fuchsia-500',
    emerald: 'from-emerald-500 to-sky-500',
    amber: 'from-amber-500 to-fuchsia-500',
    rose: 'from-rose-500 to-fuchsia-500',
  }

  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('h-2 w-full rounded-full bg-slate-900/5 dark:bg-white/10', className)}>
      <div
        className={cn('h-2 rounded-full bg-gradient-to-r', toneMap[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

