import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { HiOutlineShoppingBag, HiOutlineMapPin, HiOutlineClock, HiOutlineXMark, HiOutlineMinus, HiOutlinePlus, HiOutlinePhone } from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Toast from '../components/ui/Toast.jsx'
import { loadRestaurantMenuItems, loadRestaurantMenuCategories } from '../data/restaurantMenu.js'
import { loadRestaurantOrders, getNextRestaurantOrderNumber, saveRestaurantOrders } from '../data/restaurantOrders.js'
import { calculateRestaurantBill, formatRestaurantCurrency, safeMoney } from '../lib/restaurantPosCalculations.js'

// Inline replacements — was imported from deleted deliveryCalculations.js
const ORDER_TYPES = [
  { id: 'delivery',  label: 'Delivery' },
  { id: 'pickup',    label: 'Pickup' },
  { id: 'dine_in',   label: 'Dine-In Preorder' },
  { id: 'scheduled', label: 'Scheduled' },
]
const calculateDeliveryCharge = () => ({ charge: 0 })

export default function OnlineOrderingPortal() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const wsId = searchParams.get('ws')
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('All Menu')
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState('delivery')
  const [showCart, setShowCart] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', instructions: '' })
  const [submitting, setSubmitting] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setMenuItems(loadRestaurantMenuItems().filter((item) => item.status !== 'hidden' && item.availability !== false))
    setCategories(loadRestaurantMenuCategories())
  }, [])

  const filtered = useMemo(() => {
    if (activeCategory === 'All Menu') return menuItems
    return menuItems.filter((item) => item.category === activeCategory || (Array.isArray(item.categories) && item.categories.includes(activeCategory)))
  }, [menuItems, activeCategory])

  const bill = useMemo(() => calculateRestaurantBill(cart.map((c) => ({ item: c, qty: c.qty }))), [cart])
  const deliveryCharge = useMemo(() => orderType === 'delivery' ? calculateDeliveryCharge({ subtotal: bill.total }) : { charge: 0 }, [orderType, bill.total])

  function addToCart(item) {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === item.id)
      if (exists) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function updateQty(itemId, delta) {
    setCart((prev) => prev.map((c) => {
      if (c.id !== itemId) return c
      const next = c.qty + delta
      return next <= 0 ? null : { ...c, qty: next }
    }).filter(Boolean))
  }

  function removeItem(itemId) {
    setCart((prev) => prev.filter((c) => c.id !== itemId))
  }

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const totalWithDelivery = bill.total + deliveryCharge.charge

  async function placeOrder() {
    if (!customerInfo.name.trim()) { setToast({ tone: 'error', message: 'Name is required' }); setTimeout(() => setToast(null), 2000); return }
    if (!customerInfo.phone.trim()) { setToast({ tone: 'error', message: 'Phone is required' }); setTimeout(() => setToast(null), 2000); return }
    if (orderType === 'delivery' && !customerInfo.address.trim()) { setToast({ tone: 'error', message: 'Delivery address is required' }); setTimeout(() => setToast(null), 2000); return }
    setSubmitting(true)
    const orderNumber = getNextRestaurantOrderNumber()
    const orders = loadRestaurantOrders()
    const newOrder = {
      orderNumber,
      orderType: orderType === 'dine_in' ? 'Dine-in' : orderType === 'pickup' ? 'Takeaway' : 'Delivery',
      customer: customerInfo.name.trim(),
      customerId: `online-${Date.now()}`,
      phone: customerInfo.phone.trim(),
      deliveryAddress: customerInfo.address.trim(),
      notes: customerInfo.instructions.trim(),
      cartRows: cart.map((c) => ({ item: c, qty: c.qty })),
      totals: bill,
      total: totalWithDelivery,
      paidAmount: 0,
      paymentMethod: 'Cash',
      orderStatus: 'pending',
      paymentStatus: 'due',
      source: 'online',
      createdAt: new Date().toISOString(),
    }
    saveRestaurantOrders([newOrder, ...orders])
    setPlacedOrder({ orderNumber, total: totalWithDelivery, customerInfo })
    setSubmitting(false)
    setCart([])
  }

  if (placedOrder) {
    return (
      <motion.div initial={{ opacity: 0 }} className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
            <HiOutlineShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-950">Order Placed!</h1>
          <p className="mt-2 text-lg font-bold text-emerald-700">{placedOrder.orderNumber}</p>
          <p className="mt-1 text-sm text-slate-600">Total: {formatRestaurantCurrency(placedOrder.total)}</p>
          <p className="mt-4 text-sm text-slate-600">We'll start preparing your order shortly.</p>
          <p className="mt-1 text-xs text-slate-500">{placedOrder.customerInfo.name} · {placedOrder.customerInfo.phone}</p>
          <Button className="mt-6 rounded-2xl" onClick={() => setPlacedOrder(null)}>Order Again</Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} className="mx-auto max-w-4xl">
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-4 py-8 text-white sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">{slug?.replace(/-/g, ' ') || 'Restaurant'}</h1>
            <p className="mt-1 text-sm text-slate-300">Order online for delivery or pickup</p>
          </div>
          <button onClick={() => setShowCart(!showCart)} className="relative rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
            <HiOutlineShoppingBag className="h-6 w-6" />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold">{cartCount}</span>}
          </button>
        </div>
        {wsId && <p className="mt-2 text-xs text-slate-400">Workspace: {wsId}</p>}
      </div>

      <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-[1fr_380px]">
        {/* Menu */}
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${activeCategory === cat ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((item) => (
              <div key={item.id || item.name} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-950">{item.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{item.category}</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{formatRestaurantCurrency(item.price)}</p>
                  </div>
                  <button onClick={() => addToCart(item)} className="shrink-0 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">Add</button>
                </div>
                {item.description && <p className="mt-2 text-xs text-slate-500">{item.description}</p>}
                {item.preparationTime > 0 && <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><HiOutlineClock className="h-3 w-3" /> {item.preparationTime} min</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Cart / Checkout Sidebar */}
        <div className={`space-y-4 ${showCart ? '' : 'hidden lg:block'}`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">Your Order</h2>
            {cart.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Your cart is empty. Add items from the menu.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-950 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{formatRestaurantCurrency(item.price * item.qty)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><HiOutlineMinus className="h-3 w-3" /></button>
                      <span className="w-6 text-center text-sm font-bold text-slate-950">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><HiOutlinePlus className="h-3 w-3" /></button>
                      <button onClick={() => removeItem(item.id)} className="ml-1 text-rose-500 hover:text-rose-700"><HiOutlineXMark className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatRestaurantCurrency(bill.subtotal)}</span></div>
                  {bill.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-semibold text-emerald-600">-{formatRestaurantCurrency(bill.discount)}</span></div>}
                  {deliveryCharge.charge > 0 && <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="font-semibold">{formatRestaurantCurrency(deliveryCharge.charge)}</span></div>}
                  {deliveryCharge.freeDelivery && <div className="flex justify-between"><span className="text-emerald-600 font-semibold">Free Delivery</span><span className="text-emerald-600 font-semibold">-{formatRestaurantCurrency(deliveryCharge.charge)}</span></div>}
                  <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-950">Total</span><span className="text-lg font-black text-slate-950">{formatRestaurantCurrency(totalWithDelivery)}</span></div>
                </div>

                {/* Order Type */}
                <div className="flex gap-2">
                  {ORDER_TYPES.filter((t) => t.id !== 'dine_in' || true).map((t) => (
                    <button key={t.id} onClick={() => setOrderType(t.id)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${orderType === t.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{t.label}</button>
                  ))}
                </div>

                {/* Customer Info */}
                <div className="space-y-2">
                  <input value={customerInfo.name} onChange={(e) => setCustomerInfo((p) => ({ ...p, name: e.target.value }))} placeholder="Your name *" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300" />
                  <input value={customerInfo.phone} onChange={(e) => setCustomerInfo((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number *" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300" />
                  {orderType === 'delivery' && (
                    <input value={customerInfo.address} onChange={(e) => setCustomerInfo((p) => ({ ...p, address: e.target.value }))} placeholder="Delivery address *" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300" />
                  )}
                  <textarea value={customerInfo.instructions} onChange={(e) => setCustomerInfo((p) => ({ ...p, instructions: e.target.value }))} placeholder="Delivery instructions (optional)" className="h-16 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-300 resize-none" />
                </div>

                <Button className="w-full rounded-2xl py-3" disabled={submitting || cart.length === 0} onClick={placeOrder}>
                  {submitting ? 'Placing Order...' : `Place Order · ${formatRestaurantCurrency(totalWithDelivery)}`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      {cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-2xl">
          <HiOutlineShoppingBag className="mr-2 inline h-5 w-5" />
          View Cart ({cartCount}) · {formatRestaurantCurrency(totalWithDelivery)}
        </button>
      )}

      {/* Mobile Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="text-lg font-black">Your Order</h2>
            <button onClick={() => setShowCart(false)} className="rounded-xl border border-slate-200 p-2"><HiOutlineXMark className="h-5 w-5" /></button>
          </div>
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {/* Same cart content rendered above for desktop */}
          </div>
        </div>
      )}
    </motion.div>
  )
}
