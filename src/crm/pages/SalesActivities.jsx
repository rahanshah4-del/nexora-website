import { useMemo } from 'react'
import Card from '../components/ui/Card.jsx'
import SalesHubModulePage from '../components/sales/SalesHubModulePage.jsx'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'

function normalizeActivity(row = {}) {
  return {
    ...row,
    title: row.title || `${row.type || 'Activity'} logged`,
    type: row.type || 'Note',
    relatedTo: row.relatedTo || '',
    owner: row.owner || row.createdByName || '',
    activityDate: row.activityDate || new Date().toISOString().slice(0, 10),
    status: row.status || 'Logged',
    notes: row.notes || row.description || '',
  }
}

const config = {
  title: 'Activities',
  single: 'Activity',
  subtitle: 'Chronological Sales Hub timeline for calls, meetings, notes, emails, WhatsApp, pipeline, deal, and quote changes.',
  modalSubtitle: 'Log a Sales Hub activity for this workspace.',
  filterKey: 'type',
  searchKeys: ['title', 'type', 'relatedTo', 'owner', 'notes'],
  searchPlaceholder: 'Search activities by type, owner, related record...',
  emptyDescription: 'Log your first customer interaction or sales update.',
  initial: () => ({ title: '', type: 'Note', relatedTo: '', owner: '', activityDate: new Date().toISOString().slice(0, 10), status: 'Logged', notes: '' }),
  sanitize: normalizeActivity,
  fields: [
    { key: 'title', label: 'Title', large: true },
    { key: 'type', label: 'Type', type: 'select', options: ['Call', 'Meeting', 'Note', 'Email', 'WhatsApp Activity', 'Pipeline Change', 'Deal Change', 'Quote Change'] },
    { key: 'relatedTo', label: 'Related Record' },
    { key: 'owner', label: 'Owner' },
    { key: 'activityDate', label: 'Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Logged', 'Completed', 'Follow-up Needed'] },
    { key: 'notes', label: 'Notes', type: 'textarea', large: true },
  ],
  summaryFields: [
    { key: 'type', label: 'Type' },
    { key: 'relatedTo', label: 'Related' },
    { key: 'owner', label: 'Owner' },
    { key: 'activityDate', label: 'Date' },
  ],
}

export default function SalesActivitiesPage() {
  const api = useSalesHubCollection('salesActivities', { normalize: normalizeActivity, validate: (row) => (!row.title ? 'Activity title is required' : '') })
  const chronological = useMemo(
    () => [...api.rows].sort((a, b) => String(b.activityDate || '').localeCompare(String(a.activityDate || ''))).slice(0, 8),
    [api.rows],
  )
  return (
    <SalesHubModulePage
      config={config}
      api={api}
      metrics={[
        { label: 'Total Activities', value: api.rows.length, helper: 'All tracked interactions' },
        { label: 'Calls', value: api.rows.filter((row) => row.type === 'Call').length, helper: 'Phone interactions' },
        { label: 'Meetings', value: api.rows.filter((row) => row.type === 'Meeting').length, helper: 'Scheduled meetings' },
        { label: 'Change Events', value: api.rows.filter((row) => String(row.type).includes('Change')).length, helper: 'Pipeline, deal, quote updates' },
      ]}
      renderExtra={() => (
        <Card className="mt-4 p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Chronological History</p>
          <div className="mt-4 space-y-3">
            {chronological.length ? chronological.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.activityDate} · {item.type} · {item.owner || 'Unassigned'}</p>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No activities yet.</p>}
          </div>
        </Card>
      )}
    />
  )
}
