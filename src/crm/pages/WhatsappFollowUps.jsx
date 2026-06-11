import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlinePlus,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import PageSearch from '../components/ui/PageSearch.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import FollowUpModal from '../components/whatsapp/FollowUpModal.jsx'
import ConfirmDialog from '../components/whatsapp/ConfirmDialog.jsx'
import { useWhatsappFollowUps } from '../hooks/useWhatsappFollowUps.js'
import { useWhatsappContacts } from '../hooks/useWhatsappContacts.js'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import { formatCompact } from '../utils/format.js'
import { followUpStats, isFollowUpDueToday, isFollowUpOverdue, waLink } from '../lib/whatsappManual.js'

const blankFollowUp = {
  title: '',
  contactName: '',
  phone: '',
  linkType: '',
  linkId: '',
  dueDate: '',
  priority: 'Medium',
  status: 'Pending',
  assignedTo: '',
  notes: '',
}

const STATUS_FILTERS = ['All', 'Pending', 'Overdue', 'Due Today', 'Completed', 'Cancelled']

function priorityBadge(priority) {
  const value = String(priority || '').toLowerCase()
  if (value === 'urgent') return 'danger'
  if (value === 'high') return 'warning'
  if (value === 'low') return 'default'
  return 'info'
}

function statusBadge(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'success'
  if (value === 'cancelled') return 'default'
  return 'info'
}

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function WhatsappFollowUpsPage() {
  const api = useWhatsappFollowUps()
  const contactsApi = useWhatsappContacts()
  const teamApi = useTeamMembers()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankFollowUp)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => followUpStats(api.followUps), [api.followUps])

  const filtered = useMemo(() => {
    let rows = api.followUps
    if (filter === 'Overdue') rows = rows.filter((row) => isFollowUpOverdue(row))
    else if (filter === 'Due Today') rows = rows.filter((row) => isFollowUpDueToday(row))
    else if (filter !== 'All') rows = rows.filter((row) => row.status === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((row) =>
        [row.title, row.contactName, row.phone, row.priority, row.status, row.assignedTo, row.notes].some((value) =>
          String(value || '').toLowerCase().includes(q),
        ),
      )
    }
    return rows
  }, [filter, search, api.followUps])

  function showToast(tone, message, delay = 2200) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  function openCreate() {
    setEditing(null)
    setDraft(blankFollowUp)
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setDraft({ ...blankFollowUp, ...row })
    setModalOpen(true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const res = editing ? await api.updateFollowUp(editing.id, draft) : await api.createFollowUp(draft)
    setBusy(false)
    if (res?.ok) {
      showToast('success', editing ? 'Follow-up updated' : 'Follow-up added')
      setModalOpen(false)
      setEditing(null)
      setDraft(blankFollowUp)
    } else {
      showToast('error', res?.error || 'Unable to save follow-up', 2600)
    }
  }

  async function complete(row) {
    setBusy(true)
    const res = await api.setStatus(row, 'Completed')
    setBusy(false)
    showToast(res?.ok ? 'success' : 'error', res?.ok ? 'Marked completed' : res?.error || 'Unable to update', 2200)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const res = await api.deleteFollowUp(deleteTarget)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Follow-up deleted')
      setDeleteTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to delete follow-up', 2600)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Follow-up',
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-semibold text-slate-950 dark:text-white">{row.title}</p>
            <p className="text-xs text-slate-500">{row.contactName || '—'}</p>
          </div>
        ),
      },
      {
        key: 'dueDate',
        header: 'Due',
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1">
            <span className={isFollowUpOverdue(row) ? 'font-semibold text-rose-600' : ''}>{formatDate(row.dueDate)}</span>
            {isFollowUpOverdue(row) ? <Badge variant="danger">Overdue</Badge> : null}
            {isFollowUpDueToday(row) ? <Badge variant="warning">Today</Badge> : null}
          </div>
        ),
      },
      { key: 'priority', header: 'Priority', cell: (row) => <Badge variant={priorityBadge(row.priority)}>{row.priority}</Badge> },
      { key: 'status', header: 'Status', cell: (row) => <Badge variant={statusBadge(row.status)}>{row.status}</Badge> },
      { key: 'assignedTo', header: 'Agent', cell: (row) => row.assignedTo || '—' },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => {
          const link = waLink(row.phone, '')
          return (
            <div className="flex flex-wrap gap-1.5">
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" /> Chat
                </a>
              ) : null}
              {row.status !== 'Completed' && row.status !== 'Cancelled' ? (
                <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs text-emerald-700" type="button" disabled={busy} onClick={() => complete(row)}>
                  Complete
                </Button>
              ) : null}
              <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs" type="button" onClick={() => openEdit(row)}>
                Edit
              </Button>
              <Button
                variant="subtle"
                className="h-8 rounded-xl border-rose-200 px-2.5 text-xs text-rose-700 hover:border-rose-300"
                type="button"
                onClick={() => setDeleteTarget(row)}
              >
                Delete
              </Button>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <PageHeader
        title="WhatsApp Follow-Ups"
        subtitle="Schedule reminders so no WhatsApp conversation slips through the cracks."
        right={
          <Button className="rounded-2xl" type="button" onClick={openCreate}>
            <HiOutlinePlus className="h-4 w-4" /> New follow-up
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending" value={stats.pending} helper={`${formatCompact(stats.dueSoon)} due soon`} icon={HiOutlineClock} tone="sky" />
        <StatCard label="Overdue" value={stats.overdue} helper="Past due, still open" icon={HiOutlineExclamationTriangle} tone="rose" />
        <StatCard label="Due Today" value={stats.dueToday} helper="Reach out today" icon={HiOutlineBell} tone="amber" />
        <StatCard label="Completed" value={stats.completed} helper={`${formatCompact(stats.total)} total`} icon={HiOutlineCheckCircle} tone="emerald" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Follow-up reminders</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Manual reminders for this workspace.</p>
          </div>
          <div className="flex w-full flex-wrap items-start gap-3 sm:w-auto">
            <PageSearch
              className="w-full sm:w-72"
              value={search}
              onChange={setSearch}
              placeholder="Search follow-ups by title, contact, agent..."
              resultCount={filtered.length}
              totalCount={api.followUps.length}
            />
            <div className="w-44 shrink-0">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {STATUS_FILTERS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {api.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading follow-ups...</div>
          ) : api.error ? (
            <EmptyState title="Couldn't load follow-ups" description={api.error} />
          ) : filtered.length ? (
            <Table columns={columns} rows={filtered} />
          ) : api.followUps.length ? (
            <EmptyState title="No matching follow-ups" description="Try a different status filter." />
          ) : (
            <EmptyState title="No follow-ups yet" description="Schedule your first reminder to stay on top of conversations." actionLabel="New follow-up" onAction={openCreate} />
          )}
        </div>
      </Card>

      <FollowUpModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        onSubmit={submit}
        onClose={() => setModalOpen(false)}
        agents={teamApi.members || []}
        contacts={contactsApi.contacts}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        badge="Delete follow-up"
        title="Delete this follow-up?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : ''}
        confirmLabel="Delete follow-up"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}

function StatCard({ label, value, helper, icon: Icon, tone }) {
  const tones = {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCompact(value)}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${tones[tone] || tones.sky}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}
