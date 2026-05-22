import { motion } from 'framer-motion'
import Badge from '../ui/Badge.jsx'
import { cn } from '../../utils/cn.js'

export default function FollowUpTaskCard({ task }) {
  const priorityTone = task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'default'
  const typeTone = task.type === 'Meeting' ? 'purple' : task.type === 'Email' ? 'info' : 'default'

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className={cn('glass-muted rounded-2xl p-4')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{task.customerName}</p>
            <p className="truncate text-xs text-slate-600 dark:text-slate-300">{task.email}</p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <Badge variant={typeTone}>{task.type}</Badge>
            <Badge variant={priorityTone}>{task.priority}</Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="default">
            {task.dueDate} {task.dueTime}
          </Badge>
          <Badge variant="info">Assigned: {task.assignedTo}</Badge>
        </div>

        {task.notes ? (
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{task.notes}</p>
        ) : null}
      </div>
    </motion.div>
  )
}

