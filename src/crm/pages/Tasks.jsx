import { motion } from 'framer-motion'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Table from '../components/ui/Table.jsx'

export default function TasksPage() {
  const columns = [
    { key: 'id', header: 'Task ID' },
    { key: 'title', header: 'Task', cell: (r) => <span className="font-semibold">{r.title}</span> },
    { key: 'assignee', header: 'Assignee', cell: (r) => <Badge variant="default">{r.assignee}</Badge> },
    { key: 'channel', header: 'Channel', cell: (r) => <Badge variant="info">{r.channel}</Badge> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const v = r.status === 'Done' ? 'success' : r.status === 'Overdue' ? 'danger' : 'warning'
        return <Badge variant={v}>{r.status}</Badge>
      },
    },
    { key: 'dueDate', header: 'Due' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Follow-ups"
        subtitle="Daily follow-up tasks, reminders, and overdue alerts."
        right={<Button className="rounded-2xl">Create Task</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Task Queue</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Auto reminders and task assignment</p>
            </div>
            <Badge variant="purple">Automation</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="Search tasks…" />
            <Input placeholder="Filter (Overdue / Pending)" />
          </div>
          <div className="mt-4">
            <Table columns={columns} rows={[]} emptyTitle="No activity recorded yet" emptyDescription="Add your first record to start tracking follow-ups." />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Calendar</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Calendar integration can be added after approval.
          </p>
          <div className="mt-4 space-y-3">
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Today</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">2 follow-ups</p>
            </div>
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Overdue</p>
              <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-200">1 task</p>
            </div>
            <Button variant="subtle" className="w-full rounded-2xl">
              Send Email Reminders
            </Button>
            <Button variant="ghost" className="w-full rounded-2xl">
              WhatsApp Reminder
            </Button>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
