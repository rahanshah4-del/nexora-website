import Badge from '../ui/Badge.jsx'

function dotClass(priority) {
  if (priority === 'high') return 'from-rose-500 to-fuchsia-500'
  if (priority === 'medium') return 'from-amber-500 to-fuchsia-500'
  return 'from-indigo-500 to-fuchsia-500'
}

function badgeVariant(priority) {
  if (priority === 'high') return 'danger'
  if (priority === 'medium') return 'warning'
  return 'default'
}

export default function ActivityTimeline({ items }) {
  return (
    <ol className="space-y-4">
      {items.map((it) => (
        <li key={it.id} className="flex gap-3">
          <div className={`mt-1 h-2 w-2 flex-none rounded-full bg-gradient-to-br ${dotClass(it.priority)} shadow-glow`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {it.module}: {it.action}
                </p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">{it.description}</p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <Badge variant={badgeVariant(it.priority)} className="hidden sm:inline-flex">
                  {it.userName}
                </Badge>
                <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{it.createdAtLabel}</span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

