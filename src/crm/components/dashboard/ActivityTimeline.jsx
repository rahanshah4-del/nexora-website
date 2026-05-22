import Badge from '../ui/Badge.jsx'

export default function ActivityTimeline({ items }) {
  return (
    <ol className="space-y-4">
      {items.map((it) => (
        <li key={it.id} className="flex gap-3">
          <div className="mt-1 h-2 w-2 flex-none rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-glow" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{it.title}</p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">{it.detail}</p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <Badge variant="purple" className="hidden sm:inline-flex">
                  {it.badge}
                </Badge>
                <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{it.time}</span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

