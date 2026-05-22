import { cn } from '../../utils/cn.js'

const styles = {
  base: 'focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60',
  primary:
    'bg-gradient-to-r from-sky-600 to-violet-600 text-white shadow-soft hover:brightness-105',
  ghost:
    'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10',
  subtle:
    'glass-muted text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900/60',
}

export default function Button({
  variant = 'primary',
  className,
  ...props
}) {
  return <button className={cn(styles.base, styles[variant], className)} {...props} />
}

