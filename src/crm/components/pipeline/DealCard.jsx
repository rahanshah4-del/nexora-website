import { motion } from 'framer-motion'
import Badge from '../ui/Badge.jsx'
import { cn } from '../../utils/cn.js'

export default function DealCard({ deal, onOpen }) {
  const priorityTone =
    deal.priority === 'High' ? 'danger' : deal.priority === 'Medium' ? 'warning' : 'default'

  return (
    <motion.button
      type="button"
      onClick={() => onOpen?.(deal)}
      whileHover={{ y: -2 }}
      className={cn(
        'focus-ring glass-muted w-full rounded-2xl p-3 text-left transition',
        deal.stage === 'Lost' ? 'opacity-85' : '',
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/dealId', deal.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{deal.title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">{deal.customerName}</p>
        </div>
        <Badge variant={priorityTone}>{deal.priority}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="purple">{deal.winProbability}%</Badge>
        <Badge variant="default">{deal.expectedCloseDate}</Badge>
        {deal.stage === 'Lost' && deal.lostReason ? <Badge variant="danger">{deal.lostReason}</Badge> : null}
      </div>

      <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
        Meetings: <span className="font-semibold text-slate-900 dark:text-white">{deal.meetings?.length ?? 0}</span>
      </div>
    </motion.button>
  )
}

