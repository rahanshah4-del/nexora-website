import { cn } from '../../utils/cn.js'

const styles = {
  base: 'focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
  primary:
    'bg-slate-950 text-white shadow-sm hover:bg-slate-800 hover:shadow-md active:bg-slate-900',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200',
  subtle:
    'border border-slate-200/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm hover:border-slate-300 hover:bg-white hover:shadow-md active:bg-slate-50',
}

export default function Button({
  variant = 'primary',
  className,
  ...props
}) {
  return <button className={cn(styles.base, styles[variant], className)} {...props} />
}
