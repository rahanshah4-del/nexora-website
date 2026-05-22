import { HiOutlineBolt, HiOutlineExclamationTriangle, HiOutlineInformationCircle } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'

function iconEl(priority) {
  if (priority === 'high') return <HiOutlineExclamationTriangle className="text-lg" />
  if (priority === 'medium') return <HiOutlineBolt className="text-lg" />
  return <HiOutlineInformationCircle className="text-lg" />
}

function badgeFor(priority) {
  if (priority === 'high') return 'danger'
  if (priority === 'medium') return 'warning'
  return 'default'
}

export default function NotificationItem({ item, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="focus-ring w-full rounded-2xl px-3 py-2 text-left hover:bg-white/40 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 flex-none place-items-center rounded-2xl bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          {iconEl(item.priority)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
                {!item.read ? <span className="ml-2 inline-block h-2 w-2 rounded-full bg-fuchsia-500 align-middle" /> : null}
              </p>
              <p className="truncate text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
            </div>
            <div className="flex flex-none items-center gap-2">
              <Badge variant={badgeFor(item.priority)} className="hidden sm:inline-flex">
                {item.type}
              </Badge>
              <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{item.timeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
