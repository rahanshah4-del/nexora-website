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

export default function SupportPage() {
  const { profile } = usePreferences()
  const support = useSupportTickets()
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
        subtitle="Ticket list, assignment, comments, and customer replies (demo fallback + Firestore)."
        right={
          <div className="flex items-center gap-2">
            <Badge variant={support.source === 'firestore' ? 'success' : 'default'}>
              {support.loading ? 'Loading…' : support.source === 'firestore' ? 'Live' : 'Demo'}
            </Badge>
            <Button className="rounded-2xl" onClick={() => setCreateOpen(true)} type="button">
              Create Ticket
            </Button>
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
          </div>
        )}
      </div>

      <TicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialCustomer={initialCustomer}
        onCreate={async (payload) => {
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
        onSave={(draft) => {
          const { id, ...patch } = draft
          support.updateTicket(id, patch)
        }}
        onAddComment={(t, c) => support.addComment(t.id, c)}
      />
    </motion.div>
  )
}
