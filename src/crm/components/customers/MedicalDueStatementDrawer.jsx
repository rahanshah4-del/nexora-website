import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineReceiptPercent, HiOutlineXMark } from 'react-icons/hi2'
import { db } from '../../lib/firebase.js'
import { workspaceCollectionPath } from '../../lib/firestore.js'
import { formatCurrency } from '../../utils/format.js'

function dateValue(value) {
  if (!value) return 0
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function dateText(value) {
  if (!value) return '—'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

/**
 * Chronological due statement for one Medical POS customer: every sale that
 * had a due amount at checkout, interleaved with every wallet settlement,
 * as a running balance. Sales derive their (immutable) "due at sale" from
 * total − paidAmount, since the order's live dueAmount is reduced in place
 * as settlements get allocated against it (see settleCustomerDue).
 */
export default function MedicalDueStatementDrawer({ customer, workspaceId, onClose }) {
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!db || !workspaceId || !customer?.id) {
      setOrders([])
      setPayments([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    setError('')
    Promise.all([
      getDocs(query(
        collection(db, workspaceCollectionPath(workspaceId, 'medicalPosOrders')),
        where('customerId', '==', customer.id),
        orderBy('createdAt', 'asc'),
      )),
      getDocs(query(
        collection(db, workspaceCollectionPath(workspaceId, 'posWalletPayments')),
        where('customerId', '==', customer.id),
        orderBy('createdAt', 'asc'),
      )),
    ])
      .then(([orderSnap, paymentSnap]) => {
        if (!active) return
        setOrders(orderSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setPayments(paymentSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Unable to load due statement.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [workspaceId, customer?.id])

  const entries = useMemo(() => {
    const saleEntries = orders
      .map((order) => {
        const dueAtSale = Math.max(0, Number(order.total || 0) - Number(order.paidAmount || 0))
        const refunded = order.refundStatus === 'refunded' || Boolean(order.refundedAt)
        return {
          kind: 'sale',
          id: order.id,
          date: order.createdAt,
          orderNumber: order.orderNumber || order.id,
          dueAtSale,
          remainingDue: Number(order.dueAmount || 0),
          refunded,
        }
      })
      .filter((entry) => entry.dueAtSale > 0)

    const settlementEntries = payments
      .filter((payment) => payment.type === 'wallet_settlement')
      .map((payment) => ({
        kind: 'settlement',
        id: payment.id,
        date: payment.createdAt,
        amount: Number(payment.amount || 0),
        paymentMethod: payment.paymentMethod || 'Cash',
        note: payment.note || '',
        allocations: Array.isArray(payment.allocations) ? payment.allocations : [],
      }))

    const merged = [...saleEntries, ...settlementEntries].sort((a, b) => dateValue(a.date) - dateValue(b.date))

    // A refunded sale's due was already reversed on the customer's wallet
    // by the refund itself (not by a cash settlement), so it shouldn't add
    // to the running balance here — it's shown for visibility only.
    let balance = 0
    return merged.map((entry) => {
      if (entry.kind === 'sale' && !entry.refunded) balance += entry.dueAtSale
      else if (entry.kind === 'settlement') balance -= entry.amount
      return { ...entry, balanceAfter: Math.max(0, balance) }
    })
  }, [orders, payments])

  const totalBilled = entries.filter((e) => e.kind === 'sale' && !e.refunded).reduce((sum, e) => sum + e.dueAtSale, 0)
  const totalSettled = entries.filter((e) => e.kind === 'settlement').reduce((sum, e) => sum + e.amount, 0)
  const currentDue = Number(customer?.walletDue || 0)

  return (
    <motion.div
      className="fixed inset-0 z-[85] flex bg-slate-950/45 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="ml-auto flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="shrink-0 border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Due Statement</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{customer?.name || 'Customer'}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{customer?.phone || 'No phone'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Currently Due</p>
              <p className={`mt-1 text-xl font-black tracking-tight ${currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(currentDue)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Total Billed on Credit</p>
              <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{formatCurrency(totalBilled)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Total Settled</p>
              <p className="mt-1 text-xl font-black tracking-tight text-emerald-700">{formatCurrency(totalSettled)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" />
              <p className="text-sm font-semibold">Loading statement…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-rose-500">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <HiOutlineDocumentText className="h-12 w-12" />
              <p className="text-sm font-semibold">No due sales or settlements yet</p>
              <p className="text-xs text-slate-400">This customer has no credit sales on record in Medical POS.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <div key={`${entry.kind}-${entry.id}`} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${entry.kind === 'sale' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {entry.kind === 'sale' ? <HiOutlineReceiptPercent className="h-4 w-4" /> : <HiOutlineBanknotes className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      {entry.kind === 'sale' ? (
                        <>
                          <p className="text-sm font-bold text-slate-800">
                            Sale {entry.orderNumber}{entry.refunded ? ' — refunded' : ''}
                          </p>
                          <p className="text-xs text-slate-400">{dateText(entry.date)}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-slate-800">
                            Settlement · {entry.paymentMethod}
                          </p>
                          <p className="text-xs text-slate-400">{dateText(entry.date)}</p>
                          {entry.allocations.length ? (
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">
                              Applied to {entry.allocations.map((a) => a.orderNumber || a.orderId).join(', ')}
                            </p>
                          ) : null}
                          {entry.note ? <p className="mt-1 text-[11px] text-slate-400">{entry.note}</p> : null}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-black tabular-nums ${entry.kind === 'sale' ? (entry.refunded ? 'text-slate-400 line-through' : 'text-rose-700') : 'text-emerald-700'}`}>
                      {entry.kind === 'sale' ? '+' : '−'} {formatCurrency(entry.kind === 'sale' ? entry.dueAtSale : entry.amount)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium tabular-nums text-slate-400">
                      Bal <span className="font-bold text-slate-600">{formatCurrency(entry.balanceAfter)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
