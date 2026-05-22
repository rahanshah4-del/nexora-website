import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import { useMemo, useState } from 'react'
import { useActivityLogs } from '../hooks/useActivityLogs.js'
import ActivityFilters from '../components/activity/ActivityFilters.jsx'
import ActivityLogTable from '../components/activity/ActivityLogTable.jsx'
import ActivityTimeline from '../components/activity/ActivityTimeline.jsx'

export default function ActivityLogsPage() {
  const api = useActivityLogs()
  const [filters, setFilters] = useState({ query: '', user: 'All', module: 'All', from: '', to: '' })

  const users = useMemo(() => Array.from(new Set(api.logs.map((l) => l.userName).filter(Boolean))).sort(), [api.logs])
  const modules = useMemo(() => Array.from(new Set(api.logs.map((l) => l.module).filter(Boolean))).sort(), [api.logs])

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const from = filters.from ? new Date(filters.from).getTime() : null
    const to = filters.to ? new Date(filters.to).getTime() + 86400000 - 1 : null
    return api.logs.filter((l) => {
      const textOk =
        !q ||
        l.userName.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      const userOk = filters.user === 'All' ? true : l.userName === filters.user
      const moduleOk = filters.module === 'All' ? true : l.module === filters.module
      const at = l.createdAt?.getTime?.() || 0
      const fromOk = from ? at >= from : true
      const toOk = to ? at <= to : true
      return textOk && userOk && moduleOk && fromOk && toOk
    })
  }, [api.logs, filters])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Activity Logs"
        subtitle="Audit logs, system/user actions, filters, and timeline (demo fallback + Firestore)."
        right={
          <Button variant="subtle" className="rounded-2xl" type="button">
            Export Logs (Placeholder)
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge variant={api.source === 'firestore' ? 'success' : 'default'}>
          {api.loading ? 'Loading…' : api.source === 'firestore' ? 'Live' : 'Demo'}
        </Badge>
        {api.error ? <Badge variant="danger">Error</Badge> : null}
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Filters</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Filter by user, module, date, and search</p>
          </div>
          <Badge variant="purple">Filters</Badge>
        </div>
        <div className="mt-4">
          <ActivityFilters value={filters} onChange={setFilters} userOptions={users} moduleOptions={modules} />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Timeline</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Latest events</p>
            </div>
            <Badge variant="purple">Timeline</Badge>
          </div>
          <div className="mt-4">
            {api.loading ? (
              <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">Loading…</div>
            ) : filtered.length ? (
              <ActivityTimeline items={filtered.slice(0, 10)} />
            ) : (
              <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
                No activity found.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Log Table</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Searchable activity table</p>
            </div>
            <Badge variant="purple">{filtered.length} rows</Badge>
          </div>
          <div className="mt-4">
            <ActivityLogTable rows={filtered} loading={api.loading} />
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
