import { cn } from '../../utils/cn.js'

export default function SkeletonLoader({ className, lines = 3 }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="h-3 w-full animate-pulse rounded-full bg-slate-900/10 dark:bg-white/10"
          style={{ width: `${90 - idx * 8}%` }}
        />
      ))}
    </div>
  )
}

