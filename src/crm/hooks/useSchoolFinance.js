import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../lib/firebase.js'
import { fetchWorkspaceCollectionPage } from '../lib/firestore.js'
import { clientSafeMessage } from '../utils/messages.js'
import { computeInvoiceStats, normalizeInvoice, normalizePayment } from './useInvoices.js'
import { useUser } from './useUser.js'

const PAGE_SIZE = 500
const MAX_PAGES = 40 // 20,000 records per collection; beyond that the screen says so instead of guessing
const REFRESH_MS = 10 * 60 * 1000 // background refresh while the tab is open
const REUSE_MS = 3 * 60 * 1000 // opening another school page within this time reuses the data already loaded (no new reads)
const STALE_MS = 5 * 60 * 1000 // coming back to the tab refreshes only if the data is older than this

// Every full read costs one Firestore read per bill and payment, so the three screens share one copy.
let shared = { key: '', at: 0, data: null }

async function fetchAll({ workspaceId, businessType, collectionName, normalize }) {
  const rows = []
  let cursor = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await fetchWorkspaceCollectionPage({
      workspaceId,
      collectionName,
      businessType,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount: PAGE_SIZE,
      startAfterDoc: cursor,
    })
    ;(res.rows || res.data || []).forEach((row) => rows.push(normalize(row)))
    cursor = res.lastDoc
    if (!res.hasMore || !cursor) return { rows, truncated: false }
  }
  return { rows, truncated: true }
}

/**
 * Every fee bill and payment of the school, not just the latest page.
 *
 * The Fees page, the dashboard and the reports each used to read a small recent slice (25 to 100 records), so as soon
 * as a school had more bills than that their totals disagreed with each other and with the real numbers. All three now
 * read the full list from here and run it through the same calculations.
 *
 * Refreshes by itself every 10 minutes and when the tab is opened again after 5 minutes; `reload()` refreshes right now. Pages opened within 3 minutes of each other share one read.
 */
export function useSchoolFinance({ enabled = true } = {}) {
  const { workspaceId, businessType } = useUser()
  const [state, setState] = useState({ invoices: [], payments: [], loading: true, error: '', truncated: false, loadedAt: 0 })
  const requestRef = useRef(0)

  // load(false): reuse recent data. reload(): always read fresh (used right after a bill or payment changes).
  const load = useCallback(async (force) => {
    if (!enabled || !db || !workspaceId) {
      setState((cur) => ({ ...cur, loading: false }))
      return
    }
    const key = `${workspaceId}|${businessType}`
    if (!force && shared.key === key && shared.data && Date.now() - shared.at < REUSE_MS) {
      setState(shared.data)
      return
    }
    const requestId = ++requestRef.current
    try {
      const [invoices, payments] = await Promise.all([
        fetchAll({ workspaceId, businessType, collectionName: 'invoices', normalize: normalizeInvoice }),
        fetchAll({ workspaceId, businessType, collectionName: 'payments', normalize: normalizePayment }),
      ])
      if (requestId !== requestRef.current) return
      const next = {
        invoices: invoices.rows,
        payments: payments.rows,
        loading: false,
        error: '',
        truncated: invoices.truncated || payments.truncated,
        loadedAt: Date.now(),
      }
      shared = { key, at: next.loadedAt, data: next }
      setState(next)
    } catch (err) {
      if (requestId !== requestRef.current) return
      setState((cur) => ({ ...cur, loading: false, error: clientSafeMessage(err, 'Unable to load fee records.') }))
    }
  }, [businessType, enabled, workspaceId])

  const reload = useCallback(() => load(true), [load])

  useEffect(() => {
    if (!enabled) return undefined
    load(false)
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load(true) }, REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - shared.at > STALE_MS) load(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      requestRef.current += 1
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, load])

  const stats = useMemo(() => computeInvoiceStats(state.invoices), [state.invoices])
  return { ...state, stats, reload }
}
