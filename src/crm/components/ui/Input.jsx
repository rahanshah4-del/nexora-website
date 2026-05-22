import { cn } from '../../utils/cn.js'

export default function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'focus-ring h-10 w-full rounded-xl border border-white/30 bg-white/40 px-3 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:placeholder:text-slate-400',
        className,
      )}
      {...props}
    />
  )
}
