import { HiOutlineBolt, HiOutlineCheck, HiOutlineExclamationTriangle, HiOutlineInformationCircle, HiOutlineTrash } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import { cn } from '../../utils/cn.js'

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

export default function NotificationItem({ item, onClick, onMarkRead, onDelete, disabled, selected = false, onToggleSelect }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-2xl px-2 py-2 transition hover:bg-white/40 dark:hover:bg-white/10',
        !item.read && 'bg-fuchsia-500/5',
      )}
    >
      {onToggleSelect ? (
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={() => onToggleSelect(item.id)}
          aria-label={`Select notification ${item.title}`}
          className="mt-3 h-4 w-4 flex-none rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 disabled:cursor-not-allowed"
        />
      ) : null}

      <button
        type="button"
        disabled={disabled || (!onClick && item.read)}
        onClick={() => (onClick ? onClick(item) : onMarkRead?.(item.id))}
        className="focus-ring min-w-0 flex-1 rounded-xl px-1 py-1 text-left disabled:cursor-default"
        title={item.read ? 'Already read' : 'Mark as read'}
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

      <div className="flex flex-none items-center gap-1 pt-1">
        {!item.read ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onMarkRead?.(item.id)}
            title="Mark as read"
            aria-label="Mark as read"
            className="focus-ring grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <HiOutlineCheck className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete?.(item.id)}
          title="Delete notification"
          aria-label="Delete notification"
          className="focus-ring grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
        >
          <HiOutlineTrash className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
