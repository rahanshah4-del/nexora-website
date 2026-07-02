import { forwardRef } from 'react'
import { cn } from '../../utils/cn.js'

function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-400',
        className,
      )}
      {...props}
    />
  )
}

export default forwardRef(Input)
