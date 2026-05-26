import { motion } from 'framer-motion'
import Badge from '../ui/Badge.jsx'
import { cn } from '../../utils/cn.js'
import { HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2'

export default function FollowUpTaskCard({ task, canEdit = false, canDelete = false, onEdit, onDelete }) {
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

        {(canEdit || canDelete) ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-white/10">
            {canEdit ? (
              <button
                type="button"
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:border-sky-200 hover:text-sky-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
                onClick={() => onEdit?.(task)}
              >
                <HiOutlinePencilSquare className="h-4 w-4" />
                Edit
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700 shadow-sm transition-colors duration-150 hover:bg-rose-100"
                onClick={() => onDelete?.(task)}
              >
                <HiOutlineTrash className="h-4 w-4" />
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}
