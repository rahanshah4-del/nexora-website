import { cn } from '../../utils/cn.js'

const styles = {
  base: 'focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ease-out active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60',
  primary:
    'bg-slate-950 text-white shadow-[0_18px_42px_-24px_rgba(15,23,42,0.9)] hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_22px_50px_-24px_rgba(14,165,233,0.75)]',
  ghost:
    'text-slate-700 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10',
  subtle:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-900/80',
}

export default function Button({
  variant = 'primary',
  className,
  ...props
}) {
  return <button className={cn(styles.base, styles[variant], className)} {...props} />
}
