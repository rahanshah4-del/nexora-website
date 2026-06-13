import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineTruck,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlinePlus,
} from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import { cn } from '../utils/cn.js'
import { formatTransportCurrency } from '../lib/transportCalculations.js'
import {
  loadTransportVehicles,
  saveTransportVehicles,
  upsertTransportVehicle,
  deleteTransportVehicle,
  setVehicleStatus,
  vehicleCategories,
  vehicleFeatureOptions,
  vehicleStatuses,
} from '../data/transportVehicles.js'
import { syncVehiclesWithBookings } from '../data/transportBookings.js'

const statusMeta = {
  available: { label: 'Available', badge: 'success' },
  rented: { label: 'Rented', badge: 'warning' },
  reserved: { label: 'Reserved', badge: 'info' },
  maintenance: { label: 'Maintenance', badge: 'purple' },
}

const blankVehicle = {
  name: '',
  registration: '',
  category: 'Car',
  seats: '5',
  transmission: 'Automatic',
  fuelType: 'Petrol',
  dailyRate: '',
  hourlyRate: '',
  weeklyRate: '',
  securityDeposit: '',
  features: [],
  driverIncluded: false,
  driverName: '',
  driverPhone: '',
  driverLicense: '',
  driverRate: '',
  status: 'available',
  notes: '',
}

export default function TransportVehiclesPage() {
  const [vehicles, setVehicles] = useState(() => loadTransportVehicles())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [form, setForm] = useState(blankVehicle)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [warning, setWarning] = useState('')

  useEffect(() => {
    syncVehiclesWithBookings()
    setVehicles(loadTransportVehicles())
  }, [])

  useEffect(() => {
    saveTransportVehicles(vehicles)
  }, [vehicles])

  const counts = useMemo(() => (
    vehicleStatuses.map((status) => ({
      status,
      label: statusMeta[status].label,
      count: vehicles.filter((vehicle) => vehicle.status === status).length,
    }))
  ), [vehicles])

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase()
    return vehicles.filter((vehicle) => {
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter
      const matchesQuery = !query
        || vehicle.name.toLowerCase().includes(query)
        || vehicle.registration.toLowerCase().includes(query)
        || vehicle.category.toLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [vehicles, search, statusFilter])

  function openModal(vehicle = null) {
    setWarning('')
    setEditingVehicle(vehicle)
    setForm(vehicle
      ? {
          ...blankVehicle,
          ...vehicle,
          seats: String(vehicle.seats || ''),
          dailyRate: String(vehicle.dailyRate || ''),
          hourlyRate: String(vehicle.hourlyRate || ''),
          weeklyRate: String(vehicle.weeklyRate || ''),
          securityDeposit: String(vehicle.securityDeposit || ''),
          driverRate: String(vehicle.driverRate || ''),
          features: Array.isArray(vehicle.features) ? vehicle.features : [],
        }
      : blankVehicle)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingVehicle(null)
    setForm(blankVehicle)
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleFeature(feature) {
    setForm((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }))
  }

  function saveVehicle() {
    if (!form.name.trim()) {
      setWarning('Vehicle name is required.')
      return
    }
    if (!form.registration.trim()) {
      setWarning('Registration / plate number is required.')
      return
    }
    const payload = {
      ...form,
      id: editingVehicle?.id,
      name: form.name.trim(),
      registration: form.registration.trim(),
      seats: Number(form.seats) || 1,
      dailyRate: Number(form.dailyRate) || 0,
      hourlyRate: Number(form.hourlyRate) || 0,
      weeklyRate: Number(form.weeklyRate) || 0,
      securityDeposit: Number(form.securityDeposit) || 0,
      driverName: form.driverIncluded ? form.driverName.trim() : '',
      driverPhone: form.driverIncluded ? form.driverPhone.trim() : '',
      driverLicense: form.driverIncluded ? form.driverLicense.trim() : '',
      driverRate: form.driverIncluded ? Number(form.driverRate) || 0 : 0,
    }
    setVehicles(upsertTransportVehicle(payload))
    closeModal()
  }

  function changeStatus(vehicle, status) {
    setVehicles(setVehicleStatus(vehicle.id, status))
  }

  function requestDelete(vehicle) {
    setWarning('')
    if (vehicle.status === 'rented' || vehicle.status === 'reserved') {
      setWarning(`Cannot delete ${vehicle.name}; it has an active or reserved booking.`)
      return
    }
    setDeleteTarget(vehicle)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setVehicles(deleteTransportVehicle(deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        title="Fleet Vehicles"
        subtitle="Manage your rental fleet, availability, rates, and vehicle features."
        right={(
          <Button onClick={() => openModal()}>
            <HiOutlinePlus className="h-4 w-4" />
            Add Vehicle
          </Button>
        )}
      />

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((item) => (
          <Card key={item.status} className="rounded-[1.25rem] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{item.count}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-[1.35rem] p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, registration, category..."
            className="max-w-sm"
          />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="max-w-[180px]">
            <option value="all">All statuses</option>
            {vehicleStatuses.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
          </Select>
          <Badge variant="info" className="ml-auto">{filteredVehicles.length} vehicles</Badge>
        </div>

        {warning ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            <HiOutlineExclamationTriangle className="h-5 w-5" />
            {warning}
          </div>
        ) : null}

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => {
            const meta = statusMeta[vehicle.status] || statusMeta.available
            return (
              <div key={vehicle.id} className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black tracking-tight text-slate-950 dark:text-white">{vehicle.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{vehicle.registration} • {vehicle.category}</p>
                    </div>
                    <HiOutlineTruck className="h-6 w-6 shrink-0 text-slate-400" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                    {vehicle.driverIncluded ? <Badge variant="info">With Driver</Badge> : null}
                  </div>
                  {vehicle.driverIncluded ? (
                    <div className="mt-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                      Driver: {vehicle.driverName || 'Assigned'} {vehicle.driverRate ? `• ${formatTransportCurrency(vehicle.driverRate)}/unit` : ''}
                    </div>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <p>{vehicle.seats} seats • {vehicle.transmission}</p>
                    <p className="text-right font-semibold text-slate-950 dark:text-white">{formatTransportCurrency(vehicle.dailyRate)}/day</p>
                  </div>
                  {vehicle.features?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {vehicle.features.slice(0, 4).map((feature) => (
                        <span key={feature} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{feature}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <Button type="button" variant="subtle" className="h-8 px-2 text-xs" onClick={() => openModal(vehicle)}>
                    <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button type="button" variant="subtle" className="h-8 px-2 text-xs" onClick={() => requestDelete(vehicle)}>
                    <HiOutlineTrash className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <Select value={vehicle.status} onChange={(event) => changeStatus(vehicle, event.target.value)} className="col-span-2 h-8 rounded-xl text-xs">
                    {vehicleStatuses.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
                  </Select>
                </div>
              </div>
            )
          })}
          {!filteredVehicles.length ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No vehicles match your filters. Add a vehicle to get started.
            </div>
          ) : null}
        </div>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-lg font-black tracking-tight text-slate-950">{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vehicle Name">
                <Input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Toyota Corolla" />
              </Field>
              <Field label="Registration / Plate">
                <Input value={form.registration} onChange={(event) => updateForm('registration', event.target.value)} placeholder="LEA-1234" />
              </Field>
              <Field label="Category">
                <Select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                  {vehicleCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </Select>
              </Field>
              <Field label="Seats">
                <Input type="number" min="1" value={form.seats} onChange={(event) => updateForm('seats', event.target.value)} />
              </Field>
              <Field label="Transmission">
                <Select value={form.transmission} onChange={(event) => updateForm('transmission', event.target.value)}>
                  <option>Automatic</option>
                  <option>Manual</option>
                </Select>
              </Field>
              <Field label="Fuel Type">
                <Select value={form.fuelType} onChange={(event) => updateForm('fuelType', event.target.value)}>
                  <option>Petrol</option>
                  <option>Diesel</option>
                  <option>Hybrid</option>
                  <option>Electric</option>
                  <option>CNG</option>
                </Select>
              </Field>
              <Field label="Daily Rate (PKR)">
                <Input type="number" min="0" value={form.dailyRate} onChange={(event) => updateForm('dailyRate', event.target.value)} />
              </Field>
              <Field label="Hourly Rate (PKR)">
                <Input type="number" min="0" value={form.hourlyRate} onChange={(event) => updateForm('hourlyRate', event.target.value)} />
              </Field>
              <Field label="Weekly Rate (PKR)">
                <Input type="number" min="0" value={form.weeklyRate} onChange={(event) => updateForm('weeklyRate', event.target.value)} />
              </Field>
              <Field label="Security Deposit (PKR)">
                <Input type="number" min="0" value={form.securityDeposit} onChange={(event) => updateForm('securityDeposit', event.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                  {vehicleStatuses.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
                </Select>
              </Field>
              <Field label="Driver">
                <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700">
                  <input type="checkbox" checked={form.driverIncluded} onChange={(event) => updateForm('driverIncluded', event.target.checked)} />
                  Driver included
                </label>
              </Field>
              {form.driverIncluded ? (
                <div className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3 sm:col-span-2 sm:grid-cols-2">
                  <Field label="Driver Name">
                    <Input value={form.driverName} onChange={(event) => updateForm('driverName', event.target.value)} placeholder="Driver full name" />
                  </Field>
                  <Field label="Driver Phone">
                    <Input value={form.driverPhone} onChange={(event) => updateForm('driverPhone', event.target.value)} placeholder="0300..." />
                  </Field>
                  <Field label="License Number">
                    <Input value={form.driverLicense} onChange={(event) => updateForm('driverLicense', event.target.value)} placeholder="License / CNIC" />
                  </Field>
                  <Field label="Driver Rate Per Unit (PKR)">
                    <Input type="number" min="0" value={form.driverRate} onChange={(event) => updateForm('driverRate', event.target.value)} />
                  </Field>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold text-slate-600">Features</p>
                <div className="flex flex-wrap gap-2">
                  {vehicleFeatureOptions.map((feature) => (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => toggleFeature(feature)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-semibold transition',
                        form.features.includes(feature)
                          ? 'border-sky-300 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                      )}
                    >
                      {feature}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <Input value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Optional notes" />
                </Field>
              </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button onClick={saveVehicle}>{editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600">
              <HiOutlineExclamationTriangle className="h-5 w-5" />
              <p className="text-base font-black tracking-tight">Delete vehicle?</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">This will permanently remove <span className="font-semibold">{deleteTarget.name}</span> ({deleteTarget.registration}) from your fleet.</p>
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
