import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineCurrencyDollar,
  HiOutlineFunnel,
  HiOutlinePlus,
  HiOutlineTrophy,
  HiOutlineUserGroup,
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
import LeadModal from '../components/whatsapp/LeadModal.jsx'
import ConfirmDialog from '../components/whatsapp/ConfirmDialog.jsx'
import { useWhatsappLeads } from '../hooks/useWhatsappLeads.js'
import { useWhatsappContacts } from '../hooks/useWhatsappContacts.js'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import { formatCompact, formatCurrency } from '../utils/format.js'
import { exportCsv, exportExcel, exportPdf } from '../lib/exporters.js'
import { LEAD_STAGES, leadStats, waLink } from '../lib/whatsappManual.js'

const blankLead = {
  name: '',
  phone: '',
  email: '',
  company: '',
  stage: 'New',
  source: 'WhatsApp',
  value: '',
  currency: 'PKR',
  assignedTo: '',
  contactId: '',
  notes: '',
  nextActionAt: '',
}

const STAGE_FILTERS = ['All', ...LEAD_STAGES]

function stageBadge(stage) {
  switch (stage) {
    case 'Won':
      return 'success'
    case 'Lost':
      return 'danger'
    case 'Proposal':
    case 'Qualified':
      return 'warning'
    case 'New':
      return 'info'
    default:
      return 'default'
  }
}

const exportColumns = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'stage', label: 'Stage' },
  { key: 'source', label: 'Source' },
  { key: 'value', label: 'Value' },
  { key: 'currency', label: 'Currency' },
  { key: 'assignedTo', label: 'Agent' },
]

export default function WhatsappLeadsPage() {
  const api = useWhatsappLeads()
  const contactsApi = useWhatsappContacts()
  const teamApi = useTeamMembers()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankLead)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => leadStats(api.leads), [api.leads])

  const filtered = useMemo(() => {
    let rows = filter === 'All' ? api.leads : api.leads.filter((row) => row.stage === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((row) =>
        [row.name, row.phone, row.email, row.company, row.stage, row.source].some((value) =>
          String(value || '').toLowerCase().includes(q),
        ),
      )
    }
    return rows
  }, [filter, search, api.leads])

  function showToast(tone, message, delay = 2200) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  function openCreate() {
    setEditing(null)
    setDraft(blankLead)
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setDraft({ ...blankLead, ...row, value: row.value ? String(row.value) : '' })
    setModalOpen(true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const res = editing ? await api.updateLead(editing.id, draft) : await api.createLead(draft)
    setBusy(false)
    if (res?.ok) {
      showToast('success', editing ? 'Lead updated' : 'Lead added')
      setModalOpen(false)
      setEditing(null)
      setDraft(blankLead)
    } else {
      showToast('error', res?.error || 'Unable to save lead', 2600)
    }
  }

  async function changeStage(row, stage) {
    setBusy(true)
    const res = await api.setStage(row, stage)
    setBusy(false)
    if (!res?.ok) showToast('error', res?.error || 'Unable to update stage', 2600)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const res = await api.deleteLead(deleteTarget)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Lead deleted')
      setDeleteTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to delete lead', 2600)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Lead',
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-semibold text-slate-950 dark:text-white">{row.name}</p>
            <p className="text-xs text-slate-500">
              {row.phone || '—'}
              {row.company ? ` · ${row.company}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'stage',
        header: 'Stage',
        cell: (row) => (
          <Select
            value={row.stage}
            onChange={(e) => changeStage(row, e.target.value)}
            className="h-8 w-[8.5rem] text-xs"
          >
            {LEAD_STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        ),
      },
      { key: 'source', header: 'Source', cell: (row) => <Badge variant="default">{row.source}</Badge> },
      { key: 'value', header: 'Value', cell: (row) => <span className="font-semibold">{formatCurrency(row.value, row.currency)}</span> },
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
        title="WhatsApp Leads"
        subtitle="Track leads from first WhatsApp message to won or lost."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportPdf('nexora-whatsapp-leads.pdf', exportColumns, api.leads, 'WhatsApp Leads')}>
              Export PDF
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportExcel('nexora-whatsapp-leads.xls', exportColumns, api.leads)}>
              Excel
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportCsv('nexora-whatsapp-leads.csv', exportColumns, api.leads)}>
              CSV
            </Button>
            <Button className="rounded-2xl" type="button" onClick={openCreate}>
              <HiOutlinePlus className="h-4 w-4" /> New lead
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open Leads" value={stats.open} helper={`${formatCompact(stats.total)} total`} icon={HiOutlineUserGroup} tone="sky" />
        <StatCard label="Pipeline Value" value={formatCurrency(stats.pipelineValue, 'PKR')} helper="Open leads" icon={HiOutlineFunnel} tone="violet" raw />
        <StatCard label="Won" value={stats.won} helper={`${formatCompact(stats.lost)} lost`} icon={HiOutlineTrophy} tone="emerald" />
        <StatCard label="Won Value" value={formatCurrency(stats.wonValue, 'PKR')} helper="Closed won" icon={HiOutlineCurrencyDollar} tone="amber" raw />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Lead pipeline</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">All WhatsApp leads for this workspace.</p>
          </div>
          <div className="flex w-full flex-wrap items-start gap-3 sm:w-auto">
            <PageSearch
              className="w-full sm:w-72"
              value={search}
              onChange={setSearch}
              placeholder="Search leads by name, phone, email..."
              resultCount={filtered.length}
              totalCount={api.leads.length}
            />
            <div className="w-44 shrink-0">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {STAGE_FILTERS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {api.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading leads...</div>
          ) : api.error ? (
            <EmptyState title="Couldn't load leads" description={api.error} />
          ) : filtered.length ? (
            <Table columns={columns} rows={filtered} />
          ) : api.leads.length ? (
            <EmptyState title="No matching leads" description="Try a different stage filter." />
          ) : (
            <EmptyState title="No leads yet" description="Add your first WhatsApp lead to start tracking your pipeline." actionLabel="New lead" onAction={openCreate} />
          )}
        </div>
      </Card>

      <LeadModal
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
        badge="Delete lead"
        title="Delete this lead?"
        message={deleteTarget ? `${deleteTarget.name} will be permanently removed from this workspace.` : ''}
        confirmLabel="Delete lead"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}

function StatCard({ label, value, helper, icon: Icon, tone, raw = false }) {
  const tones = {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold text-slate-950 dark:text-white">{raw ? value : formatCompact(value)}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${tones[tone] || tones.sky}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}
