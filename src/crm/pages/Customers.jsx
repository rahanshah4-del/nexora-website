import { motion } from 'framer-motion'
import { HiOutlineArrowDownTray, HiOutlinePlus } from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Badge from '../components/ui/Badge.jsx'
import { formatCurrency } from '../utils/format.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { convertFromUsd } from '../utils/currency.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useState } from 'react'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import CustomerModal from '../components/customers/CustomerModal.jsx'

export default function CustomersPage() {
  const { currency } = usePreferences()
  const customersApi = useCustomers()
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const columns = [
    { key: 'id', header: 'Customer ID' },
    { key: 'name', header: 'Name', cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'company', header: 'Company' },
    { key: 'email', header: 'Email' },
    { key: 'plan', header: 'Plan', cell: (r) => <Badge variant="info">{r.plan}</Badge> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const v = r.status === 'Active' ? 'success' : r.status === 'At Risk' ? 'warning' : 'purple'
        return <Badge variant={v}>{r.status}</Badge>
      },
    },
    {
      key: 'spendUsd',
      header: 'Spend',
      cell: (r) => (
        <span className="font-semibold">{formatCurrency(convertFromUsd(r.spendUsd || 0, currency), currency)}</span>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Customers"
        subtitle="Manage customer records, plans, and lifecycle health."
        right={
          <>
            <Button variant="subtle" className="rounded-2xl">
              <HiOutlineArrowDownTray className="text-lg" /> Export
            </Button>
            <Button className="rounded-2xl" type="button" onClick={() => setCreateOpen(true)}>
              <HiOutlinePlus className="text-lg" /> Add Customer
            </Button>
          </>
        }
      />

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Search customers..." />
          <Input placeholder="Filter by plan (e.g. Pro)" />
          <Input placeholder="Filter by status (e.g. Active)" />
        </div>
        <div className="mt-4">
          {customersApi.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
              Loading customers…
            </div>
          ) : customersApi.customers.length ? (
            <Table columns={columns} rows={customersApi.customers} />
          ) : (
            <EmptyState title="No customers yet" description="Create your first customer to see it here." />
          )}
        </div>
      </Card>

      <CustomerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          const res = await customersApi.createCustomer(payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Customer created successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setCreateOpen(false)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to create customer' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
    </motion.div>
  )
}
