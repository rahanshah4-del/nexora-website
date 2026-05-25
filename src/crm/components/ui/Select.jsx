import { cn } from '../../utils/cn.js'

export default function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 shadow-sm outline-none transition duration-200 hover:border-slate-300 focus:border-sky-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100',
        className,
      )}
      {...props}
    />
  )
}
