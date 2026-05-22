import PageHeader from '../ui/PageHeader.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

export default function ReportsHeader({ loading, source, lastUpdated, onExport }) {
  return (
    <PageHeader
      title="Reports Center"
      subtitle="Central reporting hub across Sales, Finance, Team, Support, Subscriptions, Activity and System."
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={source === 'firestore' ? 'success' : 'default'}>
            {loading ? 'Loading…' : source === 'firestore' ? 'Live' : 'Offline'}
          </Badge>
          <Badge variant="default">Last updated: {lastUpdated}</Badge>
          <Button variant="subtle" className="rounded-2xl" type="button" onClick={onExport}>
            Export (Placeholder)
          </Button>
        </div>
      }
    />
  )
}

