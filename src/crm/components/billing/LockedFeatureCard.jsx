import { HiOutlineLockClosed } from 'react-icons/hi2'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import { cn } from '../../utils/cn.js'

export default function LockedFeatureCard({
  title,
  description,
  className,
  onUpgrade,
}) {
  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-sky-500/10" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40">
            <HiOutlineLockClosed className="text-xl text-slate-900/85 dark:text-white" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button className="rounded-2xl" onClick={onUpgrade} type="button">
            Upgrade
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This feature is available in Business Plan.
          </p>
        </div>
      </div>
    </Card>
  )
}
