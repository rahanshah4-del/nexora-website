import { useEffect, useMemo, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import AdvancedTable from './AdvancedTable.jsx'
import { db } from '../../lib/firebase.js'
import { subscribeCollection } from '../../lib/firestore.js'

function normalizeRow(r) {
  const at = r.createdAt?.toDate?.()?.toISOString?.().slice(0, 10) || r.at || '—'
  return {
    id: r.id,
    actor: r.actor || r.userName || '—',
    action: r.action || '—',
    module: r.module || '—',
    at,
    detail: r.detail || r.description || '',
  }
}

export default function AuditLogPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setError('Firestore is not configured.')
        setLoading(false)
      })
      return
    }
    Promise.resolve().then(() => setLoading(true))
    const unsub = subscribeCollection(
      'auditLogs',
      (list) => {
        const normalized = (Array.isArray(list) ? list : []).map(normalizeRow)
        setRows(normalized)
        setSource('firestore')
        setError('')
        setLoading(false)
      },
      (err) => {
        setRows([])
        setSource('firestore')
        setError(err?.message || 'Failed to load audit logs')
        setLoading(false)
      },
    )
    return () => unsub?.()
  }, [])

  const columns = useMemo(
    () => [
      { key: 'at', header: 'Date' },
      { key: 'actor', header: 'Actor', cell: (r) => <span className="font-semibold">{r.actor}</span> },
      { key: 'module', header: 'Module' },
      { key: 'action', header: 'Action', cell: (r) => <span className="font-semibold">{r.action}</span> },
      { key: 'detail', header: 'Detail' },
    ],
    [],
  )

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Audit Logs</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Security and system audit trail</p>
        </div>
        <Badge variant={source === 'firestore' ? 'success' : 'default'}>
          {loading ? 'Loading…' : source === 'firestore' ? 'Live' : 'Offline'}
        </Badge>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-rose-700 dark:text-rose-200">{error}</p>
      ) : null}
      <div className="mt-4">
        <AdvancedTable
          columns={columns}
          rows={rows}
          loading={loading}
          emptyTitle="No audit logs yet"
          emptyDescription="Audit records will appear here once actions are recorded."
        />
      </div>
    </Card>
  )
}
