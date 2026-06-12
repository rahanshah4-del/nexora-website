import { motion } from 'framer-motion'
import { HiOutlineArrowDownTray, HiOutlineBars3, HiOutlinePlus, HiOutlineSquares2X2 } from 'react-icons/hi2'
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
import { loadRestaurantCustomers, saveRestaurantCustomers } from '../data/restaurantCustomers.js'

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function CustomersPage() {
  const customersApi = useCustomers({ paginated: true, limitCount: 50 })
  const { businessType } = useUser()
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const isSchool = normalizeBusinessType(businessType) === 'School ERP'
  const isRestaurant = normalizeBusinessType(businessType) === 'Restaurant POS'

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

  if (isRestaurant) return <RestaurantCustomersManager />

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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={customersApi.source === 'firestore' ? 'success' : 'default'}>
              {customersApi.loading ? 'Loading...' : customersApi.source === 'firestore' ? 'Cloud Sync' : 'No data yet'}
            </Badge>
            <Badge variant="default">
              Page {Math.max(customersApi.customerPage, customersApi.loading ? 0 : 1)} · {customersApi.customerPageSize} per load
            </Badge>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {filteredCustomers.length} of {customersApi.customers.length} loaded {isSchool ? 'students' : 'customers'} shown
        </p>
        {customersApi.error ? <p className="mt-3 text-sm font-semibold text-rose-700">{customersApi.error}</p> : null}
        <div className="mt-4">
          {customersApi.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
              {isSchool ? 'Loading students...' : 'Loading customers...'}
            </div>
          ) : filteredCustomers.length ? (
            <Table columns={columns} rows={filteredCustomers} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <EmptyState
                title={isSchool ? 'No students yet' : 'No customers yet'}
                description={isSchool ? 'No student records yet. Add a student to begin.' : 'No account data yet. Add a customer to begin.'}
                actionLabel={isSchool ? 'Add Student' : 'Add Customer'}
                onAction={() => setCreateOpen(true)}
              />
              {customersApi.hasMoreCustomers ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    className="rounded-2xl"
                    variant="subtle"
                    type="button"
                    disabled={customersApi.paginationLoading}
                    onClick={() => customersApi.loadMoreCustomers()}
                  >
                    {customersApi.paginationLoading ? 'Loading...' : `Load more ${isSchool ? 'students' : 'customers'}`}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
          {!customersApi.loading ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">
                {customersApi.customers.length} {isSchool ? 'students' : 'customers'} loaded from recent pages
              </span>
              {customersApi.hasMoreCustomers ? (
                <Button
                  className="rounded-2xl"
                  variant="subtle"
                  type="button"
                  disabled={customersApi.paginationLoading}
                  onClick={() => customersApi.loadMoreCustomers()}
                >
                  {customersApi.paginationLoading ? 'Loading...' : `Load more ${isSchool ? 'students' : 'customers'}`}
                </Button>
              ) : (
                <Badge variant="success">All loaded</Badge>
              )}
            </div>
          ) : null}
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

const emptyRestaurantCustomer = {
  id: '',
  name: '',
  phone: '',
  address: '',
  creditBalance: 0,
  paidAmount: 0,
  lastVisit: '',
  notes: '',
  orderHistory: [],
}

function RestaurantCustomersManager() {
  const [customers, setCustomers] = useState(() => loadRestaurantCustomers())
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [viewMode, setViewMode] = useState('list')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.address, customer.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [customers, search])

  const totals = useMemo(
    () => ({
      customers: customers.length,
      due: customers.reduce((sum, customer) => sum + Number(customer.creditBalance || 0), 0),
      paid: customers.reduce((sum, customer) => sum + Number(customer.paidAmount || 0), 0),
    }),
    [customers],
  )

  function persist(next) {
    setCustomers(next)
    saveRestaurantCustomers(next)
  }

  function saveCustomer(payload) {
    const clean = {
      ...emptyRestaurantCustomer,
      ...payload,
      id: payload.id || `cust-${Date.now()}`,
      name: String(payload.name || '').trim() || 'Restaurant Customer',
      phone: String(payload.phone || '').trim(),
      address: String(payload.address || '').trim(),
      creditBalance: Math.max(0, Number(payload.creditBalance || 0)),
      paidAmount: Math.max(0, Number(payload.paidAmount || 0)),
      lastVisit: payload.lastVisit || new Date().toISOString().slice(0, 10),
      notes: String(payload.notes || '').trim(),
      orderHistory: payload.orderHistory || [],
    }
    persist(customers.some((customer) => customer.id === clean.id) ? customers.map((customer) => (customer.id === clean.id ? clean : customer)) : [clean, ...customers])
    setEditing(null)
    setToast({ tone: 'success', message: 'Restaurant customer saved locally' })
    window.setTimeout(() => setToast(null), 1600)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Restaurant Customers"
        subtitle="Manage guest profiles, order history, due payments, and local counter balances."
        right={
          <Button className="rounded-2xl" type="button" onClick={() => setEditing(emptyRestaurantCustomer)}>
            <HiOutlinePlus className="text-lg" /> Add Customer
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {[
          ['Customers', totals.customers],
          ['Due / credit balance', `Rs ${totals.due.toLocaleString()}`],
          ['Paid amount', `Rs ${totals.paid.toLocaleString()}`],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
          <Input placeholder="Search restaurant customers by name, phone, address..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${viewMode === 'list' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <HiOutlineBars3 className="h-4 w-4" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${viewMode === 'grid' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <HiOutlineSquares2X2 className="h-4 w-4" />
              Grid
            </button>
          </div>
          <Badge variant="success">Local Restaurant POS</Badge>
        </div>

        {viewMode === 'list' ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Last Visit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((customer) => {
                  const due = Number(customer.creditBalance || 0)
                  return (
                    <tr key={customer.id}>
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-950">{customer.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{customer.notes || 'No notes'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{customer.phone || 'No phone'}</td>
                      <td className="px-4 py-3 text-slate-600">{customer.address || 'No address'}</td>
                      <td className="px-4 py-3 font-bold text-slate-950">Rs {Number(customer.paidAmount || 0).toLocaleString()}</td>
                      <td className={`px-4 py-3 font-bold ${due ? 'text-rose-700' : 'text-emerald-700'}`}>Rs {due.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{customer.lastVisit || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="subtle" className="h-8 rounded-xl px-3 text-xs" onClick={() => setEditing(customer)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                      No restaurant customers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filtered.map((customer) => {
            const due = Number(customer.creditBalance || 0)
            const history = customer.orderHistory || []
            return (
              <div key={customer.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950">{customer.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{customer.phone || 'No phone'} · {customer.address || 'No address'}</p>
                  </div>
                  <Button type="button" variant="subtle" className="h-8 rounded-xl px-3 text-xs" onClick={() => setEditing(customer)}>
                    Edit
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Paid" value={`Rs ${Number(customer.paidAmount || 0).toLocaleString()}`} />
                  <MiniMetric label="Remaining" value={`Rs ${due.toLocaleString()}`} tone={due ? 'text-rose-700' : 'text-emerald-700'} />
                  <MiniMetric label="Last visit" value={customer.lastVisit || '—'} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{customer.notes || 'No notes added.'}</p>
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Order history</p>
                  <div className="mt-2 space-y-1.5">
                    {history.length ? history.slice(0, 3).map((order) => (
                      <div key={`${customer.id}-${order.orderNumber}-${order.date}`} className="flex items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-950">{order.orderNumber}</span>
                        <span>{order.date}</span>
                        <span>Rs {Number(order.total || 0).toLocaleString()}</span>
                        <span className={Number(order.due || 0) ? 'font-bold text-rose-700' : 'font-bold text-emerald-700'}>
                          Due Rs {Number(order.due || 0).toLocaleString()}
                        </span>
                      </div>
                    )) : <p className="text-xs text-slate-500">No orders yet.</p>}
                  </div>
                </div>
              </div>
            )
            })}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500 lg:col-span-2">
                No restaurant customers found.
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {editing ? (
        <RestaurantCustomerEditor
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={saveCustomer}
        />
      ) : null}
    </motion.div>
  )
}

function MiniMetric({ label, value, tone = 'text-slate-950' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${tone}`}>{value}</p>
    </div>
  )
}

function RestaurantCustomerEditor({ customer, onClose, onSave }) {
  const [draft, setDraft] = useState(customer)
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Restaurant POS</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{draft.id ? 'Edit Customer' : 'Add Customer'}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500">x</button>
        </div>
        <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
          <Field label="Customer Name">
            <Input value={draft.name} onChange={(event) => update('name', event.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={draft.phone} onChange={(event) => update('phone', event.target.value)} />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Input value={draft.address} onChange={(event) => update('address', event.target.value)} />
          </Field>
          <Field label="Paid Amount">
            <Input type="number" min="0" value={draft.paidAmount} onChange={(event) => update('paidAmount', event.target.value)} />
          </Field>
          <Field label="Remaining Balance">
            <Input type="number" min="0" value={draft.creditBalance} onChange={(event) => update('creditBalance', event.target.value)} />
          </Field>
          <Field label="Last Visit">
            <Input type="date" value={draft.lastVisit} onChange={(event) => update('lastVisit', event.target.value)} />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea
              value={draft.notes}
              onChange={(event) => update('notes', event.target.value)}
              className="min-h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <Button type="button" variant="subtle" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => onSave(draft)}>Save Customer</Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, className = '', children }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  )
}
