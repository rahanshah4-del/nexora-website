import Badge from '../ui/Badge.jsx'
import FollowUpTaskCard from './FollowUpTaskCard.jsx'

const columns = ['Today', 'Upcoming', 'Overdue', 'Completed']

export default function FollowUpBoard({ grouped, canEdit, canDelete, onEdit, onDelete }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => (
        <section key={col} className="w-[18rem] shrink-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{col}</p>
            <Badge variant={col === 'Overdue' ? 'danger' : col === 'Completed' ? 'success' : 'default'}>
              {(grouped[col] ?? []).length}
            </Badge>
          </div>
          <div className="space-y-3">
            {(grouped[col] ?? []).map((t) => (
              <FollowUpTaskCard
                key={t.id}
                task={t}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
