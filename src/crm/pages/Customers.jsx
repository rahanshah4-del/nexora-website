import { motion } from 'framer-motion'
import { HiOutlineArrowDownTray, HiOutlinePlus } from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useCustomers } from '../hooks/useCustomers.js'
import { useMemo, useState } from 'react'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import CustomerModal from '../components/customers/CustomerModal.jsx'
import { useUser } from '../hooks/useUser.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function CustomersPage() {
  const customersApi = useCustomers()
  const { businessType } = useUser()
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const isSchool = normalizeBusinessType(businessType) === 'School ERP'

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customersApi.customers
    return customersApi.customers.filter((customer) =>
      [
        customer.name,
        customer.studentName,
        customer.parentName,
        customer.email,
        customer.parentEmail,
        customer.phone,
        customer.parentPhone,
        customer.company,
        customer.className,
        customer.section,
        customer.admissionNo,
        customer.rollNo,
        customer.customerType,
        customer.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [customersApi.customers, search])

  const stats = useMemo(() => {
    const active = customersApi.customers.filter((customer) => customer.status === 'Active').length
    const business = isSchool
      ? customersApi.customers.filter((customer) => customer.parentName || customer.parentEmail || customer.parentPhone).length
      : customersApi.customers.filter((customer) => customer.customerType === 'Business' || customer.customerType === 'Enterprise').length
    return { total: customersApi.customers.length, active, business }
  }, [customersApi.customers, isSchool])

  const columns = isSchool
    ? [
        { key: 'studentName', header: 'Student', cell: (r) => <span className="font-semibold">{r.studentName || r.name || 'Student'}</span> },
        { key: 'parentName', header: 'Parent/Guardian', cell: (r) => r.parentName || r.name || '—' },
        { key: 'className', header: 'Class', cell: (r) => [r.className, r.section].filter(Boolean).join(' - ') || r.company || '—' },
        { key: 'admissionNo', header: 'Admission No', cell: (r) => r.admissionNo || '—' },
        { key: 'rollNo', header: 'Roll No', cell: (r) => r.rollNo || '—' },
        {
          key: 'status',
          header: 'Status',
          cell: (r) => {
            const v = r.status === 'Active' ? 'success' : r.status === 'Suspended' ? 'warning' : 'purple'
            return <Badge variant={v}>{r.status || 'Active'}</Badge>
          },
        },
        { key: 'createdAt', header: 'Created', cell: (r) => formatDate(r.createdAt) },
      ]
    : [
        { key: 'name', header: 'Name', cell: (r) => <span className="font-semibold">{r.name}</span> },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone', cell: (r) => r.phone || '—' },
        { key: 'company', header: 'Company', cell: (r) => r.company || '—' },
        { key: 'customerType', header: 'Type', cell: (r) => <Badge variant="info">{r.customerType}</Badge> },
        {
          key: 'status',
          header: 'Status',
          cell: (r) => {
            const v = r.status === 'Active' ? 'success' : r.status === 'At Risk' ? 'warning' : 'purple'
            return <Badge variant={v}>{r.status}</Badge>
          },
        },
        { key: 'createdAt', header: 'Created', cell: (r) => formatDate(r.createdAt) },
      ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title={isSchool ? 'Students & Parents' : 'Customers'}
        subtitle={isSchool ? 'Manage students, parent records, classes, and fee profiles.' : 'Manage customer records, plans, and lifecycle health.'}
        right={
          <>
            <Button variant="subtle" className="rounded-2xl">
              <HiOutlineArrowDownTray className="text-lg" /> Export
            </Button>
            <Button className="rounded-2xl" type="button" onClick={() => setCreateOpen(true)}>
              <HiOutlinePlus className="text-lg" /> {isSchool ? 'Add Student' : 'Add Customer'}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {[
          [isSchool ? 'Total Students' : 'Total customers', stats.total],
          [isSchool ? 'Active Students' : 'Active records', stats.active],
          [isSchool ? 'Parent Accounts' : 'Business accounts', stats.business],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <Input placeholder={isSchool ? 'Search students or parents' : 'Search customers...'} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Badge variant={customersApi.source === 'firestore' ? 'success' : 'default'}>
            {customersApi.loading ? 'Loading…' : customersApi.source === 'firestore' ? 'Live Sync' : 'No data yet'}
          </Badge>
        </div>
        {customersApi.error ? <p className="mt-3 text-sm font-semibold text-rose-700">{customersApi.error}</p> : null}
        <div className="mt-4">
          {customersApi.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
              {isSchool ? 'Loading students...' : 'Loading customers...'}
            </div>
          ) : filteredCustomers.length ? (
            <Table columns={columns} rows={filteredCustomers} />
          ) : (
            <EmptyState
              title={isSchool ? 'No students yet' : 'No customers yet'}
              description={isSchool ? 'No student records yet. Add a student to begin.' : 'No account data yet. Add a customer to begin.'}
              actionLabel={isSchool ? 'Add Student' : 'Add Customer'}
              onAction={() => setCreateOpen(true)}
            />
          )}
        </div>
      </Card>

      <CustomerModal
        open={createOpen}
        schoolMode={isSchool}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          const res = await customersApi.createCustomer(payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: isSchool ? 'Student created successfully' : 'Customer created successfully' })
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
