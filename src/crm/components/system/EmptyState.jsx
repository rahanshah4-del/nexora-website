import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'

export default function EmptyState({ title = 'Nothing here yet', description = 'No records found.', actionLabel, onAction }) {
  return (
    <Card className="p-6 text-center">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      {actionLabel ? (
        <div className="mt-4 flex justify-center">
          <Button className="rounded-2xl" type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

