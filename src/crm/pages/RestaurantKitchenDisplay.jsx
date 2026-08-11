import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineFire,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { loadRestaurantOrders, upsertRestaurantOrder } from '../data/restaurantOrders.js'
import { loadFirestoreOrders, syncSingleOrderToFirestore } from '../data/restaurantFirestoreSync.js'
import { useUser } from '../hooks/useUser.js'

const columns = [
  { key: 'pending', label: 'Pending', icon: HiOutlineClock, next: 'preparing', action: 'Start' },
  { key: 'preparing', label: 'Preparing', icon: HiOutlineFire, next: 'ready', action: 'Mark Ready' },
  { key: 'ready', label: 'Ready', icon: HiOutlineCheckCircle, next: 'served', action: 'Serve' },
]

const badgeByStatus = {
  pending: 'warning',
  preparing: 'info',
  ready: 'success',
}

function kitchenOrderFromSavedOrder(order) {
  const status = String(order.orderStatus || '').toLowerCase()
  return {
    id: order.kotNumber || order.orderNumber,
    orderNumber: order.orderNumber,
    status: ['pending', 'preparing', 'ready'].includes(status) ? status : 'pending',
    table: order.table ? `Table ${order.table}` : order.orderType,
    station: order.orderType || 'Kitchen',
    elapsed: order.time || 'Now',
    items: (order.cartRows || []).map((row) => `${row.qty || row.quantity || 1}x ${row.item?.name || 'Menu item'}`),
    raw: order,
  }
}

function loadKitchenOrders() {
  return loadRestaurantOrders()
    .filter((order) => ['pending', 'preparing', 'ready'].includes(String(order.orderStatus || '').toLowerCase()))
    .map(kitchenOrderFromSavedOrder)
}

export default function RestaurantKitchenDisplayPage() {
  const { workspaceId, userId, firebaseUser } = useUser()
  const [orders, setOrders] = useState(() => loadKitchenOrders())
  const [fsVersion, setFsVersion] = useState(0)

  // Load Firestore orders on mount and merge into KDS display
  useEffect(() => {
    if (!workspaceId || !firebaseUser) return
    let cancelled = false
    ;(async () => {
      const fsOrders = await loadFirestoreOrders(workspaceId)
      if (cancelled) return
      const fsKdsOrders = fsOrders
        .filter((o) => ['pending', 'preparing', 'ready'].includes(String(o.orderStatus || '').toLowerCase()))
        .map(kitchenOrderFromSavedOrder)
      if (fsKdsOrders.length === 0) return
      setOrders((current) => {
        const existingIds = new Set(current.map((o) => o.id))
        const newOrders = fsKdsOrders.filter((o) => !existingIds.has(o.id))
        return [...current, ...newOrders]
      })
    })()
    return () => { cancelled = true }
  }, [workspaceId, firebaseUser, fsVersion])

  const groupedOrders = useMemo(
    () => columns.map((column) => ({
      ...column,
      orders: orders.filter((order) => order.status === column.key),
    })),
    [orders],
  )

  const validTransitions = { pending: 'preparing', preparing: 'ready', ready: 'served' }

  function updateStatus(orderId, nextStatus) {
    setOrders((current) =>
      current
        .map((order) => {
          if (order.id !== orderId) return order
          // ── Transition safety: only allow forward progress ──
          if (validTransitions[order.status] !== nextStatus) {
            console.warn(`KITchen: invalid transition ${order.status} → ${nextStatus} for ${orderId}`)
            return order
          }
          const updatedOrder = { ...order.raw, orderStatus: nextStatus }
          upsertRestaurantOrder(updatedOrder, workspaceId, userId || firebaseUser?.uid)
          // Part C: immediate Firestore status sync (fire-and-forget)
          syncSingleOrderToFirestore(workspaceId, userId || firebaseUser?.uid, updatedOrder)
          return { ...order, status: nextStatus, raw: { ...order.raw, orderStatus: nextStatus } }
        })
        .filter((order) => order.status !== 'served'),
    )
  }

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        title="Kitchen Display"
        subtitle="Live kitchen queue with pending, preparing, and ready order lanes."
        right={
          <Button type="button" variant="subtle" onClick={() => setOrders(loadKitchenOrders())}>
            <HiOutlineArrowPath className="h-4 w-4" />
            Refresh KOT
          </Button>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        {groupedOrders.map((column) => {
          const Icon = column.icon
          return (
            <Card key={column.key} className="rounded-[1.35rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{column.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{column.orders.length} active tickets</p>
                  </div>
                </div>
                <Badge variant={badgeByStatus[column.key]}>{column.label}</Badge>
              </div>

              <div className="mt-4 grid min-w-0 gap-3">
                {column.orders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-950">{order.id}</p>
                        <p className="mt-1 text-sm text-slate-500">{order.table} • {order.station}</p>
                      </div>
                      <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{order.elapsed}</span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {order.items.map((item) => (
                        <div key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      className="mt-4 w-full"
                      onClick={() => updateStatus(order.id, column.next)}
                    >
                      {column.action}
                    </Button>
                  </div>
                ))}

                {column.orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-medium text-slate-500">
                    No tickets in this lane.
                  </div>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>
    </motion.div>
  )
}
