import { cn } from '../../utils/cn.js'

const variants = {
  default:
    'border-slate-200/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm',
  success:
    'border-emerald-200/60 bg-emerald-50/80 text-emerald-700 shadow-sm backdrop-blur-sm',
  warning:
    'border-amber-200/60 bg-amber-50/80 text-amber-700 shadow-sm backdrop-blur-sm',
  danger:
    'border-rose-200/60 bg-rose-50/80 text-rose-700 shadow-sm backdrop-blur-sm',
  info:
    'border-sky-200/60 bg-sky-50/80 text-sky-700 shadow-sm backdrop-blur-sm',
  purple:
    'border-indigo-200/60 bg-indigo-50/80 text-indigo-700 shadow-sm backdrop-blur-sm',
}

export default function Badge({ variant = 'default', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
