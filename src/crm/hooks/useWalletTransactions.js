/**
 * useWalletTransactions — Customer wallet ledger (append-only, immutable).
 *
 * Reads/writes the subcollection:
 *   workspaces/{workspaceId}/customers/{customerId}/walletTransactions
 *
 * Every transaction atomically:
 *   1. Increments a daily counter doc (WTX-YYYYMMDD-NNNN)
 *   2. Writes the ledger entry with full schema
 *   3. Updates the parent customer doc's walletCredit / walletDue
 *
 * All three writes succeed or fail together inside a single Firestore
 * runTransaction — no partial writes, no duplicate IDs.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

/**
 * @typedef {'credit'|'debit'} TransactionType
 * @typedef {'manual_topup'|'order_payment'|'refund'|'due_settlement'} TransactionSource
 * @typedef {'desktop_pos'|'website'} Channel
 * @typedef {'completed'} TransactionStatus
 *
 * @typedef {Object} WalletTransaction
 * @property {string}            transactionId       WTX-YYYYMMDD-NNNN
 * @property {TransactionType}   type
 * @property {number}            amount              always positive
 * @property {TransactionSource} source
 * @property {string|null}       sourceId            order number, refund id, etc.
 * @property {string}            note
 * @property {string}            referenceLabel      human-readable one-line summary
 * @property {Channel}           channel             'desktop_pos' | 'website'
 * @property {TransactionStatus} status              always 'completed' for now
 * @property {number}            balanceBefore       walletCredit before this tx
 * @property {number}            balanceAfter        walletCredit after this tx
 * @property {number}            dueBefore           walletDue before this tx
 * @property {number}            dueAfter            walletDue after this tx
 * @property {string}            createdBy
 * @property {string}            createdByRole
 * @property {string}            workspaceId
 * @property {Timestamp}         createdAt
 */

/** Pad a number to 4 digits with leading zeros. */
function pad4(n) { return String(n).padStart(4, '0') }

/** Today's date as YYYYMMDD in local time. */
function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** Build a human-readable reference label from the transaction fields. */
function buildReferenceLabel({ type, source, sourceId, note, createdByRole }) {
  const sourceLabels = {
    manual_topup: 'Manual top-up',
    order_payment: 'Order payment',
    refund: 'Refund',
    due_settlement: 'Due settlement',
  }
  const sourceLabel = sourceLabels[source] || source
  const roleLabel = (createdByRole || '').toLowerCase() === 'cashier' ? 'Cashier' : 'Owner'

  let detail = ''
  if (source === 'order_payment' && sourceId) detail = ` — ${sourceId}`
  else if (source === 'refund' && sourceId) detail = ` — ${sourceId}`
  else if (source === 'manual_topup') detail = note ? ` — ${note}` : ` by ${roleLabel}`
  else if (source === 'due_settlement') detail = note ? ` — ${note}` : ''

  return `${sourceLabel}${detail}`
}

/** Infer the channel from the caller context. */
function inferChannel(createdByRole) {
  return (createdByRole || '').toLowerCase() === 'cashier' ? 'desktop_pos' : 'website'
}

/**
 * @param {Object}   opts
 * @param {string}   opts.customerId      Firestore doc ID of the customer
 * @param {boolean}  [opts.enabled=true]  Set false to skip the subscription
 */
export function useWalletTransactions({ customerId, enabled = true } = {}) {
  const { workspaceId, userId, role, businessType } = useUser()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Real-time subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !workspaceId || !customerId || !db) {
      setLoading(false)
      setTransactions([])
      return
    }

    setLoading(true)

    const colPath = `workspaces/${workspaceId}/customers/${customerId}/walletTransactions`
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setTransactions(rows)
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load wallet transactions.'))
        setLoading(false)
      },
    )

    return () => unsub()
  }, [workspaceId, customerId, enabled])

  // ── Derived state ───────────────────────────────────────────────────
  const currentBalance = useMemo(() => {
    if (!transactions.length) return 0
    return transactions[0]?.balanceAfter ?? 0
  }, [transactions])

  // ── addTransaction (atomic — counter + ledger + customer balance) ───
  /**
   * Create a wallet transaction and update the parent customer doc's
   * walletCredit / walletDue fields atomically, including a human-readable
   * transaction ID generated from a daily counter.
   *
   * All writes (counter increment, ledger entry, customer balance update)
   * happen inside a single Firestore runTransaction — no partial writes,
   * no duplicate IDs even under concurrent access.
   *
   * @param {Object}            payload
   * @param {TransactionType}   payload.type
   * @param {number}            payload.amount      always positive
   * @param {TransactionSource} payload.source
   * @param {string|null}       [payload.sourceId]
   * @param {string}            [payload.note]
   * @returns {Promise<{ok:boolean, transactionId?:string, error?:string}>}
   */
  const addTransaction = useCallback(
    async ({ type, amount, source, sourceId = null, note = '' } = {}) => {
      if (!db || !workspaceId || !customerId || !userId) {
        return { ok: false, error: 'Missing required context (workspace / customer / auth).' }
      }

      const amt = Math.max(0, Number(amount) || 0)
      if (!amt) {
        return { ok: false, error: 'Amount must be greater than zero.' }
      }
      if (!['credit', 'debit'].includes(type)) {
        return { ok: false, error: 'Type must be "credit" or "debit".' }
      }

      try {
        const customerRef = doc(db, 'workspaces', workspaceId, 'customers', customerId)
        const txColPath = `workspaces/${workspaceId}/customers/${customerId}/walletTransactions`
        const dateKey = todayKey()
        const counterRef = doc(db, 'workspaces', workspaceId, 'counters', 'walletTransactions', dateKey)
        const callerRole = role || ''

        const txnId = await runTransaction(db, async (txn) => {
          // ── 1. Read current customer balance ──
          const custSnap = await txn.get(customerRef)
          if (!custSnap.exists()) {
            throw new Error('Customer not found.')
          }

          const custData = custSnap.data()
          const balanceBefore = Number(custData.walletCredit || 0)
          const dueBefore = Number(custData.walletDue || 0)

          // ── 2. Compute new balances ──
          let balanceAfter = balanceBefore
          let dueAfter = dueBefore

          if (type === 'credit') {
            balanceAfter = balanceBefore + amt
          } else {
            if (amt > balanceBefore) {
              throw new Error(
                `Insufficient wallet credit. Available: ${balanceBefore}, requested: ${amt}`,
              )
            }
            balanceAfter = balanceBefore - amt
          }

          // ── 3. Atomic daily counter (WTX-YYYYMMDD-NNNN) ──
          const counterSnap = await txn.get(counterRef)
          const nextSeq = (counterSnap.exists() ? (counterSnap.data().value || 0) : 0) + 1
          const transactionId = `WTX-${dateKey}-${pad4(nextSeq)}`

          txn.set(counterRef, { value: nextSeq, updatedAt: serverTimestamp() }, { merge: true })

          // ── 4. Compute derived fields ──
          const channel = inferChannel(callerRole)
          const referenceLabel = buildReferenceLabel({ type, source, sourceId, note, createdByRole: callerRole })

          // ── 5. Write the immutable ledger entry ──
          const txRef = doc(collection(db, txColPath))
          txn.set(txRef, {
            transactionId,
            type,
            amount: amt,
            source,
            sourceId: sourceId || null,
            note: String(note || '').trim(),
            referenceLabel,
            channel,
            status: 'completed',
            balanceBefore,
            balanceAfter,
            dueBefore,
            dueAfter,
            createdBy: userId,
            createdByRole: callerRole,
            workspaceId,
            createdAt: serverTimestamp(),
          })

          // ── 6. Atomically update the parent customer doc ──
          txn.update(customerRef, {
            walletCredit: balanceAfter,
            walletDue: dueAfter,
            updatedAt: serverTimestamp(),
          })

          return transactionId
        })

        return { ok: true, transactionId: txnId }
      } catch (err) {
        return {
          ok: false,
          error: err?.message || 'Failed to create wallet transaction.',
        }
      }
    },
    [workspaceId, customerId, userId, role],
  )

  return {
    transactions,
    loading,
    error,
    currentBalance,
    addTransaction,
  }
}
