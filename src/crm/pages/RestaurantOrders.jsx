import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import {
  GiBarbecue,
  GiCakeSlice,
  GiFruitBowl,
  GiFullPizza,
  GiHamburger,
  GiKnifeFork,
  GiSodaCan,
} from 'react-icons/gi'
import {
  HiArrowPath,
  HiCheckCircle,
  HiOutlineCalendarDays,
  HiOutlineCloudArrowUp,
  HiOutlineMagnifyingGlass,
  HiOutlineMinus,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineReceiptPercent,
  HiOutlineShieldExclamation,
  HiOutlineTableCells,
  HiOutlineXCircle,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import { RestaurantBillPreview, RestaurantKotPreview } from '../components/restaurant/RestaurantPrintPreview.jsx'
import { cn } from '../utils/cn.js'
import {
  applyRestaurantCustomerPayment,
  loadRestaurantCustomers,
  saveRestaurantCustomers,
} from '../data/restaurantCustomers.js'
import { hasRestaurantOffer, loadRestaurantMenuCategories, loadRestaurantMenuItems } from '../data/restaurantMenu.js'
import { getNextRestaurantOrderNumber, loadRestaurantOrders, upsertRestaurantOrder } from '../data/restaurantOrders.js'
import {
  buildBillPrintData,
  buildBillPrintTemplate,
  buildKotPrintData,
  buildKotPrintTemplate,
  calculateRestaurantBill,
  finalItemPrice,
  formatRestaurantCurrency,
} from '../lib/restaurantPosCalculations.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useUser } from '../hooks/useUser.js'
import { useReservationPosBridge } from '../hooks/useReservationPosBridge.js'
import ApplePaySuccess from '../components/ui/ApplePaySuccess.jsx'
import { enqueueBackgroundJob } from '../lib/backgroundJobs.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import { directPrinterAvailable, printThermalText } from '../lib/printerService.js'
import { useRestaurantPayments } from '../hooks/useRestaurantPayments.js'
import { useRestaurantRefunds } from '../hooks/useRestaurantRefunds.js'
import { useRestaurantCashSessions } from '../hooks/useRestaurantCashSessions.js'
import { useRestaurantCashMovements } from '../hooks/useRestaurantCashMovements.js'
import RestaurantSettlementPanel from '../components/restaurant/RestaurantSettlementPanel.jsx'

const initialCart = []
const submittingOrderRef = { current: false }

const initialQuickBill = {
  orderType: 'Quick Bill',
  customerName: '',
  customerPhone: '',
  tableNumber: '',
  outsideTableName: '',
  deliveryAddress: '',
  riderNotes: '',
  paymentMethod: 'Cash',
  paidAmount: '',
  discount: '',
  serviceCharges: '',
  tax: '',
  notes: '',
  printBill: true,
  printKot: true,
}

import { migrateKey, scopedKey } from '../lib/localDataEvents.js'

const _TABLES_BASE = 'nexora.restaurant.tables.v1'
function tablesKey() {
  const k = scopedKey(_TABLES_BASE)
  if (k !== _TABLES_BASE) {
    migrateKey(_TABLES_BASE, k)
  }
  return k
}
const restaurantTablesStorageKey = _TABLES_BASE
const outsideTablePrefix = 'Outside '

function isOutsideTable(tableId = '') {
  const normalized = String(tableId).trim().toLowerCase()
  return normalized.startsWith('out-') || normalized.startsWith(outsideTablePrefix.toLowerCase())
}

function getOutsideTableId(orderNumber = '', preferredName = '') {
  const customName = String(preferredName || '').trim()
  if (customName) return customName
  const floors = loadRestaurantFloors()
  const tableNumbers = floors
    .flatMap((floor) => (Array.isArray(floor?.tables) ? floor.tables : []))
    .map((table) => String(table?.id || '').match(/^Outside\s+(\d+)$/i)?.[1])
    .filter(Boolean)
    .map(Number)
  const orderNumbers = loadRestaurantOrders()
    .map((order) => String(order?.table || '').match(/^Outside\s+(\d+)$/i)?.[1])
    .filter(Boolean)
    .map(Number)
  const nextNumber = Math.max(0, ...tableNumbers, ...orderNumbers) + 1
  return `${outsideTablePrefix}${nextNumber}`
}

function loadRestaurantTableOptions() {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(tablesKey())
    const floors = stored ? JSON.parse(stored) : []
    if (!Array.isArray(floors)) return []
    return floors
      .flatMap((floor) => (Array.isArray(floor?.tables) ? floor.tables : []))
      .filter((table) => String(table?.status || 'available').toLowerCase() === 'available')
      .map((table) => table?.id)
      .filter(Boolean)
  } catch {
    return []
  }
}

function loadRestaurantFloors() {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(tablesKey())
    const floors = stored ? JSON.parse(stored) : []
    return Array.isArray(floors) ? floors : []
  } catch {
    return []
  }
}

function saveRestaurantFloors(floors) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(tablesKey(), JSON.stringify(Array.isArray(floors) ? floors : []))
}

function updateRestaurantTableOrder(tableId, order) {
  if (!tableId) return
  const floors = loadRestaurantFloors()
  const nextFloors = floors.map((floor) => ({
    ...floor,
    tables: Array.isArray(floor?.tables)
      ? floor.tables.map((table) => (
        table?.id === tableId
          ? {
              ...table,
              status: 'occupied',
              order: order.orderNumber,
              orderNumber: order.orderNumber,
              kotNumber: order.kotNumber,
              billNumber: order.billNumber,
              total: formatRestaurantCurrency(order.totals?.total || 0),
              customer: order.customerName || order.customer || 'Walk-in Guest',
            }
          : table
      ))
      : [],
  }))
  saveRestaurantFloors(nextFloors)
}

function releaseRestaurantTableOrder(tableId, expectedOrderNumber = '') {
  if (!tableId) return
  const floors = loadRestaurantFloors()
  const nextFloors = floors.map((floor) => ({
    ...floor,
    tables: Array.isArray(floor?.tables)
      ? floor.tables
              .filter((table) => !(table?.id === tableId && (table?.temporaryOutside || isOutsideTable(table?.id))))
          .map((table) => {
            // Only release if the table's current order matches the expected one
            if (table?.id === tableId && expectedOrderNumber && table?.orderNumber && table.orderNumber !== expectedOrderNumber) {
              return table
            }
            return table?.id === tableId
              ? {
                  ...table,
                  status: 'available',
                  order: '',
                  orderNumber: '',
                  kotNumber: '',
                  billNumber: '',
                  total: '',
                  customer: '',
                  server: 'Open',
                }
              : table
          })
      : [],
  }))
  saveRestaurantFloors(nextFloors)
}

function isTableOccupiedByOtherOrder(tableId, excludeOrderNumber = '') {
  if (!tableId) return false
  const orders = loadRestaurantOrders()
  return orders.some((order) => {
    if (order.orderNumber === excludeOrderNumber) return false
    if (order.table !== tableId) return false
    const status = String(order.orderStatus || '').toLowerCase()
    const paymentStatus = String(order.paymentStatus || '').toLowerCase()
    if (status === 'cancelled') return false
    if (paymentStatus === 'paid' && (status === 'served' || status === 'ready')) return false
    return true
  })
}

function ensureOutsideTableOrder(tableId, order) {
  if (!tableId) return
  const floors = loadRestaurantFloors()
  const fallbackFloors = floors.length ? floors : [{ name: 'Outdoor/VIP', tables: [] }]
  let found = false
  const nextFloors = fallbackFloors.map((floor, index) => {
    const shouldUseFloor = floor.name === 'Outdoor/VIP' || (!fallbackFloors.some((item) => item.name === 'Outdoor/VIP') && index === fallbackFloors.length - 1)
    const tables = Array.isArray(floor.tables) ? floor.tables : []
    if (tables.some((table) => table.id === tableId)) {
      found = true
      return {
        ...floor,
        tables: tables.map((table) => (
          table.id === tableId
            ? {
                ...table,
                status: 'occupied',
                order: order.orderNumber,
                orderNumber: order.orderNumber,
                kotNumber: order.kotNumber,
                billNumber: order.billNumber,
                total: formatRestaurantCurrency(order.totals?.total || 0),
                customer: order.customerName || order.customer || 'Walk-in Guest',
              }
            : table
        )),
      }
    }
    if (!found && shouldUseFloor) {
      found = true
      return {
        ...floor,
        tables: [
          ...tables,
          {
            id: tableId,
            seats: 1,
            floor: floor.name,
            status: 'occupied',
            server: 'Outside',
            notes: 'Temporary outside/no-table order',
            temporaryOutside: true,
            order: order.orderNumber,
            orderNumber: order.orderNumber,
            kotNumber: order.kotNumber,
            billNumber: order.billNumber,
            total: formatRestaurantCurrency(order.totals?.total || 0),
            customer: order.customerName || order.customer || 'Walk-in Guest',
          },
        ],
      }
    }
    return floor
  })
  saveRestaurantFloors(nextFloors)
}
const orderModes = [
  { label: 'Quick Bill', value: 'Quick Bill' },
  { label: 'Delivery', value: 'Delivery' },
  { label: 'Takeaway', value: 'Takeaway' },
  { label: 'Dine-in', value: 'Dine-in' },
]

const ordersPageExtraMenuItems = []

const categoryIconMap = {
  BBQ: GiBarbecue,
  Burgers: GiHamburger,
  Burger: GiHamburger,
  Pizza: GiFullPizza,
  Drinks: GiSodaCan,
  Drink: GiSodaCan,
  Salads: GiFruitBowl,
  Salad: GiFruitBowl,
  Dessert: GiCakeSlice,
  Desserts: GiCakeSlice,
}

function getCategoryIcon(category = '', name = '') {
  const source = `${category} ${name}`.toLowerCase()
  if (source.includes('bbq') || source.includes('grill')) return GiBarbecue
  if (source.includes('pizza')) return GiFullPizza
  if (source.includes('drink') || source.includes('margarita') || source.includes('soda')) return GiSodaCan
  if (source.includes('salad')) return GiFruitBowl
  if (source.includes('dessert') || source.includes('brownie') || source.includes('cake')) return GiCakeSlice
  if (source.includes('burger')) return GiHamburger
  return categoryIconMap[category] || GiKnifeFork
}

function MenuImagePlaceholder({ item }) {
  const imageSrc = item.imageUrl || item.image || item.photoUrl || item.imageSrc
  const CategoryIcon = getCategoryIcon(item.category, item.name)

  return (
    <div className="relative h-14 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-16">
      {imageSrc ? (
        <img src={imageSrc} alt={item.name} width="180" height="64" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-500">
          <CategoryIcon className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
    </div>
  )
}

/* Memoized menu card — the grid can hold hundreds of items; without memo every
   keystroke in search/customer/payment fields re-rendered every card (INP). */
const MenuItemCard = memo(function MenuItemCard({ item, inCartQty, onAdd, onAdjust }) {
  return (
    <div className="min-w-0 self-start rounded-[0.95rem] border border-slate-200 bg-white p-2 shadow-sm">
      <MenuImagePlaceholder item={item} />
      <div className="mt-1.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-950">{item.name}</p>
            <p className="mt-0.5 line-clamp-2 min-h-7 text-[10.5px] leading-3.5 text-slate-500">{item.description}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="info" className="px-1.5 py-0.5 text-[9.5px]">{item.category}</Badge>
            {hasRestaurantOffer(item) ? <Badge variant="warning" className="px-1.5 py-0.5 text-[9.5px]">Offer</Badge> : null}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-950">{formatRestaurantCurrency(finalItemPrice(item))}</p>
          {inCartQty ? (
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5">
              <button type="button" onClick={() => onAdjust(item.id, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-white text-slate-700 shadow-sm">
                <HiOutlineMinus className="h-3.5 w-3.5" />
              </button>
              <span className="w-5 text-center text-xs font-bold text-slate-950">{inCartQty}</span>
              <button type="button" onClick={() => onAdjust(item.id, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-white">
                <HiOutlinePlus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button type="button" className="h-7 px-2.5 py-1 text-xs" onClick={() => onAdd(item.id)}>
              <HiOutlinePlus className="h-3.5 w-3.5" />
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

export default function RestaurantOrdersPage() {
  const location = useLocation()
  const { settings } = useBusinessSettings()
  const { userId, workspaceId, businessType, userDoc, firebaseUser, staffId, role, isOwner, isAdmin, isManager } = useUser()

  /* Heartbeat — lets sidebar (in the dashboard tab) know this POS Till tab is open.
     localStorage, not sessionStorage: the sidebar lives in another tab and
     sessionStorage is per-tab, so it would never see this heartbeat. */
  useEffect(() => {
    const beat = () => { try { localStorage.setItem('nexora:posTill:open', String(Date.now())) } catch { /* quota — ignore */ } }
    beat()
    const pulse = setInterval(beat, 3000)
    return () => { clearInterval(pulse); try { localStorage.removeItem('nexora:posTill:open') } catch { /* ignore */ } }
  }, [])

  // ── State declarations (before hooks that depend on them) ──
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Menu')
  const [cart, setCart] = useState(initialCart)
  const [quickBillOpen, setQuickBillOpen] = useState(false)
  const [quickBill, setQuickBill] = useState(initialQuickBill)
  const [restaurantCustomers, setRestaurantCustomers] = useState(() => loadRestaurantCustomers())
  const [selectedCustomerId, setSelectedCustomerId] = useState('cust-walkin')
  const [customerSearch, setCustomerSearch] = useState('')
  const [printPreview, setPrintPreview] = useState(null)
  const [flowMessage, setFlowMessage] = useState('')
  const [billingActionStatus, setBillingActionStatus] = useState(null)
  const [showApplePay, setShowApplePay] = useState(false)
  const [paymentSyncStatus, setPaymentSyncStatus] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({ method: 'Cash', amount: '', note: '' })
  const [orderNumber, setOrderNumber] = useState(() => getNextRestaurantOrderNumber())
  const [ordersVersion, setOrdersVersion] = useState(0)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundType, setRefundType] = useState('full')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundProcessing, setRefundProcessing] = useState(false)
  const [refundResult, setRefundResult] = useState(null)
  const [cashOpenDialog, setCashOpenDialog] = useState(false)
  const [openingCashInput, setOpeningCashInput] = useState('')
  const [cashSessionSubmitting, setCashSessionSubmitting] = useState(false)
  const [cashSessionError, setCashSessionError] = useState('')
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [actualClosingCashInput, setActualClosingCashInput] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [closeManagerApproval, setCloseManagerApproval] = useState('')
  const [closeLiveExpectedCash, setCloseLiveExpectedCash] = useState(0)
  const [closeLiveDifference, setCloseLiveDifference] = useState(0)
  const [movementDialog, setMovementDialog] = useState(null) // null | type string
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [movementManagerApproval, setMovementManagerApproval] = useState('')
  const [movementSubmitting, setMovementSubmitting] = useState(false)
  const [movementError, setMovementError] = useState('')
  const [tablePanelOpen, setTablePanelOpen] = useState(false)
  const [reservationPanelOpen, setReservationPanelOpen] = useState(false)
  const [reservationSearch, setReservationSearch] = useState('')
  const [settlementPanelOpen, setSettlementPanelOpen] = useState(false)

  const [menuItems] = useState(() => [...loadRestaurantMenuItems(), ...ordersPageExtraMenuItems])
  const [menuCategories] = useState(() => loadRestaurantMenuCategories())
  const [tableOptions] = useState(() => loadRestaurantTableOptions())

  // currentSavedOrder (moved before hooks that reference it — TDZ fix)
  const currentSavedOrder = useMemo(() => {
    const savedOrders = loadRestaurantOrders()
    return (
      savedOrders.find((order) => order.orderNumber === orderNumber) ||
      savedOrders.find(
        (order) =>
          quickBill.tableNumber &&
          order.table === quickBill.tableNumber &&
          String(order.orderStatus || '').toLowerCase() !== 'cancelled',
      ) ||
      null
    )
  }, [orderNumber, ordersVersion, quickBill.tableNumber])
  const maxRefundAmount = useMemo(() => {
    if (!currentSavedOrder) return 0
    return Math.max(0, Number(currentSavedOrder.paidAmount || currentSavedOrder.total || 0))
  }, [currentSavedOrder, ordersVersion])

  const { recordPayment } = useRestaurantPayments({ enabled: Boolean(workspaceId) })
  const { payments: orderPayments } = useRestaurantPayments({
    orderId: currentSavedOrder?.orderNumber || undefined,
    enabled: Boolean(workspaceId && currentSavedOrder?.orderNumber),
    limitCount: 50,
  })
  const { recordRefund } = useRestaurantRefunds({ enabled: false })
  const {
    canOpenSession,
    canCloseSession,
    activeSession,
    openSession,
    closeSession,
    sessions: allSessions,
    pendingSettlements,
    approveSession,
    rejectSession,
    lockSession,
    reopenSession,
  } = useRestaurantCashSessions({
    enabled: Boolean(workspaceId),
    settings,
  })

  const {
    movements: cashMovements,
    totals: cashMovementTotals,
    canRecordMovement,
    recordMovement,
  } = useRestaurantCashMovements({
    sessionId: activeSession?.id || '',
    enabled: Boolean(workspaceId && activeSession?.id),
  })
  const restaurantPrintSettings = {
    restaurantName: settings?.restaurantPos?.restaurantName || settings?.businessName || 'Nexora Restaurant',
    legalName: settings?.restaurantPos?.legalName || settings?.businessName || '',
    branchName: settings?.restaurantPos?.branchName || '',
    branchCode: settings?.restaurantPos?.branchCode || '',
    address: settings?.restaurantPos?.address || settings?.address || '',
    phone: settings?.restaurantPos?.phone || settings?.phone || '',
    whatsappPhone: settings?.restaurantPos?.whatsappPhone || '',
    taxNumber: settings?.restaurantPos?.taxNumber || settings?.taxNumber || '',
    salesTaxNumber: settings?.restaurantPos?.salesTaxNumber || '',
    fbrPosId: settings?.restaurantPos?.fbrPosId || '',
    foodLicenseNumber: settings?.restaurantPos?.foodLicenseNumber || '',
    footerMessage: settings?.restaurantPos?.footerMessage || settings?.receiptFooter || '',
    logoUrl: settings?.restaurantPos?.logoUrl || settings?.restaurantPos?.logoDataUrl || settings?.logoUrl || '',
    ...(settings?.restaurantPos || {}),
  }

  function notifyRestaurantOrder({ title, message, priority = 'medium', relatedId = orderNumber, dedupeKey = '' } = {}) {
    createWorkspaceNotification({
      workspaceId,
      userId,
      businessType,
      type: 'Restaurant POS',
      priority,
      title,
      message,
      relatedId,
      route: '/app/orders',
      createdBy: userId,
      createdByEmail: firebaseUser?.email || userDoc?.email || '',
      dedupeKey,
    }).catch(() => {})
  }

  function queueRestaurantJob(type, label, payload = {}, metadata = {}) {
    if (!workspaceId || !userId) return
    enqueueBackgroundJob({
      workspaceId,
      userId,
      businessType,
      createdByEmail: firebaseUser?.email || userDoc?.email || '',
      type,
      label,
      route: '/app/orders',
      priority: metadata.priority || 'normal',
      payload: {
        orderNumber,
        billNumber: payload.billNumber || `BILL-${orderNumber.replace(/^#/, '')}`,
        kotNumber: payload.kotNumber || `KOT-${orderNumber.replace(/^#/, '')}`,
        ...payload,
      },
      metadata,
    }).catch(() => {})
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nexora:collapse-sidebar'))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const table = params.get('table')
    const mode = params.get('mode')
    const orderNumberParam = params.get('order')
    if (!table && !mode && !orderNumberParam) return

    setQuickBill((current) => ({
      ...current,
      orderType: mode || (table ? 'Dine-in' : current.orderType),
      tableNumber: table || current.tableNumber,
    }))

    const savedOrders = loadRestaurantOrders()
    const existingOrder = savedOrders.find((order) =>
      (orderNumberParam && order.orderNumber === orderNumberParam) ||
      (table && order.table === table && !['cancelled'].includes(String(order.orderStatus || '').toLowerCase())),
    )
    if (!existingOrder) return

    setOrderNumber(existingOrder.orderNumber || orderNumber)
    setCart((existingOrder.cartRows || []).map((row) => ({
      itemId: row.itemId || row.item?.id,
      qty: Math.max(1, Number(row.qty || row.quantity || 1)),
      note: row.note || '',
    })).filter((row) => row.itemId))
    setSelectedCustomerId(existingOrder.customerId || 'cust-walkin')
    setQuickBill((current) => ({
      ...current,
      orderType: existingOrder.orderType || current.orderType,
      tableNumber: existingOrder.table || table || current.tableNumber,
      outsideTableName: isOutsideTable(existingOrder.table || table || '') ? existingOrder.table || table : current.outsideTableName,
      paymentMethod: existingOrder.paymentMethod || current.paymentMethod,
      paidAmount: existingOrder.paidAmount ? String(existingOrder.paidAmount) : current.paidAmount,
      customerName: existingOrder.customer || existingOrder.customerName || current.customerName,
      customerPhone: existingOrder.phone || existingOrder.customerPhone || current.customerPhone,
      deliveryAddress: existingOrder.deliveryAddress || current.deliveryAddress,
      riderNotes: existingOrder.riderNotes || current.riderNotes,
      notes: existingOrder.notes || current.notes,
    }))
    setFlowMessage(`Loaded active order ${existingOrder.orderNumber} for table ${existingOrder.table || table}.`)
  }, [location.search])

  useEffect(() => {
    saveRestaurantCustomers(restaurantCustomers)
  }, [restaurantCustomers])

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return menuItems.filter((item) => {
      const matchesCategory = category === 'All Menu' || item.category === category
      const matchesQuery = !needle || [item.name, item.description, item.category].some((value) => value.toLowerCase().includes(needle))
      return matchesCategory && matchesQuery && item.status === 'Active' && item.availability === 'Available'
    })
  }, [category, menuItems, query])

  function openRefundOrder() {
    if (!canRefundCurrentOrder) {
      setFlowMessage(currentSavedOrder ? 'This order is not paid or already cancelled.' : 'Save this order first before refunding it.')
      return
    }
    setRefundType('full')
    setRefundAmount(String(Math.round(Number(currentSavedOrder?.paidAmount || currentSavedOrder?.total || 0))))
    setRefundReason('')
    setRefundResult(null)
    setRefundOpen(true)
  }

  function closeRefundOrder() {
    setRefundOpen(false)
    setRefundResult(null)
  }

  async function confirmRefundOrder() {
    if (!currentSavedOrder) return
    if (!refundReason.trim()) return
    setRefundProcessing(true)
    setRefundResult(null)
    try {
      const savedPaid = Number(currentSavedOrder?.paidAmount || 0)
      const savedTotal = Number(currentSavedOrder?.total || 0)
      const amount = refundType === 'full'
        ? savedPaid
        : Number(refundAmount)
      if (amount <= 0) {
        setRefundResult({ ok: false, error: 'Refund amount must be greater than zero.' })
        setRefundProcessing(false)
        return
      }
      if (amount > savedPaid) {
        setRefundResult({ ok: false, error: `Refund amount (${amount}) exceeds paid amount (${savedPaid}).` })
        setRefundProcessing(false)
        return
      }
      const completedPayments = Array.isArray(orderPayments)
        ? orderPayments.filter((p) => String(p.status || '').toLowerCase() === 'completed')
        : []
      const paymentIds = completedPayments.map((p) => p.id).filter(Boolean)
      if (!paymentIds.length) {
        setRefundResult({ ok: false, error: 'Legacy order cannot be refunded because no payment ledger exists.' })
        setRefundProcessing(false)
        return
      }
      const totalPaidOnLedger = completedPayments.reduce((sum, p) => sum + Math.max(0, Number(p.amount || 0)), 0)
      if (amount > totalPaidOnLedger) {
        setRefundResult({ ok: false, error: `Refund amount (${formatRestaurantCurrency(amount)}) exceeds total paid on ledger (${formatRestaurantCurrency(totalPaidOnLedger)}).` })
        setRefundProcessing(false)
        return
      }
      const paymentsToReverse = completedPayments.length === 1
        ? completedPayments.map((p) => ({
            paymentId: p.id,
            amount,
          }))
        : completedPayments.map((p) => {
            const paymentAmount = Math.max(0, Number(p.amount || 0))
            const ratio = totalPaidOnLedger > 0 ? paymentAmount / totalPaidOnLedger : 0
            return {
              paymentId: p.id,
              amount: Math.round(amount * ratio * 100) / 100,
            }
          })
      const orderSnapshot = {
        orderNumber: currentSavedOrder.orderNumber,
        total: savedTotal,
        paidAmount: savedPaid,
      }
      const rs = await recordRefund({
        orderId: currentSavedOrder.orderNumber || orderNumber,
        customerId: currentSavedOrder.customerId || selectedCustomerId,
        paymentIds,
        refundType,
        refundTotal: amount,
        requestedRefundAmount: amount,
        reason: refundReason.trim(),
        status: 'completed',
        originalSubtotal: currentSavedOrder.totals?.subtotal || currentSavedOrder.subtotal || 0,
        originalDiscount: currentSavedOrder.totals?.discount || currentSavedOrder.discount || 0,
        originalTax: currentSavedOrder.totals?.tax || currentSavedOrder.tax || 0,
        originalServiceCharges: currentSavedOrder.totals?.serviceCharges || currentSavedOrder.serviceCharges || 0,
        originalTotal: savedTotal || 0,
      }, {
        paymentsToReverse,
        orderSnapshot,
      })
      setRefundResult(rs)
      if (rs.ok && rs.created) {
        // ── Update local order snapshot ──
        let nextPaid = savedPaid
        let nextDue = savedTotal
        let nextPaymentStatus = 'due'
        if (refundType === 'full') {
          nextPaid = 0
          nextDue = savedTotal
          nextPaymentStatus = 'due'
        } else {
          nextPaid = Math.max(0, savedPaid - amount)
          const currentPaymentStatus = String(currentSavedOrder.paymentStatus || '').toLowerCase()
          nextDue = savedTotal - nextPaid
          nextPaymentStatus = currentPaymentStatus === 'partial' ? 'partial' : nextPaid > 0 ? 'partial' : 'due'
        }
        upsertRestaurantOrder({
          ...currentSavedOrder,
          paidAmount: nextPaid,
          dueAmount: Math.max(0, nextDue),
          paymentStatus: nextPaymentStatus,
          updatedAt: new Date().toISOString(),
        })
        setOrdersVersion((current) => current + 1)
        setFlowMessage(`Refund of ${formatRestaurantCurrency(Number(amount))} recorded. Order updated.`)
        setBillingActionStatus({ type: 'refund', status: 'success', message: 'Refund recorded' })
        closeRefundOrder()
      } else if (rs.duplicate) {
        setFlowMessage('This refund was already recorded.')
        setRefundResult({ ok: true, duplicate: true, error: 'Duplicate — refund already exists.' })
      }
    } catch (err) {
      setRefundResult({ ok: false, error: err?.message || 'Unable to process refund.' })
    } finally {
      setRefundProcessing(false)
    }
  }

  function openCashSessionDialog() {
    setOpeningCashInput('')
    setCashSessionError('')
    setCashOpenDialog(true)
  }

  function cancelCashSessionDialog() {
    setCashOpenDialog(false)
    setCashSessionError('')
    setOpeningCashInput('')
  }

  async function confirmOpenCashSession() {
    const amount = Math.max(0, Number(openingCashInput || 0))
    if (amount < 0) {
      setCashSessionError('Opening cash cannot be negative.')
      return
    }
    setCashSessionSubmitting(true)
    setCashSessionError('')
    try {
      const rs = await openSession({ openingCash: amount })
      if (rs.ok) {
        setCashOpenDialog(false)
        setOpeningCashInput('')
        setFlowMessage('Cash session opened.')
      } else {
        setCashSessionError(rs.error || 'Unable to open session.')
      }
    } catch (err) {
      setCashSessionError(err?.message || 'Unable to open session.')
    } finally {
      setCashSessionSubmitting(false)
    }
  }

  function openCloseSessionConfirm() {
    setCashSessionError('')
    setActualClosingCashInput('')
    setCloseNotes('')
    setCloseManagerApproval('')
    if (activeSession) {
      const opening = Number(activeSession.openingCash) || 0
      // Use cached movement totals for live expected cash estimate
      const mv = cashMovementTotals || { deposits: 0, withdrawals: 0, expenses: 0, adjustments: 0 }
      const expected = opening + mv.deposits - mv.withdrawals - mv.expenses + mv.adjustments
      setCloseLiveExpectedCash(expected)
    }
    setCloseLiveDifference(0)
    setCloseConfirmOpen(true)
  }

  function cancelCloseSessionConfirm() {
    setCloseConfirmOpen(false)
    setCashSessionError('')
  }

  async function confirmCloseCashSession() {
    const actual = Number(actualClosingCashInput || 0)
    if (actual < 0) {
      setCashSessionError('Actual closing cash cannot be negative.')
      return
    }
    setCashSessionSubmitting(true)
    setCashSessionError('')
    try {
      const rs = await closeSession({
        actualClosingCash: actual,
        notes: closeNotes.trim(),
        managerApprovedBy: closeManagerApproval.trim(),
      })
      if (rs.ok) {
        setCloseConfirmOpen(false)
        setFlowMessage(`Cash session closed. Expected ${closeLiveExpectedCash}, Actual ${actual}, Difference ${rs.cashDifference !== undefined ? rs.cashDifference : actual - closeLiveExpectedCash}.`)
      } else {
        setCashSessionError(rs.error || 'Unable to close session.')
      }
    } catch (err) {
      setCashSessionError(err?.message || 'Unable to close session.')
    } finally {
      setCashSessionSubmitting(false)
    }
  }

  const cartRows = useMemo(
    () =>
      cart.map((row) => {
        const item = menuItems.find((menuItem) => menuItem.id === row.itemId)
        return { ...row, item, lineTotal: finalItemPrice(item) * row.qty }
      }).filter((row) => row.item),
    [cart, menuItems],
  )
  /* O(1) cart lookup for the menu grid — avoids cartRows.find per card per render */
  const cartByItemId = useMemo(() => {
    const map = new Map()
    cartRows.forEach((row) => map.set(row.itemId, row))
    return map
  }, [cartRows])

  const billTotals = useMemo(
    () => calculateRestaurantBill(cartRows, {
      discount: quickBill.discount,
      serviceCharges: quickBill.serviceCharges,
      tax: quickBill.tax,
    }),
    [cartRows, quickBill.discount, quickBill.serviceCharges, quickBill.tax],
  )
  const { subtotal, discount, serviceCharges, tax, total } = billTotals
  const selectedCustomer = restaurantCustomers.find((customer) => customer.id === selectedCustomerId) || restaurantCustomers[0]
  const customerMatches = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase()
    if (!needle) return restaurantCustomers.slice(0, 4)
    return restaurantCustomers
      .filter((customer) => [customer.name, customer.phone].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)))
      .slice(0, 4)
  }, [customerSearch, restaurantCustomers])
  const canCancelCurrentOrder = Boolean(
    currentSavedOrder &&
    String(currentSavedOrder.orderStatus || '').toLowerCase() !== 'cancelled',
  )
  const canRefundCurrentOrder = Boolean(
    currentSavedOrder &&
    String(currentSavedOrder.orderStatus || '').toLowerCase() !== 'cancelled' &&
    (String(currentSavedOrder.paymentStatus || '').toLowerCase() === 'paid' ||
     String(currentSavedOrder.paymentStatus || '').toLowerCase() === 'partial'),
  )
  const tablePanelRows = useMemo(() => {
    const floors = loadRestaurantFloors()
    const savedOrders = loadRestaurantOrders()
    const tableRows = floors.flatMap((floor) =>
      (Array.isArray(floor?.tables) ? floor.tables : []).map((table) => {
        const activeOrder = savedOrders.find((order) => {
          if (order.table !== table?.id) return false
          const status = String(order.orderStatus || '').toLowerCase()
          const paymentStatus = String(order.paymentStatus || '').toLowerCase()
          if (status === 'cancelled') return false
          if (paymentStatus === 'paid' && (status === 'served' || status === 'ready')) return false
          return true
        })
        return {
          id: table?.id || '',
          floor: floor?.name || table?.floor || 'Floor',
          seats: table?.seats || '',
          status: activeOrder ? 'occupied' : String(table?.status || 'available').toLowerCase(),
          orderNumber: activeOrder?.orderNumber || table?.orderNumber || table?.order || '',
          customer: activeOrder?.customer || activeOrder?.customerName || table?.customer || '',
          total: activeOrder?.total ? formatRestaurantCurrency(activeOrder.total) : table?.total || '',
        }
      }),
    ).filter((table) => table.id)
    if (tableRows.length) return tableRows
    return tableOptions.map((table) => ({
      id: table,
      floor: 'Restaurant',
      seats: '',
      status: 'available',
      orderNumber: '',
      customer: '',
      total: '',
    }))
  }, [ordersVersion, tableOptions])

  // ── Reservation ↔ POS Bridge ──
  const reservationBridge = useReservationPosBridge({
    workspaceId,
    tables: tablePanelRows.map((t) => ({ id: t.id, seats: t.seats, floor: t.floor })),
    activeOrderTableId: quickBill.tableNumber || '',
  })
  const {
    searchResults: reservationResults,
    isTableReserved,
    getReservationForTable,
    seatReservation,
    reservedTableIds,
    todayReservations,
  } = reservationBridge

  const localOrderSaved = Boolean(currentSavedOrder)
  const queueReady = Boolean(workspaceId && userId)
  const activeOrderState = currentSavedOrder
    ? String(currentSavedOrder.paymentStatus || currentSavedOrder.orderStatus || 'saved').replace(/_/g, ' ')
    : cartRows.length
      ? 'draft'
      : 'new'
  const paidAmount = quickBill.paymentMethod === 'Due' ? 0 : Math.max(0, Number(quickBill.paidAmount || 0))
  const effectivePaidAmount = quickBill.paidAmount === '' && quickBill.paymentMethod !== 'Due' ? total : paidAmount
  const dueAmount = Math.max(0, total - effectivePaidAmount)
  const changeAmount = Math.max(0, effectivePaidAmount - total)
  const paymentDueForOrder = Math.max(0, total - Math.min(effectivePaidAmount, total))

  function resolvedOrderTable() {
    if (quickBill.orderType !== 'Dine-in' && !isOutsideTable(quickBill.tableNumber)) return ''
    return quickBill.tableNumber || getOutsideTableId(orderNumber, quickBill.outsideTableName)
  }

  /* Memoized auto outside-table id for render-path labels — getOutsideTableId
     JSON-parses floors + orders from localStorage on every call. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autoOutsideTableId = useMemo(() => getOutsideTableId(orderNumber), [orderNumber, ordersVersion])

  function billContext() {
    return {
      orderNumber,
      kotNumber: `KOT-${orderNumber.replace(/^#/, '')}`,
      billNumber: `BILL-${orderNumber.replace(/^#/, '')}`,
      table: resolvedOrderTable(),
      orderType: quickBill.orderType,
      customerName: selectedCustomer?.name || 'Walk-in Guest',
      customerPhone: selectedCustomer?.phone || quickBill.customerPhone || '',
      rows: billTotals.rows,
      totals: billTotals,
      paidAmount: effectivePaidAmount,
      paymentMethod: quickBill.paymentMethod,
      notes: quickBill.notes,
      priority: quickBill.orderType === 'Delivery' ? 'High' : 'Normal',
      settings: restaurantPrintSettings,
    }
  }

  function showBillPreview() {
    if (!hasRequiredTable()) return
    setPrintPreview({ title: '58mm Bill Preview', type: 'bill', data: buildBillPrintData(billContext()) })
  }

  function showKotPreview() {
    if (!hasRequiredTable()) return
    setPrintPreview({ title: '58mm KOT Preview', type: 'kot', data: buildKotPrintData(billContext()) })
  }

  async function sendRestaurantThermal(content) {
    if (!content || !directPrinterAvailable(settings)) return false
    const res = await printThermalText(content, settings)
    if (!res.ok && res.error) setFlowMessage(`${res.error} Showing print preview.`)
    return Boolean(res.ok)
  }

  function hasRequiredTable() {
    if (!cartRows.length) {
      setFlowMessage('Add at least one menu item before saving.')
      return false
    }
    if (quickBill.orderType === 'Dine-in' && !quickBill.tableNumber) {
      setFlowMessage(`No table selected. System will save this as ${getOutsideTableId(orderNumber, quickBill.outsideTableName)}.`)
    }
    // ── Table occupancy guard: prevent assigning table to two active unpaid orders ──
    const tableForOrder = resolvedOrderTable()
    if (tableForOrder && isTableOccupiedByOtherOrder(tableForOrder, currentSavedOrder?.orderNumber || orderNumber)) {
      setFlowMessage(`Table ${tableForOrder} already has an active unpaid order. Please select a different table or complete the existing order first.`)
      return false
    }
    // ── Reserved table guard: prevent orders on reserved tables unless opened from reservation ──
    if (tableForOrder && isTableReserved(tableForOrder)) {
      const res = getReservationForTable(tableForOrder)
      if (res) {
        setFlowMessage(`Table ${tableForOrder} is reserved for ${res.customerName || res.name || 'a guest'} (${res.time || res.reservationTime || ''}). Open from the Reservations panel or select a different table.`)
        return false
      }
    }
    return true
  }

  function saveOrderRecord(orderStatus = 'served', paymentStatusOverride = null) {
    // paymentStatusOverride lets KOT-only saves force 'due' regardless of what
    // effectivePaidAmount computes to (the blank-paid-amount → total fallthrough
    // bug). Bill saves pass null so the normal logic runs.
    const paymentStatus = paymentStatusOverride !== null
      ? paymentStatusOverride
      : (dueAmount ? (effectivePaidAmount > 0 ? 'partial' : 'due') : 'paid')
    const context = billContext()
    const tableForOrder = context.table
    const orderPayload = {
      ...context,
      table: tableForOrder,
      customerId: selectedCustomerId,
      customer: selectedCustomer?.name || 'Walk-in Guest',
      phone: selectedCustomer?.phone || quickBill.customerPhone || '',
      orderStatus,
      paymentStatus,
    }
    upsertRestaurantOrder(orderPayload)
    setOrdersVersion((current) => current + 1)
    if (orderPayload.table) {
      if (orderStatus === 'served' && paymentStatus === 'paid') {
        releaseRestaurantTableOrder(orderPayload.table, orderPayload.orderNumber)
      } else if (isOutsideTable(orderPayload.table) || !tableOptions.includes(orderPayload.table)) {
        ensureOutsideTableOrder(orderPayload.table, orderPayload)
        setQuickBill((current) => ({ ...current, tableNumber: orderPayload.table }))
      } else {
        updateRestaurantTableOrder(orderPayload.table, orderPayload)
      }
    }
    notifyRestaurantOrder({
      title: orderStatus === 'pending' ? 'Restaurant KOT saved' : 'Restaurant bill saved',
      message: `${orderNumber} saved for ${orderPayload.customer}. Status: ${orderStatus}.`,
      priority: orderStatus === 'pending' ? 'high' : 'medium',
      dedupeKey: `restaurant-order-${orderNumber}-${orderStatus}`,
    })
  }

  async function quickBillFlow() {
    if (!hasRequiredTable()) return
    const context = billContext()
    const outputs = [
      quickBill.printKot ? buildKotPrintTemplate(context) : '',
      quickBill.printBill ? buildBillPrintTemplate(context) : '',
    ].filter(Boolean)
    setFlowMessage(
      quickBill.printKot || quickBill.printBill
        ? `Saved order. ${quickBill.printKot ? 'KOT sent to kitchen printer. ' : ''}${quickBill.printBill ? 'Bill sent to counter printer.' : ''}`
        : 'Saved order without printing.',
    )
    if (outputs.length && !(await sendRestaurantThermal(outputs.join('\n\n\n')))) {
      setPrintPreview({
        title: quickBill.printKot && quickBill.printBill ? 'Quick Bill + KOT Preview' : quickBill.printKot ? '58mm KOT Preview' : '58mm Bill Preview',
        content: outputs.join('\n\n\n'),
      })
    }
  }

  function saveBillRecord() {
    // A saved bill enters the kitchen workflow as "pending" instead of jumping straight
    // to "served", so it shows in the kitchen display and isn't marked served prematurely.
    // If the order has already been advanced in the kitchen, keep that progress.
    const existingStatus = String(currentSavedOrder?.orderStatus || '').toLowerCase()
    const nextStatus = ['preparing', 'ready', 'served'].includes(existingStatus) ? existingStatus : 'pending'
    saveOrderRecord(nextStatus)
    queueRestaurantJob('restaurant.bill.save', 'Restaurant bill save processing', billContext(), { total: 1 })
    setRestaurantCustomers((current) =>
      applyRestaurantCustomerPayment(current, selectedCustomerId, {
        orderNumber,
        total,
        paidAmount: effectivePaidAmount,
        paymentMethod: quickBill.paymentMethod,
      }),
    )
    // ── Payment ledger: non-blocking sync on bill save ──
    if (effectivePaidAmount > 0) {
      recordPayment({
        orderId: orderNumber,
        customerId: selectedCustomerId,
        paymentType: 'initial',
        paymentMethod: quickBill.paymentMethod || 'Cash',
        amount: effectivePaidAmount,
        paymentDate: new Date().toISOString(),
        status: 'completed',
        notes: quickBill.notes || '',
        referenceNumber: orderNumber,
      }).then((r) => {
        if (r?.ok) setPaymentSyncStatus({ synced: true, duplicate: Boolean(r.duplicate), created: Boolean(r.created) })
      }).catch(() => {
        setPaymentSyncStatus({ synced: false, failed: true, error: 'Cloud payment sync failed. Order saved locally.' })
      })
    }
  }

  function openPaymentModal() {
    if (!hasRequiredTable()) return
    setPaymentDetails({
      method: quickBill.paymentMethod === 'Due' ? 'Cash' : quickBill.paymentMethod,
      amount: String(Math.round(paymentDueForOrder || total)),
      note: quickBill.notes || '',
    })
    setPaymentOpen(true)
  }

  function updateCustomerPaymentBalance(amountPaid) {
    setRestaurantCustomers((current) =>
      current.map((customer) => {
        if (customer.id !== selectedCustomerId) return customer
        const paid = Math.max(0, Number(amountPaid || 0))
        const previousBalance = Math.max(0, Number(customer.creditBalance || 0))
        const today = new Date().toISOString().slice(0, 10)
        return {
          ...customer,
          creditBalance: Math.max(0, previousBalance - paid),
          paidAmount: Math.max(0, Number(customer.paidAmount || 0) + Math.min(paid, total)),
          lastVisit: today,
          orderHistory: [
            {
              orderNumber,
              total,
              paid: Math.min(paid, total),
              due: Math.max(0, total - Math.min(paid, total)),
              method: paymentDetails.method || 'Cash',
              date: today,
              note: paymentDetails.note || 'Payment received',
            },
            ...(customer.orderHistory || []),
          ],
        }
      }),
    )
  }

  function prepareNextOrderAfterPaid() {
    setCart([])
    setOrderNumber(getNextRestaurantOrderNumber())
    setSelectedCustomerId('cust-walkin')
    setCustomerSearch('')
    setQuickBill((current) => ({
      ...initialQuickBill,
      orderType: 'Quick Bill',
      printBill: current.printBill,
      printKot: current.printKot,
    }))
    setPaymentOpen(false)
    setPaymentDetails({ method: 'Cash', amount: '', note: '' })
  }

  function prepareNextOrderAfterSave() {
    setCart([])
    setOrderNumber(getNextRestaurantOrderNumber())
    setSelectedCustomerId('cust-walkin')
    setCustomerSearch('')
    setQuickBill((current) => ({
      ...initialQuickBill,
      orderType: 'Quick Bill',
      printBill: current.printBill,
      printKot: current.printKot,
    }))
    setPaymentOpen(false)
    setPaymentDetails({ method: 'Cash', amount: '', note: '' })
  }

  function savePayment({ printBill = false } = {}) {
    if (!hasRequiredTable()) return
    // ── Duplicate payment guard ──
    if (submittingOrderRef.current) {
      setFlowMessage('Payment already in progress. Please wait.')
      return
    }
    submittingOrderRef.current = true
    try {
    const existing = currentSavedOrder
    if (existing && (existing.paymentStatus === 'paid' || existing.orderStatus === 'cancelled')) {
      setFlowMessage('This order is already paid or cancelled.')
      return
    }
    const paid = Math.max(0, Number(paymentDetails.amount || 0))
    const nextPaidAmount = Math.min(total, effectivePaidAmount + paid)
    const nextDueAmount = Math.max(0, total - nextPaidAmount)
    const nextPaymentStatus = nextDueAmount ? (nextPaidAmount > 0 ? 'partial' : 'due') : 'paid'
    const context = {
      ...billContext(),
      paidAmount: nextPaidAmount,
      paymentMethod: paymentDetails.method || 'Cash',
      notes: paymentDetails.note || quickBill.notes,
    }
    upsertRestaurantOrder({
      ...context,
      customerId: selectedCustomerId,
      customer: selectedCustomer?.name || 'Walk-in Guest',
      phone: selectedCustomer?.phone || quickBill.customerPhone || '',
      orderStatus: 'served',
      paymentStatus: nextPaymentStatus,
    })
    setOrdersVersion((current) => current + 1)
    if (context.table) {
      if (nextPaymentStatus === 'paid') {
        releaseRestaurantTableOrder(context.table, context.orderNumber)
      } else {
        const tablePayload = {
          ...context,
          customer: selectedCustomer?.name || 'Walk-in Guest',
          paymentStatus: nextPaymentStatus,
        }
        if (isOutsideTable(context.table) || !tableOptions.includes(context.table)) ensureOutsideTableOrder(context.table, tablePayload)
        else updateRestaurantTableOrder(context.table, tablePayload)
      }
    }
    updateCustomerPaymentBalance(paid)
    setQuickBill((current) => ({
      ...current,
      paymentMethod: paymentDetails.method || 'Cash',
      paidAmount: String(Math.round(nextPaidAmount)),
      notes: paymentDetails.note || current.notes,
    }))
    setPaymentOpen(false)
    setFlowMessage(nextPaymentStatus === 'paid' ? 'Payment saved. Order marked paid.' : `Payment saved. Remaining due ${formatRestaurantCurrency(nextDueAmount)}.`)
    setBillingActionStatus({ type: 'payment', status: 'success', message: nextPaymentStatus === 'paid' ? 'Paid' : 'Partial payment saved' })
    if (nextPaymentStatus === 'paid') setShowApplePay(true)
    if (printBill) {
      queueRestaurantJob('restaurant.print', 'Restaurant payment bill print', { ...context, printType: 'bill' }, { total: 1 })
      setPrintPreview({ title: '58mm Bill Preview', type: 'bill', data: buildBillPrintData(context) })
    }
    if (nextPaymentStatus === 'paid') {
      prepareNextOrderAfterPaid()
      setFlowMessage('Payment saved. Ready for new order.')
      setBillingActionStatus({ type: 'payment', status: 'success', message: 'Paid. New order ready' })
    }
    notifyRestaurantOrder({
      title: nextPaymentStatus === 'paid' ? 'Restaurant payment received' : 'Restaurant partial payment saved',
      message: `${orderNumber} payment saved. Status: ${nextPaymentStatus}.`,
      priority: nextPaymentStatus === 'paid' ? 'medium' : 'high',
      dedupeKey: `restaurant-payment-${orderNumber}-${nextPaymentStatus}`,
    })
    // ── Payment ledger: non-blocking sync ──
    if (paid > 0) {
      const prevPaymentStatus = String(existing?.paymentStatus || '').toLowerCase()
      const ledgerPaymentType = prevPaymentStatus === 'due' ? 'due_recovery' : 'partial'
      recordPayment({
        orderId: orderNumber,
        customerId: selectedCustomerId,
        paymentType: ledgerPaymentType,
        paymentMethod: paymentDetails.method || 'Cash',
        amount: paid,
        paymentDate: new Date().toISOString(),
        status: 'completed',
        notes: paymentDetails.note || quickBill.notes || '',
        referenceNumber: orderNumber,
      }).then((r) => {
        if (r?.ok) setPaymentSyncStatus({ synced: true, duplicate: Boolean(r.duplicate), created: Boolean(r.created) })
      }).catch(() => {
        setPaymentSyncStatus({ synced: false, failed: true, error: 'Cloud payment sync failed. Order saved locally.' })
      })
      // ── Inventory deduction: non-blocking background sync ──
      if (nextPaymentStatus === 'paid' || paid > 0) {
        import('../lib/restaurantPosIntegration.js').then(({ deductIngredientsForOrder, awardLoyaltyPointsForOrder, createDeliveryFromOrder }) => {
          deductIngredientsForOrder({
            workspaceId, businessType, orderNumber,
            cartRows: cartRows.map(r => ({ itemId: r.itemId, item: r.item, qty: r.qty })),
            staff: { id: staffId, name: userDoc?.name || '' },
            settings,
          }).catch(() => {})

          if (selectedCustomerId && selectedCustomerId !== 'cust-walkin' && paid > 0) {
            awardLoyaltyPointsForOrder({
              workspaceId, businessType,
              customerId: selectedCustomerId,
              orderId: orderNumber,
              orderTotal: paid,
              cashierName: userDoc?.name || '',
            }).catch(() => {})
          }

          if (quickBill.orderType === 'Delivery' && nextPaymentStatus === 'paid') {
            createDeliveryFromOrder({
              workspaceId, businessType,
              order: { orderNumber, customer: selectedCustomer?.name || 'Walk-in Guest', phone: quickBill.customerPhone, cartRows, total, paymentStatus: 'paid', paymentMethod: paymentDetails.method || 'Cash' },
              deliveryAddress: quickBill.deliveryAddress || '',
              riderNotes: quickBill.riderNotes || '',
            }).catch(() => {})
          }
        }).catch(() => {})
      }
    }
    } finally {
      submittingOrderRef.current = false
    }
  }

  function quickPaidBill() {
    if (!hasRequiredTable()) return
    // ── Duplicate payment guard ──
    if (submittingOrderRef.current) {
      setFlowMessage('Payment already in progress. Please wait.')
      return
    }
    submittingOrderRef.current = true
    try {
      const paymentMethod = quickBill.paymentMethod === 'Due' ? 'Cash' : quickBill.paymentMethod
      const context = {
        ...billContext(),
        paidAmount: total,
        paymentMethod,
      }
      // ── Idempotency: skip if already paid ──
      const existing = currentSavedOrder
      if (existing && (existing.paymentStatus === 'paid' || existing.orderStatus === 'cancelled')) {
        setFlowMessage('This order is already paid or cancelled.')
        return
      }
      upsertRestaurantOrder({
        ...context,
        customerId: selectedCustomerId,
        customer: selectedCustomer?.name || 'Walk-in Guest',
        phone: selectedCustomer?.phone || quickBill.customerPhone || '',
        orderStatus: 'served',
        paymentStatus: 'paid',
      })
      setOrdersVersion((current) => current + 1)
      if (context.table) {
        releaseRestaurantTableOrder(context.table, context.orderNumber)
      }
      setRestaurantCustomers((current) =>
        applyRestaurantCustomerPayment(current, selectedCustomerId, {
          orderNumber,
          total,
          paidAmount: total,
          paymentMethod,
        }),
      )
      setPrintPreview(null)
      queueRestaurantJob('restaurant.bill.save', 'Restaurant paid bill processing', context, { total: 1 })
      prepareNextOrderAfterPaid()
      setFlowMessage('Bill paid and saved. Ready for next bill.')
      setBillingActionStatus({ type: 'payment', status: 'success', message: 'Paid. Next bill ready' })
      notifyRestaurantOrder({
        title: 'Restaurant bill paid',
        message: `${orderNumber} was paid and saved.`,
        priority: 'medium',
        dedupeKey: `restaurant-paid-${orderNumber}`,
      })
      // ── Payment ledger: non-blocking sync ──
      recordPayment({
        orderId: orderNumber,
        customerId: selectedCustomerId,
        paymentType: 'initial',
        paymentMethod: paymentMethod || 'Cash',
        amount: total,
        paymentDate: new Date().toISOString(),
        status: 'completed',
        notes: quickBill.notes || '',
        referenceNumber: orderNumber,
      }).then((r) => {
        if (r?.ok) setPaymentSyncStatus({ synced: true, duplicate: Boolean(r.duplicate), created: Boolean(r.created) })
      }).catch(() => {
        setPaymentSyncStatus({ synced: false, failed: true, error: 'Cloud payment sync failed. Order saved locally.' })
      })
      // ── Inventory deduction: non-blocking background sync ──
      import('../lib/restaurantPosIntegration.js').then(({ deductIngredientsForOrder, awardLoyaltyPointsForOrder, createDeliveryFromOrder }) => {
        deductIngredientsForOrder({
          workspaceId, businessType, orderNumber,
          cartRows: cartRows.map(r => ({ itemId: r.itemId, item: r.item, qty: r.qty })),
          staff: { id: staffId, name: userDoc?.name || '' },
          settings,
        }).catch(() => {})

        if (selectedCustomerId && selectedCustomerId !== 'cust-walkin' && total > 0) {
          awardLoyaltyPointsForOrder({
            workspaceId, businessType,
            customerId: selectedCustomerId,
            orderId: orderNumber,
            orderTotal: total,
            cashierName: userDoc?.name || '',
          }).catch(() => {})
        }

        if (quickBill.orderType === 'Delivery') {
          createDeliveryFromOrder({
            workspaceId, businessType,
            order: { orderNumber, customer: selectedCustomer?.name || 'Walk-in Guest', phone: quickBill.customerPhone, cartRows, total, paymentStatus: 'paid', paymentMethod },
            deliveryAddress: quickBill.deliveryAddress || '',
            riderNotes: quickBill.riderNotes || '',
          }).catch(() => {})
        }
      }).catch(() => {})
    } finally {
      submittingOrderRef.current = false
    }
  }

  function saveBill() {
    if (!hasRequiredTable()) return
    saveBillRecord()
    setFlowMessage(dueAmount ? `Bill saved. Due amount ${formatRestaurantCurrency(dueAmount)} added to customer balance.` : 'Bill saved and payment recorded.')
  }

  function saveAdvancedBill() {
    if (!hasRequiredTable()) return
    saveBillRecord()
    setQuickBillOpen(false)
    setFlowMessage(dueAmount ? `Bill saved. Due amount ${formatRestaurantCurrency(dueAmount)} added to customer balance.` : 'Bill saved and payment recorded.')
    setBillingActionStatus({ type: 'bill', status: 'success', message: 'Bill saved' })
  }

  function saveKot() {
    if (!hasRequiredTable()) return
    // ── Duplicate KOT guard ──
    if (submittingOrderRef.current) {
      setFlowMessage('KOT already being saved. Please wait.')
      return
    }
    submittingOrderRef.current = true
    try {
    saveOrderRecord('pending', 'due')
    prepareNextOrderAfterSave()
    setFlowMessage('KOT saved for kitchen. Ready for next order.')
    setBillingActionStatus({ type: 'kot', status: 'success', message: 'KOT saved. New order ready' })
    } finally {
      submittingOrderRef.current = false
    }
  }

  async function savePrintBill() {
    if (!hasRequiredTable()) return
    // ── Duplicate bill guard ──
    if (submittingOrderRef.current) {
      setFlowMessage('Bill already being saved. Please wait.')
      return
    }
    submittingOrderRef.current = true
    setBillingActionStatus({ type: 'bill', status: 'loading', message: 'Queueing bill...' })
    try {
      saveBillRecord()
      const context = billContext()
      queueRestaurantJob('restaurant.print', 'Restaurant bill print job', { ...context, printType: 'bill' }, { total: 1 })
      if (quickBill.printBill) {
        sendRestaurantThermal(buildBillPrintTemplate(context)).then((printed) => {
          if (!printed) setPrintPreview({ title: '58mm Bill Preview', type: 'bill', data: buildBillPrintData(context) })
        })
      }
      setFlowMessage('')
      setBillingActionStatus({
        type: 'bill',
        status: 'success',
        message: quickBill.printBill ? 'Bill saved & printed' : 'Bill saved',
      })
      if (!dueAmount) {
        prepareNextOrderAfterPaid()
        setBillingActionStatus({
          type: 'bill',
          status: 'success',
          message: quickBill.printBill ? 'Bill saved & printed. New order ready' : 'Bill saved. New order ready',
        })
      }
    } catch (error) {
      const message = error?.message || 'Unable to save bill. Please try again.'
      setFlowMessage(message)
      setBillingActionStatus({ type: 'bill', status: 'error', message })
    } finally {
      submittingOrderRef.current = false
    }
  }

  async function savePrintKot() {
    if (!hasRequiredTable()) return
    // ── Duplicate KOT guard ──
    if (submittingOrderRef.current) {
      setFlowMessage('KOT already being saved. Please wait.')
      return
    }
    submittingOrderRef.current = true
    setBillingActionStatus({ type: 'kot', status: 'loading', message: 'Queueing KOT...' })
    try {
      const context = billContext()
      queueRestaurantJob('restaurant.print', 'Restaurant KOT print job', { ...context, printType: 'kot' }, { total: 1, priority: 'high' })
      if (quickBill.printKot) {
        sendRestaurantThermal(buildKotPrintTemplate(context)).then((printed) => {
          if (!printed) setPrintPreview({ title: '58mm KOT Preview', type: 'kot', data: buildKotPrintData(context) })
        })
      }
      saveOrderRecord('pending', 'due')
      queueRestaurantJob('restaurant.bill.save', 'Restaurant KOT save processing', context, { total: 1, priority: 'high' })
      prepareNextOrderAfterSave()
      setFlowMessage('KOT saved for kitchen. Ready for next order.')
      setBillingActionStatus({
        type: 'kot',
        status: 'success',
        message: quickBill.printKot ? 'KOT saved & printed. New order ready' : 'KOT saved. New order ready',
      })
    } catch (error) {
      const message = error?.message || 'Unable to save KOT. Please try again.'
      setFlowMessage(message)
      setBillingActionStatus({ type: 'kot', status: 'error', message })
    } finally {
      submittingOrderRef.current = false
    }
  }

  function newOrder() {
    setCart([])
    setOrderNumber(getNextRestaurantOrderNumber())
    setSelectedCustomerId('cust-walkin')
    setCustomerSearch('')
    setQuickBill((current) => ({
      ...initialQuickBill,
      orderType: current.orderType,
      tableNumber: '',
      printBill: current.printBill,
      printKot: current.printKot,
    }))
    setPrintPreview(null)
    setFlowMessage('')
    setBillingActionStatus(null)
    setPaymentOpen(false)
    setPaymentDetails({ method: 'Cash', amount: '', note: '' })
  }

  function openCancelOrder() {
    if (!canCancelCurrentOrder) {
      setFlowMessage(currentSavedOrder ? 'This order is already cancelled.' : 'Save this order first before cancelling it.')
      return
    }
    setCancelReason('')
    setCancelError('')
    setCancelOpen(true)
  }

  function confirmCancelOrder() {
    if (!currentSavedOrder) return
    if (!cancelReason.trim()) {
      setCancelError('Cancel reason is required.')
      return
    }
    upsertRestaurantOrder({
      ...currentSavedOrder,
      orderStatus: 'cancelled',
      paymentStatus: 'cancelled',
      cancelReason: cancelReason.trim(),
      cancelledAt: new Date().toISOString(),
    })
    if (currentSavedOrder.table) releaseRestaurantTableOrder(currentSavedOrder.table, currentSavedOrder.orderNumber)
    setOrdersVersion((current) => current + 1)
    setCancelOpen(false)
    prepareNextOrderAfterSave()
    setFlowMessage(`Order cancelled. Reason: ${cancelReason.trim()}`)
    setBillingActionStatus({ type: 'cancel', status: 'success', message: 'Order cancelled. New order ready' })
    notifyRestaurantOrder({
      title: 'Restaurant order cancelled',
      message: `${currentSavedOrder.orderNumber || orderNumber} was cancelled. Reason: ${cancelReason.trim()}`,
      priority: 'high',
      relatedId: currentSavedOrder.orderNumber || orderNumber,
      dedupeKey: `restaurant-cancelled-${currentSavedOrder.orderNumber || orderNumber}`,
    })
  }

  /* Stable identities so memoized menu cards never re-render from callback
     churn (INP: typing in search re-rendered every card). */
  const addItem = useCallback((itemId) => {
    setCart((current) => {
      const exists = current.find((row) => row.itemId === itemId)
      if (exists) return current.map((row) => (row.itemId === itemId ? { ...row, qty: row.qty + 1 } : row))
      return [...current, { itemId, qty: 1, note: 'Kitchen note' }]
    })
  }, [])
  const adjustQty = useCallback((itemId, delta) => {
    setCart((current) =>
      current
        .map((row) => (row.itemId === itemId ? { ...row, qty: Math.max(0, row.qty + delta) } : row))
        .filter((row) => row.qty > 0),
    )
  }, [])

  function updateQuickBill(field, value) {
    setFlowMessage('')
    setQuickBill((current) => ({
      ...current,
      [field]: value,
      ...(field === 'orderType' && value !== 'Dine-in' ? { tableNumber: '' } : {}),
    }))
  }

  function selectCustomer(customerId) {
    const customer = restaurantCustomers.find((item) => item.id === customerId)
    setSelectedCustomerId(customerId)
    if (!customer) return
    setQuickBill((current) => ({
      ...current,
      customerName: customer.name || '',
      customerPhone: customer.phone || '',
      deliveryAddress: current.deliveryAddress || customer.address || '',
    }))
  }

  function setOrderMode(value) {
    updateQuickBill('orderType', value)
  }

  function selectTableFromPanel(tableId) {
    if (!tableId) return
    setQuickBill((current) => ({
      ...current,
      orderType: 'Dine-in',
      tableNumber: tableId,
      outsideTableName: isOutsideTable(tableId) ? tableId : current.outsideTableName,
    }))
    setTablePanelOpen(false)
    setFlowMessage(`Table ${tableId} selected for this order.`)
  }

  // ── Reservation: select and seat ──
  function handleSelectReservation(reservation) {
    if (!reservation) return
    const tableId = reservation.tableId || reservation.tableNumber
    if (!tableId) {
      setFlowMessage('Reservation has no assigned table. Assign a table first.')
      return
    }

    // Load the reserved table into POS
    setQuickBill((current) => ({
      ...current,
      orderType: 'Dine-in',
      tableNumber: tableId,
      outsideTableName: isOutsideTable(tableId) ? tableId : current.outsideTableName,
    }))

    // Set customer from reservation
    if (reservation.customerName || reservation.name) {
      setSelectedCustomerId(reservation.customerId || reservation.customerName || reservation.name)
    }

    setReservationPanelOpen(false)
    setReservationSearch('')

    // Auto-seat the reservation
    seatReservation(reservation, orderNumber).then((result) => {
      if (result.ok) {
        setFlowMessage(`Reservation seated — Table ${tableId} loaded. Order #${orderNumber} ready.`)
      } else {
        setFlowMessage(`Table ${tableId} loaded. Reservation seating sync: ${result.error}`)
      }
    }).catch(() => {
      setFlowMessage(`Table ${tableId} loaded. Continue with order.`)
    })
  }

  function closeQuickBill() {
    setQuickBillOpen(false)
  }

  return (
    <>
      <motion.div
        className="restaurant-pos-page min-h-screen min-w-0 bg-slate-50 p-2.5 sm:p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="restaurant-pos-grid grid min-w-0 gap-3">
        <Card className="restaurant-pos-menu-panel flex min-h-0 flex-col rounded-[1.15rem] p-2.5 sm:p-3">
          <div className="flex min-w-0 shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Badge variant="warning">Restaurant Billing</Badge>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">POS Till</h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">Full-screen restaurant billing for menu orders, KOT, and payment.</p>
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-black', localOrderSaved ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500')}>
                  {localOrderSaved ? <HiCheckCircle className="h-3.5 w-3.5" /> : <HiArrowPath className="h-3.5 w-3.5" />}
                  {localOrderSaved ? 'Order list saved' : 'Draft not saved'}
                </span>
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-black', queueReady ? 'border-sky-100 bg-sky-50 text-sky-700' : 'border-amber-100 bg-amber-50 text-amber-700')}>
                  <HiOutlineCloudArrowUp className="h-3.5 w-3.5" />
                  {queueReady ? 'Cloud queue ready' : 'Local mode'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10.5px] font-black capitalize text-violet-700">
                  #{orderNumber.replace(/^#/, '')} · {activeOrderState}
                </span>
              </div>
            </div>
            <div className="relative flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:items-center">
              <button
                type="button"
                onClick={() => setTablePanelOpen((open) => !open)}
                className={cn(
                  'group inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black shadow-sm transition',
                  tablePanelOpen
                    ? 'border-sky-300 bg-sky-600 text-white shadow-sky-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700',
                )}
                aria-expanded={tablePanelOpen}
                aria-label="Show restaurant tables"
              >
                <HiOutlineTableCells className="h-4 w-4" />
                Tables
                {quickBill.tableNumber ? <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{quickBill.tableNumber}</span> : null}
              </button>
              <button
                type="button"
                onClick={() => setReservationPanelOpen((open) => !open)}
                className={cn(
                  'group inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black shadow-sm transition',
                  reservationPanelOpen
                    ? 'border-indigo-300 bg-indigo-600 text-white shadow-indigo-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
                )}
                aria-expanded={reservationPanelOpen}
                aria-label="Search reservations"
              >
                <HiOutlineCalendarDays className="h-4 w-4" />
                Res.
                {todayReservations.length > 0 ? <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{todayReservations.length}</span> : null}
              </button>
              <Button type="button" className="h-9 w-full px-3 text-xs sm:w-auto" onClick={newOrder}>
                <HiOutlinePlus className="h-4 w-4" />
                New Order
              </Button>
            </div>
          </div>

          {tablePanelOpen ? (
            <div className="mt-2 overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">Table View</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{quickBill.tableNumber ? `Selected ${quickBill.tableNumber}` : 'Select table for dine-in order'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTablePanelOpen(false)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-500 hover:bg-slate-50"
                  aria-label="Close table view"
                >
                  ×
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto p-3">
                {tablePanelRows.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {tablePanelRows.map((table) => {
                      const occupied = table.status === 'occupied'
                      const reserved = !occupied && isTableReserved(table.id)
                      const selected = quickBill.tableNumber === table.id
                      const reservation = reserved ? getReservationForTable(table.id) : null
                      const isLocked = reserved && !selected
                      return (
                        <button
                          key={`${table.floor}-${table.id}`}
                          type="button"
                          onClick={() => isLocked ? null : selectTableFromPanel(table.id)}
                          disabled={isLocked}
                          className={cn(
                            'min-w-0 rounded-xl border p-2.5 text-left transition',
                            selected
                              ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-sm'
                              : occupied
                                ? 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300'
                                : reserved
                                  ? 'border-indigo-200 bg-indigo-50/60 text-indigo-900 hover:border-indigo-300'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50',
                            isLocked ? 'cursor-not-allowed opacity-70' : '',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-black">{table.id}</span>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black',
                              occupied ? 'bg-amber-100 text-amber-800' :
                              reserved ? 'bg-indigo-100 text-indigo-700' :
                              'bg-emerald-50 text-emerald-700'
                            )}>
                              {occupied ? 'Active' : reserved ? 'Reserved' : 'Open'}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{table.floor}{table.seats ? ` · ${table.seats} seats` : ''}</p>
                          {occupied ? <p className="mt-1 truncate text-[11px] font-bold text-amber-800">{table.orderNumber || 'Active order'} {table.total ? `· ${table.total}` : ''}</p> : null}
                          {reserved && reservation ? (
                            <p className="mt-1 truncate text-[10px] font-bold text-indigo-700">
                              {reservation.customerName || reservation.name || 'Guest'} · {reservation.time || reservation.reservationTime || ''}
                            </p>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs font-semibold text-slate-500">
                    No restaurant tables saved yet.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ── Reservation Search Panel ── */}
          {reservationPanelOpen ? (
            <div className="mt-2 overflow-hidden rounded-[1rem] border border-indigo-200 bg-white shadow-xl shadow-indigo-200/70">
              <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">Reservations</p>
                  <p className="truncate text-xs font-semibold text-indigo-500">
                    {todayReservations.length} today · Search by name, phone, ID or table
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setReservationPanelOpen(false); setReservationSearch('') }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-indigo-200 bg-white text-sm font-black text-indigo-500 hover:bg-indigo-50"
                  aria-label="Close reservations"
                >
                  ×
                </button>
              </div>
              {/* Search input */}
              <div className="relative border-b border-slate-100 px-3 py-2">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={reservationSearch}
                  onChange={(e) => setReservationSearch(e.target.value)}
                  placeholder="Search reservations..."
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm font-medium outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
                />
              </div>
              {/* Results */}
              <div className="max-h-64 overflow-y-auto p-2">
                {reservationSearch.trim() ? (
                  reservationBridge.searchResults.length > 0 ? (
                    <div className="grid gap-1.5">
                      {reservationBridge.searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectReservation(r)}
                          disabled={r.status === 'cancelled' || r.status === 'no_show' || r.status === 'completed'}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition',
                            r.status === 'confirmed' ? 'border-sky-200 bg-sky-50 hover:border-sky-300' :
                            r.status === 'pending' ? 'border-amber-200 bg-amber-50 hover:border-amber-300' :
                            r.status === 'seated' ? 'border-emerald-200 bg-emerald-50' :
                            'border-slate-200 bg-white hover:border-indigo-200',
                            (r.status === 'cancelled' || r.status === 'no_show' || r.status === 'completed') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{r.customerName || r.name || 'Guest'}</p>
                            <p className="text-xs text-slate-500">
                              {r.phone || r.customerPhone || 'No phone'} · {r.time || r.reservationTime || '—'} · {r.partySize || r.guestCount || r.guests || 1} guests
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-black',
                              r.status === 'confirmed' ? 'bg-sky-100 text-sky-700' :
                              r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              r.status === 'seated' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-500'
                            )}>
                              {r.status === 'confirmed' ? 'Upcoming' : r.status === 'pending' ? 'Pending' : r.status === 'seated' ? 'Seated' : r.status}
                            </span>
                            <p className="mt-0.5 text-[10px] font-bold text-slate-600">Table {r.tableId || r.tableNumber || 'Auto'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs font-semibold text-slate-400">No reservations match your search.</div>
                  )
                ) : (
                  // Today's reservations quick list
                  todayReservations.length > 0 ? (
                    <div className="grid gap-1.5">
                      <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Today's Reservations</p>
                      {todayReservations.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectReservation(r)}
                          disabled={r.status === 'cancelled' || r.status === 'no_show' || r.status === 'completed'}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition',
                            r.status === 'confirmed' ? 'border-sky-200 bg-sky-50 hover:border-sky-300' :
                            r.status === 'pending' ? 'border-amber-200 bg-amber-50 hover:border-amber-300' :
                            r.status === 'seated' ? 'border-emerald-200 bg-emerald-50' :
                            'border-slate-200 bg-white hover:border-indigo-200',
                            (r.status === 'cancelled' || r.status === 'no_show' || r.status === 'completed') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{r.customerName || r.name || 'Guest'}</p>
                            <p className="text-xs text-slate-500">
                              {r.time || r.reservationTime || '—'} · Table {r.tableId || r.tableNumber || 'Auto'} · {r.partySize || r.guestCount || r.guests || 1} guests
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-black',
                              r.status === 'confirmed' ? 'bg-sky-100 text-sky-700' :
                              r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              r.status === 'seated' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-500'
                            )}>
                              {r.status === 'confirmed' ? 'Upcoming' : r.status === 'pending' ? 'Pending' : r.status === 'seated' ? 'Seated' : r.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs font-semibold text-slate-400">No reservations for today.</div>
                  )
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-2 shrink-0 space-y-1.5">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {orderModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setOrderMode(mode.value)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
                    quickBill.orderType === mode.value
                      ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700',
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {quickBill.orderType === 'Dine-in' ? (
              <div className="space-y-1.5">
                <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5">
                  {tableOptions.slice(0, 8).map((table) => (
                    <button
                      key={table}
                      type="button"
                      onClick={() => updateQuickBill('tableNumber', table)}
                      className={cn(
                        'min-w-24 shrink-0 rounded-xl border px-3.5 py-2.5 text-left transition',
                        quickBill.tableNumber === table
                          ? 'border-sky-400 bg-sky-50 text-sky-800 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200',
                      )}
                    >
                      <span className="block text-sm font-black">{table}</span>
                      <span className="mt-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">Available</span>
                    </button>
                  ))}
                </div>
                <div className="grid gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={quickBill.outsideTableName}
                    onChange={(event) => updateQuickBill('outsideTableName', event.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-sky-300"
                    placeholder={`No table? custom name or auto ${autoOutsideTableId}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuickBill('tableNumber', getOutsideTableId(orderNumber, quickBill.outsideTableName))}
                    className={cn(
                      'h-8 rounded-lg px-3 text-xs font-black transition',
                      isOutsideTable(quickBill.tableNumber)
                        ? 'bg-sky-700 text-white'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:text-sky-700',
                    )}
                  >
                    Use {quickBill.outsideTableName.trim() || autoOutsideTableId}
                  </button>
                </div>
              </div>
            ) : null}

            {quickBill.orderType === 'Delivery' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={quickBill.customerPhone}
                  onChange={(event) => updateQuickBill('customerPhone', event.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-sky-300"
                  placeholder="Customer phone"
                />
                <input
                  value={quickBill.deliveryAddress}
                  onChange={(event) => updateQuickBill('deliveryAddress', event.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-sky-300"
                  placeholder="Delivery address"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-2 grid min-w-0 shrink-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search menu items..."
                className="h-9 pl-9"
              />
            </div>
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
              {menuCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    category === item
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="restaurant-menu-scroll mt-2 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-1">
            {visibleItems.length === 0 ? (
              <div className="grid min-h-[18rem] place-items-center rounded-[1rem] border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                    <GiKnifeFork className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-base font-black text-slate-950">No menu items found</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Search ya category change karein. Menu empty ho to Settings/Menu se items add karein.
                  </p>
                </div>
              </div>
            ) : null}
            <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {visibleItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                inCartQty={cartByItemId.get(item.id)?.qty || 0}
                onAdd={addItem}
                onAdjust={adjustQty}
              />
            ))}
            </div>
          </div>
        </Card>

          <Card className="restaurant-pos-billing-panel flex min-h-0 flex-col rounded-[1.15rem] p-2.5">
            <div className="shrink-0 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Order</p>
                <p className="text-sm font-black text-slate-950 dark:text-white">{orderNumber}</p>
              </div>
              <Badge variant="success" className="shrink-0 px-2 py-0.5 text-[10px]">{quickBill.paymentMethod}</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {canOpenSession ? (
                <button
                  type="button"
                  onClick={openCashSessionDialog}
                  disabled={cashSessionSubmitting}
                  className="inline-flex h-6 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  <HiCheckCircle className="h-3 w-3" />
                  Open Shift
                </button>
              ) : null}
              {canCloseSession ? (
                <button
                  type="button"
                  onClick={openCloseSessionConfirm}
                  disabled={cashSessionSubmitting}
                  className="inline-flex h-6 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 text-[10px] font-black text-amber-700 transition hover:bg-amber-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  <HiOutlineXCircle className="h-3 w-3" />
                  Close Shift
                </button>
              ) : null}
              {activeSession ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                  <HiCheckCircle className="h-2.5 w-2.5" />
                  Shift Open
                </span>
              ) : null}
              {(isOwner || isManager) ? (
                <button
                  type="button"
                  onClick={() => setSettlementPanelOpen(true)}
                  className="inline-flex h-6 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 text-[10px] font-black text-violet-700 transition hover:bg-violet-100"
                >
                  <HiOutlineShieldExclamation className="h-3 w-3" />
                  Settlements
                  {pendingSettlements?.length > 0 ? (
                    <span className="rounded-full bg-violet-200 px-1 py-0.5 text-[8px]">{pendingSettlements.length}</span>
                  ) : null}
                </button>
              ) : null}
            </div>

            {activeSession ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-semibold text-slate-400">Cash:</span>
                {[
                  { type: 'deposit', label: '+Deposit', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                  { type: 'withdrawal', label: '-Withdrawal', cls: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' },
                  { type: 'expense', label: '💸Expense', cls: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
                  { type: 'adjustment', label: '±Adjust', cls: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' },
                ].map(({ type, label, cls }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setMovementDialog(type)
                      setMovementAmount('')
                      setMovementReason('')
                      setMovementManagerApproval('')
                      setMovementError('')
                    }}
                    disabled={movementSubmitting}
                    className={`inline-flex h-5 items-center rounded-md border px-1.5 text-[9px] font-bold transition disabled:pointer-events-none disabled:opacity-50 ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-1.5">
              <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                <div className="relative">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    className="h-7 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs font-semibold text-slate-900 outline-none focus:border-sky-300"
                    placeholder="Search customer by name or phone"
                  />
                </div>
                <div className="mt-1 flex gap-1.5 overflow-x-auto pb-0.5">
                  {customerMatches.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer.id)}
                      className={cn(
                        'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition',
                        selectedCustomerId === customer.id
                          ? 'border-slate-950 bg-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700',
                      )}
                    >
                      {customer.name}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[11px]">
                  <p className="truncate font-semibold text-slate-600">
                    {selectedCustomer?.name || 'Walk-in Guest'}{selectedCustomer?.phone ? ` / ${selectedCustomer.phone}` : ''}
                    <span className="text-slate-400"> · {quickBill.orderType === 'Dine-in' ? `Table ${quickBill.tableNumber || '—'}` : quickBill.orderType}</span>
                  </p>
                  {selectedCustomer?.creditBalance > 0 ? (
                    <span className="shrink-0 font-bold text-rose-700">Due {formatRestaurantCurrency(selectedCustomer.creditBalance)}</span>
                  ) : null}
                </div>
              </div>

              {/* Delivery details — prominent when order type is Delivery */}
              {quickBill.orderType === 'Delivery' && (quickBill.deliveryAddress || quickBill.riderNotes) ? (
                <div className="col-span-2 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/80 p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">
                    <span>📍</span> Delivery Details
                  </div>
                  {quickBill.deliveryAddress ? (
                    <p className="mt-1 flex items-start gap-1.5 text-[11px] font-medium text-slate-700">
                      <span className="mt-0.5 shrink-0">🏠</span>
                      <span>{quickBill.deliveryAddress}</span>
                    </p>
                  ) : null}
                  {quickBill.riderNotes ? (
                    <p className="mt-0.5 flex items-start gap-1.5 text-[11px] italic text-slate-500">
                      <span className="mt-0.5 shrink-0">📝</span>
                      <span>"{quickBill.riderNotes}"</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <PanelField label="Payment Method">
                <select
                  value={quickBill.paymentMethod}
                  onChange={(event) => updateQuickBill('paymentMethod', event.target.value)}
                  className="h-7 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-sky-300"
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>JazzCash</option>
                  <option>Easypaisa</option>
                  <option>Bank</option>
                  <option>Due</option>
                </select>
              </PanelField>
              <PanelField label="Paid Amount">
                <input
                  type="number"
                  min="0"
                  value={quickBill.paymentMethod === 'Due' ? '0' : quickBill.paidAmount}
                  onChange={(event) => updateQuickBill('paidAmount', event.target.value)}
                  disabled={quickBill.paymentMethod === 'Due'}
                  className="h-7 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder={String(Math.round(total))}
                />
              </PanelField>
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]">
                <span className="font-semibold text-slate-500">{changeAmount ? 'Change' : 'Due Amount'}</span>
                <span className={cn('font-black', dueAmount ? 'text-rose-700' : 'text-emerald-700')}>
                  {formatRestaurantCurrency(changeAmount || dueAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <TogglePill label="Print Bill" checked={quickBill.printBill} onChange={(value) => updateQuickBill('printBill', value)} />
              <TogglePill label="Print KOT" checked={quickBill.printKot} onChange={(value) => updateQuickBill('printKot', value)} />
            </div>

            {flowMessage ? <p className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">{flowMessage}</p> : null}
            {billingActionStatus ? (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                  billingActionStatus.status === 'success'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                    : billingActionStatus.status === 'error'
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                      : 'bg-slate-950 text-white',
                )}
              >
                {billingActionStatus.status === 'loading' ? (
                  <HiArrowPath className="h-3.5 w-3.5 animate-spin" />
                ) : billingActionStatus.status === 'error' ? (
                  <HiOutlineXCircle className="h-3.5 w-3.5" />
                ) : (
                  <HiCheckCircle className="h-3.5 w-3.5 animate-pulse" />
                )}
                <span>{billingActionStatus.message}</span>
              </div>
            ) : null}
          </div>

          <div className="restaurant-cart-panel mt-1.5 flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1.5">
            <div className="flex shrink-0 items-center justify-between px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              <span>Cart items</span>
              <span>{cartRows.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
            {cartRows.length === 0 ? (
              <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400">
                  <HiOutlinePlus className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-500">No items added</p>
                <p className="text-[11px] text-slate-400">Pick menu items to start this bill.</p>
              </div>
            ) : null}
            {cartRows.map((row) => (
              <div key={row.itemId} className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <div className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[11px] font-black text-white', row.item.tone)}>
                    {row.qty}x
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-slate-950">{row.item.name}</p>
                      <p className="shrink-0 text-xs font-bold text-slate-950">{formatRestaurantCurrency(row.lineTotal)}</p>
                    </div>
                    <p className="truncate text-[10.5px] text-slate-500">{row.note}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5">
                    <button type="button" onClick={() => adjustQty(row.itemId, -1)} className="grid h-5 w-5 place-items-center rounded-full bg-white text-slate-700 shadow-sm">
                      <HiOutlineMinus className="h-3 w-3" />
                    </button>
                    <span className="w-4 text-center text-[11px] font-bold text-slate-950">{row.qty}</span>
                    <button type="button" onClick={() => adjustQty(row.itemId, 1)} className="grid h-5 w-5 place-items-center rounded-full bg-slate-950 text-white">
                      <HiOutlinePlus className="h-3 w-3" />
                    </button>
                  </div>
                  <button type="button" aria-label={`Edit ${row.item.name}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-sky-700">
                    <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>

          <div className="mt-1.5 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-slate-500">
              <span>Subtotal <b className="font-bold text-slate-700">{formatRestaurantCurrency(subtotal)}</b></span>
              <span>Disc <b className="font-bold text-slate-700">{formatRestaurantCurrency(discount)}</b></span>
              <span>Service <b className="font-bold text-slate-700">{formatRestaurantCurrency(serviceCharges)}</b></span>
              <span>Tax <b className="font-bold text-slate-700">{formatRestaurantCurrency(tax)}</b></span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
              <span className="text-sm font-black text-slate-950">Total</span>
              <span className="text-base font-black text-slate-950">{formatRestaurantCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-1.5 shrink-0 bg-white pb-1">
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                className="h-8 px-2 text-xs"
                onClick={savePrintBill}
                disabled={billingActionStatus?.status === 'loading'}
              >
                <HiOutlinePrinter className="h-3.5 w-3.5" />
                Save / Print Bill
              </Button>
              <Button
                type="button"
                className="h-8 px-2 text-xs"
                onClick={saveKot}
                disabled={billingActionStatus?.status === 'loading'}
              >
                <HiOutlineReceiptPercent className="h-3.5 w-3.5" />
                Save Table KOT
              </Button>
            </div>
            <button
              type="button"
              onClick={quickPaidBill}
              disabled={billingActionStatus?.status === 'loading' || !cartRows.length}
              className="mt-1.5 inline-flex h-8 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-60"
            >
              <HiCheckCircle className="h-4 w-4" />
              Paid - Save & Next Bill
            </button>
            <button
              type="button"
              onClick={openPaymentModal}
              disabled={billingActionStatus?.status === 'loading' || !cartRows.length}
              className="mt-1 w-full text-center text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 disabled:pointer-events-none disabled:opacity-60"
            >
              Payment Details {paymentDueForOrder > 0 ? `(${formatRestaurantCurrency(paymentDueForOrder)})` : ''}
            </button>
            {canCancelCurrentOrder ? (
              <button
                type="button"
                onClick={openCancelOrder}
                disabled={billingActionStatus?.status === 'loading'}
                className="mt-1 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-60"
              >
                <HiOutlineXCircle className="h-3.5 w-3.5" />
                Cancel Order
              </button>
            ) : null}
            {canRefundCurrentOrder ? (
              <button
                type="button"
                onClick={openRefundOrder}
                disabled={billingActionStatus?.status === 'loading' || refundProcessing}
                className="mt-1 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 text-[11px] font-black text-amber-700 transition hover:bg-amber-100 disabled:pointer-events-none disabled:opacity-60"
              >
                <HiArrowPath className="h-3.5 w-3.5" />
                Refund
              </button>
            ) : null}
            <button
              type="button"
              className="mt-1 w-full text-center text-[11px] font-semibold text-sky-700 hover:text-sky-900"
              onClick={() => setQuickBillOpen(true)}
            >
              Advanced Bill Details
            </button>
          </div>
          </Card>
        </div>
      </motion.div>

      {quickBillOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Restaurant POS</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Advanced Bill Details</h2>
              </div>
              <button
                type="button"
                onClick={closeQuickBill}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Cancel quick bill"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-3 md:grid-cols-3">
                {quickBill.orderType === 'Delivery' ? (
                  <>
                    <Field label="Delivery Address" className="md:col-span-3">
                      <input
                        value={quickBill.deliveryAddress}
                        onChange={(event) => updateQuickBill('deliveryAddress', event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300"
                        placeholder="House, street, area"
                      />
                    </Field>
                    <Field label="Rider/Delivery Notes" className="md:col-span-3">
                      <textarea
                        value={quickBill.riderNotes}
                        onChange={(event) => updateQuickBill('riderNotes', event.target.value)}
                        className="min-h-20 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        placeholder="Rider instructions, delivery timing, or gate note"
                      />
                    </Field>
                  </>
                ) : null}

                <Field label="Discount">
                  <input
                    value={quickBill.discount}
                    onChange={(event) => updateQuickBill('discount', event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300"
                    placeholder="0"
                  />
                </Field>
                <Field label="Service Charges">
                  <input
                    value={quickBill.serviceCharges}
                    onChange={(event) => updateQuickBill('serviceCharges', event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300"
                    placeholder="0"
                  />
                </Field>
                <Field label="Tax">
                  <input
                    value={quickBill.tax}
                    onChange={(event) => updateQuickBill('tax', event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300"
                    placeholder="0"
                  />
                </Field>
                <Field label="Notes" className="md:col-span-2">
                  <textarea
                    value={quickBill.notes}
                    onChange={(event) => updateQuickBill('notes', event.target.value)}
                    className="min-h-20 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                    placeholder="Billing or kitchen notes"
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="subtle" onClick={closeQuickBill}>Cancel</Button>
              <Button type="button" variant="subtle" onClick={showKotPreview}>Send KOT</Button>
              <Button type="button" variant="subtle" onClick={showBillPreview}>
                <HiOutlinePrinter className="h-4 w-4" />
                Print Bill
              </Button>
              <Button type="button" onClick={saveAdvancedBill}>Save Bill</Button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-[86] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Cancel Order</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{currentSavedOrder?.orderNumber || orderNumber}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Reason ke bina order cancel nahi hoga.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Close cancel order"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <Field label="Cancel Reason">
                <textarea
                  value={cancelReason}
                  onChange={(event) => {
                    setCancelReason(event.target.value)
                    setCancelError('')
                  }}
                  className="min-h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                  placeholder="Example: customer left, wrong order, duplicate order..."
                />
              </Field>
              {cancelError ? <p className="text-xs font-semibold text-rose-600">{cancelError}</p> : null}
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                OK karne ke baad order cancelled ho jayega aur linked table / OUT side holder free ho jayega.
              </div>
            </div>

            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
              <Button type="button" variant="subtle" onClick={() => setCancelOpen(false)}>Back</Button>
              <button
                type="button"
                onClick={confirmCancelOrder}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-rose-700"
              >
                <HiOutlineXCircle className="h-4 w-4" />
                OK, Cancel Order
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {refundOpen ? (
        <div className="fixed inset-0 z-[86] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Refund</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{currentSavedOrder?.orderNumber || orderNumber}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Paid {formatRestaurantCurrency(Number(currentSavedOrder?.paidAmount || currentSavedOrder?.total || 0))} · Max refund {formatRestaurantCurrency(maxRefundAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRefundOrder}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Close refund"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <Field label="Refund Type">
                <select
                  value={refundType}
                  onChange={(event) => {
                    setRefundType(event.target.value)
                    if (event.target.value === 'full') {
                      setRefundAmount(String(Math.round(Number(currentSavedOrder?.paidAmount || currentSavedOrder?.total || 0))))
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-300"
                >
                  <option value="full">Full Refund</option>
                  <option value="partial">Partial Amount Refund</option>
                </select>
              </Field>
              {refundType === 'partial' ? (
                <Field label="Refund Amount">
                  <input
                    type="number"
                    min="0"
                    max={maxRefundAmount}
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-amber-300"
                    placeholder={String(Math.round(maxRefundAmount))}
                  />
                </Field>
              ) : null}
              <Field label="Refund Reason">
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  className="min-h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-300"
                  placeholder="Example: customer returned, wrong item, billing error..."
                />
              </Field>
              {refundResult && !refundResult.ok ? (
                <p className="text-xs font-semibold text-rose-600">{refundResult.error}</p>
              ) : null}
              {refundResult?.duplicate ? (
                <p className="text-xs font-semibold text-amber-600">Duplicate refund detected — this refund was already recorded.</p>
              ) : null}
              {refundResult?.ok && refundResult?.created ? (
                <p className="text-xs font-semibold text-emerald-600">Refund recorded successfully.</p>
              ) : null}
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Refund ke liye reason zaroori hai. Duplicate refunds block kiye jayenge.
              </div>
            </div>

            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
              <Button type="button" variant="subtle" onClick={closeRefundOrder}>Back</Button>
              <button
                type="button"
                onClick={confirmRefundOrder}
                disabled={refundProcessing || !refundReason.trim() || (refundType === 'partial' && (!refundAmount || Number(refundAmount) <= 0))}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-700 disabled:pointer-events-none disabled:opacity-60"
              >
                {refundProcessing ? (
                  <HiArrowPath className="h-4 w-4 animate-spin" />
                ) : (
                  <HiArrowPath className="h-4 w-4" />
                )}
                {refundProcessing ? 'Processing...' : refundType === 'full' ? 'Full Refund' : `Refund ${formatRestaurantCurrency(Number(refundAmount || 0))}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cashOpenDialog ? (
        <div className="fixed inset-0 z-[86] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Open Shift</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Opening Cash</h2>
              </div>
              <button
                type="button"
                onClick={cancelCashSessionDialog}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Close open shift"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Opening Cash Amount</span>
                <input
                  type="number"
                  min="0"
                  value={openingCashInput}
                  onChange={(event) => {
                    setOpeningCashInput(event.target.value)
                    setCashSessionError('')
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-300"
                  placeholder="0"
                />
              </label>
              {cashSessionError ? <p className="text-xs font-semibold text-rose-600">{cashSessionError}</p> : null}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                Shift open karne ke liye opening cash amount enter karein. Ek baar mein sirf ek shift open ho sakti hai.
              </div>
            </div>
            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={cancelCashSessionDialog}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmOpenCashSession}
                disabled={cashSessionSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-60"
              >
                {cashSessionSubmitting ? 'Opening...' : 'Open Shift'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closeConfirmOpen ? (
        <div className="fixed inset-0 z-[86] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Close Shift</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Confirm Close Shift</h2>
              </div>
              <button
                type="button"
                onClick={cancelCloseSessionConfirm}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Close confirm"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              {cashSessionError ? <p className="text-xs font-semibold text-rose-600">{cashSessionError}</p> : null}

              {/* ── Read-only breakdown ── */}
              {activeSession ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Opening Cash</span>
                    <span className="font-semibold text-slate-700">{formatRestaurantCurrency(Number(activeSession.openingCash) || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cash Deposits</span>
                    <span className="font-semibold text-emerald-700">{formatRestaurantCurrency(cashMovementTotals?.deposits || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cash Withdrawals</span>
                    <span className="font-semibold text-rose-700">-{formatRestaurantCurrency(cashMovementTotals?.withdrawals || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cash Expenses</span>
                    <span className="font-semibold text-rose-700">-{formatRestaurantCurrency(cashMovementTotals?.expenses || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cash Adjustments</span>
                    <span className="font-semibold text-slate-700">{cashMovementTotals?.adjustments > 0 ? '+' : ''}{formatRestaurantCurrency(cashMovementTotals?.adjustments || 0)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 mt-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-600">Expected Cash</span>
                      <span className="text-amber-700">{formatRestaurantCurrency(closeLiveExpectedCash)}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Actual Closing Cash</span>
                <input
                  type="number"
                  min="0"
                  value={actualClosingCashInput}
                  onChange={(event) => {
                    const val = event.target.value
                    setActualClosingCashInput(val)
                    const actual = Number(val || 0)
                    setCloseLiveDifference(actual - closeLiveExpectedCash)
                    setCashSessionError('')
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-amber-300"
                  placeholder="0"
                />
              </label>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-bold">
                <span className="text-slate-600">Difference</span>
                <span className={closeLiveDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {closeLiveDifference >= 0 ? '+' : ''}{formatRestaurantCurrency(closeLiveDifference)}
                </span>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Notes</span>
                <textarea
                  value={closeNotes}
                  onChange={(event) => setCloseNotes(event.target.value)}
                  className="min-h-16 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-300"
                  placeholder="Optional notes"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Manager Approval (optional)</span>
                <input
                  value={closeManagerApproval}
                  onChange={(event) => setCloseManagerApproval(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-amber-300"
                  placeholder="Manager name or ID"
                />
              </label>
            </div>
            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={cancelCloseSessionConfirm}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCloseCashSession}
                disabled={cashSessionSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-700 disabled:pointer-events-none disabled:opacity-60"
              >
                {cashSessionSubmitting ? 'Closing...' : 'Close Shift'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Cash movement dialog ── */}
      {movementDialog ? (
        <div className="fixed inset-0 z-[86] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {movementDialog === 'deposit' && 'Deposit'}
                  {movementDialog === 'withdrawal' && 'Withdrawal'}
                  {movementDialog === 'expense' && 'Cash Expense'}
                  {movementDialog === 'adjustment' && 'Cash Adjustment'}
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Record {movementDialog === 'deposit' ? 'Deposit' : movementDialog === 'withdrawal' ? 'Withdrawal' : movementDialog === 'expense' ? 'Expense' : 'Adjustment'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMovementDialog(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Close movement"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              {movementError ? <p className="text-xs font-semibold text-rose-600">{movementError}</p> : null}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Amount</span>
                <input
                  type="number"
                  min={movementDialog === 'adjustment' ? undefined : '0'}
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-sky-300"
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Reason</span>
                <textarea
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="min-h-14 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                  placeholder="Reason for this movement"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Manager Approval (optional)</span>
                <input
                  value={movementManagerApproval}
                  onChange={(e) => setMovementManagerApproval(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-sky-300"
                  placeholder="Manager name or ID"
                />
              </label>
            </div>
            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMovementDialog(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const amount = Number(movementAmount || 0)
                  if (!amount || (movementDialog !== 'adjustment' && amount < 0)) {
                    setMovementError('Please enter a valid amount.')
                    return
                  }
                  if (!movementReason.trim()) {
                    setMovementError('Reason is required.')
                    return
                  }
                  setMovementSubmitting(true)
                  setMovementError('')
                  try {
                    const rs = await recordMovement({
                      type: movementDialog,
                      amount,
                      reason: movementReason.trim(),
                      managerApprovedBy: movementManagerApproval.trim(),
                    })
                    if (rs.ok) {
                      setMovementDialog(null)
                      setFlowMessage(`Cash ${movementDialog} recorded.`)
                    } else {
                      setMovementError(rs.error || 'Unable to record.')
                    }
                  } catch (err) {
                    setMovementError(err?.message || 'Unable to record.')
                  } finally {
                    setMovementSubmitting(false)
                  }
                }}
                disabled={movementSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-700 disabled:pointer-events-none disabled:opacity-60"
              >
                {movementSubmitting ? 'Recording...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentOpen ? (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Payment Details</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Mark Order Paid</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {orderNumber} · Total {formatRestaurantCurrency(total)} · Due {formatRestaurantCurrency(paymentDueForOrder)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
                aria-label="Close payment details"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <Field label="Payment Method">
                <select
                  value={paymentDetails.method}
                  onChange={(event) => setPaymentDetails((current) => ({ ...current, method: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-300"
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>JazzCash</option>
                  <option>Easypaisa</option>
                  <option>Bank</option>
                </select>
              </Field>
              <Field label="Paid Amount">
                <input
                  type="number"
                  min="0"
                  value={paymentDetails.amount}
                  onChange={(event) => setPaymentDetails((current) => ({ ...current, amount: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-300"
                  placeholder={String(Math.round(paymentDueForOrder || total))}
                />
              </Field>
              <Field label="Payment Note">
                <textarea
                  value={paymentDetails.note}
                  onChange={(event) => setPaymentDetails((current) => ({ ...current, note: event.target.value }))}
                  className="min-h-20 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-300"
                  placeholder="Cash received, card approval, due settlement note..."
                />
              </Field>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                Save Paid se order paid/partial update hoga. Paid & Print Bill se same payment save karke 58mm bill preview open hoga.
              </div>
            </div>

            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-3">
              <Button type="button" variant="subtle" className="h-9 px-3 text-xs" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <button
                type="button"
                onClick={() => savePayment({ printBill: false })}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
              >
                <HiCheckCircle className="h-4 w-4" />
                Save Paid
              </button>
              <button
                type="button"
                onClick={() => savePayment({ printBill: true })}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800"
              >
                <HiOutlinePrinter className="h-4 w-4" />
                Paid & Print Bill
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {printPreview ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-black text-slate-950">{printPreview.title}</p>
              <button type="button" onClick={() => setPrintPreview(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-sm font-black text-slate-500">x</button>
            </div>
            <div className="max-h-[70dvh] overflow-auto bg-slate-50 px-4 py-4">
              {printPreview.type === 'bill' && printPreview.data ? <RestaurantBillPreview data={printPreview.data} /> : null}
              {printPreview.type === 'kot' && printPreview.data ? <RestaurantKotPreview data={printPreview.data} /> : null}
              {!printPreview.data ? (
                <pre className="mx-auto w-[58mm] whitespace-pre-wrap rounded bg-white p-3 font-mono text-[10px] leading-4 text-slate-950 shadow-inner">
                  {printPreview.content}
                </pre>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <Button type="button" variant="subtle" onClick={() => setPrintPreview(null)}>Close</Button>
              <Button type="button" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Settlement Manager Panel ── */}
      {settlementPanelOpen ? (
        <RestaurantSettlementPanel
          sessions={allSessions || []}
          pendingSettlements={pendingSettlements || []}
          onClose={() => setSettlementPanelOpen(false)}
          onApprove={approveSession}
          onReject={rejectSession}
          onLock={lockSession}
          onReopen={reopenSession}
          isOwner={Boolean(isOwner)}
          isManager={Boolean(isManager)}
        />
      ) : null}
      <ApplePaySuccess show={showApplePay} onDone={() => setShowApplePay(false)} />
    </>
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

function PanelField({ label, className = '', children }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function TogglePill({ label, checked, onChange }) {
  return (
    <label
      className={cn(
        'flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition',
        checked ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200',
      )}
    >
      <span className="truncate">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 shrink-0 accent-sky-500"
      />
    </label>
  )
}
