import { useEffect, useMemo, useState } from 'react'
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
  HiOutlineMagnifyingGlass,
  HiOutlineMinus,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineReceiptPercent,
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
import { enqueueBackgroundJob } from '../lib/backgroundJobs.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import { directPrinterAvailable, printThermalText } from '../lib/printerService.js'

const initialCart = []

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

const restaurantTablesStorageKey = 'nexora.restaurant.tables.v1'
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
    const stored = window.localStorage.getItem(restaurantTablesStorageKey)
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
    const stored = window.localStorage.getItem(restaurantTablesStorageKey)
    const floors = stored ? JSON.parse(stored) : []
    return Array.isArray(floors) ? floors : []
  } catch {
    return []
  }
}

function saveRestaurantFloors(floors) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(restaurantTablesStorageKey, JSON.stringify(Array.isArray(floors) ? floors : []))
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

function releaseRestaurantTableOrder(tableId) {
  if (!tableId) return
  const floors = loadRestaurantFloors()
  const nextFloors = floors.map((floor) => ({
    ...floor,
    tables: Array.isArray(floor?.tables)
      ? floor.tables
              .filter((table) => !(table?.id === tableId && (table?.temporaryOutside || isOutsideTable(table?.id))))
          .map((table) => (
            table?.id === tableId
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
          ))
      : [],
  }))
  saveRestaurantFloors(nextFloors)
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
        <img src={imageSrc} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-500">
          <CategoryIcon className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
    </div>
  )
}

export default function RestaurantOrdersPage() {
  const location = useLocation()
  const { settings } = useBusinessSettings()
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
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
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({ method: 'Cash', amount: '', note: '' })
  const [orderNumber, setOrderNumber] = useState(() => getNextRestaurantOrderNumber())
  const [ordersVersion, setOrdersVersion] = useState(0)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [menuItems] = useState(() => [...loadRestaurantMenuItems(), ...ordersPageExtraMenuItems])
  const [menuCategories] = useState(() => loadRestaurantMenuCategories())
  const [tableOptions] = useState(() => loadRestaurantTableOptions())

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

  const cartRows = useMemo(
    () =>
      cart.map((row) => {
        const item = menuItems.find((menuItem) => menuItem.id === row.itemId)
        return { ...row, item, lineTotal: finalItemPrice(item) * row.qty }
      }).filter((row) => row.item),
    [cart, menuItems],
  )

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
  const canCancelCurrentOrder = Boolean(
    currentSavedOrder &&
    String(currentSavedOrder.orderStatus || '').toLowerCase() !== 'cancelled',
  )
  const paidAmount = quickBill.paymentMethod === 'Due' ? 0 : Math.max(0, Number(quickBill.paidAmount || 0))
  const effectivePaidAmount = quickBill.paidAmount === '' && quickBill.paymentMethod !== 'Due' ? total : paidAmount
  const dueAmount = Math.max(0, total - effectivePaidAmount)
  const changeAmount = Math.max(0, effectivePaidAmount - total)
  const paymentDueForOrder = Math.max(0, total - Math.min(effectivePaidAmount, total))

  function resolvedOrderTable() {
    if (quickBill.orderType !== 'Dine-in' && !isOutsideTable(quickBill.tableNumber)) return ''
    return quickBill.tableNumber || getOutsideTableId(orderNumber, quickBill.outsideTableName)
  }

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
    return true
  }

  function saveOrderRecord(orderStatus = 'served') {
    const paymentStatus = dueAmount ? (effectivePaidAmount > 0 ? 'partial' : 'due') : 'paid'
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
        releaseRestaurantTableOrder(orderPayload.table)
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
        releaseRestaurantTableOrder(context.table)
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
  }

  function quickPaidBill() {
    if (!hasRequiredTable()) return
    const paymentMethod = quickBill.paymentMethod === 'Due' ? 'Cash' : quickBill.paymentMethod
    const context = {
      ...billContext(),
      paidAmount: total,
      paymentMethod,
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
      releaseRestaurantTableOrder(context.table)
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
    saveOrderRecord('pending')
    prepareNextOrderAfterSave()
    setFlowMessage('KOT saved for kitchen. Ready for next order.')
    setBillingActionStatus({ type: 'kot', status: 'success', message: 'KOT saved. New order ready' })
  }

  async function savePrintBill() {
    if (!hasRequiredTable()) return
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
    }
  }

  async function savePrintKot() {
    if (!hasRequiredTable()) return
    setBillingActionStatus({ type: 'kot', status: 'loading', message: 'Queueing KOT...' })
    try {
      const context = billContext()
      queueRestaurantJob('restaurant.print', 'Restaurant KOT print job', { ...context, printType: 'kot' }, { total: 1, priority: 'high' })
      if (quickBill.printKot) {
        sendRestaurantThermal(buildKotPrintTemplate(context)).then((printed) => {
          if (!printed) setPrintPreview({ title: '58mm KOT Preview', type: 'kot', data: buildKotPrintData(context) })
        })
      }
      saveOrderRecord('pending')
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
    if (currentSavedOrder.table) releaseRestaurantTableOrder(currentSavedOrder.table)
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

  function addItem(itemId) {
    setCart((current) => {
      const exists = current.find((row) => row.itemId === itemId)
      if (exists) return current.map((row) => (row.itemId === itemId ? { ...row, qty: row.qty + 1 } : row))
      return [...current, { itemId, qty: 1, note: 'Kitchen note' }]
    })
  }

  function adjustQty(itemId, delta) {
    setCart((current) =>
      current
        .map((row) => (row.itemId === itemId ? { ...row, qty: Math.max(0, row.qty + delta) } : row))
        .filter((row) => row.qty > 0),
    )
  }

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
            </div>
            <Button type="button" className="h-9 w-full px-3 text-xs lg:w-auto" onClick={newOrder}>
              <HiOutlinePlus className="h-4 w-4" />
              New Order
            </Button>
          </div>

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
                    placeholder={`No table? custom name or auto ${getOutsideTableId(orderNumber)}`}
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
                    Use {quickBill.outsideTableName.trim() || getOutsideTableId(orderNumber)}
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
            {visibleItems.map((item) => {
              const inCart = cartRows.find((row) => row.itemId === item.id)
              return (
                <div key={item.id} className="min-w-0 self-start rounded-[0.95rem] border border-slate-200 bg-white p-2 shadow-sm">
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
                      {inCart ? (
                        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5">
                          <button type="button" onClick={() => adjustQty(item.id, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-white text-slate-700 shadow-sm">
                            <HiOutlineMinus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-slate-950">{inCart.qty}</span>
                          <button type="button" onClick={() => adjustQty(item.id, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-white">
                            <HiOutlinePlus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button type="button" className="h-7 px-2.5 py-1 text-xs" onClick={() => addItem(item.id)}>
                          <HiOutlinePlus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
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
