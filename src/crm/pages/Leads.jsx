import { motion } from 'framer-motion'
import { HiOutlineFunnel, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import LeadScoringPanel from '../components/leads/LeadScoringPanel.jsx'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import LeadModal from '../components/leads/LeadModal.jsx'
import { useMemo, useState } from 'react'
import Toast from '../components/ui/Toast.jsx'
import { confirmAction } from '../components/ui/dialogActions.js'
import { db } from '../lib/firebase.js'
import { createUserDoc } from '../lib/firestore.js'
import { useUser } from '../hooks/useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

export default function LeadsPage() {
  const scoring = useLeadScoring({ paginated: true, limitCount: 50 })
  const { userId, workspaceId, businessType } = useUser()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [deletingLeadId, setDeletingLeadId] = useState('')
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()
    const stage = stageFilter.trim().toLowerCase()
    return scoring.leads.filter((lead) => {
      const haystack = [
        lead.id,
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.source,
        lead.status,
        lead.stage,
        lead.priority,
        lead.scoreType,
      ].join(' ').toLowerCase()
      if (query && !haystack.includes(query)) return false
      const leadStage = String(lead.status || lead.stage || '').toLowerCase()
      if (stage && !leadStage.includes(stage)) return false
      return true
    })
  }, [scoring.leads, search, stageFilter])

  async function handleDeleteLead(lead) {
    if (!lead?.id || deletingLeadId) return
    const label = lead.name || 'this lead'
    if (!await confirmAction({ title: 'Delete lead?', message: `Delete ${label}? This will permanently remove the lead from this workspace.`, confirmLabel: 'Delete Lead' })) return

    setDeletingLeadId(lead.id)
    const res = await scoring.deleteLead(lead)
    setDeletingLeadId('')
    if (res?.ok) {
      setToast({ tone: 'success', message: 'Lead deleted successfully' })
      window.setTimeout(() => setToast(null), 1600)
      return
    }
    setToast({ tone: 'error', message: res?.error || 'Failed to delete lead' })
    window.setTimeout(() => setToast(null), 2400)
  }

  const columns = [
    { key: 'id', header: 'Lead ID' },
    { key: 'name', header: 'Lead', cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'source', header: 'Source', cell: (r) => <Badge variant="default">{r.source || '—'}</Badge> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant="purple">{r.status || r.stage || '—'}</Badge> },
    {
      key: 'score',
      header: 'AI Score',
      cell: (r) => (
        <span className={r.score >= 85 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold'}>
          {r.score}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Auto Priority',
      cell: (r) => <Badge variant={r.priority === 'High' ? 'danger' : r.priority === 'Medium' ? 'warning' : 'default'}>{r.priority}</Badge>,
    },
    {
      key: 'prediction',
      header: 'Prediction',
      cell: (r) => <Badge variant={r.score >= 85 ? 'success' : 'info'}>{r.prediction}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="subtle"
            className="h-8 rounded-xl px-3 text-xs"
            onClick={() => setEditingLead(r)}
          >
            <HiOutlinePencilSquare className="h-4 w-4" /> Edit
          </Button>
          <Button
            type="button"
            variant="subtle"
            className="h-8 rounded-xl px-3 text-xs text-rose-700 hover:border-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10"
            disabled={deletingLeadId === r.id}
            onClick={() => handleDeleteLead(r)}
          >
            <HiOutlineTrash className="h-4 w-4" /> {deletingLeadId === r.id ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Leads"
        subtitle="Track lead sources, qualification score, and pipeline movement."
        right={
          <>
            <Button variant="subtle" className="rounded-2xl">
              <HiOutlineFunnel className="text-lg" /> Filters
            </Button>
            <Button className="rounded-2xl" type="button" onClick={() => setCreateOpen(true)}>
              <HiOutlinePlus className="text-lg" /> Add Lead
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <LeadScoringPanel leads={scoring.leads.slice(0, 4)} loading={scoring.loading} source={scoring.source} error={scoring.error} />
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto] md:items-center">
          <Input placeholder="Search leads..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input placeholder="Filter by stage (e.g. Qualified)" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={scoring.source === 'firestore' ? 'success' : 'default'}>
              {scoring.loading ? 'Loading...' : scoring.source === 'firestore' ? 'Cloud Sync' : 'No data yet'}
            </Badge>
            <Badge variant="default">
              Page {Math.max(scoring.leadPage, scoring.loading ? 0 : 1)} · {scoring.leadPageSize} per load
            </Badge>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {filteredLeads.length} of {scoring.leads.length} loaded leads shown
        </p>
        <div className="mt-4">
          {scoring.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
              Loading leads...
            </div>
          ) : (
            <Table columns={columns} rows={filteredLeads} />
          )}
          {!scoring.loading ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">
                {scoring.leads.length} leads loaded from recent pages
              </span>
              {scoring.hasMoreLeads ? (
                <Button
                  className="rounded-2xl"
                  variant="subtle"
                  type="button"
                  disabled={scoring.paginationLoading}
                  onClick={() => scoring.loadMoreLeads()}
                >
                  {scoring.paginationLoading ? 'Loading...' : 'Load more leads'}
                </Button>
              ) : (
                <Badge variant="success">All loaded</Badge>
              )}
            </div>
          ) : null}
        </div>
      </Card>

      <LeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          if (!userId || !workspaceId) {
            setToast({ tone: 'error', message: 'Please login first' })
            window.setTimeout(() => setToast(null), 2400)
            return
          }
          if (!db) {
            setToast({ tone: 'error', message: 'Secure Cloud Sync is not available right now' })
            window.setTimeout(() => setToast(null), 2400)
            return
          }

          const name = String(payload.name || '').trim()
          const email = String(payload.email || '').trim()
          if (!name || !email) {
            setToast({ tone: 'error', message: 'Name and email are required' })
            window.setTimeout(() => setToast(null), 2400)
            return
          }

          try {
            const ref = await createUserDoc(workspaceId, 'leads', {
              name,
              email,
              phone: payload.phone || '',
              company: payload.company || '',
              dealValue: Number(payload.dealValue || 0),
              status: payload.status || 'New',
              priority: payload.priority || 'Medium',
              source: payload.source || 'Website',
              // Optional signals used by AI scoring (safe defaults)
              replySpeed: 50,
              meetings: 0,
              paymentHistory: 0,
              activityFrequency: 50,
              lastContactDate: new Date().toISOString().slice(0, 10),
            }, { businessType })
            scoring.prependLead({
              id: ref.id,
              name,
              email,
              phone: payload.phone || '',
              company: payload.company || '',
              dealValue: Number(payload.dealValue || 0),
              status: payload.status || 'New',
              priority: payload.priority || 'Medium',
              source: payload.source || 'Website',
              replySpeed: 50,
              meetings: 0,
              paymentHistory: 0,
              activityFrequency: 50,
              lastContactDate: new Date().toISOString().slice(0, 10),
              createdAt: new Date().toISOString(),
            })
            setToast({ tone: 'success', message: 'Lead created successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setCreateOpen(false)
          } catch (e) {
            setToast({ tone: 'error', message: clientSafeMessage(e, 'Unable to create lead.') })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
      <LeadModal
        open={Boolean(editingLead)}
        initialRecord={editingLead}
        onClose={() => setEditingLead(null)}
        onCreate={async (payload) => {
          const res = await scoring.updateLead(editingLead?.id, payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Lead updated successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setEditingLead(null)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to update lead' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
    </motion.div>
  )
}
