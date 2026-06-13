import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineUserGroup,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import { formatTransportCurrency } from '../lib/transportCalculations.js'
import {
  loadTransportCustomers,
  saveTransportCustomers,
  upsertTransportCustomer,
  deleteTransportCustomer,
} from '../data/transportCustomers.js'

const blankCustomer = {
  name: '',
  phone: '',
  cnic: '',
  licenseNumber: '',
  address: '',
  notes: '',
}

export default function TransportCustomersPage() {
  const [customers, setCustomers] = useState(() => loadTransportCustomers())
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [form, setForm] = useState(blankCustomer)
  const [selectedId, setSelectedId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [warning, setWarning] = useState('')

  useEffect(() => {
    saveTransportCustomers(customers)
  }, [customers])

  const stats = useMemo(() => ({
    total: customers.length,
    withDues: customers.filter((customer) => customer.creditBalance > 0).length,
    totalDues: customers.reduce((sum, customer) => sum + customer.creditBalance, 0),
  }), [customers])

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query)
      || customer.phone.toLowerCase().includes(query)
      || customer.cnic.toLowerCase().includes(query)
      || customer.licenseNumber.toLowerCase().includes(query),
    )
  }, [customers, search])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedId) || filteredCustomers[0] || customers[0],
    [customers, filteredCustomers, selectedId],
  )

  function openModal(customer = null) {
    setWarning('')
    setEditingCustomer(customer)
    setForm(customer ? { ...blankCustomer, ...customer } : blankCustomer)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingCustomer(null)
    setForm(blankCustomer)
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function saveCustomer() {
    if (!form.name.trim()) {
      setWarning('Customer name is required.')
      return
    }
    const payload = { ...form, id: editingCustomer?.id, name: form.name.trim() }
    const next = upsertTransportCustomer(payload)
    setCustomers(next)
    closeModal()
  }

  function requestDelete(customer) {
    if (customer.id === 'tcust-walkin') return
    setDeleteTarget(customer)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setCustomers(deleteTransportCustomer(deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        title="Rental Customers"
        subtitle="Manage customer profiles, licenses, booking history, and outstanding dues."
        right={(
          <Button onClick={() => openModal()}>
            <HiOutlinePlus className="h-4 w-4" />
            Add Customer
          </Button>
        )}
      />

      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <Card className="rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total Customers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{stats.total}</p>
        </Card>
        <Card className="rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Customers with Dues</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{stats.withDues}</p>
        </Card>
        <Card className="rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Outstanding Dues</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{formatTransportCurrency(stats.totalDues)}</p>
        </Card>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-[1.35rem] p-4 sm:p-5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, CNIC, license..." className="max-w-sm" />
            <Badge variant="info" className="ml-auto">{filteredCustomers.length} customers</Badge>
          </div>
          <div className="mt-5 space-y-2">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setSelectedId(customer.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition hover:border-sky-200 ${selectedCustomer?.id === customer.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{customer.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{customer.phone || 'No phone'} {customer.licenseNumber ? `• Lic ${customer.licenseNumber}` : ''}</p>
                </div>
                {customer.creditBalance > 0
                  ? <Badge variant="danger">Due {formatTransportCurrency(customer.creditBalance)}</Badge>
                  : <Badge variant="success">Clear</Badge>}
              </button>
            ))}
            {!filteredCustomers.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No customers found.</div>
            ) : null}
          </div>
        </Card>

        {selectedCustomer ? (
          <Card className="rounded-[1.35rem] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <HiOutlineUserGroup className="h-5 w-5 text-slate-400" />
                  <p className="text-lg font-semibold text-slate-950 dark:text-white">{selectedCustomer.name}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">{selectedCustomer.phone || 'No phone'}</p>
              </div>
              {selectedCustomer.creditBalance > 0
                ? <Badge variant="danger">Due {formatTransportCurrency(selectedCustomer.creditBalance)}</Badge>
                : <Badge variant="success">Clear</Badge>}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Detail label="CNIC" value={selectedCustomer.cnic || '—'} />
              <Detail label="License" value={selectedCustomer.licenseNumber || '—'} />
              <Detail label="Total Paid" value={formatTransportCurrency(selectedCustomer.paidAmount)} />
              <Detail label="Last Booking" value={selectedCustomer.lastBooking || '—'} />
            </div>
            {selectedCustomer.address ? <p className="mt-3 text-xs text-slate-500">{selectedCustomer.address}</p> : null}

            <div className="mt-4 flex gap-2">
              <Button variant="subtle" className="flex-1 text-xs" onClick={() => openModal(selectedCustomer)}>
                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                Edit
              </Button>
              {selectedCustomer.id !== 'tcust-walkin' ? (
                <Button variant="subtle" className="flex-1 text-xs" onClick={() => requestDelete(selectedCustomer)}>
                  <HiOutlineTrash className="h-3.5 w-3.5" />
                  Delete
                </Button>
              ) : null}
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Booking History</p>
              <div className="mt-2 space-y-2">
                {selectedCustomer.bookingHistory?.length ? selectedCustomer.bookingHistory.slice(0, 8).map((entry, index) => (
                  <div key={`${entry.bookingNumber}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{entry.bookingNumber || 'Booking'}</span>
                      <span>{formatTransportCurrency(entry.total)}</span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-slate-400">
                      <span>{entry.date} • {entry.method}</span>
                      <span>{entry.due > 0 ? `Due ${formatTransportCurrency(entry.due)}` : 'Paid'}</span>
                    </div>
                  </div>
                )) : <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">No bookings yet.</p>}
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Transport / Rental</p>
                <h2 className="text-lg font-black tracking-tight text-slate-950">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name"><Input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Customer name" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="03xx-xxxxxxx" /></Field>
                <Field label="CNIC"><Input value={form.cnic} onChange={(event) => updateForm('cnic', event.target.value)} placeholder="xxxxx-xxxxxxx-x" /></Field>
                <Field label="License Number"><Input value={form.licenseNumber} onChange={(event) => updateForm('licenseNumber', event.target.value)} /></Field>
                <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={(event) => updateForm('address', event.target.value)} /></Field></div>
                <div className="sm:col-span-2"><Field label="Notes"><Input value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} /></Field></div>
              </div>
            </div>
            {warning ? <p className="px-5 pb-2 text-sm font-medium text-rose-600">{warning}</p> : null}
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button onClick={saveCustomer}>{editingCustomer ? 'Update Customer' : 'Add Customer'}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600">
              <HiOutlineExclamationTriangle className="h-5 w-5" />
              <p className="text-base font-black tracking-tight">Delete customer?</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">Remove <span className="font-semibold">{deleteTarget.name}</span> permanently.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="subtle" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
