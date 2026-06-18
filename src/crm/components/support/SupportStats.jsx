import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'

export default function SupportStats({ stats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Open</p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{stats.open}</p>
        <Badge variant="warning" className="mt-2">Needs action</Badge>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">In Progress</p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{stats.inProgress}</p>
        <Badge variant="info" className="mt-2">Assigned</Badge>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Resolved</p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{Number(stats.resolved || 0) + Number(stats.completed || 0)}</p>
        <Badge variant="success" className="mt-2">Completed</Badge>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Urgent</p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{stats.urgent}</p>
        <Badge variant="danger" className="mt-2">Priority</Badge>
      </Card>
    </div>
  )
}
