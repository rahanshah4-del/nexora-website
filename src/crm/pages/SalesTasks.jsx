import { useMemo } from 'react'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import SalesHubModulePage from '../components/sales/SalesHubModulePage.jsx'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'
import { calculateTaskMetrics } from '../lib/salesCalculations.js'

function normalizeTask(row = {}) {
  return {
    ...row,
    title: row.title || 'Untitled task',
    type: row.type || 'Call',
    dueDate: row.dueDate || new Date().toISOString().slice(0, 10),
    owner: row.owner || row.assignedTo || row.assignee || '',
    priority: row.priority || 'Medium',
    status: row.status || 'Upcoming',
    customerName: row.customerName || row.customer || '',
    notes: row.notes || '',
  }
}

const config = {
  title: 'Tasks & Follow-Ups',
  single: 'Task',
  subtitle: 'Manage calls, meetings, emails, WhatsApp reminders, visits, and follow-up workload.',
  modalSubtitle: 'Create a workspace-isolated Sales Hub task.',
  filterKey: 'status',
  searchKeys: ['title', 'type', 'owner', 'priority', 'customerName', 'notes'],
  searchPlaceholder: 'Search tasks by title, customer, owner, type...',
  emptyDescription: 'Create follow-up tasks to keep every lead moving.',
  initial: () => ({ title: '', type: 'Call', dueDate: new Date().toISOString().slice(0, 10), owner: '', priority: 'Medium', status: 'Upcoming', customerName: '', notes: '' }),
  sanitize: normalizeTask,
  fields: [
    { key: 'title', label: 'Task', large: true },
    { key: 'type', label: 'Type', type: 'select', options: ['Call', 'Meeting', 'Email', 'WhatsApp', 'Reminder', 'Visit'] },
    { key: 'customerName', label: 'Customer / Lead' },
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'owner', label: 'Assigned User' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Today', 'Upcoming', 'Overdue', 'Completed'] },
    { key: 'notes', label: 'Notes', type: 'textarea', large: true },
  ],
  summaryFields: [
    { key: 'type', label: 'Type' },
    { key: 'customerName', label: 'Customer' },
    { key: 'owner', label: 'Owner' },
    { key: 'dueDate', label: 'Due' },
  ],
}

export default function SalesTasksPage() {
  const api = useSalesHubCollection('salesTasks', { normalize: normalizeTask, validate: (row) => (!row.title ? 'Task title is required' : '') })
  const metrics = useMemo(() => calculateTaskMetrics(api.rows), [api.rows])
  return (
    <SalesHubModulePage
      config={config}
      api={api}
      metrics={[
        { label: 'Today Tasks', value: metrics.todayTasks, helper: 'Due today' },
        { label: 'Upcoming Tasks', value: metrics.upcomingTasks, helper: 'Future follow-ups' },
        { label: 'Overdue Tasks', value: metrics.overdueTasks, helper: `${metrics.overdueRate}% overdue rate` },
        { label: 'Completed Tasks', value: metrics.completedTasks, helper: `${metrics.completionRate}% completion rate` },
      ]}
      renderExtra={() => (
        <Card className="mt-4 p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Agent Workload</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {metrics.agentWorkload.length ? metrics.agentWorkload.map((item) => (
              <Badge key={item.owner} variant="info">{item.owner}: {item.count}</Badge>
            )) : <p className="text-sm text-slate-500">No workload yet.</p>}
          </div>
        </Card>
      )}
    />
  )
}
