import { cn } from '../../utils/cn.js'

export default function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'focus-ring h-10 w-full rounded-xl border border-white/30 bg-white/40 px-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100',
        className,
      )}
      {...props}
    />
  )
}

