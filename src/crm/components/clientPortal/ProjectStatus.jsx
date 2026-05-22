import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'

export default function ProjectStatus({ project }) {
  if (!project) return null
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Project Status</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">{project.name}</p>
        </div>
        <Badge variant="purple">{project.status}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {project.steps.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                s.done ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-glow' : 'bg-slate-400/40 dark:bg-white/10'
              }`}
            />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.label}</p>
            {s.done ? <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">Done</span> : <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">Pending</span>}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Last update: {project.lastUpdate}</p>
    </Card>
  )
}

