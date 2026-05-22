import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { usePreferences } from '../hooks/usePreferences.js'
import { useInvoices } from '../hooks/useInvoices.js'
import InvoiceStats from '../components/invoices/InvoiceStats.jsx'
import InvoiceTable from '../components/invoices/InvoiceTable.jsx'
import PaymentHistory from '../components/invoices/PaymentHistory.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import InvoiceModal from '../components/invoices/InvoiceModal.jsx'
import { useState } from 'react'
import Toast from '../components/ui/Toast.jsx'

export default function InvoicesPage() {
  const { currency } = usePreferences()
  const { invoices, payments, stats, loading, source, error, createInvoice } = useInvoices()
  const [openInvoice, setOpenInvoice] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Invoices & Payments"
        subtitle="Invoices, recurring billing placeholders, and manual payment approval (demo)."
        right={
          <div className="flex items-center gap-2">
            <Button variant="subtle" className="rounded-2xl">
              Export PDF
            </Button>
            <Button className="rounded-2xl" onClick={() => setCreateOpen(true)}>
              Create Invoice
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <Badge variant={source === 'firestore' ? 'success' : 'default'}>{loading ? 'Loading…' : source === 'firestore' ? 'Live' : 'Demo'}</Badge>
        {error ? <Badge variant="danger">Error</Badge> : null}
      </div>

      <InvoiceStats stats={stats} />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Invoice List</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Tax/GST + recurring invoices included</p>
            </div>
            <Badge variant="purple">Invoices</Badge>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading invoices…
              </div>
            ) : invoices.length === 0 ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                No invoices found.
              </div>
            ) : (
              <InvoiceTable invoices={invoices} currency={currency} onOpen={(inv) => setOpenInvoice(inv)} />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Unpaid Invoice Alerts</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Pending + overdue reminders</p>
          <div className="mt-4 space-y-3">
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Overdue</p>
              <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-200">{stats.overdue} invoices</p>
            </div>
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Pending</p>
              <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-200">{stats.pending} invoices</p>
            </div>
            <Button variant="subtle" className="w-full rounded-2xl">
              Send Reminder Emails
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <PaymentHistory payments={payments} currency={currency} />
      </div>

      <InvoiceModal open={!!openInvoice} mode="detail" invoice={openInvoice} currency={currency} onClose={() => setOpenInvoice(null)} />
      <InvoiceModal
        open={createOpen}
        mode="create"
        invoice={null}
        currency={currency}
        onClose={() => setCreateOpen(false)}
        onCreate={async (inv) => {
          const res = await createInvoice({
            id: inv.invoiceNumber,
            ...inv,
            subtotalUsd: inv.subtotalUsd,
            taxAmountUsd: inv.taxAmountUsd,
            totalUsd: inv.totalUsd,
          })
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Invoice created successfully' })
            window.setTimeout(() => setToast(null), 1600)
          } else if (res?.error) {
            setToast({ tone: 'error', message: res.error })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
    </motion.div>
  )
}
