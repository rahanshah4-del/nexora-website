import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../lib/firebase.js'
import { fetchWorkspaceCollectionPage, listenToWorkspaceCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function toDateValue(value) {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
}

function normalizeLog(l) {
  const createdAt = toDateValue(l.createdAt)
  return {
    id: l.id,
    userId: l.userId || '',
    userEmail: l.userEmail || '',
    userName: l.userName || '—',
    module: l.module || 'System',
    action: l.action || 'Action',
    description: l.description || '',
    priority: l.priority || 'low',
    createdAt,
    createdAtLabel: createdAt ? createdAt.toISOString().slice(0, 10) : '—',
    metadata: l.metadata || {},
  }
}

const DEFAULT_ACTIVITY_LOG_LIST_LIMIT = 50
const ACTIVITY_LOG_PAGE_LIMIT = 50

// TODO: Add a future archive/TTL strategy so activityLogs do not grow forever.
function safeActivityLogListLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return DEFAULT_ACTIVITY_LOG_LIST_LIMIT
  return Math.floor(next)
}

function safeActivityLogPageLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return ACTIVITY_LOG_PAGE_LIMIT
  return Math.min(ACTIVITY_LOG_PAGE_LIMIT, Math.floor(next))
}

function sortLogsByCreatedAt(rows) {
  return (Array.isArray(rows) ? rows : []).map(normalizeLog).sort((a, b) => {
    const at = a.createdAt?.getTime?.() || 0
    const bt = b.createdAt?.getTime?.() || 0
    return bt - at
  })
}

function mergeLogPages(currentRows, nextRows) {
  const seen = new Set((currentRows || []).map((log) => log.id))
  return [
    ...(currentRows || []),
    ...(nextRows || []).filter((log) => !seen.has(log.id)),
  ]
}

export function useActivityLogs({ limitCount = DEFAULT_ACTIVITY_LOG_LIST_LIMIT, paginated = false } = {}) {
  const { workspaceId, businessType } = useUser()
  const logListLimit = safeActivityLogListLimit(limitCount)
  const logPageLimit = safeActivityLogPageLimit(limitCount)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [hasMoreLogs, setHasMoreLogs] = useState(false)
  const [logPage, setLogPage] = useState(0)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const logCursorRef = useRef(null)
  const logRequestRef = useRef(0)

  const loadLogPage = useCallback(async ({ reset = false } = {}) => {
    if (!db) {
      setLogs([])
      setSource('none')
      setError('Secure Cloud Sync is not available right now.')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: false }
    }
    if (!workspaceId) {
      setLogs([])
      logCursorRef.current = null
      setHasMoreLogs(false)
      setLogPage(0)
      setSource('firestore')
      setError('')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: true }
    }

    const requestId = ++logRequestRef.current
    if (reset) {
      logCursorRef.current = null
      setLogs([])
      setHasMoreLogs(false)
      setLogPage(0)
      setLoading(true)
    } else {
      setPaginationLoading(true)
    }

    try {
      const page = await fetchWorkspaceCollectionPage({
        workspaceId,
        collectionName: 'activityLogs',
        businessType,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: logPageLimit,
        startAfterDoc: reset ? null : logCursorRef.current,
      })
      if (requestId !== logRequestRef.current) return { ok: false }

      const nextRows = sortLogsByCreatedAt(page.rows)
      setLogs((currentRows) => (reset ? nextRows : mergeLogPages(currentRows, nextRows)))
      logCursorRef.current = page.lastDoc
      setHasMoreLogs(page.hasMore)
      setLogPage((currentPage) => (reset ? 1 : currentPage + 1))
      setSource('firestore')
      setError('')
      console.log(reset ? '[ActivityLogs] first page loaded' : '[ActivityLogs] next page loaded', {
        count: page.size,
        pageSize: logPageLimit,
        hasMore: page.hasMore,
      })
      console.log('[ActivityLogs] pagination cursor', {
        cursorId: page.lastDoc?.id || null,
        hasCursor: Boolean(page.lastDoc),
      })
      return { ok: true }
    } catch (err) {
      if (requestId !== logRequestRef.current) return { ok: false }
      setError(clientSafeMessage(err, 'Unable to load activity logs.'))
      if (reset) setLogs([])
      setSource('firestore')
      return { ok: false, error: clientSafeMessage(err, 'Unable to load activity logs.') }
    } finally {
      if (requestId === logRequestRef.current) {
        if (reset) setLoading(false)
        else setPaginationLoading(false)
      }
    }
  }, [businessType, logPageLimit, workspaceId])

  const loadMoreLogs = useCallback(async () => {
    if (loading || paginationLoading || !hasMoreLogs) return { ok: true }
    return loadLogPage({ reset: false })
  }, [hasMoreLogs, loadLogPage, loading, paginationLoading])

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setLogs([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
        setPaginationLoading(false)
        setHasMoreLogs(false)
        setLogPage(0)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setLogs([])
        logCursorRef.current = null
        setHasMoreLogs(false)
        setLogPage(0)
        setSource('firestore')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    Promise.resolve().then(() => setError(''))

    if (paginated) {
      loadLogPage({ reset: true })
      return () => {
        logRequestRef.current += 1
      }
    }

    const handleRows = (rows) => {
      setLogs(sortLogsByCreatedAt(rows))
      setSource('firestore')
      setLoading(false)
    }
    const handleError = (err) => {
      setError(clientSafeMessage(err, 'Unable to load activity logs.'))
      setLogs([])
      setSource('firestore')
      setLoading(false)
    }

    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'activityLogs',
      businessType,
      limitCount: logListLimit,
      onData: handleRows,
      onError: handleError,
    })

    return () => unsub?.()
  }, [businessType, loadLogPage, logListLimit, paginated, workspaceId])

  const api = useMemo(
    () => ({
      logs,
      loading,
      paginationLoading,
      hasMoreLogs,
      logPage,
      logPageSize: paginated ? logPageLimit : logListLimit,
      loadMoreLogs,
      source,
      error,
    }),
    [logs, loading, paginationLoading, hasMoreLogs, logPage, logPageLimit, logListLimit, loadMoreLogs, source, error, paginated],
  )

  return api
}
