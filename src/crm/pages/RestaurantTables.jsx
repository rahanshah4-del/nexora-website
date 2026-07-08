import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowsRightLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineScissors,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2'
import { GiRoundTable } from 'react-icons/gi'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import { cn } from '../utils/cn.js'
import { loadRestaurantOrders } from '../data/restaurantOrders.js'
import { migrateKey, scopedKey } from '../lib/localDataEvents.js'

const _TABLES_BASE = 'nexora.restaurant.tables.v1'
function tablesKey() {
  const k = scopedKey(_TABLES_BASE)
  if (k !== _TABLES_BASE) {
    migrateKey(_TABLES_BASE, k)
  }
  return k
}

const floorAreas = ['Ground Floor', 'Family Hall', 'Outdoor/VIP']
const statusOptions = ['available', 'occupied', 'reserved', 'cleaning']

const blankTable = {
  id: '',
  seats: '4',
  floor: 'Ground Floor',
  status: 'available',
  notes: '',
}

const initialFloors = [
  {
    name: 'Ground Floor',
    tables: [],
  },
  {
    name: 'Family Hall',
    tables: [],
  },
  {
    name: 'Outdoor/VIP',
    tables: [],
  },
]

function normalizeFloors(value) {
  const storedFloors = Array.isArray(value) ? value : []
  const normalizedInitial = initialFloors.map((floor) => {
    const stored = storedFloors.find((item) => item?.name === floor.name)
    return {
      ...floor,
      tables: Array.isArray(stored?.tables) ? stored.tables : [],
    }
  })
  const customFloors = storedFloors
    .filter((item) => item?.name && !initialFloors.some((floor) => floor.name === item.name))
    .map((item) => ({
      name: item.name,
      tables: Array.isArray(item.tables) ? item.tables : [],
    }))
  return [...normalizedInitial, ...customFloors]
}

function loadRestaurantFloors() {
  if (typeof window === 'undefined') return initialFloors
  try {
    const stored = window.localStorage.getItem(tablesKey())
    return normalizeFloors(stored ? JSON.parse(stored) : initialFloors)
  } catch {
    return initialFloors
  }
}

function saveRestaurantFloors(floors) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(tablesKey(), JSON.stringify(normalizeFloors(floors)))
}

function syncFloorsWithActiveOrders(floors) {
  const activeOrders = loadRestaurantOrders().filter((order) =>
    order.table &&
    order.orderType === 'Dine-in' &&
    !['cancelled', 'completed', 'closed'].includes(String(order.orderStatus || '').toLowerCase()) &&
    String(order.paymentStatus || '').toLowerCase() !== 'paid',
  )
  if (!activeOrders.length) return floors
  const orderByTable = new Map(activeOrders.map((order) => [order.table, order]))
  return floors.map((floor) => ({
    ...floor,
    tables: floor.tables.map((table) => {
      const order = orderByTable.get(table.id)
      if (!order) return table
      return {
        ...table,
        status: 'occupied',
        order: order.orderNumber,
        orderNumber: order.orderNumber,
        kotNumber: order.kotNumber,
        billNumber: order.billNumber,
        total: `PKR ${Math.round(Number(order.totals?.total || order.total || 0)).toLocaleString('en-PK')}`,
        customer: order.customer || 'Walk-in Guest',
      }
    }),
  }))
}

const statusMeta = {
  available: { label: 'Available', badge: 'success', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  occupied: { label: 'Occupied', badge: 'warning', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  reserved: { label: 'Reserved', badge: 'info', className: 'border-sky-200 bg-sky-50 text-sky-800' },
  cleaning: { label: 'Cleaning', badge: 'purple', className: 'border-indigo-200 bg-indigo-50 text-indigo-800' },
}

export default function RestaurantTablesPage() {
  const navigate = useNavigate()
  const [floors, setFloors] = useState(() => loadRestaurantFloors())
  const [activeFloor, setActiveFloor] = useState(initialFloors[0].name)
  const [selectedTableId, setSelectedTableId] = useState('')
  const [floorViewOpen, setFloorViewOpen] = useState(false)
  const [tableModalOpen, setTableModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [tableForm, setTableForm] = useState(blankTable)
  const [areaModalOpen, setAreaModalOpen] = useState(false)
  const [areaName, setAreaName] = useState('')
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitForm, setSplitForm] = useState({ id: '', seats: '2' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [warning, setWarning] = useState('')

  useEffect(() => {
    setFloors((current) => syncFloorsWithActiveOrders(current))
  }, [])

  useEffect(() => {
    saveRestaurantFloors(floors)
  }, [floors])

  const floor = floors.find((item) => item.name === activeFloor) || floors[0]
  const selectedTable = useMemo(
    () => floors.flatMap((item) => item.tables).find((table) => table.id === selectedTableId) || floor?.tables?.[0],
    [floor?.tables, floors, selectedTableId],
  )
  const counts = useMemo(() => {
    const allTables = floors.flatMap((item) => item.tables)
    return ['available', 'occupied', 'reserved', 'cleaning'].map((status) => ({
      status,
      count: allTables.filter((table) => table.status === status).length,
    }))
  }, [floors])
  const mergeOptions = useMemo(
    () => floors
      .flatMap((area) => area.tables)
      .filter((table) => selectedTable && table.id !== selectedTable.id && table.status !== 'occupied' && !table.order),
    [floors, selectedTable],
  )

  function openTableModal(table = null) {
    setWarning('')
    setEditingTable(table)
    setTableForm(table ? { ...table, floor: table.floor || activeFloor, seats: String(table.seats || '') } : { ...blankTable, floor: activeFloor })
    setTableModalOpen(true)
  }

  function closeTableModal() {
    setTableModalOpen(false)
    setEditingTable(null)
    setTableForm(blankTable)
  }

  function updateTableForm(field, value) {
    setTableForm((current) => ({ ...current, [field]: value }))
  }

  function openAreaModal() {
    setWarning('')
    setAreaName(activeFloor)
    setAreaModalOpen(true)
  }

  function closeAreaModal() {
    setAreaModalOpen(false)
    setAreaName('')
  }

  function saveAreaName() {
    const nextName = areaName.trim()
    if (!nextName) {
      setWarning('Area name is required.')
      return
    }
    if (nextName !== activeFloor && floors.some((area) => area.name === nextName)) {
      setWarning('This area name already exists.')
      return
    }
    setFloors((current) =>
      current.map((area) => (
        area.name === activeFloor
          ? {
              ...area,
              name: nextName,
              tables: area.tables.map((table) => ({ ...table, floor: nextName })),
            }
          : area
      )),
    )
    setActiveFloor(nextName)
    closeAreaModal()
  }

  function saveTable() {
    const id = tableForm.id.trim()
    if (!id) {
      setWarning('Table number/name is required.')
      return
    }
    const next = {
      ...tableForm,
      id,
      seats: Math.max(1, Number(tableForm.seats) || 1),
      floor: tableForm.floor || activeFloor,
      server: tableForm.status === 'available' ? 'Open' : tableForm.server || 'Floor team',
      order: editingTable?.order || '',
      total: editingTable?.total || '',
    }
    setFloors((current) => {
      const withoutOld = current.map((area) => ({ ...area, tables: area.tables.filter((table) => table.id !== editingTable?.id && table.id !== id) }))
      return withoutOld.map((area) => (area.name === next.floor ? { ...area, tables: [...area.tables, next] } : area))
    })
    setActiveFloor(next.floor)
    setSelectedTableId(next.id)
    closeTableModal()
  }

  function requestDelete(table) {
    setWarning('')
    setDeleteTarget(table)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.order || deleteTarget.status === 'occupied') {
      setWarning(`Cannot delete ${deleteTarget.id}; it has an active order.`)
      setDeleteTarget(null)
      return
    }
    setFloors((current) => current.map((area) => ({ ...area, tables: area.tables.filter((table) => table.id !== deleteTarget.id) })))
    if (selectedTableId === deleteTarget.id) {
      const nextTable = floors.flatMap((area) => area.tables).find((table) => table.id !== deleteTarget.id)
      setSelectedTableId(nextTable?.id || '')
    }
    setDeleteTarget(null)
  }

  function changeStatus(table, status) {
    setFloors((current) =>
      current.map((area) => ({
        ...area,
        tables: area.tables.map((row) => (row.id === table.id ? { ...row, status, server: status === 'available' ? 'Open' : row.server } : row)),
      })),
    )
  }

  function openMergeModal() {
    if (!selectedTable) return
    setWarning('')
    setMergeTargetId(mergeOptions[0]?.id || '')
    setMergeOpen(true)
  }

  function confirmMerge() {
    if (!selectedTable || !mergeTargetId) {
      setWarning('Select a table to merge.')
      return
    }
    const target = floors.flatMap((area) => area.tables).find((table) => table.id === mergeTargetId)
    if (!target) {
      setWarning('Merge target table not found.')
      return
    }
    if (target.order || target.status === 'occupied') {
      setWarning(`Cannot merge ${target.id}; it has an active order.`)
      setMergeOpen(false)
      return
    }
    setFloors((current) =>
      current.map((area) => ({
        ...area,
        tables: area.tables
          .filter((table) => table.id !== target.id)
          .map((table) => (
            table.id === selectedTable.id
              ? {
                  ...table,
                  seats: Math.max(1, Number(table.seats || 0) + Number(target.seats || 0)),
                  notes: [table.notes, `Merged with ${target.id}`].filter(Boolean).join(' | '),
                  server: table.server || target.server,
                }
              : table
          )),
      })),
    )
    setMergeOpen(false)
    setMergeTargetId('')
    setWarning(`Merged ${target.id} into ${selectedTable.id}.`)
  }

  function openSplitModal() {
    if (!selectedTable) return
    setWarning('')
    setSplitForm({ id: `${selectedTable.id}-A`, seats: String(Math.max(1, Math.floor(Number(selectedTable.seats || 2) / 2))) })
    setSplitOpen(true)
  }

  function confirmSplit() {
    if (!selectedTable) return
    const id = splitForm.id.trim()
    if (!id) {
      setWarning('New split table name is required.')
      return
    }
    if (floors.flatMap((area) => area.tables).some((table) => table.id === id)) {
      setWarning('A table with this name already exists.')
      return
    }
    const splitSeats = Math.max(1, Number(splitForm.seats) || 1)
    setFloors((current) =>
      current.map((area) => {
        if (area.name !== selectedTable.floor) return area
        const newTable = {
          ...blankTable,
          id,
          seats: splitSeats,
          floor: area.name,
          status: 'available',
          server: 'Open',
          notes: `Split from ${selectedTable.id}`,
        }
        return {
          ...area,
          tables: area.tables.map((table) => (
            table.id === selectedTable.id
              ? {
                  ...table,
                  seats: Math.max(1, Number(table.seats || 1) - splitSeats),
                  notes: [table.notes, `Split to ${id}`].filter(Boolean).join(' | '),
                }
              : table
          )).concat(newTable),
        }
      }),
    )
    setSelectedTableId(id)
    setSplitOpen(false)
  }

  function openOrder(table = selectedTable) {
    if (!table) return
    const params = new URLSearchParams({ mode: 'Dine-in', table: table.id })
    if (table.orderNumber || table.order) params.set('order', table.orderNumber || table.order)
    navigate(`/app/orders?${params.toString()}`)
  }

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        title="Tables / Floor View"
        subtitle="Manage restaurant floor layout, table status, reservations, and active dine-in orders."
        right={
          <>
            <Button type="button" variant="subtle" onClick={() => openTableModal()}>
              <HiOutlinePlus className="h-4 w-4" />
              Add Table
            </Button>
            <Button type="button" onClick={() => setFloorViewOpen(true)}>Open Floor View</Button>
          </>
        }
      />
      {warning ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <HiOutlineExclamationTriangle className="h-5 w-5" />
          {warning}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((item) => (
          <Card key={item.status} className="rounded-[1.25rem] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{statusMeta[item.status].label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{item.count}</p>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-[1.35rem] p-4 sm:p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-2">
              {floors.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveFloor(item.name)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    activeFloor === item.name
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700',
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="subtle" className="h-9 px-3 text-xs" onClick={openAreaModal}>
                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                Edit Area
              </Button>
              <Badge variant="info">{floor.tables.length} tables</Badge>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 auto-rows-[188px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {floor.tables.map((table) => {
              const meta = statusMeta[table.status]
              const active = selectedTable?.id === table.id
              return (
                <div
                  key={table.id}
                  className={cn(
                    'flex min-w-0 flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                    meta.className,
                    active && 'ring-2 ring-slate-950 ring-offset-2',
                  )}
                >
                  <button type="button" onClick={() => setSelectedTableId(table.id)} className="min-w-0 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-black tracking-tight">{table.id}</p>
                        <p className="mt-1 text-xs font-semibold opacity-75">{table.seats} seats • {table.floor}</p>
                      </div>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/65 shadow-sm ring-1 ring-black/5">
                        <GiRoundTable className="h-5 w-5 opacity-80" />
                      </span>
                    </div>
                    <div className="mt-3 min-w-0">
                      <p className="truncate text-sm font-semibold">{meta.label}</p>
                      <p className="mt-1 truncate text-xs opacity-75">{table.order || table.notes || table.server}</p>
                    </div>
                  </button>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Button type="button" variant="subtle" className="h-8 px-2 text-xs" onClick={() => openTableModal(table)}>
                      <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button type="button" variant="subtle" className="h-8 px-2 text-xs" onClick={() => requestDelete(table)}>
                      <HiOutlineTrash className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                    <Select value={table.status} onChange={(event) => changeStatus(table, event.target.value)} className="h-8 rounded-xl text-xs">
                      {statusOptions.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
                    </Select>
                    <Button type="button" className="h-8 px-2 text-xs" onClick={() => openOrder(table)}>Open Order</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {selectedTable ? (
        <Card className="rounded-[1.35rem] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-950 dark:text-white">{selectedTable.id}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{selectedTable.seats} seats • {selectedTable.floor} • {selectedTable.server}</p>
              {selectedTable.notes ? <p className="mt-1 text-xs text-slate-500">{selectedTable.notes}</p> : null}
            </div>
            <Badge variant={statusMeta[selectedTable.status].badge}>{statusMeta[selectedTable.status].label}</Badge>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current order</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{selectedTable.order || 'No active order'}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedTable.total || 'Ready to open a new dine-in order.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="subtle" className="w-full" onClick={() => openTableModal(selectedTable)}>
                <HiOutlinePencilSquare className="h-4 w-4" />
                Edit
              </Button>
              <Button type="button" variant="subtle" className="w-full" onClick={() => requestDelete(selectedTable)}>
                <HiOutlineTrash className="h-4 w-4" />
                Delete
              </Button>
              <Select value={selectedTable.status} onChange={(event) => changeStatus(selectedTable, event.target.value)} className="h-10 rounded-2xl text-sm">
                {statusOptions.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
              </Select>
              <Button type="button" variant="subtle" className="w-full" onClick={() => changeStatus(selectedTable, 'cleaning')}>
                <HiOutlineWrenchScrewdriver className="h-4 w-4" />
                Mark Cleaning
              </Button>
              <Button type="button" variant="subtle" className="w-full" onClick={openMergeModal}>
                <HiOutlineArrowsRightLeft className="h-4 w-4" />
                Merge Table
              </Button>
              <Button type="button" variant="subtle" className="w-full" onClick={openSplitModal}>
                <HiOutlineScissors className="h-4 w-4" />
                Split Table
              </Button>
            </div>

            <Button type="button" className="w-full" onClick={() => openOrder(selectedTable)}>
              <HiOutlineCheckCircle className="h-4 w-4" />
              Open Order
            </Button>
          </div>
        </Card>
        ) : null}
      </div>

      <Card className="rounded-[1.35rem] p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Advanced floor view</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Layout zones, table actions, and service state controls are ready for live restaurant operations.
            </p>
          </div>
          <Button type="button" variant="subtle" className="self-start sm:self-auto" onClick={() => setFloorViewOpen(true)}>
            <HiOutlineSparkles className="h-4 w-4" />
            Open Floor View
          </Button>
        </div>
      </Card>

      {tableModalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Table Management</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{editingTable ? 'Edit Table' : 'Add Table'}</h2>
              </div>
              <button type="button" onClick={closeTableModal} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50" aria-label="Close table modal">x</button>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <Field label="Table number/name">
                <Input value={tableForm.id} onChange={(event) => updateTableForm('id', event.target.value)} placeholder="T-07" />
              </Field>
              <Field label="Seats">
                <Input type="number" min="1" value={tableForm.seats} onChange={(event) => updateTableForm('seats', event.target.value)} placeholder="4" />
              </Field>
              <Field label="Floor/area">
                <Select value={tableForm.floor} onChange={(event) => updateTableForm('floor', event.target.value)}>
                  {floors.map((area) => <option key={area.name}>{area.name}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={tableForm.status} onChange={(event) => updateTableForm('status', event.target.value)}>
                  {statusOptions.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
                </Select>
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <textarea value={tableForm.notes || ''} onChange={(event) => updateTableForm('notes', event.target.value)} className="min-h-20 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300" placeholder="Reservation, placement, or service notes" />
              </Field>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="subtle" onClick={closeTableModal}>Cancel</Button>
              <Button type="button" onClick={saveTable}>{editingTable ? 'Save Table' : 'Add Table'}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {areaModalOpen ? (
        <div className="fixed inset-0 z-[82] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Floor Area</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Edit Area</h2>
              </div>
              <button type="button" onClick={closeAreaModal} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50" aria-label="Close area modal">x</button>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <Field label="Area / floor name">
                <Input value={areaName} onChange={(event) => setAreaName(event.target.value)} placeholder="Ground Floor" />
              </Field>
              <p className="mt-2 text-xs text-slate-500">This updates the area tab and all tables inside this area.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="subtle" onClick={closeAreaModal}>Cancel</Button>
              <Button type="button" onClick={saveAreaName}>Save Area</Button>
            </div>
          </div>
        </div>
      ) : null}

      {mergeOpen ? (
        <div className="fixed inset-0 z-[84] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Merge Table</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Merge into {selectedTable?.id}</h2>
              </div>
              <button type="button" onClick={() => setMergeOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50" aria-label="Close merge modal">x</button>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <Field label="Select table to merge">
                <Select value={mergeTargetId} onChange={(event) => setMergeTargetId(event.target.value)}>
                  {mergeOptions.length ? mergeOptions.map((table) => (
                    <option key={table.id} value={table.id}>{table.id} - {table.seats} seats - {table.floor}</option>
                  )) : <option value="">No free tables available</option>}
                </Select>
              </Field>
              <p className="mt-2 text-xs text-slate-500">Target table seats will be added to {selectedTable?.id}; target table will be removed from layout.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="subtle" onClick={() => setMergeOpen(false)}>Cancel</Button>
              <Button type="button" onClick={confirmMerge}>Merge Table</Button>
            </div>
          </div>
        </div>
      ) : null}

      {splitOpen ? (
        <div className="fixed inset-0 z-[84] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Split Table</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Split {selectedTable?.id}</h2>
              </div>
              <button type="button" onClick={() => setSplitOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50" aria-label="Close split modal">x</button>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <Field label="New table name">
                <Input value={splitForm.id} onChange={(event) => setSplitForm((current) => ({ ...current, id: event.target.value }))} placeholder="T-01A" />
              </Field>
              <Field label="Seats to split">
                <Input type="number" min="1" value={splitForm.seats} onChange={(event) => setSplitForm((current) => ({ ...current, seats: event.target.value }))} placeholder="2" />
              </Field>
              <p className="sm:col-span-2 text-xs text-slate-500">A new available table will be created in the same area. The current table seat count will be reduced.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="subtle" onClick={() => setSplitOpen(false)}>Cancel</Button>
              <Button type="button" onClick={confirmSplit}>Split Table</Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                <HiOutlineExclamationTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-950">Delete {deleteTarget.id}?</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This removes the table from the floor layout. Tables with active orders cannot be deleted.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="subtle" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button type="button" onClick={confirmDelete}>Delete Table</Button>
            </div>
          </div>
        </div>
      ) : null}

      {floorViewOpen ? (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Advanced Floor View</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Restaurant Floor Layout</h2>
              </div>
              <button type="button" onClick={() => setFloorViewOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50" aria-label="Close floor view">x</button>
            </div>
            <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-4 lg:grid-cols-3">
                {floors.map((area) => (
                  <div key={area.name} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-950">{area.name}</p>
                      <Badge variant="info">{area.tables.length} tables</Badge>
                    </div>
                    <div className="mt-4 grid min-h-80 grid-cols-2 content-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
                      {area.tables.map((table, index) => {
                        const meta = statusMeta[table.status]
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => {
                              setActiveFloor(area.name)
                              setSelectedTableId(table.id)
                              setFloorViewOpen(false)
                            }}
                            className={cn('min-h-20 rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5', meta.className)}
                            style={{ transform: `translateY(${index % 2 ? 10 : 0}px)` }}
                            title="Drag/position placeholder"
                          >
                            <p className="text-sm font-black">{table.id}</p>
                            <p className="mt-1 text-xs font-semibold opacity-75">{table.seats} seats</p>
                            <p className="mt-2 truncate text-xs font-bold">{meta.label}</p>
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Drag/position placeholder ready for future live floor designer.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

function Field({ label, className = '', children }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  )
}
