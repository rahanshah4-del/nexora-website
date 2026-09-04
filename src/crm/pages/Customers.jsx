import { motion } from 'framer-motion'
import { HiOutlineArrowDownTray, HiOutlineBanknotes, HiOutlineBars3, HiOutlineCreditCard, HiOutlineCurrencyDollar, HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineSquares2X2, HiOutlineTrash, HiOutlineUserGroup, HiOutlineXCircle, HiOutlineXMark } from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useCustomers } from '../hooks/useCustomers.js'
import { useEffect, useMemo, useState } from 'react'
import Toast from '../components/ui/Toast.jsx'
import { confirmAction } from '../components/ui/dialogActions.js'
import EmptyState from '../components/system/EmptyState.jsx'
import CustomerModal from '../components/customers/CustomerModal.jsx'
import { useUser } from '../hooks/useUser.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { loadRestaurantCustomers, saveRestaurantCustomers } from '../data/restaurantCustomers.js'
import { formatCurrency } from '../utils/format.js'
import { useWalletTransactions } from '../hooks/useWalletTransactions.js'
import { withTimeout } from '../utils/withTimeout.js'
import { collection, onSnapshot, orderBy, query, limit, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function CustomersPage() {
  const customersApi = useCustomers({ paginated: true, limitCount: 50 })
  const { businessType } = useUser()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [settleCustomer, setSettleCustomer] = useState(null)
  const [settleDraft, setSettleDraft] = useState({ amount: '', paymentMethod: 'Cash', note: '' })
  const [settlingDue, setSettlingDue] = useState(false)
  const [deletingCustomerId, setDeletingCustomerId] = useState('')
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
    const walletDue = customersApi.customers.reduce((sum, customer) => sum + Number(customer.walletDue || 0), 0)
    const walletCredit = customersApi.customers.reduce((sum, customer) => sum + Number(customer.walletCredit || 0), 0)
    return { total: customersApi.customers.length, active, business, walletDue, walletCredit }
  }, [customersApi.customers, isSchool])

  async function handleDeleteCustomer(customer) {
    if (!customer?.id || deletingCustomerId) return
    const label = customer.studentName || customer.name || (isSchool ? 'student' : 'customer')
    const recordType = isSchool ? 'student profile' : 'customer record'
    if (!await confirmAction({ title: `Delete ${isSchool ? 'student' : 'customer'}?`, message: `Delete ${label}? This will permanently remove the ${recordType} from this workspace.`, confirmLabel: 'Delete' })) return

    setDeletingCustomerId(customer.id)
    const res = await customersApi.deleteCustomer(customer)
    setDeletingCustomerId('')
    if (res?.ok) {
      setToast({ tone: 'success', message: isSchool ? 'Student deleted successfully' : 'Customer deleted successfully' })
      window.setTimeout(() => setToast(null), 1600)
      return
    }
    setToast({ tone: 'error', message: res?.error || (isSchool ? 'Failed to delete student' : 'Failed to delete customer') })
    window.setTimeout(() => setToast(null), 2400)
  }

  function openSettleDue(customer) {
    setSettleCustomer(customer)
    setSettleDraft({ amount: String(Math.max(0, Number(customer.walletDue || 0))), paymentMethod: 'Cash', note: '' })
  }

  async function handleSettleDue(event) {
    event.preventDefault()
    if (!settleCustomer || settlingDue) return
    setSettlingDue(true)
    const res = await customersApi.settleCustomerDue(settleCustomer, settleDraft)
    setSettlingDue(false)
    if (res?.ok) {
      setToast({ tone: 'success', message: `Due settled. Remaining due ${formatCurrency(res.remainingDue || 0)}.` })
      window.setTimeout(() => setToast(null), 1800)
      setSettleCustomer(null)
      return
    }
    setToast({ tone: 'error', message: res?.error || 'Unable to settle due.' })
    window.setTimeout(() => setToast(null), 2400)
  }

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
        {
          key: 'actions',
          header: 'Actions',
          cell: (r) => (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="subtle"
                className="h-8 rounded-xl px-3 text-xs"
                onClick={() => setEditingCustomer(r)}
              >
                <HiOutlinePencilSquare className="h-4 w-4" /> Edit
              </Button>
              <Button
                type="button"
                variant="subtle"
                className="h-8 rounded-xl px-3 text-xs text-rose-700 hover:border-rose-200 hover:bg-rose-50"
                disabled={deletingCustomerId === r.id}
                onClick={() => handleDeleteCustomer(r)}
              >
                <HiOutlineTrash className="h-4 w-4" /> {deletingCustomerId === r.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          ),
        },
      ]
    : [
        { key: 'name', header: 'Name', cell: (r) => <span className="font-semibold">{r.name}</span> },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone', cell: (r) => r.phone || '—' },
        { key: 'company', header: 'Company', cell: (r) => r.company || '—' },
        { key: 'customerType', header: 'Type', cell: (r) => <Badge variant="info">{r.customerType}</Badge> },
        {
          key: 'wallet',
          header: 'Wallet',
          cell: (r) => (
            <div className="min-w-28">
              <p className={`text-sm font-black ${Number(r.walletDue || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                Due {formatCurrency(r.walletDue || 0)}
              </p>
              <p className="text-xs font-semibold text-slate-500">Credit {formatCurrency(r.walletCredit || 0)}</p>
            </div>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          cell: (r) => {
            const v = r.status === 'Active' ? 'success' : r.status === 'At Risk' ? 'warning' : 'purple'
            return <Badge variant={v}>{r.status}</Badge>
          },
        },
        { key: 'createdAt', header: 'Created', cell: (r) => formatDate(r.createdAt) },
        {
          key: 'actions',
          header: 'Actions',
          cell: (r) => (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="subtle"
                className="h-8 rounded-xl px-3 text-xs"
                onClick={() => setEditingCustomer(r)}
              >
                <HiOutlinePencilSquare className="h-4 w-4" /> Edit
              </Button>
              {Number(r.walletDue || 0) > 0 ? (
                <Button
                  type="button"
                  variant="subtle"
                  className="h-8 rounded-xl border-emerald-200 bg-emerald-50 px-3 text-xs text-emerald-800 hover:bg-emerald-100"
                  onClick={() => openSettleDue(r)}
                >
                  <HiOutlineBanknotes className="h-4 w-4" /> Settle Due
                </Button>
              ) : null}
              <Button
                type="button"
                variant="subtle"
                className="h-8 rounded-xl px-3 text-xs text-rose-700 hover:border-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10"
                disabled={deletingCustomerId === r.id}
                onClick={() => handleDeleteCustomer(r)}
              >
                <HiOutlineTrash className="h-4 w-4" /> {deletingCustomerId === r.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          ),
        },
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

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          [isSchool ? 'Total Students' : 'Total customers', stats.total],
          [isSchool ? 'Active Students' : 'Active records', stats.active],
          [isSchool ? 'Parent Accounts' : 'Business accounts', stats.business],
          [isSchool ? 'Wallet due' : 'Customer wallet due', formatCurrency(stats.walletDue)],
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
          // Keep CustomerModal's Save button disabled (via its `saving` state,
          // which only clears once this returned promise settles) for the
          // whole real operation — not just 25s — so a slow save can't be
          // mistaken for a failure and re-submitted into a duplicate student
          // record. Show an interim notice instead of a false failure, and
          // only give up (re-enabling Save) after a much longer safety cap.
          const slowNoticeTimer = window.setTimeout(() => {
            setToast({ tone: 'info', message: isSchool ? 'Still saving the student — please keep waiting.' : 'Still saving — please keep waiting.' })
          }, 8000)
          const res = await withTimeout(customersApi.createCustomer(payload), {
            ms: 60000,
            onLateResolve: (lateRes) => {
              if (lateRes?.ok) {
                setToast({ tone: 'success', message: isSchool ? 'Student was saved after all.' : 'Customer was saved after all.' })
                window.setTimeout(() => setToast(null), 2400)
                setCreateOpen(false)
              }
            },
          })
          window.clearTimeout(slowNoticeTimer)
          if (res?.ok) {
            setToast({ tone: 'success', message: isSchool ? 'Student created successfully' : 'Customer created successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setCreateOpen(false)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to create customer' })
            window.setTimeout(() => setToast(null), 2800)
          }
          return res
        }}
      />
      <CustomerModal
        open={Boolean(editingCustomer)}
        schoolMode={isSchool}
        initialRecord={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onCreate={async (payload) => {
          const slowNoticeTimer = window.setTimeout(() => {
            setToast({ tone: 'info', message: isSchool ? 'Still saving the student — please keep waiting.' : 'Still saving — please keep waiting.' })
          }, 8000)
          const res = await withTimeout(customersApi.updateCustomer(editingCustomer?.id, payload), {
            ms: 60000,
            onLateResolve: (lateRes) => {
              if (lateRes?.ok) {
                setToast({ tone: 'success', message: isSchool ? 'Student was updated after all.' : 'Customer was updated after all.' })
                window.setTimeout(() => setToast(null), 2400)
                setEditingCustomer(null)
              }
            },
          })
          window.clearTimeout(slowNoticeTimer)
          if (res?.ok) {
            setToast({ tone: 'success', message: isSchool ? 'Student updated successfully' : 'Customer updated successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setEditingCustomer(null)
          } else {
            setToast({ tone: 'error', message: res?.error || (isSchool ? 'Failed to update student' : 'Failed to update customer') })
            window.setTimeout(() => setToast(null), 2800)
          }
          return res
        }}
      />
      {settleCustomer ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6">
          <form onSubmit={handleSettleDue} className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Customer Wallet</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Settle Due Payment</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{settleCustomer.name} · Current due {formatCurrency(settleCustomer.walletDue || 0)}</p>
              </div>
              <button type="button" onClick={() => setSettleCustomer(null)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Amount received</span>
                <Input
                  type="number"
                  min="1"
                  max={Number(settleCustomer.walletDue || 0)}
                  value={settleDraft.amount}
                  onChange={(event) => setSettleDraft((draft) => ({ ...draft, amount: event.target.value }))}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Payment method</span>
                <select
                  value={settleDraft.paymentMethod}
                  onChange={(event) => setSettleDraft((draft) => ({ ...draft, paymentMethod: event.target.value }))}
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {['Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank Transfer'].map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Note</span>
                <textarea
                  value={settleDraft.note}
                  onChange={(event) => setSettleDraft((draft) => ({ ...draft, note: event.target.value }))}
                  placeholder="Optional settlement note"
                  className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="subtle" className="rounded-2xl" onClick={() => setSettleCustomer(null)}>Cancel</Button>
              <Button type="submit" className="rounded-2xl" disabled={settlingDue}>
                <HiOutlineBanknotes className="h-4 w-4" /> {settlingDue ? 'Settling...' : 'Settle Payment'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
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

/** Normalise a Firestore customer into the shape the restaurant UI expects. */
function restaurantCustomerFromFirestore(doc) {
  return {
    id: doc.id,
    name: doc.name || 'Restaurant Customer',
    phone: doc.phone || '',
    address: doc.address || '',
    creditBalance: Number(doc.walletDue || 0),
    paidAmount: Number(doc.lifetimeSpend || 0),
    lastVisit: doc.lastPosOrderAt || '',
    notes: doc.notes || '',
    orderHistory: [],
    _source: 'firestore',
  }
}

function WalletLedgerModal({ customer, workspaceId, onClose }) {
  const { transactions, loading, currentBalance, addTransaction } = useWalletTransactions({ customerId: customer.id })
  const { role, userId } = useUser()
  const isOwner = (role || '').toLowerCase() === 'owner' || (role || '').toLowerCase() === 'admin'
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionMode, setActionMode] = useState(null) // 'credit' | 'settle' | null
  const [actionAmount, setActionAmount] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  const hasFilters = search || typeFilter !== 'all' || channelFilter !== 'all' || dateFrom || dateTo
  const due = Number(customer.creditBalance || 0)

  async function handleAction() {
    const amt = Number(actionAmount)
    if (!amt || amt <= 0) { setActionError('Enter a valid amount.'); return }
    if (actionMode === 'settle' && amt > due) { setActionError(`Maximum is Rs ${due.toLocaleString()}`); return }

    setActionSubmitting(true)
    setActionError('')

    const type = actionMode === 'credit' ? 'credit' : 'debit'
    const source = actionMode === 'credit' ? 'manual_topup' : 'due_settlement'
    const result = await addTransaction({ type, amount: amt, source, sourceId: null, note: actionNote })

    if (result.ok) {
      setActionMode(null)
      setActionAmount('')
      setActionNote('')
      setActionSubmitting(false)
    } else {
      setActionError(result.error || 'Transaction failed.')
      setActionSubmitting(false)
    }
  }

  // ── Filtered / grouped transactions ──────────────────────────────────
  const filtered = useMemo(() => {
    let list = transactions

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (tx) =>
          (tx.transactionId || '').toLowerCase().includes(q) ||
          (tx.referenceLabel || '').toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q),
      )
    }

    if (typeFilter === 'credit') list = list.filter((tx) => tx.type === 'credit')
    else if (typeFilter === 'debit') list = list.filter((tx) => tx.type === 'debit')

    if (channelFilter === 'desktop_pos') list = list.filter((tx) => tx.channel === 'desktop_pos')
    else if (channelFilter === 'website') list = list.filter((tx) => tx.channel === 'website' || !tx.channel)

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      list = list.filter((tx) => {
        const d = tx.createdAt?.toDate?.() || new Date(tx.createdAt)
        return d >= from
      })
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      list = list.filter((tx) => {
        const d = tx.createdAt?.toDate?.() || new Date(tx.createdAt)
        return d <= to
      })
    }

    return list
  }, [transactions, search, typeFilter, channelFilter, dateFrom, dateTo])

  // ── Group by date ────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups = []
    for (const tx of filtered) {
      const d = tx.createdAt?.toDate?.() || new Date(tx.createdAt)
      const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.items.push(tx)
      } else {
        groups.push({ label, items: [tx] })
      }
    }
    return groups
  }, [filtered])

  // ── Summary numbers ──────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalCredits = filtered.filter((tx) => tx.type === 'credit').reduce((s, tx) => s + Number(tx.amount || 0), 0)
    const totalDebits = filtered.filter((tx) => tx.type === 'debit').reduce((s, tx) => s + Number(tx.amount || 0), 0)
    return { totalCredits, totalDebits, net: totalCredits - totalDebits, count: filtered.length }
  }, [filtered])

  return (
    <motion.div
      className="fixed inset-0 z-[85] flex bg-slate-950/45 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* ── Slide-over panel ── */}
      <motion.div
        className="ml-auto flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Wallet Statement</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{customer.name}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{customer.phone || 'No phone'}{customer.address ? ` · ${customer.address}` : ''}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>

          {/* Balance cards */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Wallet Balance</p>
              <p className={`mt-1 text-3xl font-black tracking-tight ${currentBalance > 0 ? 'text-emerald-700' : 'text-slate-950'}`}>
                Rs {Number(currentBalance || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {currentBalance > 0 ? 'In credit — customer has prepaid funds' : 'No prepaid credit available'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Outstanding Dues</p>
              <p className={`mt-1 text-3xl font-black tracking-tight ${due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                Rs {due.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {due > 0 ? 'Customer owes money — use Settle Due' : 'All dues cleared'}
              </p>
            </div>
          </div>

          {/* ── Owner actions ── */}
          {isOwner ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {actionMode ? (
                <div className="w-full rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black uppercase text-sky-700">
                      {actionMode === 'credit' ? 'Add Credit' : 'Settle Due'}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setActionMode(null); setActionAmount(''); setActionNote(''); setActionError('') }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      cancel
                    </button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Amount (Rs)</label>
                      <input
                        type="number"
                        min="1"
                        max={actionMode === 'settle' ? due : undefined}
                        value={actionAmount}
                        onChange={(e) => { setActionAmount(e.target.value); setActionError('') }}
                        placeholder={actionMode === 'settle' ? `Max Rs ${due.toLocaleString()}` : 'Enter amount'}
                        className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-sky-300"
                        autoFocus
                      />
                    </div>
                    <div className="flex-[2] min-w-[140px]">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Note</label>
                      <input
                        type="text"
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Optional note…"
                        className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-300"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAction}
                      disabled={actionSubmitting}
                      className="h-9 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
                    >
                      {actionSubmitting ? 'Saving…' : actionMode === 'credit' ? 'Add Credit' : 'Settle'}
                    </button>
                  </div>
                  {actionError ? (
                    <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{actionError}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActionMode('credit')}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                  >
                    <HiOutlinePlus className="inline h-3.5 w-3.5 mr-1" /> Add Credit
                  </button>
                  {due > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActionMode('settle')}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
                    >
                      <HiOutlineBanknotes className="inline h-3.5 w-3.5 mr-1" /> Settle Due
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* ── Filters ── */}
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <div className="space-y-2">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by transaction ID or reference…"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-300"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Type filter */}
              {['all', 'credit', 'debit'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    typeFilter === f
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'credit' ? 'Credits' : 'Debits'}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-slate-200" />
              {/* Channel filter */}
              {['all', 'desktop_pos', 'website'].map((f) => (
                <button
                  key={f}
                  onClick={() => setChannelFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    channelFilter === f
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {f === 'all' ? 'All Channels' : f === 'desktop_pos' ? 'Desktop POS' : 'Website'}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-slate-200" />
              {/* Date range */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 outline-none focus:border-sky-300"
                aria-label="From date"
              />
              <span className="text-[11px] text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 outline-none focus:border-sky-300"
                aria-label="To date"
              />
              {hasFilters ? (
                <button
                  onClick={() => { setSearch(''); setTypeFilter('all'); setChannelFilter('all'); setDateFrom(''); setDateTo('') }}
                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100"
                >
                  <HiOutlineXCircle className="h-3.5 w-3.5" /> Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Statement list ── */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" />
              <p className="text-sm font-semibold">Loading transactions…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <HiOutlineCreditCard className="h-12 w-12" />
              <p className="text-sm font-semibold">{transactions.length === 0 ? 'No transactions yet' : 'No transactions match these filters'}</p>
              <p className="text-xs text-slate-400">
                {transactions.length === 0 ? 'Wallet transactions will appear here once created.' : 'Try adjusting your search or filters above.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped.map((group) => (
                <div key={group.label}>
                  {/* Date header */}
                  <div className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/90 px-6 py-2 backdrop-blur-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{group.label}</p>
                  </div>
                  {group.items.map((tx, idx) => {
                    const isCredit = tx.type === 'credit'
                    const date = tx.createdAt?.toDate?.() || new Date(tx.createdAt)
                    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const tid = tx.transactionId || null
                    const isLegacy = !tx.transactionId
                    const label = tx.referenceLabel || tx.note || {
                      manual_topup: 'Manual top-up', order_payment: 'Order Payment',
                      refund: 'Refund', due_settlement: 'Due Settlement',
                    }[tx.source] || tx.source
                    const isDesktop = tx.channel === 'desktop_pos'

                    return (
                      <div
                        key={tx.id}
                        className={`group px-6 py-4 transition hover:bg-sky-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: ID + description */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-2">
                              {tid ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold tracking-tight text-slate-600">{tid}</span>
                              ) : (
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700" title="Created before transaction IDs were introduced">
                                  Legacy — {tx.id?.slice(0, 8)?.toUpperCase() || '—'}
                                </span>
                              )}
                              <span
                                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                                  isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {isCredit ? 'Credit' : 'Debit'}
                              </span>
                              {isDesktop ? (
                                <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-700">POS</span>
                              ) : null}
                              <span className="text-[10px] font-semibold text-slate-400">{time}</span>
                            </div>
                            <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-800">{label}</p>

                            {/* Expandable detail (hover reveal) */}
                            <div className="mt-1.5 hidden gap-3 text-[10px] text-slate-400 group-hover:flex">
                              {tx.note ? <span>Note: {tx.note}</span> : null}
                              <span>By: {tx.createdByRole || 'staff'}</span>
                              {tx.sourceId ? <span>Ref: {tx.sourceId}</span> : null}
                              {tx.dueBefore !== undefined ? <span>Due: {tx.dueBefore} → {tx.dueAfter}</span> : null}
                            </div>
                          </div>

                          {/* Right: amount + running balance */}
                          <div className="shrink-0 text-right">
                            <p className={`text-sm font-black tabular-nums ${isCredit ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isCredit ? '+' : '−'} Rs {Number(tx.amount || 0).toLocaleString()}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium tabular-nums text-slate-400">
                              <span className="text-slate-400">Bal </span>
                              <span className="font-bold text-slate-600">Rs {Number(tx.balanceAfter ?? tx.runningBalance ?? 0).toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Summary footer ── */}
        {!loading && filtered.length > 0 ? (
          <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-slate-500">
                  {summary.count} transaction{summary.count !== 1 ? 's' : ''}
                  {hasFilters ? ' match filters' : ''}
                </span>
                <span className="text-emerald-700">
                  Credits Rs {summary.totalCredits.toLocaleString()}
                </span>
                <span className="text-rose-700">
                  Debits Rs {summary.totalDebits.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-bold text-slate-500">Net change</span>
                <span className={`text-lg font-black tabular-nums ${summary.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {summary.net >= 0 ? '+' : '−'} Rs {Math.abs(summary.net).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Bottom bar ── */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
          >
            Close Statement
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function RestaurantCustomersManager() {
  const { workspaceId, userId, firebaseUser } = useUser()
  const [customers, setCustomers] = useState(() => loadRestaurantCustomers())
  const [firestoreCustomers, setFirestoreCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [viewingCustomer, setViewingCustomer] = useState(null)

  // ── Direct Firestore query WITHOUT businessType filter ──
  //     useCustomers / listenToWorkspaceCollection applies
  //     where('businessType','==',normalizedBusinessType) which excludes
  //     desktop-POS-created customers (they have no businessType field).
  useEffect(() => {
    if (!db || !workspaceId) {
      setFirestoreCustomers([])
      return
    }
    console.log('[restaurant-customers-merge] subscribing to Firestore customers | workspaceId:', workspaceId)
    const colPath = `workspaces/${workspaceId}/customers`
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'), limit(300))
    const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        console.log('[restaurant-customers-merge] Firestore returned', docs.length, 'docs | ids:', docs.map((d) => d.id).join(', ') || '(none)')
        setFirestoreCustomers(docs)
      },
      (err) => {
        console.error('[restaurant-customers-merge] Firestore query FAILED:', err?.code, err?.message)
        setFirestoreCustomers([])
      },
    )
    return () => unsub()
  }, [workspaceId])

  // ── Merge localStorage (source of truth for writes) with Firestore
  //     (desktop-POS-created customers) — dedup by customer.id, local wins ──
  const mergedCustomers = useMemo(() => {
    const localMap = new Map(customers.map((c) => [c.id, c]))
    const normalizedFirestore = (firestoreCustomers || [])
      .filter((doc) => doc.id && !localMap.has(doc.id))
      .map(restaurantCustomerFromFirestore)
    console.log('[restaurant-customers-merge] local:', customers.length, '| firestore:', firestoreCustomers.length, '| new-from-firestore:', normalizedFirestore.length, '| merged:', customers.length + normalizedFirestore.length)
    return [...customers, ...normalizedFirestore]
  }, [customers, firestoreCustomers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return mergedCustomers
    return mergedCustomers.filter((customer) =>
      [customer.name, customer.phone, customer.address, customer.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [mergedCustomers, search])

  const totals = useMemo(
    () => ({
      customers: mergedCustomers.length,
      due: mergedCustomers.reduce((sum, customer) => sum + Number(customer.creditBalance || 0), 0),
      paid: mergedCustomers.reduce((sum, customer) => sum + Number(customer.paidAmount || 0), 0),
    }),
    [mergedCustomers],
  )

  function persist(next) {
    setCustomers(next)
    saveRestaurantCustomers(next, workspaceId, userId || firebaseUser?.uid)
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

  const desktopCount = useMemo(
    () => mergedCustomers.filter((c) => c._source === 'firestore').length,
    [mergedCustomers],
  )
  const customersWithDue = useMemo(
    () => mergedCustomers.filter((c) => Number(c.creditBalance || 0) > 0).length,
    [mergedCustomers],
  )

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

      {/* ── Stat cards ── */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 p-5 transition hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
              <HiOutlineUserGroup className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Customers</p>
              <p className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{totals.customers}</p>
            </div>
          </div>
          {desktopCount > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-sky-600">{desktopCount} from Desktop POS</p>
          ) : null}
        </Card>

        <Card className={`rounded-2xl border-slate-200 p-5 transition hover:shadow-sm ${totals.due > 0 ? 'ring-1 ring-amber-200' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${totals.due > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              <HiOutlineCreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Outstanding Due</p>
              <p className={`mt-0.5 text-2xl font-black tracking-tight ${totals.due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>Rs {totals.due.toLocaleString()}</p>
            </div>
          </div>
          {customersWithDue > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-amber-700">{customersWithDue} customer{customersWithDue !== 1 ? 's' : ''} with outstanding dues</p>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">All dues cleared</p>
          )}
        </Card>

        <Card className="rounded-2xl border-slate-200 p-5 transition hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <HiOutlineCurrencyDollar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Total Paid</p>
              <p className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">Rs {totals.paid.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">Lifetime revenue</p>
        </Card>

        <Card className="rounded-2xl border-slate-200 p-5 transition hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <HiOutlineBanknotes className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Avg. Due</p>
              <p className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">
                Rs {customersWithDue ? Math.round(totals.due / customersWithDue).toLocaleString() : '0'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">Per customer with dues</p>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-[1.25rem] p-0">
        {/* ── Search + controls ── */}
        <div className="grid gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
          <div className="relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or address…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${viewMode === 'list' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <HiOutlineBars3 className="h-4 w-4" /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${viewMode === 'grid' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <HiOutlineSquares2X2 className="h-4 w-4" /> Grid
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Synced
            </span>
            {desktopCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700">
                {desktopCount} POS
              </span>
            ) : null}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50/95 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 backdrop-blur-sm">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Address</th>
                  <th className="px-5 py-3.5">Paid</th>
                  <th className="px-5 py-3.5">Remaining</th>
                  <th className="px-5 py-3.5">Last Visit</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {filtered.map((customer, idx) => {
                  const due = Number(customer.creditBalance || 0)
                  const initial = (customer.name || '?')[0].toUpperCase()
                  const avatarColors = [
                    'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700',
                    'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700',
                    'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
                    'bg-orange-100 text-orange-700', 'bg-indigo-100 text-indigo-700',
                  ]
                  const avatarColor = avatarColors[idx % avatarColors.length]
                  return (
                    <tr key={customer.id} className="group transition hover:bg-sky-50/50">
                      <td className="px-5 py-3.5" data-label="Customer">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${avatarColor}`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-950">{customer.name}</p>
                            {customer._source === 'firestore' ? (
                              <span className="mt-0.5 inline-flex items-center rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                                Desktop POS
                              </span>
                            ) : customer.notes ? (
                              <p className="mt-0.5 truncate text-xs text-slate-400">{customer.notes}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600" data-label="Phone">{customer.phone || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-[180px] truncate" data-label="Address">{customer.address || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-800 tabular-nums" data-label="Paid">Rs {Number(customer.paidAmount || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5" data-label="Remaining">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums ${due > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {due > 0 ? 'Rs ' + due.toLocaleString() : 'Clear'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500" data-label="Last Visit">{customer.lastVisit || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingCustomer(customer)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(customer)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <HiOutlineUserGroup className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-500">No restaurant customers found</p>
                      <p className="mt-1 text-xs text-slate-400">Try adjusting your search or add a new customer.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((customer, idx) => {
              const due = Number(customer.creditBalance || 0)
              const history = customer.orderHistory || []
              const initial = (customer.name || '?')[0].toUpperCase()
              const avatarColors = [
                'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700',
                'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700',
                'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
              ]
              const avatarColor = avatarColors[idx % avatarColors.length]
              return (
                <div key={customer.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${avatarColor}`}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-slate-950">{customer.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {customer._source === 'firestore' ? (
                            <span className="inline-flex items-center rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">Desktop POS</span>
                          ) : null}
                          <span className="text-xs text-slate-500">{customer.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingCustomer(customer)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(customer)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {customer.address ? (
                    <p className="mt-2 text-xs text-slate-500 truncate">{customer.address}</p>
                  ) : null}

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Paid</p>
                      <p className="mt-0.5 text-sm font-black text-slate-800 tabular-nums">Rs {Number(customer.paidAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className={`rounded-xl px-3 py-2 ${due > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Remaining</p>
                      <p className={`mt-0.5 text-sm font-black tabular-nums ${due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {due > 0 ? 'Rs ' + due.toLocaleString() : 'Clear'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Visit</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-600">{customer.lastVisit || '—'}</p>
                    </div>
                  </div>

                  {customer.notes ? (
                    <p className="mt-3 text-xs text-slate-500 line-clamp-2">{customer.notes}</p>
                  ) : null}

                  {history.length > 0 ? (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Recent Orders</p>
                      <div className="mt-1.5 space-y-1">
                        {history.slice(0, 3).map((order) => (
                          <div key={`${customer.id}-${order.orderNumber}-${order.date}`} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-800">{order.orderNumber}</span>
                            <span className="text-slate-400">{order.date}</span>
                            <span className="font-bold text-slate-600 tabular-nums">Rs {Number(order.total || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {filtered.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-8 py-16 text-center">
                <HiOutlineUserGroup className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-500">No restaurant customers found</p>
                <p className="mt-1 text-xs text-slate-400">Try adjusting your search or add a new customer.</p>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {viewingCustomer ? (
        <WalletLedgerModal
          customer={viewingCustomer}
          workspaceId={workspaceId}
          onClose={() => setViewingCustomer(null)}
        />
      ) : null}

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
