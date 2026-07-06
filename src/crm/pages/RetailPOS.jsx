import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineCheckCircle,
  HiOutlineBackspace,
  HiOutlineBanknotes,
  HiOutlineBolt,
  HiOutlineMagnifyingGlass,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineQueueList,
  HiOutlineShoppingBag,
  HiOutlineTrash,
} from 'react-icons/hi2'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import { useProducts } from '../hooks/useProducts.js'
import { usePosOrders } from '../hooks/usePosOrders.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useUser } from '../hooks/useUser.js'
import { workspaceCollectionPath } from '../lib/firestore.js'
import { db } from '../lib/firebase.js'
import { printHtmlDocument } from '../lib/printerService.js'
import { formatCurrency } from '../utils/format.js'
import { retailPosPromoCodes } from '../data/retailPosPromos.js'

const paymentMethods = ['Cash', 'Card', 'JazzCash', 'Easypaisa', 'UPI', 'Wallet']
const shortcuts = [
  ['F2', 'Search product'],
  ['F4', 'Promo'],
  ['F6', 'Pay bill'],
  ['F9', 'Print'],
  ['Esc', 'Clear cart'],
]

const fallbackProductImages = {
  beverages: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=360&q=70',
  snacks: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=360&q=70',
  biscuits: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=360&q=70',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=360&q=70',
  dairy: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=360&q=70',
  household: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=360&q=70',
  'personal care': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=360&q=70',
  general: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=360&q=70',
}

function todayShiftKey(workspaceId) {
  const date = new Date()
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `nexora.retailPos.shift.${workspaceId || 'local'}.${day}`
}

function loadPosShift(workspaceId) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(todayShiftKey(workspaceId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePosShift(workspaceId, shift) {
  if (typeof window === 'undefined') return null
  const clean = {
    id: shift?.id || `SHIFT-${Date.now()}`,
    openingCash: Math.max(0, numberValue(shift?.openingCash)),
    note: String(shift?.note || '').trim(),
    startedAt: shift?.startedAt || new Date().toISOString(),
  }
  window.localStorage.setItem(todayShiftKey(workspaceId), JSON.stringify(clean))
  return clean
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function nextOrderNumber() {
  const date = new Date()
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const tail = String(Date.now()).slice(-5)
  return `POS-${stamp}-${tail}`
}

function calculateTotals(cart, taxRateInput, promoDiscountInput = 0) {
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const promoDiscount = Math.min(Math.max(0, subtotal), Math.max(0, numberValue(promoDiscountInput)))
  const discount = promoDiscount
  const taxable = Math.max(0, subtotal - discount)
  const tax = (taxable * Math.max(0, numberValue(taxRateInput))) / 100
  const total = Math.max(0, taxable + tax)
  const cost = cart.reduce((sum, item) => sum + item.quantity * item.costPrice, 0)
  return { subtotal, lineDiscount: 0, orderDiscount: 0, promoDiscount, discount, tax, total, cost, profit: total - cost }
}

function productImage(product) {
  if (product.imageUrl) return product.imageUrl
  const category = String(product.category || 'general').toLowerCase()
  return fallbackProductImages[category] || fallbackProductImages.general
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function receiptLine(label, value) {
  const left = String(label || '').slice(0, 12)
  const right = String(value ?? '').slice(0, 18)
  return `${left.padEnd(12, ' ')}${right.padStart(20, ' ')}`
}

function buildRetailPosThermalText(order = {}) {
  const items = Array.isArray(order.items) ? order.items : []
  return [
    String(order.companyName || 'NEXORA SOLUTION').toUpperCase(),
    order.address || '',
    order.phone || '',
    '-'.repeat(32),
    'RETAIL POS RECEIPT',
    receiptLine('Order', order.orderNumber),
    receiptLine('Date', order.date),
    receiptLine('Customer', order.customer?.name || 'Walk-in'),
    receiptLine('Cashier', order.cashier || 'Cashier'),
    receiptLine('Payment', order.paymentMethod || 'Cash'),
    '-'.repeat(32),
    ...items.flatMap((item) => {
      const qty = Number(item.quantity || 1)
      const price = Number(item.price || 0)
      const total = Number(item.lineTotal || qty * price || 0)
      return [
        String(item.name || 'Item').slice(0, 32),
        receiptLine(`${qty} x ${formatCurrency(price)}`, formatCurrency(total)),
      ]
    }),
    '-'.repeat(32),
    receiptLine('Subtotal', formatCurrency(order.totals?.subtotal || 0)),
    receiptLine('Promo off', `-${formatCurrency(order.totals?.discount || 0)}`),
    order.promo?.code ? receiptLine('Promo', order.promo.code) : '',
    receiptLine('Tax', formatCurrency(order.totals?.tax || 0)),
    '='.repeat(32),
    receiptLine('TOTAL', formatCurrency(order.totals?.total || 0)),
    receiptLine('Paid', formatCurrency(order.paid || 0)),
    order.dueAmount > 0 ? receiptLine('Due', formatCurrency(order.dueAmount || 0)) : '',
    receiptLine('Change', formatCurrency(order.changeAmount || 0)),
    '-'.repeat(32),
    order.footer || 'Thank you',
    'Powered by Nexora Solution',
  ].filter(Boolean).join('\n')
}

export default function RetailPOSPage() {
  const { workspaceId, businessType, userDoc, firebaseUser, userId, isOwner, isAdmin, isStaff } = useUser()
  const { settings: businessSettings } = useBusinessSettings()
  const productsApi = useProducts({ limitCount: 200 })
  const ordersApi = usePosOrders({ limitCount: 8 })
  const customersApi = useCustomers({ limitCount: 50 })
  const searchRef = useRef(null)
  const promoRef = useRef(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoLabel, setPromoLabel] = useState('')
  const [taxRate, setTaxRate] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [message, setMessage] = useState('')
  const [successNotice, setSuccessNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false)
  const [promoPanelOpen, setPromoPanelOpen] = useState(false)
  const [shift, setShift] = useState(() => loadPosShift(workspaceId))
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [shiftDraft, setShiftDraft] = useState({ openingCash: '', note: '' })
  const [pendingPrint, setPendingPrint] = useState(false)
  const scannerBufferRef = useRef({ value: '', startedAt: 0, lastAt: 0 })
  const savingRef = useRef(false)
  const activePromoCodes = businessSettings?.retailPosPromos || retailPosPromoCodes
  const retailPosSettings = businessSettings?.retailPos || {}

  useEffect(() => {
    setShift(loadPosShift(workspaceId))
  }, [workspaceId])

  useEffect(() => {
    window.history.pushState({ nexoraPosTill: true }, '', window.location.href)
    function handleBackButton() {
      const leave = window.confirm('POS Billing is open. Going back can close this till screen. Open another page in a separate window/tab instead. Press OK only if you want to leave POS Billing.')
      if (!leave) {
        window.history.pushState({ nexoraPosTill: true }, '', window.location.href)
        return
      }
      window.removeEventListener('popstate', handleBackButton)
      window.history.back()
    }
    window.addEventListener('popstate', handleBackButton)
    return () => window.removeEventListener('popstate', handleBackButton)
  }, [])

  const products = useMemo(
    () => productsApi.products.filter((product) => product.status !== 'inactive' && product.productType !== 'service'),
    [productsApi.products],
  )
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((product) => product.category || 'General')))], [products])
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return products
      .filter((product) => category === 'All' || product.category === category)
      .filter((product) => !needle
        || product.name.toLowerCase().includes(needle)
        || product.sku.toLowerCase().includes(needle)
        || product.barcode.toLowerCase().includes(needle))
      .slice(0, 48)
  }, [category, products, query])
  const customerMatches = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase()
    if (!needle) return []
    return customersApi.customers
      .filter((customer) => [customer.name, customer.phone, customer.email].filter(Boolean).some((field) => String(field).toLowerCase().includes(needle)))
      .slice(0, 4)
  }, [customerSearch, customersApi.customers])
  const totals = useMemo(() => calculateTotals(cart, taxRate, promoDiscount), [cart, promoDiscount, taxRate])
  const changeAmount = Math.max(0, numberValue(paidAmount || totals.total) - totals.total)

  useEffect(() => {
    const defaultTax = numberValue(businessSettings?.defaultPosTaxRate)
    if (defaultTax > 0 && numberValue(taxRate) === 0) setTaxRate(String(defaultTax))
  }, [businessSettings?.defaultPosTaxRate, taxRate])

  useEffect(() => {
    const defaultMethod = retailPosSettings.defaultPaymentMethod || ''
    if (defaultMethod && paymentMethod === 'Cash') setPaymentMethod(defaultMethod)
  }, [paymentMethod, retailPosSettings.defaultPaymentMethod])

  useEffect(() => {
    if (!successNotice) return undefined
    const timer = window.setTimeout(() => setSuccessNotice(null), 2600)
    return () => window.clearTimeout(timer)
  }, [successNotice])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'F2') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'F4') {
        event.preventDefault()
        setPromoPanelOpen(true)
        window.setTimeout(() => promoRef.current?.focus(), 0)
      }
      if (event.key === 'F6') {
        event.preventDefault()
        submitOrder(false)
      }
      if (event.key === 'F9') {
        event.preventDefault()
        submitOrder(true)
      }
      if (event.key === 'Escape' && cart.length) {
        event.preventDefault()
        clearCart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cart, paidAmount, paymentMethod, taxRate, totals.total])

  const addProduct = useCallback((product) => {
    const stock = numberValue(product.stockQuantity)
    const existing = cart.find((item) => item.productId === product.id)
    const nextQty = (existing?.quantity || 0) + 1
    if (stock <= 0 || nextQty > stock) {
      setMessage(`${product.name} stock available nahi hai.`)
      return
    }
    setCart((current) => {
      if (existing) {
        return current.map((item) => item.productId === product.id ? { ...item, quantity: nextQty } : item)
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          category: product.category,
          imageUrl: product.imageUrl,
          price: numberValue(product.price),
          costPrice: numberValue(product.costPrice),
          discount: numberValue(product.discount),
          taxRate: numberValue(product.taxRate),
          stockQuantity: stock,
          quantity: 1,
        },
      ]
    })
    setMessage('')
  }, [cart])

  const addScannedCode = useCallback((rawCode) => {
    const code = String(rawCode || '').trim()
    const scanner = businessSettings?.barcodeScannerSettings || {}
    const minLength = Math.max(1, Number(scanner.minLength || 4))
    if (!code || code.length < minLength) return false
    const needle = code.toLowerCase()
    const product = products.find((item) => {
      const barcode = String(item.barcode || '').trim().toLowerCase()
      const sku = String(item.sku || '').trim().toLowerCase()
      return barcode === needle || sku === needle
    })
    if (!product) {
      setQuery(code)
      setMessage(`No product found for barcode/SKU: ${code}`)
      return false
    }
    addProduct(product)
    setQuery('')
    setMessage(`${product.name} scanned and added to cart.`)
    return true
  }, [addProduct, businessSettings?.barcodeScannerSettings, products])

  useEffect(() => {
    const scanner = businessSettings?.barcodeScannerSettings || {}
    if (scanner.enabled === false || scanner.mode === 'camera') return undefined
    const submitKey = scanner.submitKey || 'Enter'
    const timeoutMs = Math.max(200, Number(scanner.scanTimeoutMs || 700))

    function onScannerKeyDown(event) {
      const target = event.target
      const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable
      if (isEditable) return
      const now = Date.now()
      const buffer = scannerBufferRef.current
      if (event.key === submitKey) {
        const value = buffer.value
        scannerBufferRef.current = { value: '', startedAt: 0, lastAt: 0 }
        if (value && now - buffer.startedAt <= timeoutMs) {
          event.preventDefault()
          addScannedCode(value)
        }
        return
      }
      if (event.key.length !== 1) return
      const shouldReset = !buffer.lastAt || now - buffer.lastAt > 90
      scannerBufferRef.current = {
        value: shouldReset ? event.key : `${buffer.value}${event.key}`,
        startedAt: shouldReset ? now : buffer.startedAt || now,
        lastAt: now,
      }
    }

    window.addEventListener('keydown', onScannerKeyDown, true)
    return () => window.removeEventListener('keydown', onScannerKeyDown, true)
  }, [addScannedCode, businessSettings?.barcodeScannerSettings])

  function updateQty(productId, delta) {
    setCart((current) => current.flatMap((item) => {
      if (item.productId !== productId) return [item]
      const quantity = Math.min(item.stockQuantity, Math.max(0, item.quantity + delta))
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  function clearCart() {
    setCart([])
    setPromoCode('')
    setPromoDiscount(0)
    setPromoLabel('')
    setPaidAmount('')
    setMessage('')
  }

  function selectCustomer(customer) {
    if (!customer) return
    setSelectedCustomerId(customer.id)
    setCustomerName(customer.name || 'Walk-in Customer')
    setCustomerPhone(customer.phone || '')
    setCustomerSearch('')
    setMessage(`${customer.name || 'Customer'} selected.`)
  }

  async function addCustomerFromTill() {
    const name = customerName.trim()
    const phone = customerPhone.trim()
    if (!name || name.toLowerCase() === 'walk-in customer') {
      setMessage('Customer add karne ke liye name enter karein.')
      return
    }
    const emailSafePhone = phone.replace(/\D/g, '') || Date.now()
    const result = await customersApi.createCustomer({
      name,
      phone,
      email: `pos-${emailSafePhone}@nexora.local`,
      customerType: 'POS Customer',
      status: 'Active',
      notes: 'Created from POS Billing.',
    })
    if (result?.ok) {
      if (result.id) setSelectedCustomerId(result.id)
      setMessage(`${name} customer list mein add ho gaya.`)
      setCustomerSearch(name)
    } else {
      setMessage(result?.error || 'Customer add nahi ho saka.')
    }
  }

  function applyPromoCode() {
    const code = promoCode.trim().toUpperCase()
    const promo = activePromoCodes[code]
    if (!promo) {
      setPromoDiscount(0)
      setPromoLabel('')
      setMessage('Promo code valid nahi hai.')
      return
    }
    const base = Math.max(0, cart.reduce((sum, item) => sum + item.quantity * item.price, 0))
    const amount = promo.type === 'percent' ? (base * promo.value) / 100 : promo.value
    setPromoDiscount(Math.min(base, Math.round(amount)))
    setPromoLabel(promo.label)
    setPromoCode(code)
    setMessage(`${promo.label} applied.`)
  }

  async function submitOrder(shouldPrint = false, shiftOverride = null) {
    if (savingRef.current) return
    if (!cart.length) {
      setMessage('Cart empty hai. Pehle product add karein.')
      return
    }
    if (!workspaceId || !db) {
      setMessage('Secure Cloud Sync available nahi hai.')
      return
    }
    const activeShift = shiftOverride || shift || loadPosShift(workspaceId)
    if (!activeShift) {
      setPendingPrint(Boolean(shouldPrint))
      setShiftDraft({ openingCash: String(retailPosSettings.defaultOpeningCash || ''), note: retailPosSettings.cashDrawerName || '' })
      setShiftModalOpen(true)
      setMessage('Start till cash pehle set karein. Yeh sale/revenue mein add nahi hoga.')
      return
    }
    const paid = Math.max(0, numberValue(paidAmount || totals.total))
    const dueAmount = Math.max(0, totals.total - paid)
    if (dueAmount > 0 && !selectedCustomerId) {
      setCustomerPanelOpen(true)
      setMessage('Due sale ke liye saved customer select ya add karein. Walk-in customer par due save nahi hota.')
      return
    }
    savingRef.current = true
    setSaving(true)
    let unlockTimer = null
    if (typeof window !== 'undefined') {
      unlockTimer = window.setTimeout(() => {
        savingRef.current = false
        setSaving(false)
        setMessage('Order save zyada time le raha hai. Button unlock kar diya hai; order list check karein.')
      }, 8000)
    }
    const orderNumber = nextOrderNumber()
    const cartSnapshot = [...cart]
    const totalsSnapshot = { ...totals }
    const paidSnapshot = paid
    const changeSnapshot = changeAmount
    const dueSnapshot = dueAmount
    const customerSnapshot = {
      id: selectedCustomerId,
      name: customerName.trim() || 'Walk-in Customer',
      phone: customerPhone.trim(),
    }
    const promoSnapshot = {
      code: promoLabel ? promoCode.trim().toUpperCase() : '',
      label: promoLabel,
    }
    const orderItems = cartSnapshot.map((item) => ({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      quantity: item.quantity,
      price: item.price,
      costPrice: item.costPrice,
      discount: 0,
      lineTotal: item.quantity * item.price,
    }))
    clearCart()
    setCustomerName('Walk-in Customer')
    setCustomerPhone('')
    setSelectedCustomerId('')
    setCustomerSearch('')
    setMessage('')
    setSuccessNotice({ orderNumber, text: 'Saving order and syncing stock...' })
    try {
      const cashierName = userDoc?.displayName || userDoc?.fullName || userDoc?.name || firebaseUser?.displayName || firebaseUser?.email || 'Cashier'
      const cashierEmail = firebaseUser?.email || userDoc?.email || ''
      const ownerSale = Boolean(isOwner || isAdmin || userId === workspaceId || firebaseUser?.uid === workspaceId)
      const isStaffSale = Boolean(isStaff && !ownerSale)
      const cashierId = isStaffSale ? String(userDoc?.staffId || userId || firebaseUser?.uid || '') : ''
      const result = await ordersApi.createOrder({
        orderNumber,
        createdBy: userId || firebaseUser?.uid || workspaceId,
        customerName: customerSnapshot.name,
        customerPhone: customerSnapshot.phone,
        customerId: customerSnapshot.id,
        branch: 'Main Branch',
        branchId: retailPosSettings.branchId || '',
        registerId: activeShift.id,
        cashier: cashierName,
        cashierId,
        staffId: cashierId,
        cashierName,
        moduleKey: 'retail_pos',
        orderSource: 'pos_front_till',
        createdByName: cashierName,
        createdByEmail: cashierEmail,
        createdByRole: ownerSale ? 'owner' : userDoc?.role || '',
        createdByStaff: isStaffSale,
        staffTag: isStaffSale ? 'Sales Staff' : '',
        paymentMethod,
        items: orderItems,
        itemCount: cartSnapshot.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: totalsSnapshot.subtotal,
        discount: totalsSnapshot.discount,
        manualDiscount: totalsSnapshot.orderDiscount,
        promoCode: promoSnapshot.code,
        promoDiscount: totalsSnapshot.promoDiscount,
        tax: totalsSnapshot.tax,
        total: totalsSnapshot.total,
        cost: totalsSnapshot.cost,
        profit: totalsSnapshot.profit,
        paidAmount: paidSnapshot,
        changeAmount: changeSnapshot,
        dueAmount: dueSnapshot,
        paymentStatus: dueSnapshot > 0 ? 'partial' : 'paid',
        queueStatus: 'queued',
        shiftId: activeShift.id,
        shiftOpeningCash: Number(activeShift.openingCash || 0),
        shiftStartedAt: activeShift.startedAt,
      })
      if (!result?.ok) {
        throw new Error(result?.error || 'POS order save nahi ho saka.')
      }
      if (unlockTimer) window.clearTimeout(unlockTimer)
      savingRef.current = false
      setSaving(false)

      const batch = writeBatch(db)
      const transactionCollection = collection(db, workspaceCollectionPath(workspaceId, 'inventoryTransactions'))
      const queueCollection = collection(db, workspaceCollectionPath(workspaceId, 'posQueueJobs'))
      if (customerSnapshot.id) {
        const existingCustomer = customersApi.customers.find((customer) => customer.id === customerSnapshot.id) || {}
        const customerRef = doc(db, workspaceCollectionPath(workspaceId, 'customers'), customerSnapshot.id)
        batch.update(customerRef, {
          walletDue: Math.max(0, numberValue(existingCustomer.walletDue) + dueSnapshot),
          walletCredit: Math.max(0, numberValue(existingCustomer.walletCredit)),
          lifetimeSpend: numberValue(existingCustomer.lifetimeSpend) + totalsSnapshot.total,
          posOrdersCount: numberValue(existingCustomer.posOrdersCount) + 1,
          lastPosOrderAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      cartSnapshot.forEach((item) => {
        const newStock = Math.max(0, item.stockQuantity - item.quantity)
        const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), item.productId)
        batch.update(productRef, {
          stockQuantity: newStock,
          stockHistory: [
            ...(products.find((product) => product.id === item.productId)?.stockHistory || []),
            {
              type: 'sale',
              quantity: item.quantity,
              previousQuantity: item.stockQuantity,
              newQuantity: newStock,
              delta: -item.quantity,
              note: `POS sale ${orderNumber}`,
              createdAt: new Date().toISOString(),
              createdBy: userId || firebaseUser?.uid || workspaceId,
            },
          ],
          ownerId: workspaceId,
          userId: workspaceId,
          workspaceId,
          businessType,
          updatedAt: serverTimestamp(),
        })
        batch.set(doc(transactionCollection), {
          type: 'sale',
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          delta: -item.quantity,
          previousQuantity: item.stockQuantity,
          newQuantity: newStock,
          unitCost: item.costPrice,
          totalCost: item.costPrice * item.quantity,
          reference: orderNumber,
          note: 'POS billing sale',
          ownerId: workspaceId,
          userId: workspaceId,
          workspaceId,
          businessType,
          createdBy: userId || workspaceId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
      batch.set(doc(queueCollection), {
        orderId: result.id || '',
        orderNumber,
        cashierId,
        staffId: cashierId,
        cashierName,
        moduleKey: 'retail_pos',
        orderSource: 'pos_front_till',
        registerId: activeShift.id,
        branchId: retailPosSettings.branchId || '',
        task: shouldPrint ? 'receipt_print_and_stock_sync' : 'stock_sync',
        status: 'queued',
        priority: 'normal',
        total: totalsSnapshot.total,
        itemCount: orderItems.length,
        ownerId: workspaceId,
        userId: workspaceId,
        workspaceId,
        businessType,
        createdBy: userId || workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setSuccessNotice({
        orderNumber,
        text: 'Order saved. Till ready for next bill.',
      })
      Promise.resolve().then(async () => {
        let stockSyncOk = true
        let stockSyncError = ''
        try {
          await batch.commit()
        } catch (syncError) {
          stockSyncOk = false
          stockSyncError = syncError?.message || 'Stock sync permission pending.'
          console.warn('[Retail POS] order saved but stock sync failed', {
            orderNumber,
            code: syncError?.code || '',
            message: syncError?.message || String(syncError || ''),
            workspaceId,
            userId: userId || firebaseUser?.uid || '',
          })
        }
        if (shouldPrint) {
          const printed = await printReceipt({
            orderNumber,
            items: orderItems,
            totals: totalsSnapshot,
            paid: paidSnapshot,
            changeAmount: changeSnapshot,
            customer: customerSnapshot,
            cashier: cashierName,
            paymentMethod,
            promo: promoSnapshot,
            dueAmount: dueSnapshot,
          })
          if (!printed?.ok) setMessage(printed?.error || 'Allow pop-ups to print 58mm receipt.')
        }
        if (!stockSyncOk) setMessage(`Order saved, lekin stock sync pending hai: ${stockSyncError}`)
      })
    } catch (error) {
      setCart(cartSnapshot)
      setCustomerName(customerSnapshot.name)
      setCustomerPhone(customerSnapshot.phone)
      setSelectedCustomerId(customerSnapshot.id)
      setPromoCode(promoSnapshot.code)
      setPromoLabel(promoSnapshot.label)
      setPromoDiscount(totalsSnapshot.promoDiscount)
      setSuccessNotice(null)
      setMessage(error?.message || 'POS order save nahi ho saka.')
    } finally {
      if (unlockTimer) window.clearTimeout(unlockTimer)
      savingRef.current = false
      setSaving(false)
    }
  }

  function startShiftAndContinue(event) {
    event.preventDefault()
    const openingCash = numberValue(shiftDraft.openingCash)
    const nextShift = savePosShift(workspaceId, {
      openingCash,
      note: shiftDraft.note,
    })
    setShift(nextShift)
    setShiftModalOpen(false)
    setMessage(`Till started with patti cash ${formatCurrency(openingCash)}. Sale calculation mein yeh add nahi hoga.`)
    window.setTimeout(() => submitOrder(pendingPrint, nextShift), 0)
  }

  async function printReceipt(order) {
    const companyName = businessSettings?.businessName || userDoc?.company || userDoc?.workspaceName || 'NEXORA SOLUTION'
    const phone = businessSettings?.phone || userDoc?.phone || ''
    const address = businessSettings?.address || ''
    const footer = businessSettings?.receiptFooter || 'Thank you for shopping with us'
    const date = new Date().toLocaleString()
    const itemRows = order.items.map((item) => {
      const qty = Number(item.quantity || 1)
      const price = Number(item.price || 0)
      const total = Number(item.lineTotal || price * qty || 0)
      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.name || 'Item')}</strong>
            <small>${escapeHtml(item.sku || item.barcode || '')}</small>
          </td>
          <td>${qty}</td>
          <td>${formatCurrency(price)}</td>
          <td>${formatCurrency(total)}</td>
        </tr>`
    }).join('')
    const html = `<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(order.orderNumber)} Receipt</title>
          <style>
            @page { size: 58mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #fff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
            .receipt { width: 52mm; margin: 0 auto; padding: 2mm 0; }
            .brand { text-align: center; padding-bottom: 8px; border-bottom: 1px dashed #94a3b8; }
            .logo { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: #020617; color: #38bdf8; font-weight: 900; margin-bottom: 4px; }
            h1 { margin: 0; font-size: 14px; letter-spacing: 0.06em; }
            .muted { margin: 2px 0 0; color: #64748b; font-size: 9px; line-height: 1.35; }
            .pill { display: inline-block; margin-top: 6px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 3px 7px; font-size: 9px; font-weight: 800; }
            .meta { padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 10px; }
            .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9px; }
            th { color: #475569; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e2e8f0; padding: 4px 0; }
            td { vertical-align: top; border-bottom: 1px dotted #e2e8f0; padding: 5px 0; }
            td:nth-child(2), td:nth-child(3), td:nth-child(4), th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
            td:first-child { width: 44%; }
            small { display: block; color: #94a3b8; font-size: 8px; margin-top: 1px; word-break: break-all; }
            .totals { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #94a3b8; font-size: 10px; }
            .total { margin-top: 5px; padding-top: 5px; border-top: 1px solid #0f172a; font-size: 13px; font-weight: 900; }
            .footer { margin-top: 10px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 9px; color: #475569; }
            @media print { body { width: 58mm; } .receipt { width: 52mm; } }
          </style>
        </head>
        <body>
          <main class="receipt">
            <section class="brand">
              <div class="logo">N</div>
              <h1>${escapeHtml(companyName)}</h1>
              ${address ? `<p class="muted">${escapeHtml(address)}</p>` : ''}
              ${phone ? `<p class="muted">${escapeHtml(phone)}</p>` : ''}
              <span class="pill">Retail POS Receipt</span>
            </section>
            <section class="meta">
              <div class="row"><span>Order</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
              <div class="row"><span>Date</span><strong>${escapeHtml(date)}</strong></div>
              <div class="row"><span>Customer</span><strong>${escapeHtml(order.customer?.name || 'Walk-in Customer')}</strong></div>
              <div class="row"><span>Cashier</span><strong>${escapeHtml(order.cashier || 'Cashier')}</strong></div>
              <div class="row"><span>Payment</span><strong>${escapeHtml(order.paymentMethod || 'Cash')}</strong></div>
            </section>
            <table>
              <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
            <section class="totals">
              <div class="row"><span>Subtotal</span><strong>${formatCurrency(order.totals.subtotal)}</strong></div>
              <div class="row"><span>Promo discount</span><strong>- ${formatCurrency(order.totals.discount)}</strong></div>
              ${order.promo?.code ? `<div class="row"><span>Promo</span><strong>${escapeHtml(order.promo.code)}</strong></div>` : ''}
              <div class="row"><span>Tax</span><strong>${formatCurrency(order.totals.tax)}</strong></div>
              <div class="row total"><span>Total</span><strong>${formatCurrency(order.totals.total)}</strong></div>
              <div class="row"><span>Paid</span><strong>${formatCurrency(order.paid)}</strong></div>
              ${order.dueAmount > 0 ? `<div class="row"><span>Due</span><strong>${formatCurrency(order.dueAmount)}</strong></div>` : ''}
              <div class="row"><span>Change</span><strong>${formatCurrency(order.changeAmount)}</strong></div>
            </section>
            <section class="footer">
              <strong>${escapeHtml(footer)}</strong>
              <p class="muted">Powered by Nexora Solution</p>
            </section>
          </main>
        </body>
      </html>`
    const thermalText = buildRetailPosThermalText({ ...order, companyName, phone, address, footer, date })
    return printHtmlDocument({ html, thermalText, settings: businessSettings, paperSize: '58mm', fallbackOptions: { width: 300, height: 820 } })
  }

  return (
    <motion.div className="min-w-0 space-y-4 xl:h-dvh xl:overflow-hidden xl:p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {successNotice ? (
        <motion.div
          className="fixed left-1/2 top-5 z-[80] w-[min(92vw,460px)] -translate-x-1/2 rounded-3xl border border-emerald-200 bg-white/95 p-4 shadow-[0_24px_70px_-36px_rgba(16,185,129,0.8)]"
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3">
            <motion.span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
              initial={{ rotate: -18, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 420, damping: 18 }}
            >
              <HiOutlineCheckCircle className="h-7 w-7" />
            </motion.span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{successNotice.text}</p>
              <p className="mt-0.5 truncate text-xs font-bold text-emerald-700">{successNotice.orderNumber}</p>
            </div>
            <Badge variant="success" className="ml-auto">Queued</Badge>
          </div>
        </motion.div>
      ) : null}
      {shiftModalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 px-4 py-6">
          <form onSubmit={startShiftAndContinue} className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <HiOutlineBanknotes className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Start POS Till</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Opening / Patti Cash</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  Enter drawer cash before first order. This stays separate from today sale/revenue.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Opening cash
                <Input className="mt-1" type="number" min="0" value={shiftDraft.openingCash} onChange={(event) => setShiftDraft((draft) => ({ ...draft, openingCash: event.target.value }))} placeholder="Example: 5000" autoFocus />
              </label>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Note optional
                <Input className="mt-1" value={shiftDraft.note} onChange={(event) => setShiftDraft((draft) => ({ ...draft, note: event.target.value }))} placeholder="Cashier / counter note" />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="subtle" className="rounded-2xl" onClick={() => setShiftModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-2xl">
                <HiOutlineBanknotes className="h-4 w-4" /> Start Till
              </Button>
            </div>
          </form>
        </div>
      ) : null}
      <section className="grid gap-3 xl:h-full xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_500px]">
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">Retail / POS</Badge>
                  <Badge variant="success"><HiOutlineQueueList className="h-3.5 w-3.5" /> Queue linked</Badge>
                  <Badge variant={businessSettings?.barcodeScannerSettings?.enabled === false ? 'warning' : 'success'}>Scanner {businessSettings?.barcodeScannerSettings?.enabled === false ? 'off' : 'ready'}</Badge>
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Front Till Billing</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">Fast billing, stock sync, and POS orders separate from invoices.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {shortcuts.map(([key, label]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-black text-slate-950">{key}</span>
                    <span className="ml-1 text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchRef}
                  className="h-12 pl-10"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    const scanner = businessSettings?.barcodeScannerSettings || {}
                    if (event.key === (scanner.submitKey || 'Enter') && addScannedCode(query)) {
                      event.preventDefault()
                    }
                  }}
                  placeholder="Search product, SKU, barcode..."
                />
              </div>
              <Select className="h-12 lg:max-w-56" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </Select>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={() => setViewMode('grid')} className={`rounded-lg px-3 py-2 text-xs font-black ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Grid</button>
                <button type="button" onClick={() => setViewMode('list')} className={`rounded-lg px-3 py-2 text-xs font-black ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>List</button>
              </div>
            </div>
          </Card>

          <div className={`${viewMode === 'grid' ? 'grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'space-y-2'} min-h-0 flex-1 overflow-y-auto pr-1`}>
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addProduct(product)}
                className={`group min-w-0 rounded-[1.2rem] border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md ${viewMode === 'list' ? 'flex items-center gap-3' : ''}`}
              >
                <img src={productImage(product)} alt="" className={`${viewMode === 'list' ? 'h-14 w-16' : 'h-28 w-full'} rounded-xl object-cover bg-slate-50`} />
                <div className="mt-3 min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-black text-slate-950">{product.name}</p>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><HiOutlinePlus className="h-4 w-4" /></span>
                  </div>
                  <p className="mt-1 text-sm font-black text-blue-700">{formatCurrency(product.price)}</p>
                  <p className={`mt-1 text-xs font-semibold ${product.stockQuantity <= product.minStockAlert ? 'text-rose-600' : 'text-slate-500'}`}>
                    Stock: {product.stockQuantity} {product.barcode ? `• ${product.barcode}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-3 xl:h-full xl:overflow-hidden xl:pr-1">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border-slate-200/80 bg-white p-4">
            <div className="shrink-0 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">Current Cart</p>
                <p className="text-xs font-semibold text-slate-500">{cart.length} products · {cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
              </div>
              <button type="button" onClick={clearCart} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600"><HiOutlineTrash className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex gap-3">
                    <img src={productImage(item)} alt="" className="h-12 w-12 rounded-xl object-cover bg-white" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{formatCurrency(item.price)} each</p>
                    </div>
                    <button type="button" onClick={() => updateQty(item.productId, -item.quantity)} className="text-slate-400 hover:text-rose-600"><HiOutlineBackspace className="h-5 w-5" /></button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                      <button type="button" onClick={() => updateQty(item.productId, -1)} className="p-2"><HiOutlineMinus className="h-4 w-4" /></button>
                      <span className="min-w-9 text-center text-sm font-black">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.productId, 1)} className="p-2"><HiOutlinePlus className="h-4 w-4" /></button>
                    </div>
                    <p className="text-sm font-black text-blue-700">{formatCurrency(item.quantity * item.price)}</p>
                  </div>
                </div>
              ))}
              {!cart.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                  <HiOutlineShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-500">Cart empty hai</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="flex max-h-[54vh] shrink-0 flex-col overflow-hidden rounded-[1.4rem] border-slate-200/80 bg-white shadow-[0_-14px_40px_-34px_rgba(15,23,42,0.6)]">
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Billing Summary</p>
                  <p className="text-xs font-semibold text-slate-500">{customerName || 'Walk-in Customer'} · {formatCurrency(totals.total)}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge variant="info">{paymentMethod}</Badge>
                  {shift ? <Badge variant="success">Patti {formatCurrency(shift.openingCash || 0)}</Badge> : <Badge variant="warning">Till not started</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerPanelOpen((open) => !open)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:bg-slate-100"
                >
                  Customer <span className="float-right">{customerPanelOpen ? '−' : '+'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoPanelOpen((open) => !open)}
                  className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-left text-xs font-black text-blue-700 transition hover:bg-blue-100"
                >
                  Tax & Promo <span className="float-right">{promoPanelOpen ? '−' : '+'}</span>
                </button>
              </div>

              {customerPanelOpen ? (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName('Walk-in Customer')
                      setCustomerPhone('')
                      setSelectedCustomerId('')
                      setCustomerSearch('')
                    }}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200"
                  >
                    Walk-in Customer
                  </button>
                  {selectedCustomerId ? <Badge variant="success">Customer selected</Badge> : <Badge variant="warning">Walk-in</Badge>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" />
                  <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone optional" />
                  <div className="relative sm:col-span-2">
                    <Input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search saved customer..." />
                    {customerMatches.length ? (
                      <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        {customerMatches.map((customer) => (
                          <button key={customer.id} type="button" onClick={() => selectCustomer(customer)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50">
                            <span className="min-w-0 truncate">{customer.name}</span>
                            <span className="shrink-0 text-slate-400">{customer.phone || customer.email || 'Saved'}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button variant="subtle" className="h-10 rounded-xl sm:col-span-2" type="button" onClick={addCustomerFromTill}>
                    <HiOutlinePlus className="h-4 w-4" /> Add customer
                  </Button>
                </div>
              </div>
              ) : null}

              {promoPanelOpen ? (
              <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/45 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Tax & Promo</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input type="number" min="0" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} placeholder="Tax %" />
                  <Input ref={promoRef} value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="Promo code" />
                  <Button variant="subtle" className="h-10 rounded-xl border-blue-200 text-blue-700" type="button" onClick={applyPromoCode}>
                    Apply
                  </Button>
                </div>
                {promoLabel ? <p className="mt-2 text-xs font-bold text-blue-700">{promoLabel} · {formatCurrency(totals.promoDiscount)} off</p> : null}
              </div>
              ) : null}

              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
                <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                </Select>
                <Input type="number" min="0" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} placeholder={`Paid ${Math.round(totals.total)}`} />
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
                <Row label="Promo discount" value={`- ${formatCurrency(totals.discount)}`} tone="text-emerald-600" />
                <Row label="Tax" value={formatCurrency(totals.tax)} />
                <div className="border-t border-slate-200 pt-1.5" />
                <Row label="Total" value={formatCurrency(totals.total)} strong />
                <Row label="Due" value={formatCurrency(Math.max(0, totals.total - numberValue(paidAmount || totals.total)))} tone="text-rose-600" />
                <Row label="Change" value={formatCurrency(changeAmount)} tone="text-blue-700" />
              </div>
              {message ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{message}</p> : null}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-18px_42px_-30px_rgba(15,23,42,0.75)] backdrop-blur">
              <Button disabled={saving} onClick={() => submitOrder(true)} className="h-12 bg-gradient-to-r from-blue-700 to-violet-700">
                <HiOutlinePrinter className="h-5 w-5" />
                Pay & Print
              </Button>
              <Button disabled={saving} variant="subtle" onClick={() => submitOrder(false)} className="h-12 border-blue-200 text-blue-700">
                <HiOutlineBolt className="h-5 w-5" />
                Pay
              </Button>
            </div>
          </Card>

        </aside>
      </section>
    </motion.div>
  )
}

function Row({ label, value, strong, tone = 'text-slate-700' }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className={`min-w-0 truncate ${strong ? 'text-base font-black text-slate-950' : 'text-slate-500'}`}>{label}</span>
      <span className={`shrink-0 text-right ${strong ? 'text-lg font-black text-blue-700' : `font-bold ${tone}`}`}>{value}</span>
    </div>
  )
}
