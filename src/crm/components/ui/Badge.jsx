import { cn } from '../../utils/cn.js'

const variants = {
  default:
    'border-white/30 bg-white/40 text-slate-800 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100',
  success:
    'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning:
    'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  purple:
    'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
}

export default function Badge({ variant = 'default', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

