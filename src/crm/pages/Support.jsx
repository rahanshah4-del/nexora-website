import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import TicketTable from '../components/support/TicketTable.jsx'
import TicketModal from '../components/support/TicketModal.jsx'
import TicketDrawer from '../components/support/TicketDrawer.jsx'
import SupportStats from '../components/support/SupportStats.jsx'
import { useMemo, useState } from 'react'
import { useSupportTickets } from '../hooks/useSupportTickets.js'
import { usePreferences } from '../hooks/usePreferences.js'
import Toast from '../components/ui/Toast.jsx'
import { sendSupportReplyEmail } from '../lib/emailService.js'
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'

export default function SupportPage() {
  const { profile } = usePreferences()
  const support = useSupportTickets({ paginated: true, limitCount: 50 })
  const access = useWorkspaceAccess()
  const canCreateSupportTicket = access.hasModulePermission('support', 'create')
  const canEditSupportTicket = access.hasModulePermission('support', 'edit')
  const initialCustomer = useMemo(
    () => ({ name: profile.companyName || profile.ownerName, email: profile.email }),
    [profile.companyName, profile.ownerName, profile.email],
  )
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [active, setActive] = useState(null)
  const [toast, setToast] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return support.tickets.filter((t) => {
      const matches =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerEmail.toLowerCase().includes(q)
      const statusOk = statusFilter === 'All' ? true : t.status === statusFilter
      return matches && statusOk
    })
  }, [support.tickets, query, statusFilter])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Support Tickets"
        subtitle="Ticket list, assignments, comments, and customer replies."
        right={
          <div className="flex items-center gap-2">
            <Badge variant={support.source === 'firestore' ? 'success' : 'default'}>
              {support.loading ? 'Loading...' : support.source === 'firestore' ? 'Cloud Sync' : 'No data yet'}
            </Badge>
            <Badge variant="default">
              Page {Math.max(support.ticketPage, support.loading ? 0 : 1)} · {support.ticketPageSize} per load
            </Badge>
            {canCreateSupportTicket ? (
              <Button className="rounded-2xl" onClick={() => setCreateOpen(true)} type="button">
                Create Ticket
              </Button>
            ) : null}
          </div>
        }
      />

      {support.error ? (
        <div className="mb-4">
          <Badge variant="danger">Error: {support.error}</Badge>
        </div>
      ) : null}

      <SupportStats stats={support.stats} />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="Search tickets…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select className="h-11" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </Select>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-500">
        {filtered.length} of {support.tickets.length} loaded tickets shown
      </p>

      <div className="mt-4">
        {support.loading ? (
          <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">Loading…</div>
        ) : filtered.length ? (
          <TicketTable
            tickets={filtered}
            onOpen={(t) => {
              setActive(t)
              setDrawerOpen(true)
            }}
          />
        ) : (
          <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            No tickets found.
            {support.hasMoreTickets ? (
              <div className="mt-4">
                <Button
                  className="rounded-2xl"
                  variant="subtle"
                  type="button"
                  disabled={support.paginationLoading}
                  onClick={() => support.loadMoreTickets()}
                >
                  {support.paginationLoading ? 'Loading...' : 'Load more tickets'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
        {!support.loading ? (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">
              {support.tickets.length} tickets loaded from recent pages
            </span>
            {support.hasMoreTickets ? (
              <Button
                className="rounded-2xl"
                variant="subtle"
                type="button"
                disabled={support.paginationLoading}
                onClick={() => support.loadMoreTickets()}
              >
                {support.paginationLoading ? 'Loading...' : 'Load more tickets'}
              </Button>
            ) : (
              <Badge variant="success">All loaded</Badge>
            )}
          </div>
        ) : null}
      </div>

      <TicketModal
        open={canCreateSupportTicket && createOpen}
        onClose={() => setCreateOpen(false)}
        initialCustomer={initialCustomer}
        onCreate={async (payload) => {
          if (!canCreateSupportTicket) return
          const res = await support.createTicket(payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Ticket created successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setCreateOpen(false)
          } else if (res?.error) {
            setToast({ tone: 'error', message: res.error })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />

      <TicketDrawer
        open={drawerOpen}
        ticket={active}
        onClose={() => setDrawerOpen(false)}
        canEdit={canEditSupportTicket}
        canComment={canEditSupportTicket}
        onSave={(draft) => {
          if (!canEditSupportTicket) return
          const { id, ...patch } = draft
          support.updateTicket(id, patch)
        }}
        onAddComment={async (t, c) => {
          if (!canEditSupportTicket) return
          const saved = await support.addComment(t.id, c)
          if (!saved?.ok) {
            setToast({ tone: 'error', message: saved?.error || 'Unable to add support reply' })
            window.setTimeout(() => setToast(null), 2400)
            return
          }
          const sent = await sendSupportReplyEmail({ ticket: t, message: c.message })
          setToast(sent.ok
            ? { tone: 'success', message: 'Reply saved and emailed to customer' }
            : { tone: 'error', message: `Reply saved, but email failed: ${sent.error}` })
          window.setTimeout(() => setToast(null), sent.ok ? 1800 : 2800)
        }}
      />
    </motion.div>
  )
}
