import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { HiOutlinePlus } from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import ClientInvoices from '../components/clientPortal/ClientInvoices.jsx'
import ClientPayments from '../components/clientPortal/ClientPayments.jsx'
import ClientSubscriptionCard from '../components/clientPortal/ClientSubscriptionCard.jsx'
import { useClientPortal } from '../hooks/useClientPortal.js'

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

const blankClient = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  plan: 'Trial',
  status: 'Active',
}

function ClientModal({ open, onClose, onCreate }) {
  const [draft, setDraft] = useState(blankClient)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => setDraft(blankClient))
  }, [open])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="w-full max-w-2xl"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Add Client</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Create a client record in this workspace.</p>
                </div>
                <Badge variant="purple">Client</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Client Name *</label>
                  <Input className="mt-1" value={draft.name} onChange={(event) => update('name', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email *</label>
                  <Input className="mt-1" type="email" value={draft.email} onChange={(event) => update('email', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                  <Input className="mt-1" value={draft.phone} onChange={(event) => update('phone', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Business Name</label>
                  <Input className="mt-1" value={draft.businessName} onChange={(event) => update('businessName', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Plan</label>
                  <Select className="mt-1" value={draft.plan} onChange={(event) => update('plan', event.target.value)}>
                    <option>Trial</option>
                    <option>Starter</option>
                    <option>Business</option>
                    <option>Enterprise</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                  <Select className="mt-1" value={draft.status} onChange={(event) => update('status', event.target.value)}>
                    <option>Active</option>
                    <option>Trial</option>
                    <option>Paused</option>
                    <option>Inactive</option>
                  </Select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="rounded-2xl" type="button" onClick={() => onCreate?.(draft)}>
                  Create Client
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function ClientPortalPage() {
  const portal = useClientPortal()
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Client', cell: (row) => <span className="font-semibold">{row.name}</span> },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone', cell: (row) => row.phone || '—' },
      { key: 'businessName', header: 'Business', cell: (row) => row.businessName || '—' },
      { key: 'plan', header: 'Plan', cell: (row) => <Badge variant="info">{row.plan}</Badge> },
      { key: 'status', header: 'Status', cell: (row) => <Badge variant={row.status === 'Active' ? 'success' : 'default'}>{row.status}</Badge> },
      { key: 'createdAt', header: 'Created', cell: (row) => formatDate(row.createdAt) },
    ],
    [],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Client Portal"
        subtitle="Manage client workspace records, billing visibility, and subscription status."
        right={
          <Button className="rounded-2xl" type="button" onClick={() => setCreateOpen(true)}>
            <HiOutlinePlus className="text-lg" />
            Add Client
          </Button>
        }
      />

      {portal.error ? (
        <div className="mb-4">
          <Badge variant="danger">Error: {portal.error}</Badge>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          ['Clients', portal.clients.length],
          ['Invoices', portal.invoices.length],
          ['Payments', portal.payments.length],
          ['Activity', portal.activity.length],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4 min-w-0">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Client Records</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Live clients saved under this authenticated workspace.</p>
              </div>
              <Badge variant={portal.source === 'firestore' ? 'success' : 'default'}>
                {portal.loading ? 'Loading…' : portal.source === 'firestore' ? 'Live Firestore' : 'Offline'}
              </Badge>
            </div>
            <div className="mt-4">
              {portal.loading ? (
                <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                  Loading clients…
                </div>
              ) : portal.clients.length ? (
                <Table columns={columns} rows={portal.clients} />
              ) : (
                <EmptyState
                  title="No clients yet"
                  description="Firestore is empty for this workspace. Add a client to begin."
                  actionLabel="Add Client"
                  onAction={() => setCreateOpen(true)}
                />
              )}
            </div>
          </Card>
          <ClientInvoices invoices={portal.invoices} />
          <ClientPayments payments={portal.payments} />
        </div>
        <div className="space-y-4 min-w-0">
          <ClientSubscriptionCard subscription={portal.subscription} />
        </div>
      </div>

      <ClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          const res = await portal.createClient(payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Client created successfully' })
            setCreateOpen(false)
            window.setTimeout(() => setToast(null), 1600)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to create client' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
    </motion.div>
  )
}
